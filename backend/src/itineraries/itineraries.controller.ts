import * as React from 'react';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { renderToBuffer } from '@react-pdf/renderer';
import { ItinerariesService } from './itineraries.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { UpsertDayDto } from './dto/upsert-day.dto';
import { UpsertItemDto } from './dto/upsert-item.dto';
import { UpsertOptionDto } from './dto/upsert-option.dto';
import { UpsertPricingDto } from './dto/upsert-pricing.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Actor, LEAD_MODULE_ROLES } from '../common/access';
import { ItineraryDocument } from './templates/itinerary';
import { SettingsService } from '../settings/settings.service';

/**
 * Itineraries are client-facing (no cost/margin leaked) — safe to open to
 * every staff role that can touch leads. Per-lead scoping enforced in the
 * service.
 */
@Roles(...LEAD_MODULE_ROLES)
@Controller('itineraries')
export class ItinerariesController {
  constructor(
    private readonly svc: ItinerariesService,
    private readonly settings: SettingsService,
  ) {}

  // ---- public client-facing routes ---------------------------------------

  @Public()
  @Get('public/:token')
  getPublicView(@Param('token') token: string) {
    return this.svc.getPublicView(token);
  }

  @Public()
  @Post('public/:token/accept')
  acceptProposal(
    @Param('token') token: string,
    @Body() body: { optionId: string; clientNotes?: string },
  ) {
    return this.svc.acceptOption(token, body?.optionId, body?.clientNotes);
  }

  // ---- internal staff routes ---------------------------------------------

  @Post()
  create(@Body() dto: CreateItineraryDto, @CurrentUser() actor: Actor) {
    return this.svc.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: Actor, @Query('leadId') leadId?: string) {
    return this.svc.findAll(leadId, actor);
  }

  /** Global search for the ⌘K palette. */
  @Get('search')
  search(@Query('q') q: string, @CurrentUser() actor: Actor) {
    if (!q || q.trim().length < 2) return [];
    return this.svc.search(q.trim(), actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.svc.findOne(id, actor);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateItineraryDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.update(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.svc.remove(id, actor);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() actor: Actor,
    @Res() res: Response,
  ) {
    const [i, pricing] = await Promise.all([
      this.svc.findOne(id, actor),
      this.settings.getPricing(),
    ]);
    const buf = await renderToBuffer(
      React.createElement(ItineraryDocument, {
        i: {
          code: i.code,
          title: i.title,
          headline: i.headline,
          intro: i.intro,
          totalPax: i.totalPax,
          inclusions: i.inclusions,
          exclusions: i.exclusions,
          createdAt: i.createdAt,
          gstPercent: pricing.gstPercent,
          options: (i as any).options?.map((o: any) => ({
            id: o.id,
            name: o.name,
            isRecommended: o.isRecommended,
            totalSell: o.totalSell,
            perPersonSell: o.perPersonSell,
          })),
          lead: {
            name: i.lead.name,
            phone: i.lead.phone,
            email: i.lead.email,
          },
          days: i.days.map((d: any) => ({
            id: d.id,
            dayNumber: d.dayNumber,
            date: d.date,
            city: d.city,
            headline: d.headline,
            summary: d.summary,
            items: d.items.map((it: any) => ({
              kind: it.kind,
              time: it.time,
              title: it.title,
              description: it.description,
              location: it.location,
            })),
          })),
        },
      }) as any,
    );
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Itinerary-${i.code}.pdf"`,
    );
    res.send(buf);
  }

  // ---- days --------------------------------------------------------------

  @Post(':id/days')
  addDay(
    @Param('id') id: string,
    @Body() dto: UpsertDayDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.addDay(id, dto, actor);
  }

  @Patch('days/:dayId')
  updateDay(
    @Param('dayId') dayId: string,
    @Body() dto: UpsertDayDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.updateDay(dayId, dto, actor);
  }

  @Delete('days/:dayId')
  removeDay(@Param('dayId') dayId: string, @CurrentUser() actor: Actor) {
    return this.svc.removeDay(dayId, actor);
  }

  @Post(':id/days/reorder')
  reorderDays(
    @Param('id') id: string,
    @Body() dto: ReorderDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.reorderDays(id, dto, actor);
  }

  // ---- items -------------------------------------------------------------

  @Post('days/:dayId/items')
  addItem(
    @Param('dayId') dayId: string,
    @Body() dto: UpsertItemDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.addItem(dayId, dto, actor);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpsertItemDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.updateItem(itemId, dto, actor);
  }

  @Delete('items/:itemId')
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.removeItem(itemId, actor);
  }

  @Post('days/:dayId/items/reorder')
  reorderItems(
    @Param('dayId') dayId: string,
    @Body() dto: ReorderDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.reorderItems(dayId, dto, actor);
  }

  // ---- options (tiers) ---------------------------------------------------

  @Post(':id/options')
  addOption(
    @Param('id') id: string,
    @Body() dto: UpsertOptionDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.addOption(id, dto, actor);
  }

  @Patch('options/:optionId')
  updateOption(
    @Param('optionId') optionId: string,
    @Body() dto: UpsertOptionDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.updateOption(optionId, dto, actor);
  }

  @Post('options/:optionId/duplicate')
  duplicateOption(
    @Param('optionId') optionId: string,
    @Body('name') name: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.duplicateOption(optionId, name || 'Copy', actor);
  }

  @Delete('options/:optionId')
  removeOption(
    @Param('optionId') optionId: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.removeOption(optionId, actor);
  }

  // ---- pricing (per item, per option) ------------------------------------

  @Post('items/:itemId/pricing/:optionId')
  upsertPricing(
    @Param('itemId') itemId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpsertPricingDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.upsertPricing(itemId, optionId, dto, actor);
  }

  @Delete('items/:itemId/pricing/:optionId')
  removePricing(
    @Param('itemId') itemId: string,
    @Param('optionId') optionId: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.svc.removePricing(itemId, optionId, actor);
  }
}
