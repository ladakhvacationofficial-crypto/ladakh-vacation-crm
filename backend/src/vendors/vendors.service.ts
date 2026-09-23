import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Season } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { canSeeVendorContacts } from '../common/access';

/** Fields stripped from vendors for roles without contact access. */
const SENSITIVE_FIELDS = [
  'contactPerson',
  'phone',
  'altPhone',
  'email',
  'bankName',
  'accountNumber',
  'ifsc',
] as const;

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Supplier protection: strip direct contact + bank details unless the
   * viewer's role is allowed them. Rates are never stripped — staff need
   * them to quote.
   */
  private redact<T extends Record<string, any>>(vendor: T, role: Role): T {
    if (canSeeVendorContacts(role)) return vendor;
    const copy: Record<string, any> = { ...vendor };
    for (const f of SENSITIVE_FIELDS) copy[f] = null;
    copy.contactRedacted = true;
    return copy as T;
  }

  /**
   * Where-fragment matching rates whose contract period covers `on`.
   * Null validFrom/validTo mean "open ended" and always match — a rate with no
   * dates is undated, not expired.
   */
  private validOn(on: Date): Prisma.VendorRateWhereInput {
    return {
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: on } }] },
        { OR: [{ validTo: null }, { validTo: { gte: on } }] },
      ],
    };
  }

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({ data: { ...dto } });
  }

  async findAll(q: QueryVendorsDto, role: Role) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const on = q.on ? new Date(q.on) : new Date();

    const where: Prisma.VendorWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.city) where.city = { contains: q.city, mode: 'insensitive' };
    if (q.activeOnly !== 'false') where.isActive = true;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { area: { contains: q.search, mode: 'insensitive' } },
        { contactPerson: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.vendor.count({ where }),
      this.prisma.vendor.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          // Browsing view — only rates you can actually sell today.
          // The management view (listRates / findOne) still shows every rate
          // so ops can renew expired contracts.
          rates: {
            where: {
              isActive: true,
              ...(q.season ? { season: q.season } : {}),
              ...this.validOn(on),
            },
            orderBy: [{ season: 'asc' }, { netRate: 'asc' }],
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      data: rows.map((v) => this.redact(v, role)),
    };
  }

  /** Free-text search — name/area/contact for the ⌘K palette. */
  async search(q: string) {
    return this.prisma.vendor.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { area: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 8,
      select: { id: true, name: true, type: true, city: true },
    });
  }

  async findOne(id: string, role: Role) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        rates: { orderBy: [{ season: 'asc' }, { variant: 'asc' }] },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.redact(vendor, role);
  }

  /**
   * Supplier ledger — every BookingCost row we've ever raised for this vendor,
   * plus the running totals. Answers "how much business has Hotel X actually
   * done with us this year, and what do we still owe them" without the ops
   * team stitching bookings together in a spreadsheet.
   *
   * Optional [from, to] range filters by BookingCost.createdAt (when the
   * cost was recorded, not when travel happened — matches how vendor
   * statements are usually reconciled).
   */
  async ledger(id: string, params: { from?: string; to?: string }) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, city: true, isActive: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const range: Prisma.DateTimeFilter = {};
    if (params.from) range.gte = new Date(params.from);
    if (params.to) range.lte = new Date(params.to);
    const hasRange = params.from !== undefined || params.to !== undefined;

    const rows = await this.prisma.bookingCost.findMany({
      where: {
        vendorId: id,
        ...(hasRange ? { createdAt: range } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            packageName: true,
            travelStartDate: true,
            status: true,
            lead: { select: { name: true } },
          },
        },
      },
    });

    let totalDue = 0;
    let totalPaid = 0;
    for (const r of rows) {
      totalDue += r.amountDue;
      totalPaid += r.amountPaid;
    }

    return {
      vendor,
      totals: {
        rowCount: rows.length,
        totalDue,
        totalPaid,
        outstanding: Math.max(0, totalDue - totalPaid),
      },
      rows: rows.map((r: any) => ({
        id: r.id,
        createdAt: r.createdAt,
        description: r.description,
        amountDue: r.amountDue,
        amountPaid: r.amountPaid,
        paidAt: r.paidAt,
        reference: r.reference,
        notes: r.notes,
        booking: {
          id: r.booking.id,
          bookingNumber: r.booking.bookingNumber,
          packageName: r.booking.packageName,
          travelStartDate: r.booking.travelStartDate,
          status: r.booking.status,
          clientName: r.booking.lead.name,
        },
      })),
    };
  }

  async update(id: string, dto: UpdateVendorDto) {
    const exists = await this.prisma.vendor.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({ where: { id }, data: { ...dto } });
  }

  async deactivate(id: string) {
    const exists = await this.prisma.vendor.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Vendor not found');

    // Block if we still owe them money — deactivating a vendor with
    // outstanding payables makes the balance disappear from most default
    // filters and the ops team has walked into that trap before.
    const outstanding = await this.prisma.bookingCost.aggregate({
      where: { vendorId: id },
      _sum: { amountDue: true, amountPaid: true },
    });
    const due = outstanding._sum.amountDue ?? 0;
    const paid = outstanding._sum.amountPaid ?? 0;
    if (due - paid > 0) {
      throw new BadRequestException(
        `Cannot deactivate: outstanding balance of ₹${(
          due - paid
        ).toLocaleString('en-IN')}. Settle the ledger first.`,
      );
    }

    return this.prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- rates ---------------------------------------------------------------

  async addRate(vendorId: string, dto: CreateRateDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.vendorRate.create({
      data: {
        vendorId,
        variant: dto.variant,
        season: dto.season,
        mealPlan: dto.mealPlan ?? null,
        rateBasis: dto.rateBasis ?? undefined,
        netRate: dto.netRate,
        rackRate: dto.rackRate ?? null,
        extraBedRate: dto.extraBedRate ?? null,
        childRate: dto.childRate ?? null,
        maxOccupancy: dto.maxOccupancy ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listRates(vendorId: string) {
    return this.prisma.vendorRate.findMany({
      where: { vendorId },
      orderBy: [{ season: 'asc' }, { variant: 'asc' }, { netRate: 'asc' }],
    });
  }

  async updateRate(rateId: string, dto: UpdateRateDto) {
    const exists = await this.prisma.vendorRate.findUnique({
      where: { id: rateId },
    });
    if (!exists) throw new NotFoundException('Rate not found');

    const data: Record<string, any> = { ...dto };
    if (dto.validFrom !== undefined)
      data.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validTo !== undefined)
      data.validTo = dto.validTo ? new Date(dto.validTo) : null;

    return this.prisma.vendorRate.update({ where: { id: rateId }, data });
  }

  async removeRate(rateId: string) {
    const exists = await this.prisma.vendorRate.findUnique({
      where: { id: rateId },
    });
    if (!exists) throw new NotFoundException('Rate not found');
    await this.prisma.vendorRate.delete({ where: { id: rateId } });
    return { deleted: true, id: rateId };
  }

  /**
   * Rate lookup for quoting: "Deluxe camps in Nubra, peak season, MAP".
   * Returns rates with their vendor (redacted per role).
   *
   * Only rates whose contract period covers `on` (default: today) are
   * returned. Quoting last season's expired rate is how a 20% margin file
   * lands at 4%.
   */
  async searchRates(
    params: {
      city?: string;
      type?: any;
      season?: any;
      variant?: string;
      maxNet?: number;
      /** ISO date the rate must be valid on. Defaults to today. */
      on?: string;
    },
    role: Role,
  ) {
    const on = params.on ? new Date(params.on) : new Date();

    const rates = await this.prisma.vendorRate.findMany({
      where: {
        isActive: true,
        ...this.validOn(on),
        ...(params.season ? { season: params.season } : {}),
        ...(params.variant
          ? { variant: { contains: params.variant, mode: 'insensitive' } }
          : {}),
        ...(params.maxNet ? { netRate: { lte: params.maxNet } } : {}),
        vendor: {
          isActive: true,
          ...(params.city
            ? { city: { contains: params.city, mode: 'insensitive' } }
            : {}),
          ...(params.type ? { type: params.type } : {}),
        },
      },
      orderBy: [{ netRate: 'asc' }],
      take: 100,
      include: { vendor: true },
    });

    return rates.map((r: any) => ({
      ...r,
      vendor: this.redact(r.vendor, role),
    }));
  }

  /**
   * Dynamically derives the minimum baseline cost floor per person per night for packages,
   * calculated directly from active entered hotel and transport supplier rates + markup settings.
   */
  async getCostFloor(season?: Season) {
    const [hotelRate, transportRate, settings] = await Promise.all([
      this.prisma.vendorRate.findFirst({
        where: {
          isActive: true,
          vendor: { type: { in: ['HOTEL', 'CAMP', 'HOUSEBOAT'] }, isActive: true },
          ...(season ? { season } : {}),
        },
        orderBy: [{ netRate: 'asc' }],
        select: { netRate: true },
      }),
      this.prisma.vendorRate.findFirst({
        where: {
          isActive: true,
          vendor: { type: 'TRANSPORT', isActive: true },
          ...(season ? { season } : {}),
        },
        orderBy: [{ netRate: 'asc' }],
        select: { netRate: true },
      }),
      this.prisma.pricingSettings.findUnique({
        where: { id: 'default' },
        select: { defaultMarkupPercent: true, minMarginPercent: true },
      }),
    ]);

    const markup = (settings?.defaultMarkupPercent ?? 20) / 100;
    const hasHotelRate = Boolean(hotelRate?.netRate);
    const hasTransportRate = Boolean(transportRate?.netRate);

    // Baseline fallbacks if no rates are entered yet:
    // Peak season: Hotel ~₹2500, Cab ~₹3500; Shoulder: ~₹2000/₹3000; Off/Winter: ~₹1500/₹2500.
    const defaultHotelNet = season === 'OFF' ? 1500 : season === 'SHOULDER' ? 2000 : 2500;
    const defaultTransportNet = season === 'OFF' ? 2500 : season === 'SHOULDER' ? 3000 : 3500;

    const minHotelRate = hotelRate?.netRate ?? defaultHotelNet;
    const minTransportRate = transportRate?.netRate ?? defaultTransportNet;

    // Standard double-occupancy room (2 pax) + vehicle (2 pax):
    const netPerPaxNight = Math.round((minHotelRate / 2) + (minTransportRate / 2));
    const minBudgetPerPaxNight = Math.round(netPerPaxNight * (1 + markup));

    return {
      season: season ?? null,
      minHotelRate,
      minTransportRate,
      netPerPaxNight,
      minBudgetPerPaxNight,
      hasRealRates: hasHotelRate || hasTransportRate,
      markupPercent: Math.round(markup * 100),
    };
  }
}
