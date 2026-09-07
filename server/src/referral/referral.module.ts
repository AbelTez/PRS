import {
  Module, Controller, Get, Post, Put, Body, Param, Query, Injectable, Logger,
} from '@nestjs/common';
import { ReferralService, CreateReferralDto } from './referral.service';
import { Db, ConfigStore } from '../common/core.module';
import { User, CurrentUser, Public, Roles } from '../auth/auth.module';
import { RoutingModule } from '../routing/routing.module';
import { AdminController } from '../admin.controller';
import { ReferralScheduler } from './scheduler';
import { SchedulerTickInterceptor } from './scheduler-tick.interceptor';
import { AttachmentsController, AttachmentsService } from './attachments.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DECLINE_REASONS, OVERRIDE_REASONS, TIER_SKIP_REASONS, DISPOSITIONS, TRANSPORT_MODES, STATES } from './state-machine';

/* ------------------------------------------------------------ CONTROLLER */
@Controller('v1/referrals')
export class ReferralController {
  constructor(private svc: ReferralService) {}

  @Get('vocabulary')
  vocabulary() {
    return {
      states: STATES,
      declineReasons: DECLINE_REASONS,
      overrideReasons: OVERRIDE_REASONS,
      tierSkipReasons: TIER_SKIP_REASONS,
      dispositions: DISPOSITIONS,
      transportModes: TRANSPORT_MODES,
    };
  }

  @Get()
  list(@User() user: CurrentUser, @Query() q: any) {
    return this.svc.list(user, q);
  }

  @Post()
  create(@Body() dto: CreateReferralDto, @User() user: CurrentUser) {
    return this.svc.create(dto, user);
  }

  @Get('code/:code')
  byCode(@Param('code') code: string, @User() user: CurrentUser) {
    return this.svc.byCode(code, user);
  }

  @Get(':id')
  get(@Param('id') id: string, @User() user: CurrentUser) {
    return this.svc.get(id, user);
  }

  @Get(':id/chain')
  chain(@Param('id') id: string, @User() user: CurrentUser) {
    return this.svc.chain(id, user);
  }

  /* ---- explicit lifecycle endpoints (Appendix B) */
  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'submit', u, b);
  }
  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'acknowledge', u, b);
  }
  @Post(':id/accept')
  accept(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'accept', u, b);
  }
  @Post(':id/decline')
  decline(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'decline', u, b);
  }
  @Post(':id/redirect')
  redirect(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'redirect', u, b);
  }
  @Post(':id/request-info')
  requestInfo(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'request_info', u, b);
  }
  @Post(':id/supply-info')
  supplyInfo(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'supply_info', u, b);
  }
  @Post(':id/reroute')
  reroute(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'reroute', u, b);
  }
  @Post(':id/depart')
  depart(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'depart', u, b);
  }
  @Post(':id/arrive')
  arrive(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'arrive', u, b);
  }
  @Post(':id/start-care')
  startCare(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'start_care', u, b);
  }
  @Post(':id/outcome')
  outcome(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'submit_outcome', u, b);
  }
  @Post(':id/acknowledge-outcome')
  ackOutcome(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'acknowledge_outcome', u, b);
  }
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'cancel', u, b);
  }
  @Post(':id/close-declined')
  closeDeclined(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'close_declined_all', u, b);
  }
  @Post(':id/record-death')
  recordDeath(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.transition(id, 'record_death', u, b);
  }
}

/* ---------------------------------------------------------- CBHI TOKENS */
@Controller('v1/tokens')
export class TokenController {
  constructor(private svc: ReferralService) {}

  /** BR-61/BR-64: validity only. Never clinical content. */
  @Post('verify')
  @Roles('cbhi', 'sysadmin', 'liaison', 'facility_admin')
  verify(@Body() b: { token: string }) {
    return this.svc.verifyToken(b?.token || '');
  }
}

@Module({
  imports: [RoutingModule],
  providers: [
    ReferralService,
    ReferralScheduler,
    AttachmentsService,
    // Global: keeps the referral clocks running where cron cannot (serverless).
    { provide: APP_INTERCEPTOR, useClass: SchedulerTickInterceptor },
  ],
  controllers: [ReferralController, TokenController, AdminController, AttachmentsController],
  exports: [ReferralService],
})
export class ReferralModule {}
