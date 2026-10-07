import { Module, Controller, Get, Post, Body } from '@nestjs/common';
import { User, CurrentUser } from '../auth/auth.module';
import { AiService } from './ai.service';
import { GeminiClient } from './gemini.client';
import { RoutingModule } from '../routing/routing.module';

/**
 * /v1/ai — lightweight AI assistant (demo). Role checks, rate limiting and
 * the AI_ENABLED switch live in AiService so every endpoint shares them.
 */
@Controller('v1/ai')
export class AiController {
  constructor(private svc: AiService) {}

  @Get('status') status(@User() u: CurrentUser) { return this.svc.status(u); }
  @Post('case-assist') caseAssist(@User() u: CurrentUser, @Body() b: any) { return this.svc.caseAssist(u, b); }
  @Post('match-facility') matchFacility(@User() u: CurrentUser, @Body() b: any) { return this.svc.matchFacility(u, b); }
  @Post('match-colleague') matchColleague(@User() u: CurrentUser, @Body() b: any) { return this.svc.matchColleague(u, b); }
  @Post('draft') draft(@User() u: CurrentUser, @Body() b: any) { return this.svc.draft(u, b); }
  @Post('chat') chat(@User() u: CurrentUser, @Body() b: any) { return this.svc.chat(u, b); }
}

@Module({
  imports: [RoutingModule],
  controllers: [AiController],
  providers: [AiService, GeminiClient],
})
export class AiModule {}
