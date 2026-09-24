import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { UpsertDayDto } from './dto/upsert-day.dto';
import { UpsertItemDto } from './dto/upsert-item.dto';
import { UpsertOptionDto } from './dto/upsert-option.dto';
import { UpsertPricingDto } from './dto/upsert-pricing.dto';
import { ReorderDto } from './dto/reorder.dto';
import { Actor, canSeeAllLeads } from '../common/access';
import { toDateOrNull } from '../common/dates';
import { withNumberRetry } from '../common/sequence';
import { SettingsService } from '../settings/settings.service';
import { SettingsLike } from '../common/pricing';
import {
  computeItemPricing,
  computeOptionTotals,
} from './itinerary-pricing';

/** Which kinds default to priceable when a new item is added. */
const PRICEABLE_KINDS = new Set(['STAY', 'TRANSFER', 'ACTIVITY', 'MEAL']);

@Injectable()
export class ItinerariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // --- access scoping ------------------------------------------------------
  //
  // An itinerary is client-facing — it doesn't leak cost or margin, so the
  // scoping is looser than quotes/bookings. Still per-lead: a sales exec
  // should not read another exec's itineraries because they contain the
  // client's travel plans and identity.

  private leadScope(actor: Actor): Prisma.ItineraryWhereInput {
    return canSeeAllLeads(actor.role) ? {} : { lead: { assignedToId: actor.id } };
  }

  private async assertItineraryAccess(id: string, actor: Actor) {
    if (canSeeAllLeads(actor.role)) return;
    const it = await this.prisma.itinerary.findUnique({
      where: { id },
      select: { lead: { select: { assignedToId: true } } },
    });
    if (!it || it.lead.assignedToId !== actor.id) {
      throw new NotFoundException('Itinerary not found');
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

  private async assertDayAccess(dayId: string, actor: Actor) {
    const day = await this.prisma.itineraryDay.findUnique({
      where: { id: dayId },
      select: { itineraryId: true },
    });
    if (!day) throw new NotFoundException('Day not found');
    await this.assertItineraryAccess(day.itineraryId, actor);
    return day.itineraryId;
  }

  private async assertItemAccess(itemId: string, actor: Actor) {
    const item = await this.prisma.itineraryItem.findUnique({
      where: { id: itemId },
      select: { day: { select: { itineraryId: true, date: true } } },
    });
    if (!item) throw new NotFoundException('Item not found');
    await this.assertItineraryAccess(item.day.itineraryId, actor);
    return item;
  }

  // --- code generation -----------------------------------------------------

  private async nextItineraryCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LV-ITI-${year}-`;
    const last = await this.prisma.itinerary.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(n).padStart(4, '0')}`;
  }

  // --- itineraries ---------------------------------------------------------

  async create(dto: CreateItineraryDto, actor: Actor) {
    await this.assertLeadAccess(dto.leadId, actor);
    // Number + insert inside the retry loop — race-safe.
    const created = await withNumberRetry(async () => {
      const code = await this.nextItineraryCode();
      return this.prisma.itinerary.create({
        data: {
          code,
          leadId: dto.leadId,
          title: dto.title,
          headline: dto.headline ?? null,
          intro: dto.intro ?? null,
          totalPax: dto.totalPax ?? 2,
          inclusions: dto.inclusions ?? null,
          exclusions: dto.exclusions ?? null,
          createdById: actor.id,
          // Every itinerary gets a default "Package" option so operators
          // who don't care about tiers see one price. They can rename it or
          // add more (Budget / Standard / Deluxe) when needed.
          options: {
            create: [
              { name: 'Package', sortOrder: 0, isRecommended: true },
            ],
          },
        },
      });
    });
    return created;
  }

  /** Free-text over code + title + client name for the ⌘K palette. */
  async search(q: string, actor: Actor) {
    return this.prisma.itinerary.findMany({
      where: {
        ...this.leadScope(actor),
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { lead: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        code: true,
        title: true,
        lead: { select: { name: true } },
      },
    });
  }

  findAll(leadId: string | undefined, actor: Actor) {
    return this.prisma.itinerary.findMany({
      where: {
        ...(leadId ? { leadId } : {}),
        ...this.leadScope(actor),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        _count: { select: { days: true } },
      },
    });
  }

  async findOne(id: string, actor: Actor) {
    await this.assertItineraryAccess(id, actor);
    const it = await this.prisma.itinerary.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, destination: true, travelDate: true } },
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                vendor: { select: { id: true, name: true, type: true } },
                pricing: true,
              },
            },
          },
        },
      },
    });
    if (!it) throw new NotFoundException('Itinerary not found');
    return it;
  }

  async update(id: string, dto: UpdateItineraryDto, actor: Actor) {
    await this.assertItineraryAccess(id, actor);
    const updated = await this.prisma.itinerary.update({
      where: { id },
      data: {
        ...(dto.title !== undefined      ? { title: dto.title } : {}),
        ...(dto.headline !== undefined   ? { headline: dto.headline } : {}),
        ...(dto.intro !== undefined      ? { intro: dto.intro } : {}),
        ...(dto.totalPax !== undefined   ? { totalPax: dto.totalPax } : {}),
        ...(dto.inclusions !== undefined ? { inclusions: dto.inclusions } : {}),
        ...(dto.exclusions !== undefined ? { exclusions: dto.exclusions } : {}),
      },
    });
    // Changing totalPax shifts per-person totals across every tier.
    if (dto.totalPax !== undefined) await this.recalcAllOptions(id);
    return updated;
  }

  async remove(id: string, actor: Actor) {
    await this.assertItineraryAccess(id, actor);
    await this.prisma.itinerary.delete({ where: { id } });
    return { deleted: true, id };
  }

  // --- days ----------------------------------------------------------------

  async addDay(itineraryId: string, dto: UpsertDayDto, actor: Actor) {
    await this.assertItineraryAccess(itineraryId, actor);
    // Append at the end unless a specific dayNumber was requested.
    const last = await this.prisma.itineraryDay.findFirst({
      where: { itineraryId },
      orderBy: { dayNumber: 'desc' },
      select: { dayNumber: true },
    });
    const dayNumber = dto.dayNumber ?? (last?.dayNumber ?? 0) + 1;
    return this.prisma.itineraryDay.create({
      data: {
        itineraryId,
        dayNumber,
        date: toDateOrNull(dto.date),
        city: dto.city ?? null,
        headline: dto.headline ?? null,
        summary: dto.summary ?? null,
      },
    });
  }

  async updateDay(dayId: string, dto: UpsertDayDto, actor: Actor) {
    await this.assertDayAccess(dayId, actor);
    return this.prisma.itineraryDay.update({
      where: { id: dayId },
      data: {
        ...(dto.city !== undefined     ? { city: dto.city } : {}),
        ...(dto.headline !== undefined ? { headline: dto.headline } : {}),
        ...(dto.summary !== undefined  ? { summary: dto.summary } : {}),
        ...(dto.date !== undefined     ? { date: toDateOrNull(dto.date) } : {}),
      },
    });
  }

  async removeDay(dayId: string, actor: Actor) {
    const itineraryId = await this.assertDayAccess(dayId, actor);
    await this.prisma.itineraryDay.delete({ where: { id: dayId } });
    // Re-sequence remaining days so numbering stays 1..N. If we skip this,
    // the client sees "Day 1, Day 3" after deleting the middle one, and the
    // unique (itineraryId, dayNumber) index keeps working, but the PDF
    // looks broken.
    await this.renumberDays(itineraryId);
    return { deleted: true, id: dayId };
  }

  /**
   * Re-sequence days 1..N in current dayNumber order. Runs in a transaction
   * to keep the unique constraint from tripping during the intermediate state
   * — we bump every day into the 9000+ range first, then back down. Ugly
   * but the standard trick for unique-column reordering.
   */
  private async renumberDays(itineraryId: string) {
    const days = await this.prisma.itineraryDay.findMany({
      where: { itineraryId },
      orderBy: { dayNumber: 'asc' },
      select: { id: true },
    });
    await this.prisma.$transaction([
      ...days.map((d, i) =>
        this.prisma.itineraryDay.update({
          where: { id: d.id },
          data: { dayNumber: 9000 + i },
        }),
      ),
      ...days.map((d, i) =>
        this.prisma.itineraryDay.update({
          where: { id: d.id },
          data: { dayNumber: i + 1 },
        }),
      ),
    ]);
  }

  async reorderDays(itineraryId: string, dto: ReorderDto, actor: Actor) {
    await this.assertItineraryAccess(itineraryId, actor);
    // Verify every id belongs to this itinerary — a maliciously-crafted
    // reorder must not touch someone else's days.
    const owned = await this.prisma.itineraryDay.findMany({
      where: { itineraryId, id: { in: dto.ids } },
      select: { id: true },
    });
    if (owned.length !== dto.ids.length) {
      throw new NotFoundException('One or more days do not belong to this itinerary');
    }
    // Same two-phase trick as renumberDays.
    await this.prisma.$transaction([
      ...dto.ids.map((id, i) =>
        this.prisma.itineraryDay.update({ where: { id }, data: { dayNumber: 9000 + i } }),
      ),
      ...dto.ids.map((id, i) =>
        this.prisma.itineraryDay.update({ where: { id }, data: { dayNumber: i + 1 } }),
      ),
    ]);
    return { reordered: dto.ids.length };
  }

  // --- items ---------------------------------------------------------------

  async addItem(dayId: string, dto: UpsertItemDto, actor: Actor) {
    const itineraryId = await this.assertDayAccess(dayId, actor);
    const last = await this.prisma.itineraryItem.findFirst({
      where: { dayId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    // priceable defaults from kind — STAY / TRANSFER / ACTIVITY / MEAL are
    // priced by default; SIGHTSEEING / FREE_TIME / NOTE are not. Operator
    // can flip either way via the DTO.
    const priceable = dto.priceable ?? PRICEABLE_KINDS.has(dto.kind);
    const created = await this.prisma.itineraryItem.create({
      data: {
        dayId,
        kind: dto.kind,
        title: dto.title,
        time: dto.time ?? null,
        description: dto.description ?? null,
        location: dto.location ?? null,
        vendorId: dto.vendorId ?? null,
        quantity: dto.quantity ?? 1,
        units: dto.units ?? 1,
        priceable,
        sortOrder: dto.sortOrder ?? (last?.sortOrder ?? -1) + 1,
      },
    });
    // Adding a priceable item with no pricing rows doesn't change totals,
    // but if the operator later flips priceable → true we DO need to recompute.
    // Cheap enough to always run.
    if (priceable) await this.recalcAllOptions(itineraryId);
    return created;
  }

  async updateItem(itemId: string, dto: UpsertItemDto, actor: Actor) {
    const item = await this.assertItemAccess(itemId, actor);
    const updated = await this.prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(dto.kind !== undefined        ? { kind: dto.kind } : {}),
        ...(dto.title !== undefined       ? { title: dto.title } : {}),
        ...(dto.time !== undefined        ? { time: dto.time } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.location !== undefined    ? { location: dto.location } : {}),
        ...(dto.quantity !== undefined    ? { quantity: dto.quantity } : {}),
        ...(dto.units !== undefined       ? { units: dto.units } : {}),
        ...(dto.priceable !== undefined   ? { priceable: dto.priceable } : {}),
        ...(dto.vendorId !== undefined
          ? {
              vendor: dto.vendorId
                ? { connect: { id: dto.vendorId } }
                : { disconnect: true },
            }
          : {}),
      },
    });
    // qty / units / priceable / kind all feed the line math — recompute.
    await this.recalcAllOptions(item.day.itineraryId);
    return updated;
  }

  async removeItem(itemId: string, actor: Actor) {
    const item = await this.assertItemAccess(itemId, actor);
    await this.prisma.itineraryItem.delete({ where: { id: itemId } });
    await this.recalcAllOptions(item.day.itineraryId);
    return { deleted: true, id: itemId };
  }

  async reorderItems(dayId: string, dto: ReorderDto, actor: Actor) {
    await this.assertDayAccess(dayId, actor);
    const owned = await this.prisma.itineraryItem.findMany({
      where: { dayId, id: { in: dto.ids } },
      select: { id: true },
    });
    if (owned.length !== dto.ids.length) {
      throw new NotFoundException('One or more items do not belong to this day');
    }
    // sortOrder isn't unique, so a single pass is safe.
    await this.prisma.$transaction(
      dto.ids.map((id, i) =>
        this.prisma.itineraryItem.update({ where: { id }, data: { sortOrder: i } }),
      ),
    );
    return { reordered: dto.ids.length };
  }

  // ==========================================================================
  // Options (tiers: Budget / Standard / Deluxe)
  // ==========================================================================

  private async assertOptionAccess(optionId: string, actor: Actor) {
    const opt = await this.prisma.itineraryOption.findUnique({
      where: { id: optionId },
      select: { itineraryId: true },
    });
    if (!opt) throw new NotFoundException('Option not found');
    await this.assertItineraryAccess(opt.itineraryId, actor);
    return opt.itineraryId;
  }

  async addOption(itineraryId: string, dto: UpsertOptionDto, actor: Actor) {
    await this.assertItineraryAccess(itineraryId, actor);
    const last = await this.prisma.itineraryOption.findFirst({
      where: { itineraryId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return this.prisma.itineraryOption.create({
      data: {
        itineraryId,
        name: dto.name ?? 'Option',
        sortOrder: dto.sortOrder ?? (last?.sortOrder ?? -1) + 1,
        isRecommended: dto.isRecommended ?? false,
        markupPercent: dto.markupPercent ?? null,
      },
    });
  }

  async updateOption(optionId: string, dto: UpsertOptionDto, actor: Actor) {
    const itineraryId = await this.assertOptionAccess(optionId, actor);
    await this.prisma.itineraryOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name !== undefined          ? { name: dto.name } : {}),
        ...(dto.sortOrder !== undefined     ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isRecommended !== undefined ? { isRecommended: dto.isRecommended } : {}),
        ...(dto.markupPercent !== undefined ? { markupPercent: dto.markupPercent } : {}),
      },
    });
    // Markup change ripples through every pricing row on this option.
    if (dto.markupPercent !== undefined) await this.recalcOption(optionId, itineraryId);
    return this.prisma.itineraryOption.findUnique({ where: { id: optionId } });
  }

  async removeOption(optionId: string, actor: Actor) {
    const itineraryId = await this.assertOptionAccess(optionId, actor);
    const count = await this.prisma.itineraryOption.count({ where: { itineraryId } });
    if (count <= 1) {
      // An itinerary without any option is meaningless in this model — the
      // options ARE the price surface. Refuse and let the operator rename
      // the last one instead.
      throw new BadRequestException('Cannot remove the last option — rename it instead.');
    }
    await this.prisma.itineraryOption.delete({ where: { id: optionId } });
    return { deleted: true, id: optionId };
  }

  /**
   * Clone an option with all its pricing rows — the "Duplicate as Deluxe"
   * flow: same vendor picks as Standard, operator then bumps rates.
   */
  async duplicateOption(optionId: string, newName: string, actor: Actor) {
    const itineraryId = await this.assertOptionAccess(optionId, actor);
    const src = await this.prisma.itineraryOption.findUnique({
      where: { id: optionId },
      include: { pricing: true },
    });
    if (!src) throw new NotFoundException('Option not found');

    const copy = await this.prisma.itineraryOption.create({
      data: {
        itineraryId,
        name: newName,
        sortOrder: src.sortOrder + 1,
        markupPercent: src.markupPercent,
      },
    });
    for (const p of src.pricing) {
      await this.prisma.itineraryItemPricing.create({
        data: {
          itemId: p.itemId,
          optionId: copy.id,
          vendorRateId: p.vendorRateId,
          vendorId: p.vendorId,
          unitNet: p.unitNet,
          markupPercent: p.markupPercent,
        },
      });
    }
    await this.recalcOption(copy.id, itineraryId);
    return this.prisma.itineraryOption.findUnique({ where: { id: copy.id } });
  }

  // ==========================================================================
  // Pricing (per item, per option)
  // ==========================================================================

  /**
   * Upsert the pricing cell for (item, option). If vendorRateId is present
   * we pull the stored rate's netRate — the operator picking a rate should
   * never be able to introduce a typo.
   */
  async upsertPricing(
    itemId: string,
    optionId: string,
    dto: UpsertPricingDto,
    actor: Actor,
  ) {
    const item = await this.assertItemAccess(itemId, actor);
    const optIt = await this.assertOptionAccess(optionId, actor);
    if (optIt !== item.day.itineraryId) {
      throw new BadRequestException('Item and option belong to different itineraries.');
    }

    let unitNet = dto.unitNet;
    let vendorId = dto.vendorId ?? null;
    if (dto.vendorRateId) {
      const rate = await this.prisma.vendorRate.findUnique({
        where: { id: dto.vendorRateId },
        select: { netRate: true, vendorId: true, isActive: true, validFrom: true, validTo: true, vendor: { select: { isActive: true } } },
      });
      if (!rate) throw new NotFoundException('Vendor rate not found');
      const today = item.day.date ?? new Date();
      if (!rate.isActive || !rate.vendor.isActive || (rate.validFrom && rate.validFrom > today) || (rate.validTo && rate.validTo < today)) {
        throw new BadRequestException('This supplier rate is inactive or outside its validity period. Confirm a current rate before quoting.');
      }
      unitNet = rate.netRate;
      vendorId = rate.vendorId;
    }
    if (unitNet === undefined || unitNet === null) {
      throw new BadRequestException('unitNet is required when no vendorRateId is provided.');
    }

    await this.prisma.itineraryItemPricing.upsert({
      where: { itemId_optionId: { itemId, optionId } },
      create: {
        itemId,
        optionId,
        vendorRateId: dto.vendorRateId ?? null,
        vendorId,
        unitNet,
        markupPercent: dto.markupPercent ?? null,
      },
      update: {
        vendorRateId: dto.vendorRateId ?? null,
        vendorId,
        unitNet,
        markupPercent: dto.markupPercent ?? null,
      },
    });

    return this.recalcOption(optionId, item.day.itineraryId);
  }

  async removePricing(itemId: string, optionId: string, actor: Actor) {
    const item = await this.assertItemAccess(itemId, actor);
    await this.assertOptionAccess(optionId, actor);
    await this.prisma.itineraryItemPricing.deleteMany({ where: { itemId, optionId } });
    await this.recalcOption(optionId, item.day.itineraryId);
    return { deleted: true, itemId, optionId };
  }

  // ==========================================================================
  // Totals recompute
  // ==========================================================================

  /**
   * Recompute lineNet/lineSell on every pricing row of the given option, then
   * roll totals up onto the option row. Called after every mutation that
   * affects money (pricing upsert, item qty/units change, option markup
   * change, item priceable toggle, item kind change).
   */
  private async recalcOption(optionId: string, itineraryId: string) {
    const [option, itinerary, s] = await Promise.all([
      this.prisma.itineraryOption.findUnique({ where: { id: optionId } }),
      this.prisma.itinerary.findUnique({
        where: { id: itineraryId },
        select: { totalPax: true },
      }),
      this.settings.getPricing() as unknown as Promise<SettingsLike>,
    ]);
    if (!option || !itinerary) throw new NotFoundException('Option not found');

    const items = await this.prisma.itineraryItem.findMany({
      where: { day: { itineraryId } },
      include: {
        pricing: { where: { optionId } },
      },
    });

    // Recompute + persist each pricing row, if it drifted.
    for (const item of items) {
      const priceRow = item.pricing[0] ?? null;
      if (!priceRow) continue;
      const { lineNet, lineSell } = computeItemPricing(item, priceRow, option, s);
      if (lineNet !== priceRow.lineNet || lineSell !== priceRow.lineSell) {
        await this.prisma.itineraryItemPricing.update({
          where: { id: priceRow.id },
          data: { lineNet, lineSell },
        });
      }
    }

    // Roll up totals.
    const rows = await this.prisma.itineraryItemPricing.findMany({
      where: { optionId },
      select: { lineNet: true, lineSell: true },
    });
    const totals = computeOptionTotals(rows, itinerary.totalPax);
    return this.prisma.itineraryOption.update({
      where: { id: optionId },
      data: totals,
    });
  }

  /** Recompute every option under an itinerary. Used when a shared field
   * changes (item qty/units/kind/priceable, itinerary totalPax). */
  private async recalcAllOptions(itineraryId: string) {
    const options = await this.prisma.itineraryOption.findMany({
      where: { itineraryId },
      select: { id: true },
    });
    for (const o of options) await this.recalcOption(o.id, itineraryId);
  }

  async getPublicView(token: string) {
    if (!token) throw new NotFoundException('Itinerary token is required');

    const itinerary = await this.prisma.itinerary.findFirst({
      where: {
        OR: [{ shareToken: token }, { code: token }, { id: token }],
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            destination: true,
            travelDate: true,
            nights: true,
            adults: true,
            children: true,
          },
        },
        options: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            isRecommended: true,
            perPersonSell: true,
            totalSell: true,
            sortOrder: true,
          },
        },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                kind: true,
                time: true,
                title: true,
                description: true,
                location: true,
                vendor: { select: { name: true, city: true, type: true } },
              },
            },
          },
        },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary not found or link has expired');
    }

    if (!itinerary.shareToken) {
      const generated = `lv-${itinerary.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      await this.prisma.itinerary.update({
        where: { id: itinerary.id },
        data: { shareToken: generated },
      });
      itinerary.shareToken = generated;
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [{ itineraryId: itinerary.id }, { leadId: itinerary.leadId }],
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
      },
    });

    const company = await this.prisma.companyProfile.findUnique({
      where: { id: 'default' },
    });

    return {
      id: itinerary.id,
      code: itinerary.code,
      shareToken: itinerary.shareToken,
      title: itinerary.title,
      headline: itinerary.headline,
      intro: itinerary.intro,
      totalPax: itinerary.totalPax,
      inclusions: itinerary.inclusions,
      exclusions: itinerary.exclusions,
      clientName: itinerary.lead.name,
      destination: itinerary.lead.destination ?? 'Ladakh',
      travelStartDate: itinerary.lead.travelDate,
      options: itinerary.options,
      days: itinerary.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        date: d.date,
        city: d.city,
        headline: d.headline,
        summary: d.summary,
        items: d.items.map((i) => ({
          id: i.id,
          kind: i.kind,
          time: i.time,
          title: i.title,
          description: i.description,
          location: i.location,
          hotelName: i.vendor?.name,
          hotelCity: i.vendor?.city,
        })),
      })),
      booking: booking
        ? {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
          }
        : null,
      company: {
        brandName: company?.brandName ?? 'Ladakh Vacation',
        phone: company?.phone ?? '+91 94191 78901',
        email: company?.email ?? 'reservations@ladakhvacation.in',
        website: company?.website ?? 'https://ladakhvacation.com',
      },
    };
  }

  async acceptOption(token: string, optionId: string, clientNotes?: string) {
    const itinerary = await this.prisma.itinerary.findFirst({
      where: {
        OR: [{ shareToken: token }, { code: token }, { id: token }],
      },
      include: {
        options: true,
        lead: true,
      },
    });
    if (!itinerary) throw new NotFoundException('Itinerary not found');

    const option = itinerary.options.find((o) => o.id === optionId);
    if (!option) throw new NotFoundException('Selected option not found');

    await this.prisma.activity.create({
      data: {
        leadId: itinerary.leadId,
        type: 'NOTE',
        content: `Traveler accepted "${option.name}" proposal (₹${option.totalSell.toLocaleString('en-IN')}) via Web Portal.${clientNotes ? ` Note: "${clientNotes}"` : ''}`,
      },
    });

    await this.prisma.lead.update({
      where: { id: itinerary.leadId },
      data: {
        status: 'INTERESTED',
      },
    });

    return {
      success: true,
      message: `Thank you! You have accepted the "${option.name}" package. Our Ladakh travel expert will contact you shortly with your confirmation and payment link.`,
    };
  }

  // --- revisions & snapshotting --------------------------------------------

  async createRevision(
    itineraryId: string,
    changeSummary: string | undefined,
    actor: Actor,
  ) {
    await this.assertItineraryAccess(itineraryId, actor);

    const it = await this.prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        lead: { select: { id: true, name: true } },
        options: {
          orderBy: { sortOrder: 'asc' },
          include: {
            pricing: true,
          },
        },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                vendor: { select: { id: true, name: true, type: true } },
                pricing: true,
              },
            },
          },
        },
      },
    });
    if (!it) throw new NotFoundException('Itinerary not found');

    const lastRev = await this.prisma.itineraryRevision.findFirst({
      where: { itineraryId },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const revisionNumber = (lastRev?.revisionNumber ?? 0) + 1;

    // Pick recommended or primary option for snapshot summary totals
    const primaryOption = it.options.find((o) => o.isRecommended) || it.options[0];
    const totalNet = primaryOption?.totalNet ?? 0;
    const totalSell = primaryOption?.totalSell ?? 0;
    const perPersonSell = primaryOption?.perPersonSell ?? 0;

    const snapshot = {
      title: it.title,
      headline: it.headline,
      intro: it.intro,
      totalPax: it.totalPax,
      inclusions: it.inclusions,
      exclusions: it.exclusions,
      options: it.options,
      days: it.days,
    };

    const revision = await this.prisma.itineraryRevision.create({
      data: {
        itineraryId,
        revisionNumber,
        title: `${it.code} (v${revisionNumber})`,
        totalPax: it.totalPax,
        snapshot: snapshot as any,
        totalNet,
        totalSell,
        perPersonSell,
        changeSummary: changeSummary ?? null,
        createdById: actor.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: it.leadId,
        type: 'NOTE',
        content: `Created quotation proposal version v${revisionNumber} (Total: ₹${totalSell.toLocaleString('en-IN')}${changeSummary ? ` - ${changeSummary}` : ''})`,
      },
    });

    return revision;
  }

  async listRevisions(itineraryId: string, actor: Actor) {
    await this.assertItineraryAccess(itineraryId, actor);
    return this.prisma.itineraryRevision.findMany({
      where: { itineraryId },
      orderBy: { revisionNumber: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getRevision(itineraryId: string, revisionId: string, actor: Actor) {
    await this.assertItineraryAccess(itineraryId, actor);
    const rev = await this.prisma.itineraryRevision.findUnique({
      where: { id: revisionId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!rev || rev.itineraryId !== itineraryId) {
      throw new NotFoundException('Revision not found');
    }
    return rev;
  }

  async restoreRevision(itineraryId: string, revisionId: string, actor: Actor) {
    await this.assertItineraryAccess(itineraryId, actor);
    const rev = await this.getRevision(itineraryId, revisionId, actor);
    const snapshot: any = rev.snapshot;
    if (!snapshot) throw new BadRequestException('Revision snapshot is empty');

    // 1. Update itinerary top-level fields
    await this.prisma.itinerary.update({
      where: { id: itineraryId },
      data: {
        title: snapshot.title,
        headline: snapshot.headline ?? null,
        intro: snapshot.intro ?? null,
        totalPax: snapshot.totalPax ?? 2,
        inclusions: snapshot.inclusions ?? null,
        exclusions: snapshot.exclusions ?? null,
      },
    });

    // 2. Clear current days (cascades to items and pricing)
    await this.prisma.itineraryDay.deleteMany({
      where: { itineraryId },
    });

    // 3. Recreate days and items from snapshot
    if (Array.isArray(snapshot.days)) {
      for (const d of snapshot.days) {
        const createdDay = await this.prisma.itineraryDay.create({
          data: {
            itineraryId,
            dayNumber: d.dayNumber,
            date: d.date ? new Date(d.date) : null,
            city: d.city ?? null,
            headline: d.headline ?? null,
            summary: d.summary ?? null,
          },
        });

        if (Array.isArray(d.items)) {
          for (const it of d.items) {
            await this.prisma.itineraryItem.create({
              data: {
                dayId: createdDay.id,
                kind: it.kind,
                time: it.time ?? null,
                title: it.title,
                description: it.description ?? null,
                location: it.location ?? null,
                vendorId: it.vendorId ?? null,
                quantity: it.quantity ?? 1,
                units: it.units ?? 1,
                priceable: it.priceable ?? false,
                sortOrder: it.sortOrder ?? 0,
              },
            });
          }
        }
      }
    }

    // 4. Recalculate options
    await this.recalcAllOptions(itineraryId);

    // 5. Create a new revision noting the restoration
    await this.createRevision(
      itineraryId,
      `Restored state from historical version v${rev.revisionNumber}`,
      actor,
    );

    return this.findOne(itineraryId, actor);
  }

  async compareRevisions(
    itineraryId: string,
    revIdA: string,
    revIdB: string,
    actor: Actor,
  ) {
    await this.assertItineraryAccess(itineraryId, actor);
    const [revA, revB] = await Promise.all([
      this.getRevision(itineraryId, revIdA, actor),
      this.getRevision(itineraryId, revIdB, actor),
    ]);

    const snapA: any = revA.snapshot ?? {};
    const snapB: any = revB.snapshot ?? {};

    const daysA = Array.isArray(snapA.days) ? snapA.days.length : 0;
    const daysB = Array.isArray(snapB.days) ? snapB.days.length : 0;

    return {
      revisionA: {
        id: revA.id,
        version: revA.revisionNumber,
        totalSell: revA.totalSell,
        totalNet: revA.totalNet,
        totalPax: revA.totalPax,
        daysCount: daysA,
      },
      revisionB: {
        id: revB.id,
        version: revB.revisionNumber,
        totalSell: revB.totalSell,
        totalNet: revB.totalNet,
        totalPax: revB.totalPax,
        daysCount: daysB,
      },
      delta: {
        sellDiff: revB.totalSell - revA.totalSell,
        netDiff: revB.totalNet - revA.totalNet,
        marginDiff: (revB.totalSell - revB.totalNet) - (revA.totalSell - revA.totalNet),
        daysDiff: daysB - daysA,
      },
    };
  }
}
