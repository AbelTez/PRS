import { Controller, Post, Module } from '@nestjs/common';
import { Roles } from './auth/auth.module';
import { ReferralScheduler } from './referral/scheduler';

/**
 * Dev/ops utility: run the background clocks on demand instead of waiting
 * for the cron tick. Used by the e2e test suite and by pilot support staff.
 */
@Controller('v1/admin')
export class AdminController {
  constructor(private scheduler: ReferralScheduler) {}

  @Post('run-schedulers')
  @Roles('sysadmin')
  async run() {
    await this.scheduler.slaBreaches();
    await this.scheduler.reservationLapses();
    await this.scheduler.arrivalGrace();
    await this.scheduler.lostToFollowUp();
    return { ok: true, ran: ['sla_breach', 'reservation_lapse', 'arrival_grace', 'lost_to_followup'] };
  }
}
