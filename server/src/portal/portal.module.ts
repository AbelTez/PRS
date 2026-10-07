import {
  Module, Injectable, Controller, Get, Post, Body,
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { Db, Audit } from '../common/core.module';
import { User, CurrentUser, Roles, Public } from '../auth/auth.module';
import { ReferralService } from '../referral/referral.service';
import { ReferralModule } from '../referral/referral.module';

/**
 * Patient portal.
 *
 * Two entry points:
 *  - authenticated patient accounts (GET /v1/portal/me) — every referral of
 *    the linked patient, patient-safe view (no clinical chart);
 *  - a public tracker (POST /v1/portal/lookup) — referral code + the phone
 *    number on the patient record. Deliberately requires BOTH factors and
 *    returns the same patient-safe view.
 */

@Injectable()
export class PortalService {
  constructor(private db: Db, private audit: Audit, private referrals: ReferralService) {}

  async me(user: CurrentUser) {
    if (user.role !== 'patient' || !user.patientId) {
      throw new ForbiddenException('The patient portal is for patient accounts');
    }
    const patient = await this.db.one(`SELECT * FROM patient WHERE id = $1`, [user.patientId]);
    const rows = await this.db.query(
      `SELECT id FROM referral WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.patientId],
    );
    const referrals = [];
    for (const r of rows) referrals.push(await this.referrals.patientView(r.id, user.patientId));
    return {
      patient: patient ? {
        id: patient.id,
        name: [patient.given_name_lat, patient.fathers_name_lat].filter(Boolean).join(' '),
        nameAm: patient.given_name_am,
      } : null,
      referrals,
    };
  }

  /** Public tracker: referral code + matching phone (both factors required). */
  async lookup(body: { code?: string; phone?: string }) {
    const code = (body?.code || '').trim().toUpperCase();
    const phoneDigits = (body?.phone || '').replace(/\D/g, '');
    if (!code || phoneDigits.length < 6) {
      throw new BadRequestException('Referral code and the phone number on the referral are required');
    }
    const r = await this.db.one(
      `SELECT r.id, r.patient_id, convert_from(p.phone_primary_enc, 'UTF8') AS phone
         FROM referral r JOIN patient p ON p.id = r.patient_id
        WHERE r.referral_code = $1`,
      [code],
    );
    if (!r) throw new NotFoundException('No referral found with that code');
    const onFile = (r.phone || '').replace(/\D/g, '');
    // Compare the tail so +251 91..., 091... and 91... all match the same SIM.
    if (!onFile || onFile.slice(-9) !== phoneDigits.slice(-9)) {
      throw new ForbiddenException('The phone number does not match the one on the referral');
    }
    await this.audit.record({
      actorUserId: null, action: 'portal_lookup', resourceType: 'referral', resourceId: r.id,
      purpose: 'patient_self_service',
    });
    return this.referrals.patientView(r.id, r.patient_id);
  }
}

@Controller('v1/portal')
export class PortalController {
  constructor(private svc: PortalService) {}

  @Get('me')
  @Roles('patient')
  me(@User() u: CurrentUser) { return this.svc.me(u); }

  @Public()
  @Post('lookup')
  lookup(@Body() b: any) { return this.svc.lookup(b); }
}

@Module({
  imports: [ReferralModule],
  providers: [PortalService],
  controllers: [PortalController],
})
export class PortalModule {}
