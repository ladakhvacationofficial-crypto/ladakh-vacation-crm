import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * All-agency reports. Every endpoint accepts an optional [from, to] range;
 * when neither is set we return "everything on record". Numbers are computed
 * on demand — no denormalised report tables — because volume for a DMC is
 * modest (hundreds of bookings a year, not millions).
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const r: Prisma.DateTimeFilter = {};
    if (from) r.gte = new Date(from);
    if (to)   r.lte = new Date(to);
    return r;
  }

  // ------------------------------------------------------------------------
  // Revenue by month — line chart on the frontend
  // ------------------------------------------------------------------------
  async revenueTrend(from?: string, to?: string) {
    const range = this.range(from, to);
    // Postgres date_trunc groups cleanly; Prisma's aggregate doesn't do
    // "group by month" directly without raw SQL.
    // status filter excludes cancelled bookings from the trend — a
    // cancellation isn't revenue.
    const rows = await this.prisma.$queryRawUnsafe<
      { month: Date; revenue: bigint; bookings: bigint }[]
    >(
      `SELECT date_trunc('month', "createdAt") AS month,
              SUM("totalSell")::bigint         AS revenue,
              COUNT(*)::bigint                 AS bookings
         FROM "Booking"
         WHERE "status" <> 'CANCELLED'
         ${range?.gte ? 'AND "createdAt" >= $1' : ''}
         ${range?.lte ? `AND "createdAt" <= $${range?.gte ? 2 : 1}` : ''}
         GROUP BY month
         ORDER BY month ASC`,
      ...(range?.gte ? [range.gte] : []),
      ...(range?.lte ? [range.lte] : []),
    );
    return rows.map((r) => ({
      month: r.month.toISOString().slice(0, 7),
      revenue: Number(r.revenue ?? 0),
      bookings: Number(r.bookings ?? 0),
    }));
  }

  // ------------------------------------------------------------------------
  // Top staff — leads, bookings, revenue, conversion per sales exec
  // ------------------------------------------------------------------------
  async topStaff(from?: string, to?: string) {
    const range = this.range(from, to);
    const leadRange = range ? { createdAt: range } : {};
    const bookingRange = range ? { createdAt: range } : {};

    // Two grouped queries + one user lookup, then merge in JS.
    const [users, leadsByAssignee, leadsConverted, bookings] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { not: null }, ...leadRange },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { not: null }, status: 'CONFIRMED', ...leadRange },
        _count: { _all: true },
      }),
      this.prisma.booking.findMany({
        where: {
          status: { not: 'CANCELLED' },
          ...bookingRange,
        },
        select: {
          totalSell: true,
          totalNet: true,
          createdById: true,
          lead: { select: { assignedToId: true } },
        },
      }),
    ]);

    const leadsMap = new Map(
      leadsByAssignee.map((r: any) => [r.assignedToId, r._count._all]),
    );
    const convertedMap = new Map(
      leadsConverted.map((r: any) => [r.assignedToId, r._count._all]),
    );
    const bookingMap = new Map<string, { count: number; revenue: number; estCost: number }>();
    for (const b of bookings) {
      // Attribute sales revenue to the sales rep who owns the lead; fallback to createdById if unassigned
      const creditedUserId = b.lead?.assignedToId ?? b.createdById;
      if (!creditedUserId) continue;
      const cur = bookingMap.get(creditedUserId) ?? { count: 0, revenue: 0, estCost: 0 };
      cur.count += 1;
      cur.revenue += b.totalSell ?? 0;
      cur.estCost += b.totalNet ?? 0;
      bookingMap.set(creditedUserId, cur);
    }

    return users
      .map((u: any) => {
        const leadsAssigned = leadsMap.get(u.id) ?? 0;
        const leadsConvertedCount = convertedMap.get(u.id) ?? 0;
        const b = bookingMap.get(u.id) ?? { count: 0, revenue: 0, estCost: 0 };
        return {
          userId: u.id,
          name: u.name,
          role: u.role,
          leadsAssigned,
          leadsConverted: leadsConvertedCount,
          conversionPercent:
            leadsAssigned > 0 ? (leadsConvertedCount / leadsAssigned) * 100 : 0,
          bookings: b.count,
          revenue: b.revenue,
          grossProfit: b.revenue - b.estCost,
          averageDeal: b.count > 0 ? Math.round(b.revenue / b.count) : 0,
        };
      })
      // Hide users with nothing to report so the list stays useful.
      .filter((r) => r.leadsAssigned > 0 || r.bookings > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ------------------------------------------------------------------------
  // Vendor / hotel usage — where the money is actually going
  // ------------------------------------------------------------------------
  async vendorSpend(from?: string, to?: string) {
    const range = this.range(from, to);

    // Sum BookingCost per vendor. We use amountDue not amountPaid because the
    // report is about total business volume with each supplier, not just
    // what's cleared through the bank.
    const grouped = await this.prisma.bookingCost.groupBy({
      by: ['vendorId'],
      where: {
        vendorId: { not: null },
        ...(range ? { createdAt: range } : {}),
      },
      _count: { _all: true },
      _sum: { amountDue: true, amountPaid: true },
    });
    if (grouped.length === 0) return [];

    const vendorIds = grouped
      .map((g: any) => g.vendorId)
      .filter((id: string | null): id is string => id !== null);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true, type: true, city: true },
    });
    const map = new Map(vendors.map((v: any) => [v.id, v]));

    return grouped
      .map((g: any) => {
        const v = map.get(g.vendorId);
        if (!v) return null;
        const amountDue = g._sum.amountDue ?? 0;
        const amountPaid = g._sum.amountPaid ?? 0;
        return {
          vendorId: g.vendorId,
          name: v.name,
          type: v.type,
          city: v.city,
          lineCount: g._count._all,
          amountDue,
          amountPaid,
          outstanding: Math.max(0, amountDue - amountPaid),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.amountDue - a.amountDue);
  }

  // ------------------------------------------------------------------------
  // Cancellation rate + status mix
  // ------------------------------------------------------------------------
  async cancellations(from?: string, to?: string) {
    const range = this.range(from, to);
    const byStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where: range ? { createdAt: range } : {},
      _count: { _all: true },
      _sum: { totalSell: true },
    });

    let total = 0;
    let cancelled = 0;
    let lostRevenue = 0;
    const buckets: { status: string; count: number; revenue: number }[] = [];
    for (const b of byStatus as any[]) {
      const count = b._count._all;
      const revenue = b._sum.totalSell ?? 0;
      total += count;
      if (b.status === 'CANCELLED') {
        cancelled += count;
        lostRevenue += revenue;
      }
      buckets.push({ status: b.status, count, revenue });
    }

    return {
      total,
      cancelled,
      cancellationPercent: total > 0 ? (cancelled / total) * 100 : 0,
      lostRevenue,
      byStatus: buckets.sort((a, b) => b.count - a.count),
    };
  }

  // ------------------------------------------------------------------------
  // Lead source mix — where the funnel is filling from
  // ------------------------------------------------------------------------
  async leadSources(from?: string, to?: string) {
    const range = this.range(from, to);
    const rows = await this.prisma.lead.groupBy({
      by: ['source'],
      where: range ? { createdAt: range } : {},
      _count: { _all: true },
    });
    const total = rows.reduce((a: number, r: any) => a + r._count._all, 0);
    return rows
      .map((r: any) => ({
        source: r.source,
        count: r._count._all,
        percent: total > 0 ? (r._count._all / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
