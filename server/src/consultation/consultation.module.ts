import { Module, Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { Roles, User, CurrentUser } from '../auth/auth.module';
import { ReferralModule } from '../referral/referral.module';
import { ConsultationService } from './consultation.service';

@Controller('v1/consultations')
@Roles('doctor', 'clinician', 'specialist')
export class ConsultationController {
  constructor(private svc: ConsultationService) {}
  @Get('facilities') facilities(@User() u: CurrentUser) { return this.svc.facilities(u); }
  @Get('specialties') specialties(@User() u: CurrentUser, @Query('facilityId') id: string) { return this.svc.specialties(u, id); }
  @Get('doctors') doctors(@User() u: CurrentUser, @Query('search') q: string, @Query('facilityId') id: string, @Query('specialty') specialty: string) { return this.svc.doctors(u, q, id, specialty); }
  @Get('patients') patients(@User() u: CurrentUser, @Query('search') q: string) { return this.svc.patients(u, q); }
  @Get('inbox') inbox(@User() u: CurrentUser) { return this.svc.inbox(u); }
  @Get() list(@User() u: CurrentUser, @Query() q: any) { return this.svc.list(u, q); }
  @Post() create(@User() u: CurrentUser, @Body() b: any) { return this.svc.create(u, b); }
  @Get(':id') detail(@User() u: CurrentUser, @Param('id') id: string) { return this.svc.detail(u, id); }
  @Get(':id/referral-context') referralContext(@User() u: CurrentUser, @Param('id') id: string) { return this.svc.referralContext(u, id); }
  @Post(':id/read') read(@User() u: CurrentUser, @Param('id') id: string, @Body() b: any) { return this.svc.read(u, id, b?.through); }
  @Post(':id/actions') action(@User() u: CurrentUser, @Param('id') id: string, @Body() b: any) { return this.svc.action(u, id, b); }
  @Get(':id/messages') messages(@User() u: CurrentUser, @Param('id') id: string, @Query('after') after: string) { return this.svc.messages(u, id, after); }
  @Post(':id/messages') message(@User() u: CurrentUser, @Param('id') id: string, @Body() b: any) { return this.svc.message(u, id, b); }
  @Post(':id/attachments') attach(@User() u: CurrentUser, @Param('id') id: string, @Body() b: any) { return this.svc.attach(u, id, b); }
  @Get(':id/attachments/:aid') async download(@User() u: CurrentUser, @Param('id') id: string, @Param('aid') aid: string, @Res() res: any) {
    const a = await this.svc.download(u, id, aid);
    res.setHeader('Content-Type', a.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(a.file_name)}`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(a.content);
  }
  @Post(':id/calls') startCall(@User() u: CurrentUser, @Param('id') id: string, @Body() b: any) { return this.svc.startCall(u, id, b); }
  @Post(':id/calls/:cid/actions') callAction(@User() u: CurrentUser, @Param('id') id: string, @Param('cid') cid: string, @Body() b: any) { return this.svc.callAction(u, id, cid, b); }
  @Get(':id/calls/:cid/signals') signals(@User() u: CurrentUser, @Param('id') id: string, @Param('cid') cid: string, @Query('after') after: string) { return this.svc.signals(u, id, cid, after); }
  @Post(':id/calls/:cid/signals') signal(@User() u: CurrentUser, @Param('id') id: string, @Param('cid') cid: string, @Body() b: any) { return this.svc.signal(u, id, cid, b); }
}

@Module({ imports: [ReferralModule], controllers: [ConsultationController], providers: [ConsultationService] })
export class ConsultationModule {}
