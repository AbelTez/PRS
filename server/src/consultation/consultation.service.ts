import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Db, Audit } from '../common/core.module';
import { CurrentUser } from '../auth/auth.module';
import { ReferralService } from '../referral/referral.service';

const ROLES = ['doctor', 'clinician', 'specialist'];
const OPEN = ['active', 'answered'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuid(v: any) { if (typeof v !== 'string' || !UUID.test(v)) throw new BadRequestException('Invalid identifier'); return v; }
function text(v: any, max: number, required = true) {
  if (typeof v !== 'string' || v.trim().length > max || (required && !v.trim())) throw new BadRequestException(`Text must contain ${required ? '1' : '0'}–${max} characters`);
  return v.trim();
}
function cursor(v: any) { if (v && !/^\d{1,18}$/.test(String(v))) throw new BadRequestException('Invalid cursor'); return v || '0'; }

@Injectable()
export class ConsultationService {
  constructor(private db: Db, private audit: Audit, private referrals: ReferralService) {}
  private clinical(u: CurrentUser) { if (!ROLES.includes(u.role)) throw new ForbiddenException('Consultations are for clinical staff'); }
  private async party(u: CurrentUser, id: string, client?: any) {
    this.clinical(u); uuid(id);
    const q = client ? client.query.bind(client) : this.db.pool.query.bind(this.db.pool);
    const { rows } = await q(`SELECT * FROM consultation WHERE id=$1 AND (requester_id=$2 OR consultant_id=$2) ${client ? 'FOR UPDATE' : ''}`, [id, u.id]);
    if (!rows[0]) throw new NotFoundException('Consultation not found');
    return rows[0];
  }
  private async event(c: any, id: string, u: CurrentUser, event: string, note = '') {
    await c.query('INSERT INTO consultation_event (consultation_id,actor_id,event,note) VALUES ($1,$2,$3,$4)', [id, u.id, event, note]);
    await c.query('UPDATE consultation SET updated_at=clock_timestamp() WHERE id=$1', [id]);
  }
  async facilities(u: CurrentUser) {
    this.clinical(u);
    return this.db.query(`SELECT id,name_lat,name_am,facility_type FROM facility WHERE status='active' ORDER BY name_lat,id`);
  }
  async specialties(u: CurrentUser, facilityId: string) {
    this.clinical(u); uuid(facilityId);
    return this.db.query(`SELECT DISTINCT coalesce(nullif(trim(u.department),''),nullif(trim(u.title),''),'General practice') AS specialty
      FROM app_user u JOIN facility f ON f.id=u.facility_id
      WHERE u.facility_id=$1 AND u.id<>$2 AND u.role=ANY($3) AND u.status='active'
      AND u.verified_at IS NOT NULL AND f.status='active' ORDER BY specialty`, [facilityId,u.id,ROLES]);
  }
  async doctors(u: CurrentUser, search = '', facilityId = '', specialty = '') {
    this.clinical(u); if (facilityId) uuid(facilityId);
    return this.db.query(`SELECT u.id,u.full_name,u.title,u.department,u.facility_id,f.name_lat AS facility_name,
      coalesce(nullif(trim(u.department),''),nullif(trim(u.title),''),'General practice') AS specialty
      FROM app_user u JOIN facility f ON f.id=u.facility_id
      WHERE u.id<>$1 AND u.role=ANY($2) AND u.status='active' AND u.verified_at IS NOT NULL AND f.status='active'
      AND ($3='' OR u.full_name ILIKE '%' || $3 || '%')
      AND ($4::uuid IS NULL OR u.facility_id=$4::uuid)
      AND ($5='' OR coalesce(nullif(trim(u.department),''),nullif(trim(u.title),''),'General practice')=$5)
      ORDER BY u.full_name,u.id LIMIT 100`, [u.id, ROLES, String(search).trim().slice(0,100),facilityId || null,String(specialty).trim().slice(0,200)]);
  }
  async patients(u: CurrentUser, search = '') {
    this.clinical(u);
    return this.db.query(`SELECT p.id,concat_ws(' ',p.given_name_lat,p.fathers_name_lat,p.grandfathers_name_lat) AS name,
      p.sex,p.age_value,p.age_unit,p.is_test_data
      FROM patient p JOIN app_user a ON a.id=p.created_by WHERE a.facility_id=$1 AND p.merged_into_id IS NULL
      AND ($2='' OR concat_ws(' ',p.name_search,p.given_name_lat,p.fathers_name_lat,p.grandfathers_name_lat) ILIKE '%' || $2 || '%')
      ORDER BY p.created_at DESC,p.id LIMIT 50`, [u.facilityId, String(search).trim().slice(0,100)]);
  }
  async create(u: CurrentUser, b: any) {
    this.clinical(u); uuid(b?.consultantId); uuid(b?.clientId);
    const title = text(b.title,160), summary = text(b.summary ?? '',10000,false);
    if (b.consultantId === u.id) throw new BadRequestException('Choose another doctor');
    const topic=b.topic || 'general', priority=b.priority || 'routine';
    if (!['general','patient_case','second_opinion','learning'].includes(topic) || !['routine','urgent'].includes(priority)) throw new BadRequestException('Invalid topic or priority');
    let patientId=b.patientId || null, referralId=b.referralId || null;
    if (referralId) {
      uuid(referralId);
      await this.referrals.get(referralId,u);
      const r=await this.db.one('SELECT patient_id FROM referral WHERE id=$1',[referralId]);
      if (patientId && patientId!==r.patient_id) throw new BadRequestException('Patient and referral do not match');
      patientId=r.patient_id;
    } else if (patientId) {
      uuid(patientId);
      const p=await this.db.one('SELECT p.id FROM patient p JOIN app_user a ON a.id=p.created_by WHERE p.id=$1 AND a.facility_id=$2 AND p.merged_into_id IS NULL',[patientId,u.facilityId]);
      if (!p) throw new ForbiddenException('This patient is not available to your facility');
    }
    if ((patientId || referralId) && b.sharingConfirmed!==true) throw new BadRequestException('Confirm authorization to share the selected case');
    return this.db.tx(async c=>{
      const recipient=await c.query("SELECT id FROM app_user WHERE id=$1 AND role=ANY($2) AND status='active' AND verified_at IS NOT NULL",[b.consultantId,ROLES]);
      const sender=await c.query("SELECT id FROM app_user WHERE id=$1 AND status='active' AND verified_at IS NOT NULL",[u.id]);
      if (!recipient.rows.length || !sender.rows.length) throw new BadRequestException('Both doctors must have verified active accounts');
      const result=await c.query(`INSERT INTO consultation (requester_id,consultant_id,title,summary,topic,priority,patient_id,referral_id,sharing_confirmed,client_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (requester_id,client_id) DO NOTHING RETURNING *`,
        [u.id,b.consultantId,title,summary,topic,priority,patientId,referralId,b.sharingConfirmed===true,b.clientId]);
      if (!result.rows.length) return (await c.query('SELECT * FROM consultation WHERE requester_id=$1 AND client_id=$2',[u.id,b.clientId])).rows[0];
      await this.event(c,result.rows[0].id,u,'requested'); return result.rows[0];
    });
  }
  async list(u: CurrentUser, q: any = {}) {
    this.clinical(u);
    const offset=Math.max(0,Math.min(100000,Number(q.offset)||0));
    return this.db.query(`SELECT c.*,a.full_name AS requester_name,b.full_name AS consultant_name,
      fa.name_lat AS requester_facility,fb.name_lat AS consultant_facility,
      (SELECT count(*)::int FROM consultation_message m WHERE m.consultation_id=c.id AND m.author_id<>$1 AND m.created_at>coalesce(CASE WHEN c.requester_id=$1 THEN c.requester_read_at ELSE c.consultant_read_at END,'epoch')) AS unread_count
      FROM consultation c JOIN app_user a ON a.id=c.requester_id JOIN app_user b ON b.id=c.consultant_id
      LEFT JOIN facility fa ON fa.id=a.facility_id LEFT JOIN facility fb ON fb.id=b.facility_id
      WHERE (c.requester_id=$1 OR c.consultant_id=$1)
      AND ($2='' OR c.status=$2)
      ORDER BY c.updated_at DESC LIMIT 50 OFFSET $3`,[u.id,q.status || '',offset]);
  }
  async inbox(u: CurrentUser) {
    this.clinical(u);
    const counts=await this.db.one(`SELECT count(*)::int AS unread FROM consultation c
      WHERE (requester_id=$1 OR consultant_id=$1) AND
      (c.status='requested' AND c.consultant_id=$1 AND c.consultant_read_at IS NULL OR EXISTS
        (SELECT 1 FROM consultation_message m WHERE m.consultation_id=c.id AND m.author_id<>$1 AND m.created_at>coalesce(CASE WHEN c.requester_id=$1 THEN c.requester_read_at ELSE c.consultant_read_at END,'epoch')))`,[u.id]);
    const calls=await this.db.query(`SELECT k.id,k.consultation_id,c.title,a.full_name AS caller_name,k.mode
      FROM consultation_call k JOIN consultation c ON c.id=k.consultation_id JOIN app_user a ON a.id=k.started_by
      WHERE (c.requester_id=$1 OR c.consultant_id=$1) AND k.started_by<>$1 AND k.status='ringing' AND k.expires_at>now() AND k.caller_seen_at>now()-interval '45 seconds'
      ORDER BY k.created_at DESC LIMIT 5`,[u.id]);
    return { ...counts, calls };
  }
  private async expire(c: any, id: string) {
    const ended=await c.query(`UPDATE consultation_call SET status=CASE WHEN status='ringing' THEN 'missed' ELSE 'ended' END,ended_at=now()
      WHERE consultation_id=$1 AND status IN ('ringing','active') AND
      (expires_at<now() OR caller_seen_at<now()-interval '45 seconds' OR (status='active' AND callee_seen_at<now()-interval '45 seconds')) RETURNING id`,[id]);
    if (ended.rows.length) await c.query('DELETE FROM consultation_signal WHERE call_id=ANY($1::uuid[])',[ended.rows.map(r=>r.id)]);
  }
  async detail(u: CurrentUser, id: string) {
    await this.party(u,id);
    await this.expire(this.db.pool,id);
    const row=await this.db.one(`SELECT c.*,a.full_name AS requester_name,b.full_name AS consultant_name,
      fa.name_lat AS requester_facility,fb.name_lat AS consultant_facility,
      concat_ws(' ',p.given_name_lat,p.fathers_name_lat,p.grandfathers_name_lat) AS patient_name,r.referral_code
      FROM consultation c JOIN app_user a ON a.id=c.requester_id JOIN app_user b ON b.id=c.consultant_id
      LEFT JOIN facility fa ON fa.id=a.facility_id LEFT JOIN facility fb ON fb.id=b.facility_id
      LEFT JOIN patient p ON p.id=c.patient_id LEFT JOIN referral r ON r.id=c.referral_id WHERE c.id=$1`,[id]);
    const attachments=await this.db.query(`SELECT id,file_name,mime_type,octet_length(content) AS size_bytes,created_at FROM consultation_attachment WHERE consultation_id=$1 ORDER BY created_at DESC LIMIT 100`,[id]);
    const events=await this.db.query(`SELECT e.*,u.full_name AS actor_name FROM consultation_event e JOIN app_user u ON u.id=e.actor_id WHERE consultation_id=$1 ORDER BY e.id DESC LIMIT 100`,[id]);
    const calls=await this.db.query('SELECT * FROM consultation_call WHERE consultation_id=$1 ORDER BY created_at DESC LIMIT 20',[id]);
    const referrals=await this.db.query('SELECT r.id,r.referral_code FROM consultation_referral l JOIN referral r ON r.id=l.referral_id WHERE l.consultation_id=$1',[id]);
    return { ...row, attachments, events, calls, referrals };
  }
  async referralContext(u: CurrentUser,id: string) {
    const r=await this.party(u,id);
    if(r.requester_id!==u.id || !r.patient_id) throw new ForbiddenException('Only the requesting doctor can prepare this referral');
    const p=await this.db.one(`SELECT id,concat_ws(' ',given_name_lat,fathers_name_lat,grandfathers_name_lat) AS name,
      sex,age_value AS "ageValue",age_unit AS "ageUnit",concat_ws(' ',age_value,age_unit) AS age,cbhi_member AS "cbhiMember" FROM patient WHERE id=$1`,[r.patient_id]);
    const opinion=await this.db.one("SELECT body FROM consultation_message WHERE consultation_id=$1 AND kind='opinion' ORDER BY id DESC LIMIT 1",[id]);
    return {patient:p,summary:opinion?.body || r.summary,title:r.title};
  }
  async read(u: CurrentUser, id: string, through?: string) {
    const r=await this.party(u,id);
    const column=r.requester_id===u.id?'requester_read_at':'consultant_read_at';
    cursor(through);
    const seen=through && through!=='0' ? await this.db.one('SELECT created_at FROM consultation_message WHERE id=$1 AND consultation_id=$2',[through,id]) : null;
    if(through && through!=='0' && !seen) throw new BadRequestException('Message does not belong to this conversation');
    await this.db.query(`UPDATE consultation SET ${column}=greatest(${column},$2::timestamptz) WHERE id=$1`,[id,seen?.created_at || r.created_at]);
    await this.audit.record({actorUserId:u.id,actorFacilityId:u.facilityId,action:'consultation_read',resourceType:'consultation',resourceId:id});
    return {ok:true};
  }
  async action(u: CurrentUser,id: string,b: any) {
    return this.db.tx(async c=>{
      const r=await this.party(u,id,c);
      const actions: any={accept:['requested','active','consultant'],decline:['requested','declined','consultant'],cancel:['requested','cancelled','requester'],close:[['active','answered'],'closed','requester']};
      const a=actions[b?.action];
      if (!a || !(Array.isArray(a[0])?a[0]:[a[0]]).includes(r.status)) throw new ConflictException('This action is not available in the current state');
      if (r[`${a[2]}_id`]!==u.id) throw new ForbiddenException('Only the responsible doctor can do this');
      const note=text(b.note || '',2000,b.action==='decline');
      await c.query('UPDATE consultation SET status=$2 WHERE id=$1',[id,a[1]]);
      if (['closed','cancelled','declined'].includes(a[1])) {
        const calls=await c.query("UPDATE consultation_call SET status='ended',ended_at=now() WHERE consultation_id=$1 AND status IN ('ringing','active') RETURNING id",[id]);
        if (calls.rows.length) await c.query('DELETE FROM consultation_signal WHERE call_id=ANY($1::uuid[])',[calls.rows.map(x=>x.id)]);
      }
      await this.event(c,id,u,b.action,note); return {ok:true,status:a[1]};
    });
  }
  async messages(u: CurrentUser,id: string,after: string) {
    await this.party(u,id); cursor(after);
    return this.db.query(`SELECT m.id,m.author_id,m.kind,m.body,m.client_id,m.created_at,a.full_name AS author_name
      FROM consultation_message m JOIN app_user a ON a.id=m.author_id WHERE consultation_id=$1 AND m.id>$2 ORDER BY m.id LIMIT 100`,[id,after || '0']);
  }
  async message(u: CurrentUser,id: string,b: any) {
    const body=text(b?.body,10000), clientId=uuid(b?.clientId), kind=b.kind || 'message';
    if (!['message','opinion'].includes(kind)) throw new BadRequestException('Invalid message type');
    return this.db.tx(async c=>{
      const r=await this.party(u,id,c);
      const existing=await c.query('SELECT * FROM consultation_message WHERE consultation_id=$1 AND author_id=$2 AND client_id=$3',[id,u.id,clientId]);
      if (existing.rows[0]) return existing.rows[0];
      if (!OPEN.includes(r.status)) throw new ConflictException('Accept the consultation before messaging; closed conversations are read-only');
      if (kind==='opinion' && r.consultant_id!==u.id) throw new ForbiddenException('Only the consulting doctor can submit an opinion');
      const msg=(await c.query('INSERT INTO consultation_message (consultation_id,author_id,body,kind,client_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',[id,u.id,body,kind,clientId])).rows[0];
      if (kind==='opinion') await c.query("UPDATE consultation SET status='answered' WHERE id=$1",[id]);
      await this.event(c,id,u,kind==='opinion'?'opinion_submitted':'message_sent'); return msg;
    });
  }
  async attach(u: CurrentUser,id: string,b: any) {
    const name=text(b?.name,200), clientId=uuid(b?.clientId);
    const m=typeof b.dataUrl==='string' && /^data:(image\/(?:jpeg|png)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(b.dataUrl);
    if (!m) throw new BadRequestException('Upload a JPEG, PNG or PDF');
    const content=Buffer.from(m[2],'base64');
    const valid=m[1]==='application/pdf'?content.subarray(0,5).toString()==='%PDF-':m[1]==='image/png'?content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):content[0]===255 && content[1]===216 && content[2]===255;
    if (!valid || !content.length || content.length>1500000) throw new BadRequestException('Invalid file or file exceeds 1.5 MB');
    return this.db.tx(async c=>{
      const r=await this.party(u,id,c);
      if (!OPEN.includes(r.status)) throw new ConflictException('Attachments can be shared in accepted consultations');
      const a=await c.query(`INSERT INTO consultation_attachment (consultation_id,uploaded_by,client_id,file_name,mime_type,content)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (consultation_id,uploaded_by,client_id) DO NOTHING RETURNING id`,[id,u.id,clientId,name,m[1],content]);
      if(a.rows.length) await this.event(c,id,u,'attachment_added',name);
      return {ok:true};
    });
  }
  async download(u: CurrentUser,id: string,aid: string) {
    await this.party(u,id); uuid(aid);
    const a=await this.db.one('SELECT * FROM consultation_attachment WHERE id=$1 AND consultation_id=$2',[aid,id]);
    if(!a) throw new NotFoundException('Attachment not found');
    await this.audit.record({actorUserId:u.id,actorFacilityId:u.facilityId,action:'consultation_attachment_read',resourceType:'consultation',resourceId:id,detail:{attachmentId:aid}});
    return a;
  }
  private ice(u: CurrentUser) {
    const iceServers: any[]=[{urls:process.env.CONSULTATION_STUN_URL || 'stun:stun.l.google.com:19302'}];
    const urls=(process.env.TURN_URLS || '').split(',').map(s=>s.trim()).filter(Boolean);
    if(urls.some(s=>!/^turns?:/.test(s))) throw new BadRequestException('Call relay configuration is invalid');
    if(urls.length && process.env.TURN_SHARED_SECRET) {
      const username=`${Math.floor(Date.now()/1000)+3600}:${u.id}`;
      iceServers.push({urls,username,credential:createHmac('sha1',process.env.TURN_SHARED_SECRET).update(username).digest('base64')});
    } else if(urls.length && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
      iceServers.push({urls,username:process.env.TURN_USERNAME,credential:process.env.TURN_PASSWORD});
    }
    return {iceServers,relayConfigured:iceServers.length>1};
  }
  async startCall(u: CurrentUser,id: string,b: any) {
    const mode=b?.mode || 'video'; if(!['audio','video'].includes(mode)) throw new BadRequestException('Invalid call mode');
    return this.db.tx(async c=>{
      const r=await this.party(u,id,c);
      if(!OPEN.includes(r.status)) throw new ConflictException('Accept the consultation before calling');
      const participants=await c.query("SELECT id FROM app_user WHERE id=ANY($1::uuid[]) AND status='active' AND verified_at IS NOT NULL",[[r.requester_id,r.consultant_id]]);
      if(participants.rows.length!==2) throw new ConflictException('Both doctors must be active and verified');
      await this.expire(c,id);
      const live=await c.query("SELECT * FROM consultation_call WHERE consultation_id=$1 AND status IN ('ringing','active')",[id]);
      if(live.rows[0]) return live.rows[0];
      const call=(await c.query('INSERT INTO consultation_call (consultation_id,started_by,mode) VALUES ($1,$2,$3) RETURNING *',[id,u.id,mode])).rows[0];
      await this.event(c,id,u,'call_started',mode);return call;
    });
  }
  private async call(u: CurrentUser,id: string,cid: string,c: any) {
    await this.party(u,id,c);uuid(cid);await this.expire(c,id);
    const call=(await c.query('SELECT * FROM consultation_call WHERE id=$1 AND consultation_id=$2 FOR UPDATE',[cid,id])).rows[0];
    if(!call) throw new NotFoundException('Call not found');return call;
  }
  async callAction(u: CurrentUser,id: string,cid: string,b: any) {
    return this.db.tx(async c=>{
      const call=await this.call(u,id,cid,c);
      if(b?.action==='end' && !['ringing','active'].includes(call.status)) return {call};
      if(!['ringing','active'].includes(call.status)) throw new ConflictException('This call has ended');
      const caller=call.started_by===u.id;
      if(b?.action==='join') {
        const participants=await c.query(`SELECT a.id FROM app_user a JOIN consultation r ON a.id IN (r.requester_id,r.consultant_id)
          WHERE r.id=$1 AND a.status='active' AND a.verified_at IS NOT NULL`,[id]);
        if(participants.rows.length!==2) throw new ForbiddenException('A participant is no longer available');
        if(!caller && call.status==='ringing') {
          await c.query("UPDATE consultation_call SET status='active',answered_at=now(),callee_seen_at=now(),expires_at=now()+interval '55 minutes' WHERE id=$1",[cid]);
          await this.event(c,id,u,'call_joined');call.status='active';
        }
        await c.query(`UPDATE consultation_call SET ${caller?'caller_seen_at':'callee_seen_at'}=now() WHERE id=$1`,[cid]);
        return {call,...this.ice(u)};
      }
      if(b?.action==='heartbeat') {
        if(!caller && call.status==='ringing') throw new ForbiddenException('Join the call first');
        await c.query(`UPDATE consultation_call SET ${caller?'caller_seen_at':'callee_seen_at'}=now() WHERE id=$1`,[cid]);return {call};
      }
      if(!['end','decline'].includes(b?.action)) throw new BadRequestException('Invalid call action');
      if(b.action==='decline' && (caller || call.status!=='ringing')) throw new ForbiddenException('Only the invited doctor can decline a ringing call');
      const status=b.action==='decline'?'declined':'ended';
      await c.query('UPDATE consultation_call SET status=$2,ended_at=now() WHERE id=$1',[cid,status]);
      await c.query('DELETE FROM consultation_signal WHERE call_id=$1',[cid]);
      await this.event(c,id,u,`call_${status}`);return {call:{...call,status}};
    });
  }
  async signal(u: CurrentUser,id: string,cid: string,b: any) {
    uuid(b?.clientId);
    if(!['offer','answer','candidate'].includes(b.kind) || !b.payload || typeof b.payload!=='object' || JSON.stringify(b.payload).length>64000) throw new BadRequestException('Invalid call signal');
    if(b.kind==='candidate') {
      if(typeof b.payload.candidate!=='string' || b.payload.candidate.length>4000) throw new BadRequestException('Invalid network candidate');
    } else if(b.payload.type!==b.kind || typeof b.payload.sdp!=='string') throw new BadRequestException('Invalid session description');
    return this.db.tx(async c=>{
      const call=await this.call(u,id,cid,c);
      if(!['ringing','active'].includes(call.status)) throw new ConflictException('Call ended');
      const caller=call.started_by===u.id;
      if(!caller && call.status!=='active' || b.kind==='offer' && !caller || b.kind==='answer' && caller) throw new ForbiddenException('Signal not permitted');
      const count=await c.query('SELECT count(*)::int AS n FROM consultation_signal WHERE call_id=$1 AND sender_id=$2',[cid,u.id]);
      if(count.rows[0].n>=300) throw new BadRequestException('Call signaling limit reached; restart the call');
      await c.query(`INSERT INTO consultation_signal (call_id,sender_id,kind,payload,client_id) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (call_id,sender_id,client_id) DO NOTHING`,[cid,u.id,b.kind,b.payload,b.clientId]);return {ok:true};
    });
  }
  async signals(u: CurrentUser,id: string,cid: string,after: string) {
    cursor(after);
    return this.db.tx(async c=>{
      const call=await this.call(u,id,cid,c);
      if(call.started_by!==u.id && call.status==='ringing') return {call,signals:[]};
      const signals=(await c.query('SELECT id,kind,payload FROM consultation_signal WHERE call_id=$1 AND sender_id<>$2 AND id>$3 ORDER BY id LIMIT 100',[cid,u.id,after || '0'])).rows;
      return {call,signals};
    });
  }
}
