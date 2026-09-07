import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { createHash, createHmac, randomUUID } from 'crypto';
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
  /** Imaging/documents uploaded with the referral (base64 data URLs). */
  attachments?: { name: string; type?: string; size?: number; dataUrl: string; kind?: string }[];
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

  /* --------------------------------------------- real ward reservations */

  /**
   * BR-26 made concrete: reserving a bed decrements the ward's live free-bed
   * count (append-only capacity rows, latest wins). Throws 409 when the ward
   * has nothing left — the liaison must update the board or accept without a
   * reservation, so availability shown to senders is never fiction.
   */
  private async takeBed(c: PoolClient, facilityId: string, wardType: string, user: CurrentUser): Promise<string> {
    const pick = await c.query(
      `SELECT DISTINCT ON (ward_type) ward_type, beds_total, beds_free
         FROM facility_capacity
        WHERE facility_id = $1 AND ward_type = ANY($2::text[])
        ORDER BY ward_type, reported_at DESC`,
      [facilityId, wardType === 'general' ? ['general'] : [wardType, 'general']],
    );
    const rows = pick.rows;
    const ward = rows.find((w: any) => w.ward_type === wardType) || rows[0];
    if (!ward || ward.beds_free === null || ward.beds_free <= 0) {
      throw new BadRequestException({
        message: `No free ${wardType} bed to reserve — update the availability board or accept without a reservation`,
        hint: 'Reservations are real in this system: a reservation takes an actual bed.',
      });
    }
    await c.query(
      `INSERT INTO facility_capacity (facility_id, ward_type, beds_total, beds_free, reported_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [facilityId, ward.ward_type, ward.beds_total, ward.beds_free - 1, user.id],
    );
    return ward.ward_type;
  }

  /** Returns the reserved bed to the board (lapse, cancel, reroute). */
  private async releaseBed(c: PoolClient, r: any): Promise<void> {
    if (!r.bed_reserved || !r.reserved_ward_type) return;
    const cur = await c.query(
      `SELECT beds_total, beds_free FROM facility_capacity
        WHERE facility_id = $1 AND ward_type = $2
        ORDER BY reported_at DESC LIMIT 1`,
      [r.target_facility_id, r.reserved_ward_type],
    );
    if (!cur.rows.length) return;
    const { beds_total, beds_free } = cur.rows[0];
    if (beds_total !== null && beds_free >= beds_total) return;
    await c.query(
      `INSERT INTO facility_capacity (facility_id, ward_type, beds_total, beds_free, reported_by)
       VALUES ($1,$2,$3,$4,NULL)`,
      [r.target_facility_id, r.reserved_ward_type, beds_total, beds_free + 1],
    );
  }

  private actorSide(r: any, user: CurrentUser): 'origin' | 'target' | 'system' {
    if (user.role === 'sysadmin') return 'system';
    if (r.origin_facility_id === user.facilityId) return 'origin';
    if (r.target_facility_id === user.facilityId) return 'target';
    throw new ForbiddenException(
      'Your facility is not a party to this referral (BR-51: relationship-based access control)',
    );
  }

  /* --------------------------------------------- reception & assignment */

  /** Roles that staff the referral reception desk of a facility. */
  private static readonly RECEPTION_ROLES = ['liaison', 'triage', 'facility_admin'];
  /** Roles that treat patients and therefore receive assignments. */
  private static readonly CLINICAL_ROLES = ['doctor', 'clinician', 'specialist'];

  /**
   * Reception-first access.
   *
   * An inbound referral belongs to the receiving hospital's reception until a
   * clinician is assigned to it. Most referrals need a specific specialty, so
   * an unassigned clinician must not be able to open the chart: it makes the
   * case nobody's responsibility and exposes patient data to staff with no
   * role in that patient's care.
   *
   * Reception, administration, oversight and the origin side are unaffected.
   */
  private assertMayReadAtTarget(r: any, user: CurrentUser) {
    const atTarget = r.target_facility_id === user.facilityId;
    if (!atTarget) return;
    if (!ReferralService.CLINICAL_ROLES.includes(user.role)) return;
    if (r.assigned_doctor_id === user.id) return;
    // The clinician who returns the outcome keeps access to their own case.
    if (r.outcome_submitted_by === user.id || r.decision_by === user.id) return;

    throw new ForbiddenException({
      message: 'This referral has not been assigned to you',
      hint: r.assigned_doctor_id
        ? `The referral reception assigned it to ${r.assigned_doctor_name}.`
        : 'The referral reception has not yet assigned a clinician to this case.',
      awaitingAssignment: !r.assigned_doctor_id,
    });
  }

  /** Clinicians of the receiving facility that reception can assign a case to. */
  async assignableClinicians(referralId: string, user: CurrentUser) {
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [referralId]);
    if (!r) throw new NotFoundException('Referral not found');
    if (r.target_facility_id !== user.facilityId && user.role !== 'sysadmin') {
      throw new ForbiddenException('Only the receiving facility assigns a clinician');
    }
    return this.db.query(
      `SELECT id, full_name AS "fullName", role, title, department,
              license_number AS "licenseNumber", phone,
              (SELECT count(*)::int FROM referral a
                WHERE a.assigned_doctor_id = u.id
                  AND a.status NOT LIKE 'CLOSED_%') AS "activeCases"
         FROM app_user u
        WHERE u.facility_id = $1 AND u.status = 'active'
          AND u.role = ANY($2::text[])
        ORDER BY u.full_name`,
      [r.target_facility_id, ReferralService.CLINICAL_ROLES],
    );
  }

  /**
   * Reception forwards the case to the clinician who will treat it.
   * Re-assignment is allowed while the referral is open (the note explains why).
   */
  async assign(referralId: string, body: { doctorId?: string; note?: string }, user: CurrentUser) {
    if (!ReferralService.RECEPTION_ROLES.includes(user.role) && user.role !== 'sysadmin') {
      throw new ForbiddenException(
        `Role '${user.role}' may not assign referrals — this is the referral reception's responsibility`,
      );
    }
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [referralId]);
    if (!r) throw new NotFoundException('Referral not found');
    if (r.target_facility_id !== user.facilityId && user.role !== 'sysadmin') {
      throw new ForbiddenException('Only the receiving facility assigns a clinician to a referral');
    }
    if (isTerminal(r.status)) throw new BadRequestException('Closed referrals are immutable (BR-36)');
    if (!body?.doctorId) throw new BadRequestException('doctorId is required');

    const doctor = await this.db.one(
      `SELECT * FROM app_user WHERE id = $1 AND facility_id = $2`,
      [body.doctorId, r.target_facility_id],
    );
    if (!doctor) {
      throw new BadRequestException('That clinician is not registered at the receiving facility');
    }
    if (doctor.status !== 'active') {
      throw new BadRequestException('That account is not active — the facility IT administrator must verify it first');
    }
    if (!ReferralService.CLINICAL_ROLES.includes(doctor.role)) {
      throw new BadRequestException({
        message: 'Referrals can only be assigned to a treating clinician',
        allowedRoles: ReferralService.CLINICAL_ROLES,
      });
    }

    const reassignment = !!r.assigned_doctor_id && r.assigned_doctor_id !== doctor.id;
    const updated = await this.db.one(
      `UPDATE referral
          SET assigned_doctor_id = $2, assigned_doctor_name = $3,
              assigned_at = now(), assigned_by = $4, assigned_by_name = $5,
              assignment_note = $6, updated_at = now(), version = version + 1
        WHERE id = $1 RETURNING *`,
      [referralId, doctor.id, doctor.full_name, user.id, user.fullName, body.note ?? null],
    );

    await this.db.query(
      `INSERT INTO referral_transition
         (referral_id, from_status, to_status, event, actor_user_id, actor_user_name,
          actor_facility_id, note)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7)`,
      [referralId, r.status, reassignment ? 'reassign' : 'assign', user.id, user.fullName,
       user.facilityId,
       `${reassignment ? 'Reassigned' : 'Assigned'} to ${doctor.full_name}`
         + `${doctor.department ? ` (${doctor.department})` : ''}`
         + `${body.note ? ` — ${body.note}` : ''}`],
    );

    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: reassignment ? 'referral_reassign' : 'referral_assign',
      resourceType: 'referral', resourceId: referralId,
      detail: { doctorId: doctor.id, doctorName: doctor.full_name },
    });

    await this.notifier.queue({
      channel: 'in_app',
      recipient: doctor.phone || doctor.id,
      template: 'referral_assigned',
      body: `[${String(r.urgency).toUpperCase()}] Referral ${r.referral_code} from `
        + `${r.origin_facility_name} has been assigned to you by ${user.fullName}. `
        + `Dx: ${r.provisional_diagnosis}.`,
      referralId,
    });

    return this.get(referralId, user);
  }

  /* -------------------------------------------------------------- create */

  async create(dto: CreateReferralDto, user: CurrentUser) {
    if (!['hew', 'clinician', 'doctor', 'liaison', 'triage', 'specialist', 'sysadmin'].includes(user.role)) {
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

      // Imaging/documents sent with the referral (same limits as the
      // attachments endpoint; stored in-DB at pilot scale).
      for (const att of dto.attachments ?? []) {
        const m = (att.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/s);
        if (!m) throw new BadRequestException(`Attachment '${att.name}' is not a valid base64 data URL`);
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 1_500_000) {
          throw new BadRequestException(`Attachment '${att.name}' is too large (max 1.5 MB)`);
        }
        await c.query(
          `INSERT INTO referral_attachment
             (referral_id, kind, object_key, sha256, size_bytes, mime_type, uploaded_by, file_name, content)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, att.kind ?? 'document', `db://${id}/${att.name}`,
           createHash('sha256').update(buf).digest('hex'),
           buf.length, m[1], user.id, att.name, buf],
        );
      }

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

      // Acting on a case is at least as sensitive as reading it: a clinician at
      // the receiving facility may only act once reception has assigned it.
      if (side === 'target') this.assertMayReadAtTarget(r, user);

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
            await this.releaseBed(c, r);
            set('bed_reserved', false);
            set('reserved_ward_type', null);
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
            // The reservation is REAL: it takes an actual bed off the ward's
            // availability board, so a promise to the sender is a promise.
            const ward = await this.takeBed(c, r.target_facility_id, payload.wardType || 'general', user);
            const hrs = await this.cfg.bedReservationHours(r.urgency);
            set('bed_reserved', true);
            set('reserved_ward_type', ward);
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
          await this.releaseBed(c, r);
          set('bed_reserved', false);
          set('reserved_ward_type', null);
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
          await this.releaseBed(c, r);
          if (r.bed_reserved) { set('bed_reserved', false); set('reserved_ward_type', null); }
          break;

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

  /** Facility contact snapshot — what a receiving clinician needs to call back. */
  private presentFacility(f: any) {
    if (!f) return null;
    return {
      id: f.id, name: f.name_lat, nameAm: f.name_am, type: f.facility_type,
      tier: f.tier, phone: f.phone, address: f.address_line, poBox: f.po_box,
      region: f.region_name ?? null, zone: f.zone_name ?? null,
      is24h: f.is_24h, hasAmbulance: f.has_ambulance,
    };
  }

  private async loadFacilitySnapshot(q: (s: string, p: any[]) => Promise<any[]>, id: string) {
    const rows = await q(
      `SELECT f.*, rg.name_lat AS region_name, zn.name_lat AS zone_name
         FROM facility f
         LEFT JOIN admin_unit rg ON rg.id = f.region_id
         LEFT JOIN admin_unit zn ON zn.id = f.zone_id
        WHERE f.id = $1`,
      [id],
    );
    return this.presentFacility(rows[0]);
  }

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
    const referrer = (await q(
      `SELECT role, title, department, license_number FROM app_user WHERE id = $1`,
      [r.referring_user_id],
    ))[0];
    const attachments = await q(
      `SELECT id, file_name, mime_type, size_bytes, kind, uploaded_at,
              (SELECT full_name FROM app_user WHERE id = uploaded_by) AS uploaded_by_name
         FROM referral_attachment WHERE referral_id = $1 ORDER BY uploaded_at ASC`,
      [r.id],
    );

    let side: 'origin' | 'target' | 'system' | 'none' = 'none';
    try { side = this.actorSide(r, user); } catch { side = 'none'; }

    /* Feedback stays out of clinical views. Only the IT administrator of a
     * party facility sees it — and only the rows about THEIR facility. */
    let feedback: any[] | undefined;
    if (user.role === 'it_admin'
        && (r.origin_facility_id === user.facilityId || r.target_facility_id === user.facilityId)) {
      feedback = await q(
        `SELECT id, facility_role, rating, comment, created_at
           FROM referral_feedback WHERE referral_id = $1 AND facility_id = $2`,
        [r.id, user.facilityId],
      );
    }

    return {
      ...r,
      originFacility: await this.loadFacilitySnapshot(q, r.origin_facility_id),
      targetFacility: await this.loadFacilitySnapshot(q, r.target_facility_id),
      referringUser: {
        name: r.referring_user_name,
        phone: r.referring_user_phone,
        role: referrer?.role ?? null,
        title: referrer?.title ?? null,
        department: referrer?.department ?? null,
        licenseNumber: referrer?.license_number ?? null,
      },
      attachments: attachments.map((a: any) => ({
        id: a.id, name: a.file_name, type: a.mime_type, size: a.size_bytes,
        kind: a.kind, uploadedAt: a.uploaded_at, uploadedBy: a.uploaded_by_name,
      })),
      ...(feedback !== undefined ? { feedback } : {}),
      assignment: r.assigned_doctor_id ? {
        doctorId: r.assigned_doctor_id,
        doctorName: r.assigned_doctor_name,
        assignedAt: r.assigned_at,
        assignedByName: r.assigned_by_name,
        note: r.assignment_note,
        isMine: r.assigned_doctor_id === user.id,
      } : null,
      awaitingAssignment: !r.assigned_doctor_id && !isTerminal(r.status),
      /** Reception (and only reception) may forward the case to a clinician. */
      canAssign: r.target_facility_id === user.facilityId
        && (ReferralService.RECEPTION_ROLES.includes(user.role) || user.role === 'sysadmin')
        && !isTerminal(r.status),
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

  /**
   * Patient-safe view: status, both facilities' contact details, the receiving
   * clinician, follow-up instructions and the patient's own ratings — never
   * the clinical chart, vitals or internal notes.
   */
  async patientView(referralId: string, patientId: string) {
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [referralId]);
    if (!r) throw new NotFoundException('Referral not found');
    if (r.patient_id !== patientId) throw new ForbiddenException('Not your referral');
    const q = (s: string, p: any[]) => this.db.query(s, p);
    const feedback = await q(
      `SELECT id, facility_role, rating, comment, created_at
         FROM referral_feedback WHERE referral_id = $1`,
      [r.id],
    );
    const transitions = await q(
      `SELECT to_status, event, occurred_at FROM referral_transition
        WHERE referral_id = $1 ORDER BY occurred_at ASC`,
      [r.id],
    );
    const outcome = r.outcome || {};
    return {
      id: r.id,
      referral_code: r.referral_code,
      status: r.status,
      urgency: r.urgency,
      created_at: r.created_at,
      updated_at: r.updated_at,
      arrived_at: r.arrived_at,
      outcome_submitted_at: r.outcome_submitted_at,
      originFacility: await this.loadFacilitySnapshot(q, r.origin_facility_id),
      targetFacility: await this.loadFacilitySnapshot(q, r.target_facility_id),
      receiving_clinician_name: r.receiving_clinician_name,
      receiving_clinician_phone: r.receiving_clinician_phone,
      bed_reserved: r.bed_reserved,
      reserved_ward_type: r.reserved_ward_type,
      outcome: r.outcome
        ? { disposition: outcome.disposition ?? null, followUpInstructions: outcome.followUpInstructions ?? null }
        : null,
      transitions,
      feedback,
      feedbackEligible: !!r.arrived_at || String(r.status).startsWith('CLOSED_'),
      clinicalRedacted: true,
      actorSide: 'patient',
      allowedEvents: [],
    };
  }

  async get(id: string, user: CurrentUser) {
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [id]);
    if (!r) throw new NotFoundException('Referral not found');

    // Patients see their own referrals through the patient-safe projection.
    if (user.role === 'patient') {
      if (r.patient_id !== user.patientId) {
        throw new ForbiddenException('Not your referral');
      }
      return this.patientView(id, user.patientId!);
    }

    // BR-51: relationship-based access control. Oversight roles get metadata only.
    const oversight = ['woreda', 'region', 'moh', 'cbhi'].includes(user.role);
    // BR-51: administrative roles are never a clinical "party", even when their
    // registered facility happens to be the origin or target of the referral.
    const admin = user.role === 'it_admin';
    const party = !oversight
      && (r.origin_facility_id === user.facilityId || r.target_facility_id === user.facilityId);
    if (!party && !oversight && user.role !== 'sysadmin') {
      throw new ForbiddenException('BR-51: your facility is not a party to this referral');
    }

    // Reception-first: at the receiving facility a clinician reads the chart
    // only once the case has been assigned to them.
    this.assertMayReadAtTarget(r, user);

    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'read_payload', resourceType: 'referral', resourceId: id,
      purpose: party ? (admin ? 'administration' : 'care_coordination') : 'oversight',
    });

    const full = await this.hydrate(r, user);
    if (oversight || admin) {
      // Data minimisation: oversight and IT administration see flow, not the chart.
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
    /** Reception and clinician queue filters (query strings, hence the union). */
    assignedToMe?: string | boolean;
    unassigned?: string | boolean;
  }) {
    const where: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (user.role === 'patient') {
      where.push(`patient_id = $${i++}`); vals.push(user.patientId);
    } else if (['woreda', 'region', 'moh', 'sysadmin'].includes(user.role)) {
      // oversight: everything in scope
    } else if (q.direction === 'inbound') {
      where.push(`target_facility_id = $${i++}`); vals.push(user.facilityId);
    } else if (q.direction === 'outbound') {
      where.push(`origin_facility_id = $${i++}`); vals.push(user.facilityId);
    } else {
      where.push(`(origin_facility_id = $${i} OR target_facility_id = $${i})`);
      vals.push(user.facilityId); i++;
    }

    // Reception-first: a clinician's inbound list is what reception assigned to
    // them, not the hospital's whole queue. Their own outbound referrals and
    // anything they were already responsible for stay visible.
    if (ReferralService.CLINICAL_ROLES.includes(user.role)) {
      where.push(`(origin_facility_id = $${i} OR assigned_doctor_id = $${i + 1}
                   OR decision_by = $${i + 1} OR outcome_submitted_by = $${i + 1})`);
      vals.push(user.facilityId, user.id); i += 2;
    }
    if (q.assignedToMe === 'true' || q.assignedToMe === true) {
      where.push(`assigned_doctor_id = $${i++}`); vals.push(user.id);
    }
    if (q.unassigned === 'true' || q.unassigned === true) {
      where.push(`assigned_doctor_id IS NULL`);
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
              r.assigned_doctor_id, r.assigned_doctor_name, r.assigned_at,
              p.given_name_lat, p.fathers_name_lat, p.sex, p.age_value, p.age_unit,
              (SELECT count(*)::int FROM referral_attachment a WHERE a.referral_id = r.id) AS "attachmentCount"
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
      // Patients and administrative readers get the flow, not the diagnosis.
      provisional_diagnosis: ['patient', 'it_admin'].includes(user.role) ? null : r.provisional_diagnosis,
      // Reception's working signal: inbound cases with nobody responsible yet.
      awaitingAssignment: r.target_facility_id === user.facilityId
        && !r.assigned_doctor_id && !String(r.status).startsWith('CLOSED_'),
      assignedToMe: r.assigned_doctor_id === user.id,
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
