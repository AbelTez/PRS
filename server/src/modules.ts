import {
  Module, Injectable, Controller, Get, Post, Put, Body, Param, Query,
  BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Db, Audit, ChangeLog } from './common/core.module';
import { User, CurrentUser, Roles } from './auth/auth.module';

/* ==================================================================== FACILITY */
@Injectable()
export class FacilityService {
  constructor(private db: Db, private audit: Audit) {}

  async list(q: { capability?: string; tier?: number; woredaId?: string; search?: string }) {
    const where: string[] = [`f.status = 'active'`];
    const vals: any[] = [];
    let i = 1;
    if (q.tier) { where.push(`f.tier >= $${i++}`); vals.push(q.tier); }
    if (q.woredaId) { where.push(`f.woreda_id = $${i++}`); vals.push(q.woredaId); }
    if (q.search) { where.push(`f.name_lat ILIKE $${i++}`); vals.push(`%${q.search}%`); }
    if (q.capability) {
      where.push(`EXISTS (SELECT 1 FROM facility_capability fc
                   WHERE fc.facility_id = f.id AND fc.capability_code = $${i++}
                     AND fc.status = 'available')`);
      vals.push(q.capability);
    }
    return this.db.query(
      `SELECT f.id, f.mfr_id, f.name_lat, f.name_am, f.facility_type, f.tier,
              f.latitude, f.longitude, f.phone, f.is_24h, f.has_ambulance,
              a.name_lat AS woreda_name
         FROM facility f LEFT JOIN admin_unit a ON a.id = f.woreda_id
        WHERE ${where.join(' AND ')}
        ORDER BY f.tier DESC, f.name_lat`,
      vals,
    );
  }

  async detail(id: string) {
    const f = await this.db.one(`SELECT * FROM facility WHERE id = $1`, [id]);
    if (!f) throw new NotFoundException('Facility not found');
    const caps = await this.db.query(
      `SELECT fc.capability_code, c.name_lat, c.name_am, c.category,
              fc.status, fc.blocking_note, fc.verified_at,
              (fc.verified_at < now() - INTERVAL '30 days') AS stale
         FROM facility_capability fc JOIN capability c ON c.code = fc.capability_code
        WHERE fc.facility_id = $1 ORDER BY c.category, c.name_lat`,
      [id],
    );
    const capacity = await this.db.query(
      `SELECT DISTINCT ON (ward_type) ward_type, beds_total, beds_free, reported_at,
              (reported_at < now() - INTERVAL '8 hours') AS stale
         FROM facility_capacity WHERE facility_id = $1
        ORDER BY ward_type, reported_at DESC`,
      [id],
    );
    return { ...f, capabilities: caps, capacity };
  }

  /** BR-73: facility_admin role required; two-person rule flagged for life-critical. */
  async setCapability(
    facilityId: string, code: string,
    body: { status: string; blockingNote?: string }, user: CurrentUser,
  ) {
    if (user.facilityId !== facilityId && !['woreda', 'region', 'sysadmin'].includes(user.role)) {
      throw new ForbiddenException('You may only edit your own facility capability matrix');
    }
    if (!['available', 'degraded', 'unavailable', 'unknown'].includes(body.status)) {
      throw new BadRequestException('Invalid capability status');
    }
    const LIFE_CRITICAL = ['caesarean_section', 'blood_transfusion', 'oxygen_supply',
      'anaesthesia_general', 'resuscitation'];
    const twoPersonRequired = LIFE_CRITICAL.includes(code) && body.status === 'unavailable';

    await this.db.query(
      `INSERT INTO facility_capability (facility_id, capability_code, status, blocking_note, verified_at, verified_by)
       VALUES ($1,$2,$3,$4, now(), $5)
       ON CONFLICT (facility_id, capability_code)
       DO UPDATE SET status = EXCLUDED.status, blocking_note = EXCLUDED.blocking_note,
                     verified_at = now(), verified_by = EXCLUDED.verified_by`,
      [facilityId, code, body.status, body.blockingNote ?? null, user.id],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: facilityId,
      action: 'capability_update', resourceType: 'facility', resourceId: facilityId,
      detail: { code, status: body.status, twoPersonRequired },
    });
    return { ok: true, facilityId, code, status: body.status, twoPersonRuleFlagged: twoPersonRequired };
  }

  async reportCapacity(
    facilityId: string,
    body: { wardType: string; bedsTotal?: number; bedsFree: number },
    user: CurrentUser,
  ) {
    if (user.facilityId !== facilityId && user.role !== 'sysadmin') {
      throw new ForbiddenException('You may only report capacity for your own facility');
    }
    await this.db.query(
      `INSERT INTO facility_capacity (facility_id, ward_type, beds_total, beds_free, reported_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [facilityId, body.wardType, body.bedsTotal ?? null, body.bedsFree, user.id],
    );
    return { ok: true };
  }

  capabilities() {
    return this.db.query(`SELECT * FROM capability ORDER BY category, name_lat`);
  }

  reasonCodes() {
    return this.db.query(`SELECT * FROM reason_code ORDER BY category, name_lat`);
  }
}

@Controller('v1')
export class FacilityController {
  constructor(private svc: FacilityService) {}

  @Get('facilities')
  list(@Query() q: any) { return this.svc.list(q); }

  @Get('capabilities')
  caps() { return this.svc.capabilities(); }

  @Get('reason-codes')
  reasons() { return this.svc.reasonCodes(); }

  @Get('facilities/:id')
  detail(@Param('id') id: string) { return this.svc.detail(id); }

  @Put('facilities/:id/capabilities/:code')
  @Roles('facility_admin', 'liaison', 'woreda', 'region', 'sysadmin')
  setCap(@Param('id') id: string, @Param('code') code: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.setCapability(id, code, b, u);
  }

  @Post('facilities/:id/capacity')
  @Roles('facility_admin', 'liaison', 'triage', 'clinician', 'sysadmin')
  capacity(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.reportCapacity(id, b, u);
  }
}

/* ===================================================================== PATIENT */
@Injectable()
export class PatientService {
  constructor(private db: Db, private audit: Audit) {}

  private hash(v: string) {
    return createHash('sha256')
      .update((process.env.HASH_PEPPER || 'dev-pepper') + v)
      .digest('hex');
  }

  /**
   * BR-42/BR-43: deterministic match on Fayda; otherwise probabilistic on
   * name + sex + age + woreda. Never auto-merge on name similarity alone.
   */
  async search(q: { faydaId?: string; phone?: string; name?: string; woredaId?: string }, user: CurrentUser) {
    if (q.faydaId) {
      const exact = await this.db.query(
        `SELECT * FROM patient WHERE fayda_id_hash = $1 AND merged_into_id IS NULL`,
        [this.hash(q.faydaId)],
      );
      if (exact.length) return exact.map((p) => this.present(p, 1.0, 'fayda_exact'));
    }
    if (q.phone) {
      const byPhone = await this.db.query(
        `SELECT * FROM patient WHERE phone_primary_hash = $1 AND merged_into_id IS NULL`,
        [this.hash(q.phone)],
      );
      if (byPhone.length) return byPhone.map((p) => this.present(p, 0.9, 'phone_exact'));
    }
    if (q.name) {
      const rows = await this.db.query(
        `SELECT *, similarity_score FROM (
           SELECT p.*,
             CASE WHEN lower(coalesce(p.name_search,'')) = lower($1) THEN 0.85
                  WHEN lower(coalesce(p.name_search,'')) LIKE lower($2) THEN 0.6
                  ELSE 0.3 END AS similarity_score
           FROM patient p
           WHERE p.merged_into_id IS NULL
             AND (p.name_search ILIKE $2 OR p.given_name_am ILIKE $2)
             AND ($3::uuid IS NULL OR p.woreda_id = $3::uuid)
         ) s ORDER BY similarity_score DESC LIMIT 20`,
        [q.name, `%${q.name}%`, q.woredaId ?? null],
      );
      return rows.map((p) => this.present(p, Number(p.similarity_score), 'name_probabilistic'));
    }
    return [];
  }

  private present(p: any, confidence: number, method: string) {
    return {
      id: p.id,
      name: [p.given_name_lat, p.fathers_name_lat, p.grandfathers_name_lat].filter(Boolean).join(' '),
      nameAm: [p.given_name_am, p.fathers_name_am].filter(Boolean).join(' '),
      sex: p.sex,
      age: p.age_value ? `${p.age_value} ${p.age_unit}` : null,
      ageValue: p.age_value, ageUnit: p.age_unit,
      cbhiMember: p.cbhi_member,
      isPregnant: p.is_pregnant,
      hasFayda: !!p.fayda_id_hash,
      matchConfidence: confidence,
      matchMethod: method,
      // BR-42: 0.75–0.95 goes to a human review queue, never auto-merge
      requiresReview: confidence >= 0.75 && confidence < 0.95,
    };
  }

  async create(body: any, user: CurrentUser) {
    if (!body.givenNameLat && !body.givenNameAm) {
      throw new BadRequestException('At least one given name (Latin or Ge\'ez) is required');
    }
    if (!body.sex) throw new BadRequestException('sex is required');
    if (!body.dateOfBirthGc && !body.ageValue) {
      throw new BadRequestException('Either dateOfBirthGc or ageValue+ageUnit is required');
    }
    const id = body.id || randomUUID();
    const nameSearch = [body.givenNameLat, body.fathersNameLat, body.grandfathersNameLat]
      .filter(Boolean).join(' ');

    const row = await this.db.one(
      `INSERT INTO patient (
         id, fayda_id_hash, fayda_id_enc, echis_member_id,
         given_name_lat, given_name_am, fathers_name_lat, fathers_name_am,
         grandfathers_name_lat, grandfathers_name_am, name_search,
         sex, date_of_birth_gc, date_of_birth_ec, age_value, age_unit,
         phone_primary_hash, phone_primary_enc, phone_owner_relation,
         region_id, zone_id, woreda_id, kebele_id, address_detail,
         cbhi_member, is_pregnant, is_test_data, created_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
       ) ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        id,
        body.faydaId ? this.hash(body.faydaId) : null,
        body.faydaId ? Buffer.from(body.faydaId) : null,
        body.echisMemberId ?? null,
        body.givenNameLat ?? null, body.givenNameAm ?? null,
        body.fathersNameLat ?? null, body.fathersNameAm ?? null,
        body.grandfathersNameLat ?? null, body.grandfathersNameAm ?? null,
        nameSearch,
        body.sex, body.dateOfBirthGc ?? null, body.dateOfBirthEc ?? null,
        body.ageValue ?? null, body.ageUnit ?? null,
        body.phonePrimary ? this.hash(body.phonePrimary) : null,
        body.phonePrimary ? Buffer.from(body.phonePrimary) : null,
        body.phoneOwnerRelation ?? null,
        body.regionId ?? null, body.zoneId ?? null, body.woredaId ?? null,
        body.kebeleId ?? null, body.addressDetail ?? null,
        body.cbhiMember ?? false, body.isPregnant ?? null,
        body.isTestData ?? false, user.id,
      ],
    );

    const patient = row || await this.db.one(`SELECT * FROM patient WHERE id = $1`, [id]);
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'create', resourceType: 'patient', resourceId: id,
    });
    return this.present(patient, 1.0, 'created');
  }
}

@Controller('v1/patients')
export class PatientController {
  constructor(private svc: PatientService) {}

  @Post('search')
  search(@Body() b: any, @User() u: CurrentUser) { return this.svc.search(b, u); }

  @Post()
  create(@Body() b: any, @User() u: CurrentUser) { return this.svc.create(b, u); }
}

/* =================================================================== ANALYTICS */
@Injectable()
export class AnalyticsService {
  constructor(private db: Db) {}

  /** Appendix C metric definitions — written down, not improvised. */
  async metrics(scope: { facilityId?: string; woredaId?: string; from?: string; to?: string }) {
    const from = scope.from || '1970-01-01';
    const to = scope.to || '2999-01-01';
    const facFilter = scope.facilityId
      ? `AND (origin_facility_id = $3::uuid OR target_facility_id = $3::uuid)` : '';
    const vals: any[] = [from, to];
    if (scope.facilityId) vals.push(scope.facilityId);

    const [core] = await this.db.query(
      `SELECT
         count(*) FILTER (WHERE is_test_data = FALSE) AS total_referrals,
         count(*) FILTER (WHERE urgency = 'emergency' AND is_test_data = FALSE) AS emergency_count,
         count(*) FILTER (WHERE status LIKE 'CLOSED_%' AND status <> 'CLOSED_CANCELLED'
                            AND is_test_data = FALSE) AS terminal_countable,
         count(*) FILTER (WHERE status = 'CLOSED_COMPLETED' AND is_test_data = FALSE) AS loop_closed,
         count(*) FILTER (WHERE decision = 'accepted' AND is_test_data = FALSE) AS accepted,
         count(*) FILTER (WHERE decision IS NOT NULL AND is_test_data = FALSE) AS decided,
         count(*) FILTER (WHERE arrived_at IS NOT NULL AND is_test_data = FALSE) AS arrived,
         count(*) FILTER (WHERE self_referred = TRUE AND is_test_data = FALSE) AS self_referred,
         count(*) FILTER (WHERE sla_breached = TRUE AND is_test_data = FALSE) AS sla_breaches,
         count(*) FILTER (WHERE created_offline = TRUE AND is_test_data = FALSE) AS created_offline,
         count(*) FILTER (WHERE emergency_override = FALSE AND is_test_data = FALSE) AS with_full_vitals,
         percentile_cont(0.5) WITHIN GROUP (
           ORDER BY EXTRACT(EPOCH FROM (acknowledged_at - synced_at))/60
         ) FILTER (WHERE acknowledged_at IS NOT NULL AND is_test_data = FALSE) AS median_minutes_to_ack,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY transit_minutes)
           FILTER (WHERE transit_minutes IS NOT NULL AND is_test_data = FALSE) AS median_transit_minutes,
         count(*) FILTER (WHERE outcome_submitted_at IS NOT NULL
                            AND outcome_acknowledged_at IS NULL
                            AND is_test_data = FALSE) AS outcomes_awaiting_ack,
         count(*) FILTER (WHERE status IN ('ARRIVED','IN_CARE')
                            AND arrived_at < now() - INTERVAL '72 hours'
                            AND outcome_submitted_at IS NULL
                            AND is_test_data = FALSE) AS overdue_outcomes
       FROM referral
       WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz ${facFilter}`,
      vals,
    );

    const declines = await this.db.query(
      `SELECT decline_reason, count(*)::int AS n
         FROM referral
        WHERE decline_reason IS NOT NULL AND is_test_data = FALSE
          AND created_at BETWEEN $1::timestamptz AND $2::timestamptz ${facFilter}
        GROUP BY decline_reason ORDER BY n DESC`,
      vals,
    );

    const byStatus = await this.db.query(
      `SELECT status, count(*)::int AS n FROM referral
        WHERE is_test_data = FALSE AND created_at BETWEEN $1::timestamptz AND $2::timestamptz ${facFilter}
        GROUP BY status ORDER BY n DESC`,
      vals,
    );

    const flow = await this.db.query(
      `SELECT origin_facility_name AS source, target_facility_name AS target, count(*)::int AS n
         FROM referral WHERE is_test_data = FALSE
           AND created_at BETWEEN $1::timestamptz AND $2::timestamptz ${facFilter}
         GROUP BY 1,2 ORDER BY n DESC LIMIT 25`,
      vals,
    );

    const pct = (a: any, b: any) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 1000) / 10 : null);

    return {
      totals: {
        totalReferrals: Number(core.total_referrals),
        emergencyCount: Number(core.emergency_count),
        terminalCountable: Number(core.terminal_countable),
        loopClosed: Number(core.loop_closed),
        arrived: Number(core.arrived),
        slaBreaches: Number(core.sla_breaches),
        createdOffline: Number(core.created_offline),
        outcomesAwaitingAck: Number(core.outcomes_awaiting_ack),
        overdueOutcomes: Number(core.overdue_outcomes),
      },
      // The North Star (Appendix C)
      loopClosureRatePct: pct(core.loop_closed, core.terminal_countable),
      acceptanceRatePct: pct(core.accepted, core.decided),
      arrivalConfirmationRatePct: pct(core.arrived, core.accepted),
      preReferralCompletenessPct: pct(core.with_full_vitals, core.total_referrals),
      bypassRatePct: pct(core.self_referred, core.total_referrals),
      medianMinutesToAcknowledge: core.median_minutes_to_ack !== null
        ? Math.round(Number(core.median_minutes_to_ack)) : null,
      medianTransitMinutes: core.median_transit_minutes !== null
        ? Math.round(Number(core.median_transit_minutes)) : null,
      declineReasons: declines,
      byStatus,
      flow,
      benchmark: {
        loopClosureBaselinePct: 10,
        loopClosureTargetPct: 60,
        timeToAcceptTargetMinutes: 30,
        arrivalConfirmationTargetPct: 75,
        preReferralCompletenessBaselinePct: 39,
        preReferralCompletenessTargetPct: 85,
      },
    };
  }
}

/* ---------------------------------------------- role-aware analytics views */
/**
 * Visibility policy (deliberate, until dedicated quality roles exist):
 *  - oversight (woreda/region/moh/sysadmin): network flow metrics — no feedback;
 *  - it_admin: DETAILED analytics for THEIR OWN facility only, including
 *    patient feedback linked to the ordering doctor and the from/to hospitals;
 *  - every other facility role (doctor, hew, liaison, triage, facility_admin):
 *    only data about their own work — no feedback, no other facility's detail.
 */
@Injectable()
export class ScopedAnalyticsService {
  constructor(private db: Db) {}

  /** A clinician's own referral activity — nothing about anyone else. */
  async mine(user: CurrentUser) {
    const [core] = await this.db.query(
      `SELECT count(*)::int AS sent,
              count(*) FILTER (WHERE status = 'CLOSED_COMPLETED')::int AS loops_closed,
              count(*) FILTER (WHERE status LIKE 'CLOSED_%' AND status <> 'CLOSED_CANCELLED')::int AS terminal,
              count(*) FILTER (WHERE urgency = 'emergency')::int AS emergencies,
              count(*) FILTER (WHERE decision = 'declined' AND status = 'DECLINED')::int AS awaiting_reroute,
              count(*) FILTER (WHERE outcome_submitted_at IS NOT NULL AND outcome_acknowledged_at IS NULL)::int AS outcomes_to_acknowledge,
              count(*) FILTER (WHERE status IN ('SUBMITTED','ESCALATED','ACKNOWLEDGED'))::int AS awaiting_response
         FROM referral
        WHERE referring_user_id = $1 AND is_test_data = FALSE`,
      [user.id],
    );
    const byStatus = await this.db.query(
      `SELECT status, count(*)::int AS n FROM referral
        WHERE referring_user_id = $1 AND is_test_data = FALSE
        GROUP BY status ORDER BY n DESC`,
      [user.id],
    );
    return {
      scope: 'my_referrals',
      viewer: { name: user.fullName, role: user.role, facilityName: user.facilityName },
      totals: {
        sent: core.sent, loopsClosed: core.loops_closed, emergencies: core.emergencies,
        awaitingResponse: core.awaiting_response, awaitingReroute: core.awaiting_reroute,
        outcomesToAcknowledge: core.outcomes_to_acknowledge,
      },
      myLoopClosureRatePct: core.terminal > 0
        ? Math.round((core.loops_closed / core.terminal) * 1000) / 10 : null,
      byStatus,
    };
  }

  /** A liaison's operational picture of their OWN facility's queue. */
  async facilityOps(user: CurrentUser) {
    const [core] = await this.db.query(
      `SELECT
         count(*) FILTER (WHERE target_facility_id = $1 AND status IN ('SUBMITTED','ESCALATED'))::int AS inbound_awaiting_decision,
         count(*) FILTER (WHERE target_facility_id = $1 AND status = 'ESCALATED')::int AS inbound_escalated,
         count(*) FILTER (WHERE target_facility_id = $1 AND status = 'ACCEPTED')::int AS accepted_awaiting_arrival,
         count(*) FILTER (WHERE target_facility_id = $1 AND status = 'IN_TRANSIT')::int AS in_transit,
         count(*) FILTER (WHERE target_facility_id = $1 AND status IN ('ARRIVED','IN_CARE') AND outcome_submitted_at IS NULL)::int AS outcomes_due,
         count(*) FILTER (WHERE target_facility_id = $1 AND bed_reserved = TRUE)::int AS beds_reserved,
         count(*) FILTER (WHERE origin_facility_id = $1 AND status IN ('SUBMITTED','ESCALATED','ACKNOWLEDGED'))::int AS outbound_awaiting,
         count(*) FILTER (WHERE origin_facility_id = $1 AND outcome_submitted_at IS NOT NULL AND outcome_acknowledged_at IS NULL)::int AS outbound_to_acknowledge
         FROM referral WHERE is_test_data = FALSE`,
      [user.facilityId],
    );
    const capacity = await this.db.query(
      `SELECT DISTINCT ON (ward_type) ward_type, beds_total, beds_free, reported_at
         FROM facility_capacity WHERE facility_id = $1
        ORDER BY ward_type, reported_at DESC`,
      [user.facilityId],
    );
    return {
      scope: 'facility_operations',
      viewer: { name: user.fullName, role: user.role, facilityName: user.facilityName },
      queue: {
        inboundAwaitingDecision: core.inbound_awaiting_decision,
        inboundEscalated: core.inbound_escalated,
        acceptedAwaitingArrival: core.accepted_awaiting_arrival,
        inTransit: core.in_transit,
        outcomesDue: core.outcomes_due,
        bedsReserved: core.beds_reserved,
        outboundAwaiting: core.outbound_awaiting,
        outboundToAcknowledge: core.outbound_to_acknowledge,
      },
      capacity,
    };
  }
}

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(
    private svc: AnalyticsService,
    private scoped: ScopedAnalyticsService,
    private db: Db,
  ) {}

  private static OVERSIGHT = ['woreda', 'region', 'moh', 'sysadmin'];

  @Get('facility/:id')
  facility(@Param('id') id: string, @Query() q: any, @User() u: CurrentUser) {
    const own = u.facilityId === id;
    if (!AnalyticsController.OVERSIGHT.includes(u.role) && !(own && ['it_admin', 'facility_admin'].includes(u.role))) {
      throw new ForbiddenException('Detailed facility analytics are limited to oversight and the facility\'s own IT administration');
    }
    return this.svc.metrics({ facilityId: id, ...q });
  }

  /** One endpoint, a different depth of view per role. */
  @Get('overview')
  async overview(@Query() q: any, @User() u: CurrentUser) {
    if (AnalyticsController.OVERSIGHT.includes(u.role)) {
      // Network flow for health bureaus — no patient feedback here.
      const m = await this.svc.metrics(q);
      return { scope: 'network_flow', ...m, overrideInsights: await this.overrideInsights(null) };
    }
    if (u.role === 'it_admin') {
      // Full detail — but strictly the IT administrator's OWN facility.
      const m = await this.svc.metrics({ facilityId: u.facilityId });
      return {
        scope: 'it_facility_detail',
        facilityName: u.facilityName,
        ...m,
        overrideInsights: await this.overrideInsights(u.facilityId),
      };
    }
    if (['liaison', 'triage', 'facility_admin'].includes(u.role)) return this.scoped.facilityOps(u);
    if (['doctor', 'clinician', 'specialist', 'hew'].includes(u.role)) return this.scoped.mine(u);
    throw new ForbiddenException(`Role '${u.role}' has no analytics view`);
  }

  /** BR-13 data put to work: aggregated routing-override reasons. */
  private async overrideInsights(facilityId: string | null) {
    const rows = await this.db.query(
      `SELECT override_reason, count(*)::int AS n
         FROM referral
        WHERE override_reason IS NOT NULL AND is_test_data = FALSE
          AND ($1::uuid IS NULL OR origin_facility_id = $1 OR target_facility_id = $1)
        GROUP BY override_reason ORDER BY n DESC`,
      [facilityId],
    );
    const [ranked] = await this.db.query(
      `SELECT count(*) FILTER (WHERE suggestion_rank_of_chosen IS NOT NULL)::int AS with_suggestion,
              count(*) FILTER (WHERE override_reason IS NOT NULL)::int AS overridden
         FROM referral
        WHERE is_test_data = FALSE
          AND ($1::uuid IS NULL OR origin_facility_id = $1 OR target_facility_id = $1)`,
      [facilityId],
    );
    return {
      totalWithSuggestion: ranked.with_suggestion,
      overridden: ranked.overridden,
      overrideRatePct: ranked.with_suggestion > 0
        ? Math.round((ranked.overridden / ranked.with_suggestion) * 1000) / 10 : null,
      reasons: rows,
    };
  }
}

/* ======================================================================== SYNC */
@Injectable()
export class SyncService {
  constructor(private db: Db) {}

  /** §12.4: change-log pull scoped to the device's facility. */
  async pull(deviceId: string, cursor: number, user: CurrentUser) {
    const rows = await this.db.query(
      `SELECT cursor, entity_type, entity_id, op, payload, created_at
         FROM change_log
        WHERE cursor > $1 AND ($2::uuid = ANY(facility_scope))
        ORDER BY cursor ASC LIMIT 500`,
      [cursor, user.facilityId],
    );
    const next = rows.length ? Number(rows[rows.length - 1].cursor) : cursor;
    await this.db.query(
      `INSERT INTO sync_cursor (device_id, user_id, facility_id, last_cursor, last_seen_at)
       VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (device_id) DO UPDATE SET last_cursor = EXCLUDED.last_cursor, last_seen_at = now()`,
      [deviceId, user.id, user.facilityId, next],
    );
    return { cursor: next, changes: rows, hasMore: rows.length === 500 };
  }
}

@Controller('v1/sync')
export class SyncController {
  constructor(private svc: SyncService) {}

  @Post('pull')
  pull(@Body() b: { deviceId: string; cursor?: number }, @User() u: CurrentUser) {
    return this.svc.pull(b.deviceId || randomUUID(), b.cursor ?? 0, u);
  }
}

/* ======================================================================= AUDIT */
@Controller('v1/audit')
export class AuditController {
  constructor(private db: Db, private audit: Audit) {}

  @Get('verify-chain')
  @Roles('sysadmin', 'facility_admin', 'woreda')
  verify() { return this.audit.verifyChain(); }

  @Get('referral/:id')
  @Roles('sysadmin', 'facility_admin', 'woreda')
  forReferral(@Param('id') id: string) {
    return this.db.query(
      `SELECT occurred_at, actor_user_id, action, resource_type, purpose, detail
         FROM audit_log WHERE resource_id = $1 ORDER BY occurred_at ASC`,
      [id],
    );
  }
}

@Module({
  providers: [FacilityService, PatientService, AnalyticsService, ScopedAnalyticsService, SyncService],
  controllers: [
    FacilityController, PatientController, AnalyticsController,
    SyncController, AuditController,
  ],
  exports: [FacilityService, PatientService],
})
export class FeatureModule {}
