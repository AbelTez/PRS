import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './common/core.module';
import { AuthModule, AuthGuard } from './auth/auth.module';
import { RoutingModule } from './routing/routing.module';
import { ReferralModule } from './referral/referral.module';
import { FeatureModule } from './modules';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CoreModule,
    AuthModule,
    RoutingModule,
    ReferralModule,
    FeatureModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
