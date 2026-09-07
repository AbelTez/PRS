import { Module, Injectable, Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Db, ConfigStore } from '../common/core.module';
import { User, CurrentUser } from '../auth/auth.module';

export interface SuggestRequest {
  reasonCode: string;
  urgency?: 'emergency' | 'urgent' | 'routine';
  originFacilityId?: string;
  requiredCapabilities?: string[];
  wardType?: string;
  limit?: number;
}

export interface FacilityCandidate {
  facilityId: string;
  mfrId: string;
  name: string;
  nameAm?: string;
  facilityType: string;
  tier: number;
  distanceKm: number;
  estimatedTravelMinutes: number;
  bedsFree: number | null;
  bedsReportedAt: string | null;
  bedsStale: boolean;
  acceptanceRate: number;
  queueDepth: number;
  score: number;
  eligible: boolean;
  /** BR-15 / §14.3: why this facility cannot take the patient. */
  missingCapabilities: { code: string; name: string; status: string; note?: string }[];
  staleCapabilities: string[];
  phone?: string;
  is24h: boolean;
  hasAmbulance: boolean;
}

@Injectable()
export class RoutingService {
  constructor(private db: Db, private cfg: ConfigStore) {}

  /**
   * BR-10..BR-15. Returns eligible candidates ranked by the composite score,
   * PLUS ineligible facilities with explicit exclusion reasons — the clinician
   * must see "closer but no anaesthetist", not an unexplained absence.
   */
  async suggest(req: SuggestRequest): Promise<{
    reasonCode: string;
    urgency: string;
    minTargetTier: number;
    requiredCapabilities: string[];
    stabilisationItems: string[];
    candidates: FacilityCandidate[];
    excluded: FacilityCandidate[];
  }> {
    const reason = await this.db.one(
      `SELECT * FROM reason_code WHERE code = $1`, [req.reasonCode],
    );
    if (!reason) throw new BadRequestException(`Unknown reason_code '${req.reasonCode}'`);

    const urgency = req.urgency || reason.default_urgency;
    const required: string[] =
      req.requiredCapabilities?.length ? req.requiredCapabilities : reason.required_capabilities;

    const origin = req.originFacilityId
      ? await this.db.one(`SELECT * FROM facility WHERE id = $1`, [req.originFacilityId])
      : null;

    const staleDays = await this.cfg.get<number>('capability_stale_days', 30);
    const staleHours = await this.cfg.get<number>('capacity_stale_hours', 8);
    const w = await this.cfg.get<any>('routing_weights', {
      distance: 0.35, acceptance: 0.25, beds: 0.25, queue: 0.15,
    });

    // BR-04: emergencies ignore the minimum-tier floor and go to nearest capable.
    const minTier = urgency === 'emergency' ? 2 : reason.min_target_tier;

    const rows = await this.db.query(
      `
      WITH target AS (
        SELECT f.*,
          CASE WHEN $2::numeric IS NULL OR f.latitude IS NULL THEN NULL ELSE
            6371 * 2 * asin(sqrt(
              power(sin(radians(f.latitude - $2::numeric) / 2), 2) +
              cos(radians($2::numeric)) * cos(radians(f.latitude)) *
              power(sin(radians(f.longitude - $3::numeric) / 2), 2)
            ))
          END AS distance_km
        FROM facility f
        WHERE f.status = 'active'
          AND f.tier >= $1
          AND ($4::uuid IS NULL OR f.id <> $4::uuid)
      ),
      caps AS (
        SELECT t.id AS facility_id,
          COALESCE(json_agg(json_build_object(
            'code', c.code, 'name', c.name_lat,
            'status', COALESCE(fc.status, 'unknown'),
            'note', fc.blocking_note,
            'stale', (fc.verified_at IS NULL OR fc.verified_at < now() - ($5 || ' days')::interval)
          )) FILTER (WHERE c.code IS NOT NULL), '[]'::json) AS cap_detail
        FROM target t
        LEFT JOIN capability c ON c.code = ANY($6::text[])
        LEFT JOIN facility_capability fc
               ON fc.facility_id = t.id AND fc.capability_code = c.code
        GROUP BY t.id
      ),
      beds AS (
        SELECT DISTINCT ON (facility_id) facility_id, beds_free, reported_at
        FROM facility_capacity
        WHERE ward_type = COALESCE($7, 'general')
        ORDER BY facility_id, reported_at DESC
      ),
      queue AS (
        SELECT target_facility_id AS facility_id, count(*)::int AS depth
        FROM referral
        WHERE status IN ('SUBMITTED','ESCALATED','ACKNOWLEDGED') AND is_test_data = FALSE
        GROUP BY target_facility_id
      )
      SELECT t.id, t.mfr_id, t.name_lat, t.name_am, t.facility_type, t.tier,
             t.phone, t.is_24h, t.has_ambulance, t.distance_km,
             caps.cap_detail,
             b.beds_free, b.reported_at AS beds_reported_at,
             (b.reported_at IS NULL OR b.reported_at < now() - ($8 || ' hours')::interval) AS beds_stale,
             COALESCE(s.acceptance_rate, 0.5) AS acceptance_rate,
             COALESCE(q.depth, 0) AS queue_depth
      FROM target t
      JOIN caps ON caps.facility_id = t.id
      LEFT JOIN beds b ON b.facility_id = t.id
      LEFT JOIN queue q ON q.facility_id = t.id
      LEFT JOIN facility_acceptance_stats s ON s.facility_id = t.id
      ORDER BY t.distance_km NULLS LAST
      `,
      [
        minTier,
        origin?.latitude ?? null,
        origin?.longitude ?? null,
        req.originFacilityId ?? null,
        String(staleDays),
        required,
        req.wardType ?? null,
        String(staleHours),
      ],
    );

    const all: FacilityCandidate[] = rows.map((r) => {
      const capDetail: any[] = r.cap_detail || [];
      const missing = capDetail.filter((c) => c.status !== 'available');
      const stale = capDetail.filter((c) => c.status === 'available' && c.stale).map((c) => c.code);
      const distanceKm = r.distance_km !== null ? Number(r.distance_km) : 0;
      const bedsFree = r.beds_free !== null ? Number(r.beds_free) : null;
      const acceptance = Number(r.acceptance_rate);
      const queueDepth = Number(r.queue_depth);

      // BR-12 composite score
      const score =
        w.distance * (1 / (1 + distanceKm / 25)) +
        w.acceptance * acceptance +
        w.beds * Math.min((bedsFree ?? 0) / 5, 1) -
        w.queue * Math.min(queueDepth / 10, 1);

      return {
        facilityId: r.id,
        mfrId: r.mfr_id,
        name: r.name_lat,
        nameAm: r.name_am,
        facilityType: r.facility_type,
        tier: r.tier,
        distanceKm: Math.round(distanceKm * 10) / 10,
        // ~35 km/h effective average on rural Ethiopian roads
        estimatedTravelMinutes: Math.round((distanceKm / 35) * 60),
        bedsFree,
        bedsReportedAt: r.beds_reported_at,
        bedsStale: r.beds_stale,
        acceptanceRate: Math.round(acceptance * 100) / 100,
        queueDepth,
        score: Math.round(score * 1000) / 1000,
        eligible: missing.length === 0,
        missingCapabilities: missing.map((m) => ({
          code: m.code, name: m.name, status: m.status, note: m.note,
        })),
        staleCapabilities: stale,
      } as FacilityCandidate;
    }).map((c, i) => ({ ...c, phone: rows[i].phone, is24h: rows[i].is_24h, hasAmbulance: rows[i].has_ambulance }));

    const eligible = all.filter((c) => c.eligible).sort((a, b) => b.score - a.score);
    const excluded = all.filter((c) => !c.eligible).sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      reasonCode: reason.code,
      urgency,
      minTargetTier: minTier,
      requiredCapabilities: required,
      stabilisationItems: reason.stabilisation_items,
      candidates: eligible.slice(0, req.limit ?? 5),
      // BR-15: if nothing matched fully, surface the best partial matches
      excluded: excluded.slice(0, 5),
    };
  }
}

@Controller('v1/routing')
export class RoutingController {
  constructor(private svc: RoutingService) {}

  @Post('suggest')
  suggest(@Body() body: SuggestRequest, @User() user: CurrentUser) {
    return this.svc.suggest({ ...body, originFacilityId: body.originFacilityId || user.facilityId });
  }
}

@Module({
  providers: [RoutingService],
  controllers: [RoutingController],
  exports: [RoutingService],
})
export class RoutingModule {}
