import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor, LEAD_ASSIGN_ACCESS, LEAD_DELETE_ACCESS, LEAD_MODULE_ROLES, LEAD_CLOSE_REQUEST_ACCESS } from '../common/access';

function detectDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s)) return 'tablet';
  if (/mobi|android|iphone/.test(s)) return 'mobile';
  return 'desktop';
}

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** PUBLIC + rate limited. Landing pages / ads / WhatsApp post here. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('capture')
  capture(@Body() dto: CaptureLeadDto, @Req() req: any) {
    const userAgent: string = req.headers['user-agent'] ?? '';
    const forwarded: string = req.headers['x-forwarded-for'] ?? '';
    const ipAddress =
      (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
      req.ip ||
      undefined;

    return this.leads.capture(dto, {
      ipAddress,
      userAgent,
      device: detectDevice(userAgent),
    });
  }

  /**
   * Manual add by a logged-in operator (phone-in, walk-in).
   * Same dedupe + scoring path as public capture, but auto-assigns to caller.
   */
  @Roles(...LEAD_MODULE_ROLES)
  @Post()
  manualCreate(@Body() dto: CaptureLeadDto, @CurrentUser() actor: Actor) {
    return this.leads.manualCreate(dto, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Get()
  findAll(@Query() q: QueryLeadsDto, @CurrentUser() actor: Actor) {
    return this.leads.findAll(q, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Get('stats')
  stats(@CurrentUser() actor: Actor) {
    return this.leads.stats(actor);
  }

  /** Operational tiles for the desk. Scoped per role like `stats`. */
  @Roles(...LEAD_MODULE_ROLES)
  @Get('stats/ops')
  opsStats(@CurrentUser() actor: Actor) {
    return this.leads.opsStats(actor);
  }

  /** Overdue + due-today + upcoming-this-week worklist for /follow-ups. */
  @Roles(...LEAD_MODULE_ROLES)
  @Get('follow-ups')
  followUps(@CurrentUser() actor: Actor) {
    return this.leads.followUps(actor);
  }

  /** Global search from the ⌘K palette. Free-text over name/phone/email. */
  @Roles(...LEAD_MODULE_ROLES)
  @Get('search')
  search(@Query('q') q: string, @CurrentUser() actor: Actor) {
    if (!q || q.trim().length < 2) return [];
    return this.leads.searchLeads(actor, q.trim());
  }

  /** Owner-only team scorecard for the dashboard. */
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @Get('stats/team-scorecard')
  teamScorecard() {
    return this.leads.teamScorecard();
  }

  /**
   * Bulk assign — reassign N leads to one user (or unassign by passing null).
   * Gated on roles that already see every lead, so a SALES_EXEC cannot bulk-
   * move things away from themselves.
   */
  @Roles(...LEAD_ASSIGN_ACCESS)
  @Post('bulk-assign')
  bulkAssign(
    @Body() body: { leadIds: string[]; assignedToId: string | null },
    @CurrentUser() actor: Actor,
  ) {
    if (!Array.isArray(body?.leadIds) || body.leadIds.length === 0) {
      throw new BadRequestException('leadIds required');
    }
    if (body.leadIds.length > 500) {
      throw new BadRequestException('Max 500 leads per bulk assignment');
    }
    return this.leads.bulkAssign(body.leadIds, body.assignedToId ?? null, actor);
  }

  @Roles(...LEAD_ASSIGN_ACCESS)
  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: Actor,
  ) {
    if (!file) throw new BadRequestException('CSV file is required');
    return this.leads.importCsv(file.buffer, actor);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER)
  @Post('rescore-all')
  rescoreAll(@CurrentUser() actor: Actor) {
    return this.leads.rescoreAllActiveLeads(actor);
  }

  @Roles(...LEAD_DELETE_ACCESS)
  @Get('approvals/pending')
  getPendingCloseRequests() {
    return this.leads.getPendingCloseRequests();
  }

  @Roles(...LEAD_DELETE_ACCESS)
  @Post('approvals/:requestId/review')
  reviewCloseRequest(
    @Param('requestId') requestId: string,
    @Body('approve') approve: boolean,
    @CurrentUser() actor: Actor,
  ) {
    return this.leads.reviewCloseRequest(requestId, approve, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Get(':id/ai-draft')
  generateAiDraft(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.leads.generateAiDraft(id, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.leads.findOne(id, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.leads.update(id, dto, actor);
  }

  /**
   * Permanent delete. Owner and super-admin only. A lead that already has
   * a booking or an invoice cannot be destroyed; mark it Lost instead.
   */
  @Roles(...LEAD_DELETE_ACCESS)
  @Delete(':id')
  deleteLead(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.leads.deleteLead(id, actor);
  }

  @Roles(...LEAD_DELETE_ACCESS)
  @Post(':id/close')
  closeLead(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: Actor,
  ) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('A valid reason (min 10 characters) is required to close a lead.');
    }
    return this.leads.deactivate(id, actor, reason.trim());
  }

  @Roles(...LEAD_CLOSE_REQUEST_ACCESS)
  @Post(':id/close-request')
  requestCloseLead(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: Actor,
  ) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('A valid reason (min 10 characters) is required to request closing a lead.');
    }
    return this.leads.requestClose(id, actor, reason.trim());
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Post(':id/activities')
  addActivity(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.leads.addActivity(id, dto, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Post(':id/whatsapp')
  async sendWhatsAppMessage(
    @Param('id') id: string,
    @Body('message') message: string,
    @CurrentUser() actor: Actor,
  ) {
    if (!message || !message.trim()) {
      throw new BadRequestException('Message cannot be empty.');
    }
    return this.leads.sendWhatsAppMessage(id, message, actor);
  }

  @Roles(...LEAD_MODULE_ROLES)
  @Get(':id/b2b-quote')
  generateB2bQuote(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.leads.generateB2bQuote(id, actor);
  }
}
