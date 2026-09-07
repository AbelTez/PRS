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
    ScheduleModule.forRoot(),
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
