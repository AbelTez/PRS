import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './common/core.module';
import { AuthModule, AuthGuard } from './auth/auth.module';
import { RoutingModule } from './routing/routing.module';
import { ReferralModule } from './referral/referral.module';
import { FeatureModule } from './modules';
import { UsersModule } from './users/users.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    // Cron needs a long-lived process. On serverless the clocks are driven by
    // traffic instead (SchedulerTickInterceptor), so the timers are left off.
    ...(process.env.VERCEL ? [] : [ScheduleModule.forRoot()]),
    CoreModule,
    AuthModule,
    RoutingModule,
    ReferralModule,
    FeatureModule,
    UsersModule,
    FeedbackModule,
    PortalModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
