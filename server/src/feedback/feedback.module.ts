import {
  Module, Injectable, Controller, Get, Post, Body,
  BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { Db, Audit } from '../common/core.module';
import { User, CurrentUser, Roles } from '../auth/auth.module';

/**
 * Patient feedback on referrals.
 *
 * Collection: only the patient the referral belongs to can rate, one rating
 * for the referring facility and one for the receiving facility, once the
 * patient has actually been received (or the referral is closed).
 *
 * Visibility (deliberately narrow until dedicated quality roles exist):
 *  - the patient sees their own ratings;
 *  - the facility's IT administrator sees feedback about THEIR facility only,
 *    linked to the referral, the doctor who ordered it and the from/to
 *    hospitals — so the hospital can act on it;
 *  - nobody else (doctors, liaisons, other hospitals, oversight) sees feedback.
 */

@Injectable()
export class FeedbackService {
  constructor(private db: Db, private audit: Audit) {}

  async submit(body: any, user: CurrentUser) {
    if (user.role !== 'patient') {
      throw new ForbiddenException('Only patients can rate their referral experience');
    }
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [body?.referralId]);
    if (!r) throw new NotFoundException('Referral not found');
    if (r.patient_id !== user.patientId) throw new ForbiddenException('Not your referral');
    const terminal = String(r.status).startsWith('CLOSED_');
    if (!r.arrived_at && !terminal) {
      throw new BadRequestException('You can rate after you have been received, or once the referral is closed');
    }

    const ratings: any[] = Array.isArray(body.ratings) ? body.ratings : [];
    if (!ratings.length) throw new BadRequestException('ratings[] is required');
    const saved = [];
    for (const item of ratings) {
      if (!['origin', 'target'].includes(item.facilityRole)) {
        throw new BadRequestException("facilityRole must be 'origin' or 'target'");
      }
      const rating = Number(item.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be 1–5 stars');
      }
      const facilityId = item.facilityRole === 'origin' ? r.origin_facility_id : r.target_facility_id;
      const row = await this.db.one(
        `INSERT INTO referral_feedback (referral_id, patient_id, facility_id, facility_role, rating, comment)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (referral_id, facility_role)
         DO UPDATE SET rating = EXCLUDED.rating,
                       comment = COALESCE(EXCLUDED.comment, referral_feedback.comment),
                       updated_at = now()
         RETURNING *`,
        [r.id, user.patientId, facilityId, item.facilityRole, rating, item.comment ?? null],
      );
      saved.push(row);
    }
    await this.audit.record({
      actorUserId: user.id, action: 'feedback_submit', resourceType: 'referral', resourceId: r.id,
      detail: { count: saved.length },
    });
    return { ok: true, feedback: saved };
  }

  /**
   * IT administrator's view: feedback about their OWN facility, with the
   * linkage that makes it actionable — the referral, the clinician who
   * ordered it (name + license) and which hospital referred to which.
   */
  async forMyFacility(user: CurrentUser) {
    if (!user.facilityId) throw new ForbiddenException('No facility on your account');
    const items = await this.db.query(
      `SELECT fb.id, fb.rating, fb.comment, fb.facility_role, fb.created_at,
              r.referral_code, r.reason_code, r.urgency, r.status AS referral_status,
              r.origin_facility_name, r.target_facility_name,
              r.referring_user_name,
              ru.license_number AS referring_user_license, ru.role AS referring_user_role,
              (p.given_name_lat || ' ' || COALESCE(p.fathers_name_lat, '')) AS patient_name
         FROM referral_feedback fb
         JOIN referral r  ON r.id = fb.referral_id
         LEFT JOIN app_user ru ON ru.id = r.referring_user_id
         LEFT JOIN patient p   ON p.id = fb.patient_id
        WHERE fb.facility_id = $1
        ORDER BY fb.created_at DESC
        LIMIT 200`,
      [user.facilityId],
    );
    const stats = await this.db.one(
      `SELECT round(avg(rating)::numeric, 1) AS avg, count(*)::int AS count,
              count(*) FILTER (WHERE rating <= 2)::int AS low_ratings
         FROM referral_feedback WHERE facility_id = $1`,
      [user.facilityId],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'feedback_read', resourceType: 'facility', resourceId: user.facilityId,
      purpose: 'quality_improvement',
    });
    return {
      facilityId: user.facilityId,
      avgRating: stats?.avg !== null && stats?.avg !== undefined ? Number(stats.avg) : null,
      count: stats?.count ?? 0,
      lowRatings: stats?.low_ratings ?? 0,
      items: items.map((i) => ({
        id: i.id, rating: i.rating, comment: i.comment,
        facilityRole: i.facility_role, createdAt: i.created_at,
        referralCode: i.referral_code, reasonCode: i.reason_code,
        urgency: i.urgency, referralStatus: i.referral_status,
        fromFacility: i.origin_facility_name, toFacility: i.target_facility_name,
        referringDoctor: i.referring_user_name,
        referringDoctorLicense: i.referring_user_license,
        referringDoctorRole: i.referring_user_role,
        patientName: (i.patient_name || '').trim() || null,
      })),
    };
  }
}

@Controller('v1/feedback')
export class FeedbackController {
  constructor(private svc: FeedbackService) {}

  @Post()
  @Roles('patient')
  submit(@Body() b: any, @User() u: CurrentUser) { return this.svc.submit(b, u); }

  /** IT-only, own facility only — the narrow visibility rule, on purpose. */
  @Get('my-facility')
  @Roles('it_admin', 'sysadmin')
  mine(@User() u: CurrentUser) { return this.svc.forMyFacility(u); }
}

@Module({
  providers: [FeedbackService],
  controllers: [FeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}
