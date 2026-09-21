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
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PdfService } from '../pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCostDto } from './dto/create-cost.dto';
import { UpdateCostDto } from './dto/update-cost.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor, BOOKING_MODULE_ROLES } from '../common/access';

/** Money movements are restricted to finance-capable roles. */
const FINANCE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.ACCOUNTS,
  Role.OPERATIONS,
];

/**
 * Staff only — every booking response carries totalNet and actual margin.
 * The service then scopes each route to the leads the caller owns.
 */
@Roles(...BOOKING_MODULE_ROLES)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly pdf: PdfService,
    private readonly settings: SettingsService,
  ) {}

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() actor: Actor) {
    return this.bookings.create(dto, actor);
  }

  @Get()
  findAll(@Query() q: QueryBookingsDto, @CurrentUser() actor: Actor) {
    return this.bookings.findAll(q, actor);
  }

  /** Agency-wide totals — restricted to roles that already see every lead. */
  @Roles(...FINANCE_ROLES, Role.SALES_MANAGER)
  @Get('stats')
  stats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.bookings.stats(from, to);
  }

  /** Receivables and payables aged 0-30 / 30-60 / 60+. Finance-only. */
  @Roles(...FINANCE_ROLES)
  @Get('stats/aging')
  aging() {
    return this.bookings.aging();
  }

  /**
   * Owner-dashboard "this week" pulse — booked delta vs last week,
   * bookings travelling this week, payments due next 7 days, suppliers
   * overdue >30d. Owner + super-admin only.
   */
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @Get('stats/weekly-pulse')
  weeklyPulse() {
    return this.bookings.weeklyPulse();
  }

  /** Global search — ⌘K palette. */
  @Get('search')
  search(@Query('q') q: string) {
    if (!q || q.trim().length < 2) return [];
    return this.bookings.search(q.trim());
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.bookings.findOne(id, actor);
  }

  /**
   * Client-facing pro-forma invoice PDF. Access-checked via findOne so a
   * sales exec cannot download an invoice for a booking they cannot read.
   * Vendor costs are deliberately NOT included — clients never see what
   * Ladakh Vacation pays a hotel.
   *
   * This is a PRO-FORMA (booking summary). For formal GST invoices with
   * line items, see InvoicesController.downloadPdf().
   */
  @Get(':id/invoice.pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser() actor: Actor,
    @Res() res: Response,
  ) {
    const [b, pricing] = await Promise.all([
      this.bookings.findOne(id, actor),
      this.settings.getPricing(),
    ]);
    const buf = await this.pdf.renderProFormaInvoice({
      bookingNumber: b.bookingNumber,
      packageName: b.packageName,
      travelStartDate: b.travelStartDate,
      travelEndDate: b.travelEndDate,
      adults: b.adults,
      children: b.children,
      nights: b.nights,
      totalSell: b.totalSell,
      totalReceived: b.totalReceived,
      gstPercent: pricing.gstPercent,
      createdAt: b.createdAt,
      notes: b.notes,
      lead: {
        name: b.lead.name,
        phone: b.lead.phone,
        email: b.lead.email,
      },
      payments: b.payments.map((p: any) => ({
        receivedAt: p.receivedAt,
        amount: p.amount,
        mode: p.mode,
        reference: p.reference,
        isRefund: p.isRefund,
      })),
    });
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${b.bookingNumber}.pdf"`,
    );
    res.send(buf);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.bookings.update(id, dto, actor);
  }

  /**
   * Cancel a booking. Rides on `update` so the same activity trail is written
   * and the parent lead's status flips to CANCELLED. Optional ?reason=
   * captures why for the audit — defaults to "Cancelled by operator".
   */
  @Delete(':id')
  cancel(
    @Param('id') id: string,
    @Query('reason') reason: string | undefined,
    @CurrentUser() actor: Actor,
  ) {
    return this.bookings.cancel(id, reason, actor);
  }

  // --- payments ------------------------------------------------------------

  @Roles(...FINANCE_ROLES)
  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookings.addPayment(id, dto, userId);
  }

  @Roles(...FINANCE_ROLES)
  @Delete('payments/:paymentId')
  removePayment(@Param('paymentId') paymentId: string) {
    return this.bookings.removePayment(paymentId);
  }

  // --- vendor costs --------------------------------------------------------

  @Roles(...FINANCE_ROLES)
  @Post(':id/costs')
  addCost(@Param('id') id: string, @Body() dto: CreateCostDto) {
    return this.bookings.addCost(id, dto);
  }

  /** Pull the itinerary tier's priced items in as expected vendor costs. */
  @Roles(...FINANCE_ROLES)
  @Post(':id/costs/from-itinerary')
  seedCosts(@Param('id') id: string) {
    return this.bookings.seedCostsFromItinerary(id);
  }

  @Roles(...FINANCE_ROLES)
  @Patch('costs/:costId')
  updateCost(@Param('costId') costId: string, @Body() dto: UpdateCostDto) {
    return this.bookings.updateCost(costId, dto);
  }

  @Roles(...FINANCE_ROLES)
  @Delete('costs/:costId')
  removeCost(@Param('costId') costId: string) {
    return this.bookings.removeCost(costId);
  }
}
