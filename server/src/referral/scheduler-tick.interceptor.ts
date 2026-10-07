import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ReferralScheduler } from './scheduler';

/**
 * Drives the referral clocks (SLA breach, reservation lapse, arrival grace,
 * lost-to-follow-up) from incoming traffic.
 *
 * On a long-running server the @Cron in ReferralScheduler does this every
 * minute and this interceptor is a cheap no-op. On serverless there is no
 * process between requests, so requests are the only reliable clock — which is
 * also semantically right: a breach matters at the moment someone reads the
 * data. `tickIfDue` self-throttles, so all but roughly one request per interval
 * pays nothing.
 */
@Injectable()
export class SchedulerTickInterceptor implements NestInterceptor {
  constructor(private scheduler: ReferralScheduler) {}

  async intercept(_ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    await this.scheduler.tickIfDue();
    return next.handle();
  }
}
