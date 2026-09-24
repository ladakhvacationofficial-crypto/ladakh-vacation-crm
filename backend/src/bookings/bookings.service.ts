import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  BookingStatus,
  LeadStatus,
  PaymentMode,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCostDto } from './dto/create-cost.dto';
import { UpdateCostDto } from './dto/update-cost.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { HandoverBookingDto } from './dto/handover-booking.dto';
import { computeBookingFinancials, deriveStatus } from './booking-math';
import { Actor, canSeeAllLeads } from '../common/access';
import { toDateOrNull } from '../common/dates';
import { withNumberRetry } from '../common/sequence';
import { OfflineConversionsService } from '../attribution/offline-conversions.service';
import type { HotelVoucherInput } from '../pdf/templates/hotel-voucher';
import type { DriverVoucherInput } from '../pdf/templates/driver-voucher';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offlineConversions: OfflineConversionsService,
  ) {}

  // --- access scoping ------------------------------------------------------
  //
  // A booking exposes totalNet and actual margin, so it inherits the access
  // rules of its lead. 404 rather than 403, matching LeadsService.
  //
  // The money routes (payments, costs) are already restricted to finance
  // roles, all of which have full lead access — they use detail() directly.

  private leadScope(actor: Actor): Prisma.BookingWhereInput {
    return canSeeAllLeads(actor.role)
      ? {}
      : { lead: { assignedToId: actor.id } };
  }

  private async assertBookingAccess(bookingId: string, actor: Actor) {
    if (canSeeAllLeads(actor.role)) return;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { lead: { select: { assignedToId: true } } },
    });
    if (!booking || booking.lead.assignedToId !== actor.id) {
      throw new NotFoundException('Booking not found');
    }
  }

  private async assertLeadAccess(leadId: string, actor: Actor) {
    if (canSeeAllLeads(actor.role)) return;
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { assignedToId: true },
    });
    if (!lead || lead.assignedToId !== actor.id) {
      throw new NotFoundException('Lead not found');
    }
  }

  private async nextBookingNumber(db: Prisma.TransactionClient = this.prisma): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LV-B-${year}-`;
    const last = await db.booking.findFirst({
      where: { bookingNumber: { startsWith: prefix } },
      orderBy: { bookingNumber: 'desc' },
      select: { bookingNumber: true },
    });
    const n = last
      ? parseInt(last.bookingNumber.slice(prefix.length), 10) + 1
      : 1;
    return `${prefix}${String(n).padStart(4, '0')}`;
  }

  /** Recompute stored totals from the child rows, then re-derive status. */
  private async refresh(bookingId: string, db: Prisma.TransactionClient = this.prisma) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true, costs: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const fin = computeBookingFinancials({
      totalSell: booking.totalSell,
      totalNet: booking.totalNet,
      payments: booking.payments,
      costs: booking.costs,
    });

    const status = deriveStatus(
      booking.status,
      booking.totalSell,
      fin.totalReceived,
    ) as BookingStatus;

    return db.booking.update({
      where: { id: bookingId },
      data: {
        totalReceived: fin.totalReceived,
        totalCostPaid: fin.totalCostPaid,
        status,
      },
    });
  }

  async create(dto: CreateBookingDto, actor: Actor) {
    const userId = actor.id;
    let leadId = dto.leadId;
    let totalSell = dto.totalSell ?? 0;
    let totalNet = dto.totalNet ?? 0;
    let itineraryId: string | null = null;
    let packageName = dto.packageName ?? null;
    let adults = dto.adults ?? 2;
    let children = dto.children ?? 0;
    let nights = dto.nights ?? 0;

    // --- build from an itinerary tier: snapshot its numbers ---
    if (dto.itineraryOptionId) {
      const option = await this.prisma.itineraryOption.findUnique({
        where: { id: dto.itineraryOptionId },
        include: {
          itinerary: {
            include: {
              days: { select: { dayNumber: true } },
            },
          },
        },
      });
      if (!option) throw new NotFoundException('Itinerary option not found');

      leadId = option.itinerary.leadId;
      itineraryId = option.itineraryId;
      totalSell = option.totalSell;
      totalNet = option.totalNet;
      packageName =
        packageName ?? `${option.itinerary.title} — ${option.name}`;
      adults = dto.adults ?? option.itinerary.totalPax;
      children = dto.children ?? 0;
      // Infer nights from the number of days if the operator didn't override.
      // Standard convention: N days = N-1 nights (arrival + last day travel).
      const dayCount = option.itinerary.days.length;
      nights = dto.nights ?? Math.max(0, dayCount - 1);

      if (totalSell <= 0) {
        throw new BadRequestException(
          'That itinerary tier has no pricing yet — set rates on the priceable items first.',
        );
      }
    }

    if (!leadId) {
      throw new BadRequestException(
        'Provide either itineraryOptionId or leadId.',
      );
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    await this.assertLeadAccess(leadId, actor);

    // Race-safe number + insert. See src/common/sequence.ts.
    const booking = await withNumberRetry(() => this.prisma.$transaction(async (tx) => {
      const bookingNumber = await this.nextBookingNumber(tx);
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          leadId,
          itineraryId,
          itineraryOptionId: dto.itineraryOptionId ?? null,
          createdById: userId ?? null,
          status: BookingStatus.CONFIRMED,
          packageName,
          travelStartDate: toDateOrNull(dto.travelStartDate),
          travelEndDate: toDateOrNull(dto.travelEndDate),
          adults,
          children,
          nights,
          totalSell,
          totalNet,
          notes: dto.notes ?? null,
        },
      });

    // pipeline side-effects
    await tx.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.CONFIRMED },
    });
    await tx.activity.create({
      data: {
        leadId,
        userId: userId ?? null,
        type: ActivityType.SYSTEM,
        content: `Booking ${created.bookingNumber} confirmed — sell ${totalSell}, est. cost ${totalNet}`,
      },
    });

      return created;
    }));

    // Closed-loop offline conversion upload for ad algorithms (Google Ads & Meta CAPI)
    try {
      await this.offlineConversions.uploadBookingConversion({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        totalSell: booking.totalSell,
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          gclid: lead.gclid,
          fbclid: lead.fbclid,
        },
      });
    } catch {
      // Non-blocking: failure in external attribution upload never blocks confirmed bookings
    }

    return booking;
  }

  async findAll(q: QueryBookingsDto, actor: Actor) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;

    const where: Prisma.BookingWhereInput = { ...this.leadScope(actor) };
    if (q.status) where.status = q.status;
    if (q.leadId) where.leadId = q.leadId;
    if (q.from || q.to) {
      where.travelStartDate = {};
      if (q.from) where.travelStartDate.gte = new Date(q.from);
      if (q.to) where.travelStartDate.lte = new Date(q.to);
    }
    if (q.search) {
      where.OR = [
        { bookingNumber: { contains: q.search, mode: 'insensitive' } },
        { packageName: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          payments: { select: { amount: true } },
          costs: { select: { amountDue: true, amountPaid: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      data: rows.map((b: any) => ({
        ...b,
        payments: undefined,
        costs: undefined,
        financials: computeBookingFinancials({
          totalSell: b.totalSell,
          totalNet: b.totalNet,
          payments: b.payments,
          costs: b.costs,
        }),
      })),
    };
  }

  async findOne(id: string, actor: Actor) {
    await this.assertBookingAccess(id, actor);
    return this.detail(id);
  }

  /** Unscoped read — callers must have checked access first. */
  private async detail(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        operationsOwner: { select: { id: true, name: true, email: true } },
        handedOverBy: { select: { id: true, name: true } },
        payments: {
          orderBy: { receivedAt: 'desc' },
          include: {
            verifiedBy: { select: { id: true, name: true } },
            recordedBy: { select: { id: true, name: true } },
          },
        },
        costs: { orderBy: { createdAt: 'asc' } },
        fleetAssignments: {
          include: {
            vehicle: true,
            driver: true,
          },
        },
        permitApplications: {
          include: {
            travellers: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return {
      ...booking,
      financials: computeBookingFinancials({
        totalSell: booking.totalSell,
        totalNet: booking.totalNet,
        payments: booking.payments,
        costs: booking.costs,
      }),
    };
  }

  async update(id: string, dto: UpdateBookingDto, actor: Actor) {
    const userId = actor.id;
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertBookingAccess(id, actor);

    const data: Prisma.BookingUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.packageName !== undefined) data.packageName = dto.packageName;
    if (dto.adults !== undefined) data.adults = dto.adults;
    if (dto.children !== undefined) data.children = dto.children;
    if (dto.nights !== undefined) data.nights = dto.nights;
    if (dto.totalSell !== undefined) data.totalSell = dto.totalSell;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.cancelledReason !== undefined)
      data.cancelledReason = dto.cancelledReason;
    if (dto.travelStartDate !== undefined)
      data.travelStartDate = toDateOrNull(dto.travelStartDate);
    if (dto.travelEndDate !== undefined)
      data.travelEndDate = toDateOrNull(dto.travelEndDate);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.fxRate !== undefined) data.fxRate = dto.fxRate;

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.booking.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Booking not found');
    await tx.booking.update({ where: { id }, data });

    if (dto.status && dto.status !== current.status) {
      await tx.activity.create({
        data: {
          leadId: current.leadId,
          userId: userId ?? null,
          type: ActivityType.SYSTEM,
          content: `Booking ${current.bookingNumber}: ${current.status} -> ${dto.status}`,
        },
      });
      if (dto.status === BookingStatus.CANCELLED) {
        await tx.lead.update({
          where: { id: current.leadId },
          data: { status: LeadStatus.CANCELLED },
        });
      }
    }

      if (dto.totalSell !== undefined) await this.refresh(id, tx);
    });

    return this.detail(id);
  }

  /**
   * Cancel a booking. Thin wrapper over `update` so the CANCELLED transition
   * writes the audit activity and cascades to the parent lead. Idempotent —
   * cancelling an already-cancelled booking is a no-op.
   */
  async cancel(id: string, reason: string | undefined, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertBookingAccess(id, actor);

    if (booking.status === BookingStatus.CANCELLED) {
      return { id, alreadyCancelled: true };
    }
    await this.update(
      id,
      {
        status: BookingStatus.CANCELLED,
        cancelledReason: reason?.trim() || 'Cancelled by operator',
      } as any,
      actor,
    );
    return { id, cancelled: true };
  }

  // --- payments (money in) -------------------------------------------------

  async addPayment(
    bookingId: string,
    dto: CreatePaymentDto,
    userId?: string,
  ) {
    const updatedId = await this.prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;

    // a refund is stored as a negative amount so totals stay a simple sum
    const signed = dto.isRefund ? -Math.abs(dto.amount) : Math.abs(dto.amount);

    await tx.bookingPayment.create({
      data: {
        bookingId,
        amount: signed,
        mode: dto.mode ?? PaymentMode.BANK_TRANSFER,
        reference: dto.reference ?? null,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
        notes: dto.notes ?? null,
        isRefund: dto.isRefund ?? false,
        verificationStatus: dto.verificationStatus ?? 'VERIFIED',
        recordedById: userId ?? null,
      },
    });

    await tx.activity.create({
      data: {
        leadId: booking.leadId,
        userId: userId ?? null,
        type: ActivityType.SYSTEM,
        content: `${dto.isRefund ? 'Refund' : 'Payment'} ${Math.abs(
          dto.amount,
        )} recorded on ${booking.bookingNumber}`,
      },
    });

    await this.refresh(bookingId, tx);
    return bookingId;
    });
    return this.detail(updatedId);
  }

  async removePayment(paymentId: string) {
    const updatedId = await this.prisma.$transaction(async (tx) => {
    const payment = await tx.bookingPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${payment.bookingId} FOR UPDATE`;
    await tx.bookingPayment.delete({ where: { id: paymentId } });
    await this.refresh(payment.bookingId, tx);
    return payment.bookingId;
    });
    return this.detail(updatedId);
  }

  // --- costs (money out) ---------------------------------------------------

  async addCost(bookingId: string, dto: CreateCostDto) {
    const updatedId = await this.prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;

    await tx.bookingCost.create({
      data: {
        bookingId,
        vendorId: dto.vendorId ?? null,
        description: dto.description,
        amountDue: dto.amountDue,
        amountPaid: dto.amountPaid ?? 0,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.refresh(bookingId, tx);
    return bookingId;
    });
    return this.detail(updatedId);
  }

  async updateCost(costId: string, dto: UpdateCostDto) {
    const updatedId = await this.prisma.$transaction(async (tx) => {
    const cost = await tx.bookingCost.findUnique({
      where: { id: costId },
    });
    if (!cost) throw new NotFoundException('Cost not found');
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${cost.bookingId} FOR UPDATE`;

    const data: Record<string, any> = { ...dto };
    if (dto.paidAt !== undefined)
      data.paidAt = dto.paidAt ? new Date(dto.paidAt) : null;

    await tx.bookingCost.update({ where: { id: costId }, data });
    await this.refresh(cost.bookingId, tx);
    return cost.bookingId;
    });
    return this.detail(updatedId);
  }

  async removeCost(costId: string) {
    const updatedId = await this.prisma.$transaction(async (tx) => {
    const cost = await tx.bookingCost.findUnique({
      where: { id: costId },
    });
    if (!cost) throw new NotFoundException('Cost not found');
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${cost.bookingId} FOR UPDATE`;
    await tx.bookingCost.delete({ where: { id: costId } });
    await this.refresh(cost.bookingId, tx);
    return cost.bookingId;
    });
    return this.detail(updatedId);
  }

  /**
   * Copy the itinerary tier's priced items in as expected vendor costs.
   *
   * Deduplicated by vendor. A hotel that appears on multiple items — same
   * supplier billed under two meal plans, or a stay + a transfer both keyed
   * to the same vendor — collapses into one payable row with amounts
   * summed. That matches how invoices actually arrive: the hotel sends one
   * bill for the whole stay, not one per row.
   *
   * Items without a linked vendor (manually-priced lines) stay individual —
   * we don't know they're the same supplier, so combining them silently
   * would be wrong.
   */
  async seedCostsFromItinerary(bookingId: string) {
    const updatedId = await this.prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { costs: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
    if (!booking.itineraryOptionId) {
      throw new BadRequestException(
        'This booking was not created from an itinerary tier.',
      );
    }
    if (booking.costs.length > 0) {
      throw new BadRequestException(
        'Costs already exist on this booking — add them individually instead.',
      );
    }

    const pricings = await tx.itineraryItemPricing.findMany({
      where: { optionId: booking.itineraryOptionId },
      include: {
        item: { select: { title: true } },
      },
    });

    // Group by vendorId. Rows with a null vendor go into their own bucket
    // each so they're never accidentally merged with each other.
    const grouped = new Map<
      string,
      { vendorId: string | null; titles: string[]; amountDue: number }
    >();
    for (const p of pricings) {
      const key = p.vendorId ?? `__null_${p.id}`;
      const bucket = grouped.get(key) ?? {
        vendorId: p.vendorId,
        titles: [],
        amountDue: 0,
      };
      bucket.titles.push(p.item.title);
      bucket.amountDue += p.lineNet;
      grouped.set(key, bucket);
    }

    // Look up vendor names for the grouped rows so the payable description
    // reads "Camp at Hunder (2 items)" instead of "Item 1 + Item 2".
    const vendorIds = Array.from(grouped.values())
      .map((b) => b.vendorId)
      .filter((v): v is string => v !== null);
    const vendors = vendorIds.length
      ? await tx.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true },
        })
      : [];
    const vendorName = new Map(vendors.map((v: any) => [v.id, v.name]));

    for (const bucket of grouped.values()) {
      const label = bucket.vendorId
        ? vendorName.get(bucket.vendorId) ?? bucket.titles[0]
        : bucket.titles[0];
      const description =
        bucket.titles.length === 1
          ? label
          : `${label} (${bucket.titles.length} items)`;
      await tx.bookingCost.create({
        data: {
          bookingId,
          vendorId: bucket.vendorId,
          description,
          amountDue: bucket.amountDue,
          amountPaid: 0,
        },
      });
    }

    await this.refresh(bookingId, tx);
    return bookingId;
    });
    return this.detail(updatedId);
  }

  // --- reporting -----------------------------------------------------------

  async stats(from?: string, to?: string) {
    const where: Prisma.BookingWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        payments: { select: { amount: true } },
        costs: { select: { amountDue: true, amountPaid: true } },
      },
    });

    let totalSell = 0;
    let totalQuotedProfit = 0;
    let totalActualProfit = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;
    let vendorOutstanding = 0;

    for (const b of bookings as any[]) {
      const f = computeBookingFinancials({
        totalSell: b.totalSell,
        totalNet: b.totalNet,
        payments: b.payments,
        costs: b.costs,
      });
      if (b.status === BookingStatus.CANCELLED) continue;
      totalSell += f.totalSell;
      totalQuotedProfit += f.quotedProfit;
      totalActualProfit += f.actualProfit;
      totalReceived += f.totalReceived;
      totalOutstanding += f.balanceDue;
      vendorOutstanding += f.vendorOutstanding;
    }

    const byStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return {
      bookings: bookings.length,
      totalSell,
      totalReceived,
      totalOutstanding,
      vendorOutstanding,
      totalQuotedProfit,
      totalActualProfit,
      profitVariance: totalActualProfit - totalQuotedProfit,
      averageMarginPercent:
        totalSell > 0 ? (totalActualProfit / totalSell) * 100 : 0,
      byStatus: byStatus.map((r: any) => ({
        status: r.status,
        count: r._count._all,
      })),
    };
  }

  /**
   * Owner-dashboard "this week" tiles. Real ops-critical numbers vs
   * finance-page ledger view (which is aged AR/AP).
   *
   *  - bookedThisWeek        rupees booked in the current calendar week
   *  - bookedLastWeek        same range one week ago (for the delta arrow)
   *  - travellingThisWeek    bookings whose travelStartDate falls in [today, today+7)
   *  - paymentsDueNext7Days  sum of balance-due on bookings starting travel in the next week
   *  - suppliersOverdue30d   count of vendor cost rows with balance > 0 and > 30d old
   */
  async weeklyPulse() {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);
    const startOfPrevWeek = new Date(startOfWeek); startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
    const in7Days = new Date(startOfDay); in7Days.setDate(in7Days.getDate() + 7);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [bookedThis, bookedPrev, upcomingBookings, overdueVendorCosts] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          status: { not: BookingStatus.CANCELLED },
          createdAt: { gte: startOfWeek, lt: endOfWeek },
        },
        _sum: { totalSell: true },
        _count: { _all: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { not: BookingStatus.CANCELLED },
          createdAt: { gte: startOfPrevWeek, lt: startOfWeek },
        },
        _sum: { totalSell: true },
      }),
      this.prisma.booking.findMany({
        where: {
          status: { not: BookingStatus.CANCELLED },
          travelStartDate: { gte: startOfDay, lt: in7Days },
        },
        select: { totalSell: true, payments: { select: { amount: true } } },
      }),
      this.prisma.bookingCost.findMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
        select: { amountDue: true, amountPaid: true },
      }),
    ]);

    let paymentsDueNext7Days = 0;
    for (const b of upcomingBookings) {
      const paid = (b.payments as { amount: number }[]).reduce((s, p) => s + p.amount, 0);
      paymentsDueNext7Days += Math.max(0, b.totalSell - paid);
    }

    let suppliersOverdue = 0;
    for (const c of overdueVendorCosts) {
      if (c.amountDue - c.amountPaid > 0) suppliersOverdue += 1;
    }

    return {
      bookedThisWeek: bookedThis._sum.totalSell ?? 0,
      bookedLastWeek: bookedPrev._sum.totalSell ?? 0,
      bookingsThisWeek: bookedThis._count._all,
      travellingThisWeek: upcomingBookings.length,
      paymentsDueNext7Days,
      suppliersOverdue30d: suppliersOverdue,
    };
  }

  /** Free-text search over booking number, package name, and client name. */
  async search(q: string, actor: Actor) {
    return this.prisma.booking.findMany({
      where: {
        ...this.leadScope(actor),
        OR: [
          { bookingNumber: { contains: q, mode: 'insensitive' } },
          { packageName: { contains: q, mode: 'insensitive' } },
          { lead: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        bookingNumber: true,
        packageName: true,
        status: true,
        lead: { select: { name: true } },
      },
    });
  }

  /**
   * Aging report for the finance page. Receivables aged from booking
   * createdAt; payables aged from cost createdAt. Buckets are 0-30, 30-60,
   * 60+ — the ones actually used in DMC collections calls.
   *
   * Cancelled bookings are excluded from receivables but their vendor costs
   * (if any were seeded then not zeroed) still count as payables.
   */
  async aging() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const bucketize = (ageDays: number) => {
      if (ageDays < 30) return 'd0_30';
      if (ageDays < 60) return 'd30_60';
      return 'd60_plus';
    };

    const [bookings, costs] = await Promise.all([
      this.prisma.booking.findMany({
        where: { status: { not: BookingStatus.CANCELLED } },
        select: {
          id: true,
          bookingNumber: true,
          totalSell: true,
          createdAt: true,
          travelStartDate: true,
          lead: { select: { name: true } },
          payments: { select: { amount: true } },
        },
      }),
      this.prisma.bookingCost.findMany({
        where: {},
        select: {
          id: true,
          vendorId: true,
          amountDue: true,
          amountPaid: true,
          description: true,
          createdAt: true,
          booking: { select: { bookingNumber: true } },
        },
      }),
    ]);

    // Look up vendor names in one shot — BookingCost has no @relation to
    // Vendor (nullable FK, kept flexible for ad-hoc costs), so we resolve
    // names ourselves.
    const vendorIds = Array.from(
      new Set(costs.map((c) => c.vendorId).filter((v): v is string => !!v)),
    );
    const vendors = vendorIds.length
      ? await this.prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true },
        })
      : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    const receivables = { d0_30: 0, d30_60: 0, d60_plus: 0 };
    const receivableRows: any[] = [];
    for (const b of bookings) {
      const paid = (b.payments as any[]).reduce((s, p) => s + p.amount, 0);
      const balance = b.totalSell - paid;
      if (balance <= 0) continue;
      const ageDays = Math.floor((now - b.createdAt.getTime()) / day);
      receivables[bucketize(ageDays)] += balance;
      receivableRows.push({
        id: b.id,
        bookingNumber: b.bookingNumber,
        clientName: b.lead.name,
        balance,
        ageDays,
        travelStartDate: b.travelStartDate,
      });
    }

    const payables = { d0_30: 0, d30_60: 0, d60_plus: 0 };
    const payableRows: any[] = [];
    for (const c of costs as any[]) {
      const balance = c.amountDue - c.amountPaid;
      if (balance <= 0) continue;
      const ageDays = Math.floor((now - c.createdAt.getTime()) / day);
      payables[bucketize(ageDays)] += balance;
      payableRows.push({
        id: c.id,
        description: c.description,
        vendorName: c.vendorId ? (vendorMap.get(c.vendorId) ?? '—') : '—',
        vendorId: c.vendorId,
        bookingNumber: c.booking?.bookingNumber ?? '—',
        balance,
        ageDays,
      });
    }

    receivableRows.sort((a, b) => b.ageDays - a.ageDays);
    payableRows.sort((a, b) => b.ageDays - a.ageDays);

    return {
      receivables: {
        ...receivables,
        total: receivables.d0_30 + receivables.d30_60 + receivables.d60_plus,
        rows: receivableRows.slice(0, 25),
      },
      payables: {
        ...payables,
        total: payables.d0_30 + payables.d30_60 + payables.d60_plus,
        rows: payableRows.slice(0, 25),
      },
    };
  }

  // --- vouchers & movement --------------------------------------------------

  async getHotelVoucherData(id: string, actor: Actor): Promise<HotelVoucherInput> {
    await this.assertBookingAccess(id, actor);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        lead: true,
        costs: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const vendorIds = booking.costs
      .map((c) => c.vendorId)
      .filter(Boolean) as string[];
    const vendors =
      vendorIds.length > 0
        ? await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
          })
        : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    let itineraryDays: any[] = [];
    if (booking.itineraryId) {
      const it = await this.prisma.itinerary.findUnique({
        where: { id: booking.itineraryId },
        include: {
          days: {
            include: { items: { include: { vendor: true } } },
            orderBy: { dayNumber: 'asc' },
          },
        },
      });
      if (it?.days) itineraryDays = it.days;
    }

    const hotelCost = booking.costs.find((c) => {
      const v = c.vendorId ? vendorMap.get(c.vendorId) : null;
      return (
        v?.type === 'HOTEL' ||
        v?.type === 'CAMP' ||
        v?.type === 'HOUSEBOAT' ||
        c.description?.toLowerCase().includes('hotel') ||
        c.description?.toLowerCase().includes('camp')
      );
    });
    const hotelVendor = hotelCost?.vendorId
      ? vendorMap.get(hotelCost.vendorId)
      : null;

    const stayItem = itineraryDays
      .flatMap((d) => d.items)
      .find((i) => i.kind === 'STAY' && i.vendor);

    const hotelName =
      hotelVendor?.name ??
      stayItem?.vendor?.name ??
      stayItem?.title ??
      'Grand Dragon / Partner Deluxe Hotel';
    const hotelCity =
      hotelVendor?.city ??
      stayItem?.vendor?.city ??
      stayItem?.location ??
      'Leh, Ladakh';
    const hotelAddress =
      hotelVendor?.address ?? stayItem?.vendor?.address ?? null;
    const hotelPhone =
      hotelVendor?.phone ?? stayItem?.vendor?.phone ?? null;
    const hotelContact =
      hotelVendor?.contactPerson ?? stayItem?.vendor?.contactPerson ?? null;

    const checkIn = booking.travelStartDate ?? new Date();
    const checkOut =
      booking.travelEndDate ??
      new Date(new Date(checkIn).getTime() + (booking.nights || 5) * 86400000);
    const nights =
      booking.nights ||
      Math.max(
        1,
        Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            86400000,
        ),
      );

    const totalPax = (booking.adults || 2) + (booking.children || 0);
    const roomCount = Math.max(1, Math.ceil((booking.adults || 2) / 2));

    return {
      voucherNumber: `VCH-HTL-${booking.bookingNumber}`,
      bookingNumber: booking.bookingNumber,
      createdAt: new Date(),
      guestName: booking.lead.name,
      guestPhone: booking.lead.phone,
      guestEmail: booking.lead.email,
      totalPax,
      adults: booking.adults || 2,
      children: booking.children || 0,
      hotelName,
      hotelCity,
      hotelAddress,
      hotelPhone,
      hotelContactPerson: hotelContact,
      checkIn,
      checkOut,
      nights,
      roomVariant: stayItem?.description ?? 'Deluxe Room',
      roomCount,
      mealPlan: 'MAP (Breakfast & Dinner)',
      specialRequests: booking.notes,
    };
  }

  async getDriverVoucherData(id: string, actor: Actor): Promise<DriverVoucherInput> {
    await this.assertBookingAccess(id, actor);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        lead: true,
        costs: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const vendorIds = booking.costs
      .map((c) => c.vendorId)
      .filter(Boolean) as string[];
    const vendors =
      vendorIds.length > 0
        ? await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
          })
        : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    let itineraryDays: any[] = [];
    if (booking.itineraryId) {
      const it = await this.prisma.itinerary.findUnique({
        where: { id: booking.itineraryId },
        include: {
          days: {
            include: { items: { include: { vendor: true } } },
            orderBy: { dayNumber: 'asc' },
          },
        },
      });
      if (it?.days) itineraryDays = it.days;
    }

    const transportCost = booking.costs.find((c) => {
      const v = c.vendorId ? vendorMap.get(c.vendorId) : null;
      return (
        v?.type === 'TRANSPORT' ||
        c.description?.toLowerCase().includes('transport') ||
        c.description?.toLowerCase().includes('innova') ||
        c.description?.toLowerCase().includes('cab')
      );
    });
    const transportVendor = transportCost?.vendorId
      ? vendorMap.get(transportCost.vendorId)
      : null;

    const totalPax = (booking.adults || 2) + (booking.children || 0);
    const vehicleType =
      transportCost?.description?.includes('Innova') ||
      booking.packageName?.includes('Innova')
        ? 'Toyota Innova Crysta (AC / 4x2)'
        : transportCost?.description?.includes('Tempo') || totalPax > 6
        ? 'Force Tempo Traveller (12+1 Seater)'
        : 'Toyota Innova Crysta / 4x4 SUV';

    const startDate = booking.travelStartDate
      ? new Date(booking.travelStartDate)
      : new Date();

    let circuitDays: any[] = [];
    if (itineraryDays.length > 0) {
      circuitDays = itineraryDays.map((d) => {
        const dayDate = d.date
          ? new Date(d.date)
          : new Date(startDate.getTime() + (d.dayNumber - 1) * 86400000);
        const sightseeing = d.items.map((i: any) => i.title).join(' · ');
        return {
          dayNumber: d.dayNumber,
          date: dayDate,
          routeTitle: d.headline ?? d.city ?? `Day ${d.dayNumber} Sightseeing`,
          nightHalt: d.city ?? 'Leh',
          sightseeing: sightseeing || d.summary || undefined,
        };
      });
    } else {
      const totalDays = Math.max(2, (booking.nights || 5) + 1);
      const standardCircuit = [
        {
          title: 'Airport Pickup & Leh Acclimatization',
          halt: 'Leh',
          sights: 'Leh Main Market, Shanti Stupa, Leh Palace',
        },
        {
          title: 'Leh - Sham Valley Sightseeing',
          halt: 'Leh',
          sights:
            'Hall of Fame, Magnetic Hill, Gurudwara Pathar Sahib, Sangam (Indus & Zanskar)',
        },
        {
          title: 'Leh to Nubra Valley via Khardung La (18,380 ft)',
          halt: 'Nubra (Hunder)',
          sights:
            'Khardung La Top, Diskit Monastery, Hunder Sand Dunes & Bactrian Camel',
        },
        {
          title: 'Nubra to Pangong Lake via Shyok Route',
          halt: 'Pangong Lake',
          sights:
            'Shyok River Valley, Durbuk, Tangtse, Spangmik, 3-Idiots Shooting Point',
        },
        {
          title: 'Pangong Lake to Leh via Chang La (17,586 ft)',
          halt: 'Leh',
          sights:
            'Sunrise at Pangong, Chang La summit, Thiksey Monastery, Shey Palace',
        },
        {
          title: 'Leh Hotel to Airport Drop',
          halt: 'Departure',
          sights: 'Kushok Bakula Rimpochee Airport (IXL) Transfer',
        },
      ];

      for (let i = 0; i < totalDays; i++) {
        const item = standardCircuit[Math.min(i, standardCircuit.length - 1)];
        circuitDays.push({
          dayNumber: i + 1,
          date: new Date(startDate.getTime() + i * 86400000),
          routeTitle: item.title,
          nightHalt: item.halt,
          sightseeing: item.sights,
        });
      }
    }

    return {
      voucherNumber: `VCH-DRV-${booking.bookingNumber}`,
      bookingNumber: booking.bookingNumber,
      createdAt: new Date(),
      guestName: booking.lead.name,
      guestPhone: booking.lead.phone,
      guestEmail: booking.lead.email,
      totalPax,
      adults: booking.adults || 2,
      children: booking.children || 0,
      vehicleType,
      transporterName:
        transportVendor?.name ?? 'Ladakh Tour Operators Fleet',
      reportingDate: startDate,
      reportingTime: 'Flight Arrival Time (Morning)',
      reportingLocation: 'Kushok Bakula Rimpochee Airport (IXL), Leh',
      circuitDays,
      specialInstructions: booking.notes,
    };
  }

  async getDailyMovement(dateStr?: string, actor?: Actor) {
    const target = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(target);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);

    const activeBookings = await this.prisma.booking.findMany({
      where: {
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.PARTIALLY_PAID,
            BookingStatus.PAID,
          ],
        },
        travelStartDate: { lte: endOfDay },
        travelEndDate: { gte: startOfDay },
        ...(actor ? this.leadScope(actor) : {}),
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        costs: true,
      },
      orderBy: { travelStartDate: 'asc' },
    });

    // Fetch all linked itineraries for active bookings
    const allItineraryIds = Array.from(
      new Set(activeBookings.map((b) => b.itineraryId).filter(Boolean) as string[]),
    );
    const itineraries =
      allItineraryIds.length > 0
        ? await this.prisma.itinerary.findMany({
            where: { id: { in: allItineraryIds } },
            include: {
              days: {
                include: {
                  items: {
                    include: {
                      vendor: { select: { id: true, name: true, type: true, city: true } },
                    },
                  },
                },
                orderBy: { dayNumber: 'asc' },
              },
            },
          })
        : [];
    const itineraryMap = new Map(itineraries.map((iti) => [iti.id, iti]));

    const allVendorIds = Array.from(
      new Set(
        activeBookings
          .flatMap((b) => b.costs)
          .map((c) => c.vendorId)
          .filter(Boolean) as string[],
      ),
    );
    const vendors =
      allVendorIds.length > 0
        ? await this.prisma.vendor.findMany({
            where: { id: { in: allVendorIds } },
            select: { id: true, name: true, type: true, city: true },
          })
        : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    const arrivals: any[] = [];
    const departures: any[] = [];
    const inTransit: any[] = [];
    const valleyDistribution = {
      leh: [] as any[],
      nubra: [] as any[],
      pangong: [] as any[],
      other: [] as any[],
    };

    let totalPaxInDestination = 0;
    let highPassCrossingsCount = 0;

    const targetYmd = (dateStr ? new Date(dateStr) : new Date())
      .toISOString()
      .slice(0, 10);
    const toYmd = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
    const toUtcDayNumber = (ymd: string) => {
      const [y, m, d] = ymd.split('-').map(Number);
      return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    };
    const targetDayNumber = toUtcDayNumber(targetYmd);

    for (const b of activeBookings) {
      const bStartYmd = b.travelStartDate ? toYmd(b.travelStartDate) : null;
      const bEndYmd = b.travelEndDate ? toYmd(b.travelEndDate) : null;
      const pax = (b.adults || 2) + (b.children || 0);
      totalPaxInDestination += pax;

      const isArrival = Boolean(bStartYmd && bStartYmd === targetYmd);
      const isDeparture = Boolean(bEndYmd && bEndYmd === targetYmd);

      const daysSinceStart = bStartYmd
        ? targetDayNumber - toUtcDayNumber(bStartYmd) + 1
        : 1;

      let currentValley = 'Unallocated';
      let currentHotel = 'Not scheduled';

      // --- TRUTHFUL LOCATION RESOLUTION FROM REAL ITINERARY ---
      const iti = b.itineraryId ? itineraryMap.get(b.itineraryId) : null;
      const matchedDay = iti?.days?.find(
        (d) => d.dayNumber === daysSinceStart || (d.date && toYmd(d.date) === targetYmd),
      );

      if (matchedDay) {
        // 1. Look for explicit STAY item in the itinerary day
        const stayItem = matchedDay.items.find(
          (i) =>
            i.kind === 'STAY' ||
            i.title.toLowerCase().includes('hotel') ||
            i.title.toLowerCase().includes('camp') ||
            i.title.toLowerCase().includes('resort'),
        );
        if (stayItem) {
          currentHotel = stayItem.vendor?.name ?? stayItem.title;
          currentValley = stayItem.vendor?.city ?? stayItem.location ?? matchedDay.city ?? 'Leh';
        } else if (matchedDay.city) {
          currentValley = matchedDay.city;
        }

        // 2. Check for genuine in-transit transfers scheduled for this day
        const transferItems = matchedDay.items.filter(
          (i) =>
            i.kind === 'TRANSFER' ||
            i.title.toLowerCase().includes('drive') ||
            i.title.toLowerCase().includes('transfer') ||
            i.title.toLowerCase().includes('pass'),
        );
        for (const t of transferItems) {
          const sector = t.title + (t.location ? ` (${t.location})` : '');
          inTransit.push({
            bookingId: b.id,
            bookingNumber: b.bookingNumber,
            guestName: b.lead.name,
            phone: b.lead.phone,
            pax,
            sector,
          });

          const sectorLower = (sector + ' ' + (t.description ?? '')).toLowerCase();
          const isPass =
            sectorLower.includes('khardung') ||
            sectorLower.includes('chang la') ||
            sectorLower.includes('baralacha') ||
            sectorLower.includes('tanglang') ||
            sectorLower.includes('fotu la') ||
            sectorLower.includes('namika') ||
            sectorLower.includes('zoji') ||
            sectorLower.includes('umling');
          if (isPass) {
            highPassCrossingsCount += pax;
          }
        }
      }

      // 3. Fallback to actual vendor costs if itinerary is unallocated or unlinked
      if (currentHotel === 'Not scheduled') {
        const hotelCosts = b.costs.filter((c) => {
          const v = c.vendorId ? vendorMap.get(c.vendorId) : null;
          return (
            v?.type === 'HOTEL' ||
            v?.type === 'CAMP' ||
            c.description?.toLowerCase().includes('hotel') ||
            c.description?.toLowerCase().includes('camp')
          );
        });

        if (isDeparture) {
          currentHotel = 'Airport Departure';
          currentValley = 'Leh';
        } else if (hotelCosts.length > 0) {
          const matchedCost =
            hotelCosts.find((c) => {
              const v = c.vendorId ? vendorMap.get(c.vendorId) : null;
              return (
                v?.city &&
                currentValley !== 'Unallocated' &&
                v.city.toLowerCase() === currentValley.toLowerCase()
              );
            }) || hotelCosts[0];

          if (matchedCost) {
            const v = matchedCost.vendorId ? vendorMap.get(matchedCost.vendorId) : null;
            currentHotel = v?.name ?? matchedCost.description ?? 'Not scheduled';
            if (currentValley === 'Unallocated') {
              currentValley = v?.city ?? (currentHotel.toLowerCase().includes('camp') ? 'Nubra Valley' : 'Leh');
            }
          }
        } else if (isArrival) {
          currentHotel = 'Arrival - Unallocated';
          currentValley = 'Leh';
        }
      }

      const guestCard = {
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        guestName: b.lead.name,
        phone: b.lead.phone,
        email: b.lead.email,
        pax,
        adults: b.adults,
        children: b.children,
        packageName: b.packageName,
        dayOfTrip: daysSinceStart,
        totalNights: b.nights,
        currentValley,
        currentHotel,
        travelStartDate: b.travelStartDate,
        travelEndDate: b.travelEndDate,
      };

      if (isArrival) arrivals.push(guestCard);
      if (isDeparture) departures.push(guestCard);

      const vLower = currentValley.toLowerCase();
      if (
        vLower.includes('nubra') ||
        vLower.includes('hunder') ||
        vLower.includes('diskit') ||
        vLower.includes('turtuk') ||
        vLower.includes('sumur')
      ) {
        valleyDistribution.nubra.push(guestCard);
      } else if (
        vLower.includes('pangong') ||
        vLower.includes('spangmik') ||
        vLower.includes('tangtse') ||
        vLower.includes('lukung') ||
        vLower.includes('merak')
      ) {
        valleyDistribution.pangong.push(guestCard);
      } else if (
        vLower.includes('leh') ||
        vLower.includes('sham') ||
        vLower.includes('indus') ||
        vLower.includes('shey') ||
        vLower.includes('thiksey') ||
        vLower.includes('alchi') ||
        vLower.includes('nimmu')
      ) {
        valleyDistribution.leh.push(guestCard);
      } else {
        // Hanle, Tso Moriri, Sarchu, Kargil, Zanskar, or Unallocated
        valleyDistribution.other.push(guestCard);
      }
    }

    return {
      date: target.toISOString().slice(0, 10),
      summary: {
        totalGuestsInDestination: totalPaxInDestination,
        activeBookingsCount: activeBookings.length,
        arrivalsToday: arrivals.length,
        departuresToday: departures.length,
        highPassCrossingsToday: highPassCrossingsCount,
      },
      arrivals,
      departures,
      inTransit,
      valleyDistribution,
    };
  }

  async handover(
    id: string,
    dto: HandoverBookingDto,
    actor: Actor,
  ) {
    await this.assertBookingAccess(id, actor);
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const opsUser = await this.prisma.user.findUnique({
      where: { id: dto.operationsOwnerId },
    });
    if (!opsUser) throw new NotFoundException('Operations executive not found');

    await this.prisma.booking.update({
      where: { id },
      data: {
        operationsOwnerId: dto.operationsOwnerId,
        handedOverAt: new Date(),
        handedOverById: actor.id,
        handoverNotes: dto.notes?.trim() || null,
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: booking.leadId,
        userId: actor.id,
        type: ActivityType.SYSTEM,
        content: `Trip handed over to Operations (${opsUser.name})${dto.notes ? `: "${dto.notes}"` : ''}`,
      },
    });

    return this.detail(id);
  }

  async verifyPayment(
    paymentId: string,
    status: 'VERIFIED' | 'REJECTED',
    actor: Actor,
  ) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.bookingPayment.update({
      where: { id: paymentId },
      data: {
        verificationStatus: status,
        verifiedById: actor.id,
        verifiedAt: new Date(),
      },
    });

    return { success: true, paymentId, status };
  }

  async getPaymentWorkQueue() {
    const [unverifiedPayments, upcomingBookings, pendingReservations] = await Promise.all([
      this.prisma.bookingPayment.findMany({
        where: { verificationStatus: 'PENDING_VERIFICATION' },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              packageName: true,
              lead: { select: { id: true, name: true, phone: true } },
            },
          },
          recordedBy: { select: { id: true, name: true } },
        },
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.booking.findMany({
        where: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.PENDING] },
        },
        select: {
          id: true,
          bookingNumber: true,
          packageName: true,
          totalSell: true,
          totalReceived: true,
          travelStartDate: true,
          lead: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { travelStartDate: 'asc' },
        take: 50,
      }),
      this.prisma.bookingCost.findMany({
        where: { confirmationStatus: 'PENDING' },
        include: {
          booking: { select: { id: true, bookingNumber: true, packageName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const overdueReceivables = upcomingBookings
      .filter((b) => b.totalSell > b.totalReceived)
      .map((b) => ({
        ...b,
        balanceDue: b.totalSell - b.totalReceived,
      }));

    return {
      unverifiedPayments,
      overdueReceivables,
      pendingReservations,
    };
  }
}
