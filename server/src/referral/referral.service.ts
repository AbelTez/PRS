import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { createHmac, randomUUID } from 'crypto';
import { Db, ConfigStore, Audit, Notifier, ChangeLog } from '../common/core.module';
import { CurrentUser } from '../auth/auth.module';
import { RoutingService } from '../routing/routing.module';
import {
  resolve, ReferralState, ReferralEvent, isTerminal, allowedEvents,
  DECLINE_REASONS, OVERRIDE_REASONS, TIER_SKIP_REASONS, TRANSPORT_MODES,
  DISPOSITIONS, ARRIVAL_METHODS, SLA_ACTIVE_STATES,
} from './state-machine';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev-token-secret-change-me';

export interface CreateReferralDto {
  id?: string;                      // client-generated UUID (offline-safe, idempotent)
  patientId: string;
  reasonCode: string;
  urgency?: 'emergency' | 'urgent' | 'routine';
  referralType?: 'up' | 'down' | 'lateral' | 'diagnostic' | 'specimen';
  targetFacilityId: string;
  suggestedFacilityIds?: string[];
  suggestionRankOfChosen?: number;
  overrideReason?: string;
  tierSkipReason?: string;
  provisionalDiagnosis: string;
  icdCode?: string;
  reasonFreeText?: string;
  requiredCapabilities?: string[];
  sensitivityFlag?: string;
  clinical?: Record<string, any>;
  preReferral?: Record<string, any>;
  emergencyOverride?: boolean;
  emergencyOverrideReason?: string;
  lawfulBasis?: 'consent' | 'vital_interest' | 'legal_obligation';
  consentMethod?: string;
  selfReferred?: boolean;
  createdOffline?: boolean;
  clientCreatedAt?: string;
  distanceKm?: number;
  estimatedTravelMinutes?: number;
  isTestData?: boolean;
  submit?: boolean;                 // create + submit in one call
}

/** BR-05: vitals mandatory unless emergency_override. */
const MANDATORY_VITALS = ['bpSystolic', 'bpDiastolic', 'pulse', 'respRate', 'temperatureC'];

@Injectable()
export class ReferralService {
  private readonly log = new Logger('ReferralService');

  constructor(
    private db: Db,
    private cfg: ConfigStore,
    private audit: Audit,
    private notifier: Notifier,
    private changes: ChangeLog,
    private routing: RoutingService,
  ) {}

  /* ------------------------------------------------------------- helpers */

  private genCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — read aloud over phone
    const pick = (n: number) => Array.from({ length: n }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    const body = `${pick(4)}-${pick(2)}`;
    const checksum = body.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 10;
    return `ERL-${body}${checksum}`;
  }

  /** BR-60: signed referral validity token for CBHI. Contains NO clinical data. */
  private mintToken(r: any): string {
    const payload = {
      rid: r.id,
      code: r.referral_code,
      phash: createHmac('sha256', TOKEN_SECRET).update(r.patient_id).digest('hex').slice(0, 32),
      origin: r.origin_facility_id,
      dest: r.target_facility_id,
      tierFrom: r.origin_facility_tier,
      tierTo: r.target_facility_tier,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // BR-62
    };
    const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = b64({ alg: 'HS256', typ: 'ERL-VT' });
    const bodyPart = b64(payload);
    const sig = createHmac('sha256', TOKEN_SECRET).update(`${head}.${bodyPart}`).digest('base64url');
    return `${head}.${bodyPart}.${sig}`;
  }

  verifyToken(token: string) {
    try {
      const [head, body, sig] = token.split('.');
      const expected = createHmac('sha256', TOKEN_SECRET).update(`${head}.${body}`).digest('base64url');
      if (sig !== expected) return { valid: false, reason: 'bad_signature' };
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, reason: 'expired' };
      // BR-64 / data minimisation: validity + facility pair + tier only. No clinical content.
      return {
        valid: true,
        referralCode: payload.code,
        originFacilityId: payload.origin,
        destinationFacilityId: payload.dest,
        tierTransition: `${payload.tierFrom}->${payload.tierTo}`,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    } catch {
      return { valid: false, reason: 'malformed' };
    }
  }

  private actorSide(r: any, user: CurrentUser): 'origin' | 'target' | 'system' {
    if (user.role === 'sysadmin') return 'system';
    if (r.origin_facility_id === user.facilityId) return 'origin';
    if (r.target_facility_id === user.facilityId) return 'target';
    throw new ForbiddenException(
      'Your facility is not a party to this referral (BR-51: relationship-based access control)',
    );
  }

  /* -------------------------------------------------------------- create */

  async create(dto: CreateReferralDto, user: CurrentUser) {
    if (!['hew', 'clinician', 'liaison', 'triage', 'specialist', 'sysadmin'].includes(user.role)) {
      throw new ForbiddenException(`Role '${user.role}' may not create referrals`);
    }

    const id = dto.id || randomUUID();

    // Idempotent on client-generated UUID (§12.4) — safe offline replay.
    const existing = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [id]);
    if (existing) return this.get(id, user);

    const patient = await this.db.one(`SELECT * FROM patient WHERE id = $1`, [dto.patientId]);
    if (!patient) throw new NotFoundException('Patient not found');

    const reason = await this.db.one(`SELECT * FROM reason_code WHERE code = $1`, [dto.reasonCode]);
    if (!reason) throw new BadRequestException(`Unknown reason_code '${dto.reasonCode}'`);

    const origin = await this.db.one(`SELECT * FROM facility WHERE id = $1`, [user.facilityId]);
    const target = await this.db.one(`SELECT * FROM facility WHERE id = $1`, [dto.targetFacilityId]);
    if (!target) throw new NotFoundException('Target facility not found');
    if (target.id === origin.id) throw new BadRequestException('Cannot refer a patient to the originating facility');

    const urgency = dto.urgency || reason.default_urgency;
    const referralType = dto.referralType
      || (target.tier > origin.tier ? 'up' : target.tier < origin.tier ? 'down' : 'lateral');

    /* --- BR-05: pre-referral clinical dataset completeness */
    const clinical = dto.clinical || {};
    if (!dto.emergencyOverride) {
      const missing = MANDATORY_VITALS.filter(
        (v) => clinical[v] === undefined || clinical[v] === null || clinical[v] === '',
      );
      if (missing.length) {
        throw new BadRequestException({
          message: 'BR-05: mandatory pre-referral vitals missing',
          missingVitals: missing,
          hint: 'Supply the vitals, or set emergencyOverride=true with emergencyOverrideReason.',
        });
      }
    } else if (!dto.emergencyOverrideReason) {
      throw new BadRequestException('BR-05: emergencyOverride requires emergencyOverrideReason');
    }

    /* --- BR-01: tier skip requires an explicit reason (emergencies exempt, BR-04) */
    const tierGap = target.tier - origin.tier;
    if (referralType === 'up' && tierGap > 1 && urgency !== 'emergency' && !dto.tierSkipReason) {
      throw new BadRequestException({
        message: `BR-01: referral skips ${tierGap - 1} tier(s) (${origin.tier} -> ${target.tier}); tierSkipReason is required`,
        allowedReasons: TIER_SKIP_REASONS,
      });
    }
    if (dto.tierSkipReason && !TIER_SKIP_REASONS.includes(dto.tierSkipReason as any)) {
      throw new BadRequestException({ message: 'Invalid tierSkipReason', allowed: TIER_SKIP_REASONS });
    }

    /* --- BR-13: overriding the top suggestion requires a recorded reason */
    const rank = dto.suggestionRankOfChosen;
    if (rank !== undefined && rank !== 1 && !dto.overrideReason) {
      throw new BadRequestException({
        message: 'BR-13: choosing a facility other than the top suggestion requires overrideReason',
        allowedReasons: OVERRIDE_REASONS,
      });
    }
    if (dto.overrideReason && !OVERRIDE_REASONS.includes(dto.overrideReason as any)) {
      throw new BadRequestException({ message: 'Invalid overrideReason', allowed: OVERRIDE_REASONS });
    }

    /* --- BR-50: lawful basis */
    const lawfulBasis = dto.lawfulBasis || (urgency === 'emergency' ? 'vital_interest' : 'consent');

    const requiredCaps = dto.requiredCapabilities?.length
      ? dto.requiredCapabilities
      : reason.required_capabilities;

    const code = this.genCode();
    const now = new Date();
    const graceHours = await this.cfg.arrivalGraceHours(urgency);
    const expectedArrival = new Date(now.getTime() + graceHours * 3600 * 1000);

    // Sync lag: server receipt vs device creation. Never punish a facility for the network.
    const syncLag = dto.clientCreatedAt
      ? Math.max(0, Math.round((now.getTime() - new Date(dto.clientCreatedAt).getTime()) / 60000))
      : 0;

    const row = await this.db.tx(async (c) => {
      const ins = await c.query(
        `INSERT INTO referral (
           id, referral_code, chain_root_id, patient_id, status, urgency, referral_type,
           origin_facility_id, origin_facility_tier, origin_facility_name,
           referring_user_id, referring_user_name, referring_user_phone,
           target_facility_id, target_facility_tier, target_facility_name,
           suggested_facility_ids, suggestion_rank_of_chosen, override_reason, tier_skip_reason,
           distance_km, estimated_travel_minutes,
           reason_code, reason_free_text, provisional_diagnosis, icd_code,
           required_capabilities, sensitivity_flag, clinical, pre_referral,
           emergency_override, emergency_override_reason,
           expected_arrival_at, lawful_basis, consent_captured_at, consent_method,
           self_referred, created_offline, client_created_at, synced_at, sync_lag_minutes,
           is_test_data
         ) VALUES (
           $1,$2,$1,$3,'DRAFT',$4,$5,
           $6,$7,$8,
           $9,$10,$11,
           $12,$13,$14,
           $15,$16,$17,$18,
           $19,$20,
           $21,$22,$23,$24,
           $25,$26,$27,$28,
           $29,$30,
           $31,$32,$33,$34,
           $35,$36,$37,now(),$38,
           $39
         ) RETURNING *`,
        [
          id, code, dto.patientId, urgency, referralType,
          origin.id, origin.tier, origin.name_lat,
          user.id, user.fullName, user.phone ?? null,
          target.id, target.tier, target.name_lat,
          dto.suggestedFacilityIds ?? null, rank ?? null, dto.overrideReason ?? null, dto.tierSkipReason ?? null,
          dto.distanceKm ?? null, dto.estimatedTravelMinutes ?? null,
          dto.reasonCode, dto.reasonFreeText ?? null, dto.provisionalDiagnosis, dto.icdCode ?? null,
          requiredCaps, dto.sensitivityFlag ?? 'none',
          JSON.stringify(clinical), JSON.stringify(dto.preReferral ?? {}),
          dto.emergencyOverride ?? false, dto.emergencyOverrideReason ?? null,
          expectedArrival, lawfulBasis, lawfulBasis === 'consent' ? now : null, dto.consentMethod ?? null,
          dto.selfReferred ?? false, dto.createdOffline ?? false, dto.clientCreatedAt ?? null, syncLag,
          dto.isTestData ?? false,
        ],
      );
      const r = ins.rows[0];

      await c.query(
        `INSERT INTO referral_transition
           (referral_id, from_status, to_status, event, actor_user_id, actor_user_name, actor_facility_id)
         VALUES ($1, NULL, 'DRAFT', 'create', $2, $3, $4)`,
        [id, user.id, user.fullName, origin.id],
      );

      await this.audit.record({
        actorUserId: user.id, actorFacilityId: origin.id,
        action: 'create', resourceType: 'referral', resourceId: id,
        detail: { code, urgency, target: target.name_lat },
      }, c);

      await this.changes.append('referral', id, 'create',
        { id, code, status: 'DRAFT' }, [origin.id, target.id], c);

      return r;
    });

    if (dto.submit !== false) {
      return this.transition(id, 'submit', user, {});
    }
    return this.get(id, user);
  }

  /* ---------------------------------------------------------- transition */

  /**
   * Single entry point for every state change. Server-authoritative (§12.4):
   * the client requests, this method decides.
   */
  async transition(
    referralId: string,
    event: ReferralEvent,
    user: CurrentUser,
    payload: Record<string, any> = {},
  ) {
    return this.db.tx(async (c) => {
      // Optimistic concurrency: lock the row (BR — double-accept race, §10.4)
      const cur = await c.query(`SELECT * FROM referral WHERE id = $1 FOR UPDATE`, [referralId]);
      if (!cur.rows.length) throw new NotFoundException('Referral not found');
      const r = cur.rows[0];

      if (payload.expectedVersion !== undefined && payload.expectedVersion !== r.version) {
        throw new BadRequestException(
          `Concurrent modification: referral is at version ${r.version}, you sent ${payload.expectedVersion}`,
        );
      }

      const side = event === 'sla_breach' || event === 'grace_expiry' || event === 'lost_timeout'
        || event === 'reservation_lapse'
        ? 'system'
        : this.actorSide(r, user);

      const check = resolve(r.status as ReferralState, event, side);
      if (!check.ok) throw new BadRequestException(check.error);

      const to = check.to!;
      const sets: string[] = ['status = $2', 'updated_at = now()', 'version = version + 1'];
      const vals: any[] = [referralId, to];
      let i = 3;
      const set = (col: string, val: any) => { sets.push(`${col} = $${i}`); vals.push(val); i++; };

      // Collected here, dispatched AFTER commit. Sending inside the transaction
      // would deadlock: the notification FK references the referral row we hold
      // locked FOR UPDATE, and it would also send SMS for work that may roll back.
      const notifications: Array<Parameters<Notifier['queue']>[0]> = [];

      switch (event) {
        /* ---- submission: start the SLA clock (BR-20) */
        case 'submit':
        case 'reroute': {
          if (event === 'reroute') {
            if (!payload.targetFacilityId) throw new BadRequestException('reroute requires targetFacilityId');
            const nt = await c.query(`SELECT * FROM facility WHERE id = $1`, [payload.targetFacilityId]);
            if (!nt.rows.length) throw new NotFoundException('New target facility not found');
            set('target_facility_id', nt.rows[0].id);
            set('target_facility_tier', nt.rows[0].tier);
            set('target_facility_name', nt.rows[0].name_lat);
            set('decision', null); set('decision_at', null); set('decision_by', null);
            set('decline_reason', null); set('acknowledged_at', null); set('acknowledged_by', null);
            set('escalation_level', 0); set('sla_breached', false);
          }
          const mins = await this.cfg.slaMinutes(r.urgency);
          set('sla_deadline_at', new Date(Date.now() + mins * 60000));
          set('synced_at', new Date());

          const tgtId = payload.targetFacilityId || r.target_facility_id;
          const focal = await c.query(
            `SELECT u.phone, u.full_name FROM app_user u
              WHERE u.facility_id = $1 AND u.role IN ('liaison','triage') AND u.status='active' LIMIT 1`,
            [tgtId],
          );
          if (focal.rows.length) {
            notifications.push(({
              channel: 'sms',
              recipient: focal.rows[0].phone,
              template: 'new_referral',
              body: `[${String(r.urgency).toUpperCase()}] New referral ${r.referral_code} from ${r.origin_facility_name}. Dx: ${r.provisional_diagnosis}. Respond within ${mins} min.`,
              referralId,
            }));
          }
          break;
        }

        /* ---- acknowledgement */
        case 'acknowledge':
          set('acknowledged_at', new Date());
          set('acknowledged_by', user.id);
          break;

        case 'sla_breach':
          set('sla_breached', true);
          set('escalation_level', Math.min((r.escalation_level ?? 0) + 1, 3));
          break;

        /* ---- acceptance (BR-26 bed reservation, BR-60 token) */
        case 'accept': {
          set('decision', 'accepted');
          set('decision_at', new Date());
          set('decision_by', user.id);
          set('receiving_clinician_name', payload.receivingClinicianName ?? user.fullName);
          set('receiving_clinician_phone', payload.receivingClinicianPhone ?? user.phone ?? null);
          if (payload.bedReserved) {
            const hrs = await this.cfg.bedReservationHours(r.urgency);
            set('bed_reserved', true);
            set('bed_reservation_expires_at', new Date(Date.now() + hrs * 3600 * 1000));
          }
          set('validity_token', this.mintToken(r));

          const pat = await c.query(`SELECT * FROM patient WHERE id = $1`, [r.patient_id]);
          const phone = payload.patientPhone || null;
          if (phone || pat.rows[0]) {
            notifications.push(({
              channel: 'sms',
              recipient: phone || 'patient-contact-on-file',
              template: 'referral_accepted',
              body: `Your referral ${r.referral_code} is ACCEPTED at ${r.target_facility_name}. Show this code on arrival.`,
              referralId,
            }));
          }
          notifications.push(({
            channel: 'sms',
            recipient: r.referring_user_phone || 'origin-focal-point',
            template: 'accepted_notify_origin',
            body: `Referral ${r.referral_code} ACCEPTED by ${r.target_facility_name}. Contact: ${payload.receivingClinicianName ?? user.fullName}.`,
            referralId,
          }));
          break;
        }

        /* ---- decline (BR-22, BR-23, BR-24) */
        case 'decline': {
          if (!payload.declineReason) {
            throw new BadRequestException({
              message: 'BR-22: a decline must carry a controlled reason code',
              allowedReasons: DECLINE_REASONS,
            });
          }
          if (!DECLINE_REASONS.includes(payload.declineReason)) {
            throw new BadRequestException({ message: 'Invalid declineReason', allowed: DECLINE_REASONS });
          }
          set('decision', 'declined');
          set('decision_at', new Date());
          set('decision_by', user.id);
          set('decline_reason', payload.declineReason);
          set('decline_note', payload.declineNote ?? null);

          // BR-24: an emergency must never sit declined — escalate immediately.
          if (r.urgency === 'emergency') {
            notifications.push(({
              channel: 'sms',
              recipient: r.referring_user_phone || 'origin-focal-point',
              template: 'emergency_declined',
              body: `URGENT: emergency referral ${r.referral_code} DECLINED by ${r.target_facility_name} (${payload.declineReason}). Reroute immediately.`,
              referralId,
            }));
            const woreda = await c.query(
              `SELECT phone FROM app_user WHERE role='woreda' AND status='active' LIMIT 1`,
            );
            if (woreda.rows.length) {
              notifications.push(({
                channel: 'sms',
                recipient: woreda.rows[0].phone,
                template: 'emergency_declined_woreda',
                body: `Emergency referral ${r.referral_code} declined by ${r.target_facility_name}. Reason: ${payload.declineReason}.`,
                referralId,
              }));
            }
          }
          break;
        }

        /* ---- redirect (BR-25): spawn a child node, preserve the chain */
        case 'redirect': {
          if (!payload.redirectTargetFacilityId) {
            throw new BadRequestException('redirect requires redirectTargetFacilityId');
          }
          const nt = await c.query(`SELECT * FROM facility WHERE id = $1`, [payload.redirectTargetFacilityId]);
          if (!nt.rows.length) throw new NotFoundException('Redirect target not found');
          set('decision', 'redirected');
          set('decision_at', new Date());
          set('decision_by', user.id);
          set('redirect_target_facility_id', nt.rows[0].id);

          const childId = randomUUID();
          const childCode = this.genCode();
          const mins = await this.cfg.slaMinutes(r.urgency);
          await c.query(
            `INSERT INTO referral (
               id, referral_code, parent_referral_id, chain_root_id, patient_id, status,
               urgency, referral_type, origin_facility_id, origin_facility_tier, origin_facility_name,
               referring_user_id, referring_user_name, referring_user_phone,
               target_facility_id, target_facility_tier, target_facility_name,
               reason_code, reason_free_text, provisional_diagnosis, icd_code,
               required_capabilities, sensitivity_flag, clinical, pre_referral,
               expected_arrival_at, lawful_basis, sla_deadline_at, synced_at, is_test_data
             ) VALUES (
               $1,$2,$3,$4,$5,'SUBMITTED',
               $6,$7,$8,$9,$10,
               $11,$12,$13,
               $14,$15,$16,
               $17,$18,$19,$20,
               $21,$22,$23,$24,
               $25,$26,$27,now(),$28)`,
            [
              childId, childCode, r.id, r.chain_root_id, r.patient_id,
              r.urgency, r.referral_type, r.target_facility_id, r.target_facility_tier, r.target_facility_name,
              user.id, user.fullName, user.phone ?? null,
              nt.rows[0].id, nt.rows[0].tier, nt.rows[0].name_lat,
              r.reason_code, r.reason_free_text, r.provisional_diagnosis, r.icd_code,
              r.required_capabilities, r.sensitivity_flag, r.clinical, r.pre_referral,
              r.expected_arrival_at, r.lawful_basis, new Date(Date.now() + mins * 60000), r.is_test_data,
            ],
          );
          await c.query(
            `INSERT INTO referral_transition
               (referral_id, from_status, to_status, event, actor_user_id, actor_user_name, actor_facility_id, note)
             VALUES ($1,NULL,'SUBMITTED','redirect_spawn',$2,$3,$4,$5)`,
            [childId, user.id, user.fullName, r.target_facility_id,
             `Redirected from ${r.referral_code}`],
          );
          set('decline_note', `Redirected to ${nt.rows[0].name_lat} as ${childCode}`);
          break;
        }

        case 'request_info':
          if (!payload.question) throw new BadRequestException('request_info requires a question');
          break;

        case 'reservation_lapse':
          set('bed_reserved', false);
          break;

        /* ---- transit */
        case 'depart': {
          if (payload.transportMode && !TRANSPORT_MODES.includes(payload.transportMode)) {
            throw new BadRequestException({ message: 'Invalid transportMode', allowed: TRANSPORT_MODES });
          }
          set('departed_at', new Date());
          set('transport_mode', payload.transportMode ?? 'other');
          set('escort_type', payload.escortType ?? 'none');
          break;
        }

        /* ---- arrival: half loop closure (BR-30, BR-31) */
        case 'arrive':
        case 'found': {
          const method = payload.arrivalMethod ?? 'attestation';
          if (!ARRIVAL_METHODS.includes(method)) {
            throw new BadRequestException({ message: 'Invalid arrivalMethod', allowed: ARRIVAL_METHODS });
          }
          const arrivedAt = new Date();
          set('arrived_at', arrivedAt);
          set('arrival_confirmed_by', user.id);
          set('arrival_method', method);
          if (r.departed_at) {
            set('transit_minutes',
              Math.round((arrivedAt.getTime() - new Date(r.departed_at).getTime()) / 60000));
          }
          notifications.push(({
            channel: 'in_app',
            recipient: r.origin_facility_id,
            template: 'patient_arrived',
            body: `Patient for referral ${r.referral_code} has ARRIVED at ${r.target_facility_name}.`,
            referralId,
          }));
          break;
        }

        /* ---- BR-32: not arrived within grace -> follow-up task at ORIGIN */
        case 'grace_expiry':
          if (r.status === 'NOT_ARRIVED') break; // second expiry closes it
          notifications.push(({
            channel: 'sms',
            recipient: r.referring_user_phone || 'origin-focal-point',
            template: 'not_arrived',
            body: `Referral ${r.referral_code} has NOT ARRIVED at ${r.target_facility_name}. Please trace the patient.`,
            referralId,
          }));
          break;

        case 'start_care':
          break;

        /* ---- outcome (BR-33) */
        case 'submit_outcome': {
          const o = payload.outcome || {};
          if (!o.finalDiagnosis) throw new BadRequestException('outcome.finalDiagnosis is required');
          if (!o.disposition) throw new BadRequestException('outcome.disposition is required');
          if (!DISPOSITIONS.includes(o.disposition)) {
            throw new BadRequestException({ message: 'Invalid disposition', allowed: DISPOSITIONS });
          }
          set('outcome', JSON.stringify(o));
          set('outcome_submitted_at', new Date());
          set('outcome_submitted_by', user.id);
          notifications.push(({
            channel: 'in_app',
            recipient: r.origin_facility_id,
            template: 'outcome_returned',
            body: `Outcome returned for ${r.referral_code}: ${o.finalDiagnosis} (${o.disposition}). Please acknowledge to close the loop.`,
            referralId,
          }));
          break;
        }

        /* ---- BR-30: the field that actually closes the loop */
        case 'acknowledge_outcome':
          set('outcome_acknowledged_at', new Date());
          set('outcome_acknowledged_by', user.id);
          break;

        case 'record_death':
          set('outcome', JSON.stringify({ ...(payload.outcome || {}), disposition: 'died' }));
          set('outcome_submitted_at', new Date());
          set('outcome_submitted_by', user.id);
          break;

        case 'cancel':
        case 'close_declined_all':
        case 'lost_timeout':
        case 'supply_info':
        case 'refer_onward':
          break;
      }

      const upd = await c.query(
        `UPDATE referral SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals,
      );
      const updated = upd.rows[0];

      await c.query(
        `INSERT INTO referral_transition
           (referral_id, from_status, to_status, event, actor_user_id, actor_user_name,
            actor_facility_id, reason_code, note, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          referralId, r.status, to, event, user.id, user.fullName, user.facilityId,
          payload.declineReason ?? payload.overrideReason ?? null,
          payload.note ?? payload.declineNote ?? payload.question ?? null,
          JSON.stringify(payload || {}),
        ],
      );

      await this.audit.record({
        actorUserId: user.id, actorFacilityId: user.facilityId,
        action: `transition:${event}`, resourceType: 'referral', resourceId: referralId,
        detail: { from: r.status, to },
      }, c);

      await this.changes.append('referral', referralId, 'update',
        { id: referralId, status: to, version: updated.version },
        [r.origin_facility_id, r.target_facility_id], c);

      const hydrated = await this.hydrate(updated, user, c);
      return { hydrated, notifications };
    }).then(async ({ hydrated, notifications }) => {
      // Post-commit dispatch (see note above).
      for (const n of notifications) {
        try { await this.notifier.queue(n); }
        catch (e: any) { this.log.warn(`Notification failed: ${e.message}`); }
      }
      return hydrated;
    });
  }

  /* ----------------------------------------------------------- retrieval */

  private async hydrate(r: any, user: CurrentUser, client?: PoolClient) {
    const q = client
      ? (s: string, p: any[]) => client.query(s, p).then((x) => x.rows)
      : (s: string, p: any[]) => this.db.query(s, p);

    const patient = (await q(`SELECT * FROM patient WHERE id = $1`, [r.patient_id]))[0];
    const transitions = await q(
      `SELECT from_status, to_status, event, actor_user_name, reason_code, note, occurred_at
         FROM referral_transition WHERE referral_id = $1 ORDER BY occurred_at ASC`,
      [r.id],
    );

    let side: 'origin' | 'target' | 'system' | 'none' = 'none';
    try { side = this.actorSide(r, user); } catch { side = 'none'; }

    return {
      ...r,
      patient: patient ? {
        id: patient.id,
        name: [patient.given_name_lat, patient.fathers_name_lat, patient.grandfathers_name_lat]
          .filter(Boolean).join(' '),
        nameAm: [patient.given_name_am, patient.fathers_name_am].filter(Boolean).join(' '),
        sex: patient.sex,
        age: patient.age_value ? `${patient.age_value} ${patient.age_unit}` : null,
        cbhiMember: patient.cbhi_member,
        isPregnant: patient.is_pregnant,
      } : null,
      transitions,
      allowedEvents: isTerminal(r.status) ? [] : allowedEvents(r.status),
      actorSide: side,
      slaRemainingMinutes: r.sla_deadline_at && SLA_ACTIVE_STATES.includes(r.status)
        ? Math.round((new Date(r.sla_deadline_at).getTime() - Date.now()) / 60000)
        : null,
    };
  }

  async get(id: string, user: CurrentUser) {
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [id]);
    if (!r) throw new NotFoundException('Referral not found');

    // BR-51: relationship-based access control. Oversight roles get metadata only.
    const oversight = ['woreda', 'region', 'moh', 'cbhi'].includes(user.role);
    // BR-51: administrative roles are never a clinical "party", even when their
    // registered facility happens to be the origin or target of the referral.
    const party = !oversight
      && (r.origin_facility_id === user.facilityId || r.target_facility_id === user.facilityId);
    if (!party && !oversight && user.role !== 'sysadmin') {
      throw new ForbiddenException('BR-51: your facility is not a party to this referral');
    }

    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'read_payload', resourceType: 'referral', resourceId: id,
      purpose: party ? 'care_coordination' : 'oversight',
    });

    const full = await this.hydrate(r, user);
    if (oversight) {
      // Data minimisation: oversight sees flow, not the chart.
      const { clinical, pre_referral, outcome, provisional_diagnosis, ...rest } = full as any;
      return { ...rest, clinicalRedacted: true };
    }
    return full;
  }

  async byCode(code: string, user: CurrentUser) {
    const r = await this.db.one(`SELECT id FROM referral WHERE referral_code = $1`, [code]);
    if (!r) throw new NotFoundException(`No referral with code ${code}`);
    return this.get(r.id, user);
  }

  async list(user: CurrentUser, q: {
    direction?: 'inbound' | 'outbound' | 'all';
    status?: string; urgency?: string; limit?: number; offset?: number;
  }) {
    const where: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (['woreda', 'region', 'moh', 'sysadmin'].includes(user.role)) {
      // oversight: everything in scope
    } else if (q.direction === 'inbound') {
      where.push(`target_facility_id = $${i++}`); vals.push(user.facilityId);
    } else if (q.direction === 'outbound') {
      where.push(`origin_facility_id = $${i++}`); vals.push(user.facilityId);
    } else {
      where.push(`(origin_facility_id = $${i} OR target_facility_id = $${i})`);
      vals.push(user.facilityId); i++;
    }

    if (q.status) { where.push(`status = ANY($${i++}::text[])`); vals.push(q.status.split(',')); }
    if (q.urgency) { where.push(`urgency = $${i++}`); vals.push(q.urgency); }

    const limit = Math.min(q.limit ?? 50, 200);
    vals.push(limit, q.offset ?? 0);

    const rows = await this.db.query(
      `SELECT r.id, r.referral_code, r.status, r.urgency, r.referral_type, r.reason_code,
              r.provisional_diagnosis, r.origin_facility_name, r.target_facility_name,
              r.origin_facility_id, r.target_facility_id,
              r.created_at, r.sla_deadline_at, r.sla_breached, r.decision, r.decline_reason,
              r.arrived_at, r.outcome_submitted_at, r.outcome_acknowledged_at, r.version,
              p.given_name_lat, p.fathers_name_lat, p.sex, p.age_value, p.age_unit
         FROM referral r JOIN patient p ON p.id = r.patient_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY
          CASE r.urgency WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
          r.created_at DESC
        LIMIT $${i++} OFFSET $${i}`,
      vals,
    );

    return rows.map((r) => ({
      ...r,
      patientName: [r.given_name_lat, r.fathers_name_lat].filter(Boolean).join(' '),
      patientAge: r.age_value ? `${r.age_value} ${r.age_unit}` : null,
      slaRemainingMinutes: r.sla_deadline_at && SLA_ACTIVE_STATES.includes(r.status)
        ? Math.round((new Date(r.sla_deadline_at).getTime() - Date.now()) / 60000)
        : null,
    }));
  }

  /** Full referral chain (redirects, onward referrals, back-referrals). */
  async chain(id: string, user: CurrentUser) {
    const r = await this.db.one(`SELECT chain_root_id FROM referral WHERE id = $1`, [id]);
    if (!r) throw new NotFoundException('Referral not found');
    return this.db.query(
      `SELECT id, referral_code, parent_referral_id, status, urgency,
              origin_facility_name, target_facility_name, created_at
         FROM referral WHERE chain_root_id = $1 ORDER BY created_at ASC`,
      [r.chain_root_id],
    );
  }
}
