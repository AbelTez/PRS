import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Db, ConfigStore } from '../common/core.module';
import { CurrentUser } from '../auth/auth.module';
import { ReferralService } from './referral.service';

/* ------------------------------------------------------------- SCHEDULER */
/**
 * Background clocks: SLA breach (BR-21), bed reservation lapse (BR-26),
 * arrival grace expiry (BR-32), lost-to-follow-up (BR-35).
 * In production these become BullMQ jobs; an interval is sufficient at pilot scale.
 */
@Injectable()
export class ReferralScheduler {
  private readonly log = new Logger('ReferralScheduler');
  private readonly systemUser: CurrentUser = {
    id: '00000000-0000-0000-0000-000000000000',
    username: 'system', fullName: 'System', role: 'sysadmin', facilityId: null as any,
  };

  constructor(private db: Db, private cfg: ConfigStore, private svc: ReferralService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (process.env.DISABLE_SCHEDULER === 'true') return;
    await this.slaBreaches();
    await this.reservationLapses();
    await this.arrivalGrace();
    await this.lostToFollowUp();
  }

  /** BR-21: escalate on SLA breach. */
  async slaBreaches() {
    const rows = await this.db.query(
      `SELECT id FROM referral
        WHERE status IN ('SUBMITTED') AND sla_breached = FALSE
          AND sla_deadline_at IS NOT NULL AND sla_deadline_at < now()`,
    );
    for (const r of rows) {
      try { await this.svc.transition(r.id, 'sla_breach', this.systemUser); }
      catch (e: any) { this.log.warn(`SLA breach ${r.id}: ${e.message}`); }
    }
    if (rows.length) this.log.log(`Escalated ${rows.length} SLA breach(es)`);
  }

  /** BR-26: bed reservation lapses. */
  async reservationLapses() {
    const rows = await this.db.query(
      `SELECT id FROM referral
        WHERE status = 'ACCEPTED' AND bed_reserved = TRUE
          AND bed_reservation_expires_at < now()`,
    );
    for (const r of rows) {
      try { await this.svc.transition(r.id, 'reservation_lapse', this.systemUser); }
      catch (e: any) { this.log.warn(`Reservation lapse ${r.id}: ${e.message}`); }
    }
  }

  /** BR-32: not arrived within grace -> NOT_ARRIVED + follow-up task at origin. */
  async arrivalGrace() {
    const rows = await this.db.query(
      `SELECT id FROM referral
        WHERE status = 'IN_TRANSIT'
          AND expected_arrival_at IS NOT NULL AND expected_arrival_at < now()`,
    );
    for (const r of rows) {
      try { await this.svc.transition(r.id, 'grace_expiry', this.systemUser); }
      catch (e: any) { this.log.warn(`Grace expiry ${r.id}: ${e.message}`); }
    }
  }

  /** BR-35: 30 days in NOT_ARRIVED -> lost to follow-up (counts AGAINST loop closure). */
  async lostToFollowUp() {
    const days = await this.cfg.get<number>('lost_to_followup_days', 30);
    const rows = await this.db.query(
      `SELECT id FROM referral
        WHERE status = 'NOT_ARRIVED'
          AND updated_at < now() - ($1 || ' days')::interval`,
      [String(days)],
    );
    for (const r of rows) {
      try { await this.svc.transition(r.id, 'lost_timeout', this.systemUser); }
      catch (e: any) { this.log.warn(`Lost timeout ${r.id}: ${e.message}`); }
    }
  }
}

