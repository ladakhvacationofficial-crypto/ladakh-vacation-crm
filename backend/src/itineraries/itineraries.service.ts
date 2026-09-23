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
      select: { day: { select: { itineraryId: true } } },
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
        select: { netRate: true, vendorId: true, isActive: true },
      });
      if (!rate) throw new NotFoundException('Vendor rate not found');
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
}
