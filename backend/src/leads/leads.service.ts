import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityType, LeadSource, LeadStatus, Prisma, Season } from '@prisma/client';
import * as Papa from 'papaparse';
import { IntegrationsService } from '../integrations/integrations.service';
import { WhatsAppService } from '../integrations/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { scoreLead } from './lead-scoring';
import { computeNextFollowUp, isBreached } from './follow-up-cadence';
import { Actor, canAssignLeads, canSeeAllLeads } from '../common/access';
import { toDateOrNull, parseTravelDate, LadakhSeason } from '../common/dates';
import { AttributionService } from '../attribution/attribution.service';
import { AssignmentService } from './assignment.service';
import { LeadNurturingService } from './lead-nurturing.service';

/** Extra request context the controller extracts (not client-supplied). */
export interface CaptureContext {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
}

const DEDUPE_WINDOW_DAYS = 30;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaBreaches() {
    const now = new Date();
    const breached = await this.prisma.lead.findMany({
      where: {
        nextFollowUp: { lte: now },
        slaBreachAt: null,
        status: { notIn: [LeadStatus.CONFIRMED, LeadStatus.LOST, LeadStatus.CANCELLED] },
      },
      select: { id: true },
    });

    if (breached.length > 0) {
      const ids = breached.map(b => b.id);
      await this.prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { slaBreachAt: now },
      });

      const activities = ids.map(leadId => ({
        leadId,
        type: 'SYSTEM' as any,
        content: 'SLA breached. Follow-up is overdue.'
      }));
      await this.prisma.activity.createMany({ data: activities });
    }
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly attribution: AttributionService,
    private readonly assignment: AssignmentService,
    private readonly nurturing: LeadNurturingService,
    @Inject(forwardRef(() => IntegrationsService))
    private readonly integrations: IntegrationsService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Sales execs may only touch leads assigned to them.
   * 404 (not 403) so they cannot probe which lead ids exist.
   */
  private assertCanTouch(lead: { assignedToId: string | null }, actor: Actor) {
    if (canSeeAllLeads(actor.role)) return;
    if (lead.assignedToId !== actor.id) {
      throw new NotFoundException('Lead not found');
    }
  }

  /** Normalise a phone to digits so "+91 98765 43210" == "9876543210". */
  private normalisePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  /**
   * Title-case a free-form destination string so "ladakh", "LADAKH", and
   * "Ladakh" all render as one label in the leads list. Preserves the
   * word "and"/"&" small on multi-word entries.
   */
  private normaliseDestination(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) return null;
    return trimmed
      .toLowerCase()
      .split(' ')
      .map((w) => (w === 'and' || w === '&' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  /**
   * Helper to derive the current per-pax/night budget floor from entered supplier rates (hotels + cabs)
   * and company pricing settings. Falls back gracefully to standard Ladakh baselines if rates are not yet configured.
   */
  async getEstimatedBudgetFloor(season?: LadakhSeason): Promise<number> {
    try {
      const dbSeason = season === 'PRIME' ? Season.PEAK : season === 'SHOULDER' ? Season.SHOULDER : season === 'WINTER' ? Season.OFF : undefined;
      const [hotelRate, transportRate, settings] = await Promise.all([
        this.prisma.vendorRate.findFirst({
          where: {
            isActive: true,
            vendor: { type: { in: ['HOTEL', 'CAMP', 'HOUSEBOAT'] }, isActive: true },
            ...(dbSeason ? { season: dbSeason } : {}),
          },
          orderBy: [{ netRate: 'asc' }],
          select: { netRate: true },
        }),
        this.prisma.vendorRate.findFirst({
          where: {
            isActive: true,
            vendor: { type: 'TRANSPORT', isActive: true },
            ...(dbSeason ? { season: dbSeason } : {}),
          },
          orderBy: [{ netRate: 'asc' }],
          select: { netRate: true },
        }),
        this.prisma.pricingSettings.findUnique({
          where: { id: 'default' },
          select: { defaultMarkupPercent: true },
        }),
      ]);

      const markup = (settings?.defaultMarkupPercent ?? 20) / 100;
      const defaultHotelNet = season === 'WINTER' ? 1500 : season === 'SHOULDER' ? 2000 : 2500;
      const defaultTransportNet = season === 'WINTER' ? 2500 : season === 'SHOULDER' ? 3000 : 3500;

      const minHotelRate = hotelRate?.netRate ?? defaultHotelNet;
      const minTransportRate = transportRate?.netRate ?? defaultTransportNet;

      const netPerPaxNight = Math.round((minHotelRate / 2) + (minTransportRate / 2));
      return Math.round(netPerPaxNight * (1 + markup));
    } catch {
      return season === 'PRIME' ? 2500 : season === 'SHOULDER' ? 2000 : 1600;
    }
  }

  async capture(dto: CaptureLeadDto, ctx: CaptureContext) {
    // Load the visit early so its stored attribution wins over anything the
    // form fields might carry — the URL had ground truth, form values can be
    // spoofed with copy-paste. `pick` is DTO-first, visit-fallback.
    const visit = dto.visitId
      ? await this.attribution.findVisit(dto.visitId)
      : null;
    // DTO-first, visit-fallback. Typed loose on purpose — both sides share the
    // same attribution field names, but they live on different types.
    const v = visit as any;
    const pick = (key: string): string | null | undefined =>
      (dto as any)[key] ?? (v ? v[key] : undefined);

    const phoneKey = this.normalisePhone(dto.phone);
    const since = new Date();
    since.setDate(since.getDate() - DEDUPE_WINDOW_DAYS);

    // Title-case the destination so "ladakh", "LADAKH" and "Ladakh" all
    // group as one label in the leads list. Mutates once so every downstream
    // write sees the normalised value.
    const normalisedDest = this.normaliseDestination(dto.destination);
    dto.destination = normalisedDest ?? undefined;

    // --- dedupe: same phone inside the window is a RE-ENQUIRY, not a new lead
    const existing = await this.prisma.lead.findFirst({
      where: { phone: { endsWith: phoneKey }, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const enquiryCount = existing.enquiryCount + 1;
      const effTravelDate = existing.travelDate ?? (dto.travelDate ? parseTravelDate(dto.travelDate).date : null);
      const effSeason = effTravelDate ? parseTravelDate(effTravelDate).season : undefined;
      const floor = await this.getEstimatedBudgetFloor(effSeason);
      const { score, notes } = scoreLead({
        source: existing.source,
        email: dto.email ?? existing.email,
        message: dto.message ?? existing.message,
        destination: dto.destination ?? existing.destination,
        travelDate: effTravelDate,
        season: effSeason,
        budget: dto.budget ?? existing.budget,
        nights: dto.nights ?? existing.nights,
        adults: dto.adults ?? existing.adults,
        gclid: dto.gclid ?? existing.gclid,
        fbclid: dto.fbclid ?? existing.fbclid,
        enquiryCount,
        minBudgetPerPaxNight: floor,
      });

      const updated = await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          enquiryCount,
          score,
          scoreNotes: notes,
          // fill blanks only — never overwrite what staff already corrected
          email: existing.email ?? dto.email ?? null,
          destination: existing.destination ?? dto.destination ?? null,
          message: existing.message ?? dto.message ?? null,
        },
      });

      await this.prisma.activity.create({
        data: {
          leadId: existing.id,
          type: ActivityType.RE_ENQUIRY,
          content:
            `Re-enquiry #${enquiryCount} from ${dto.source ?? 'unknown source'}` +
            (dto.landingPage ? ` via ${dto.landingPage}` : '') +
            (dto.message ? ` — "${dto.message.slice(0, 200)}"` : ''),
        },
      });

      return { duplicate: true, leadId: updated.id, score: updated.score };
    }

    // --- new lead
    const { date: parsedTravelDate, season } = parseTravelDate(dto.travelDate);
    const minBudgetPerPaxNight = await this.getEstimatedBudgetFloor(season);
    let leadMessage = dto.message ?? null;
    if (dto.travelDate && !parsedTravelDate) {
      leadMessage = leadMessage ? `${leadMessage} | Preferred Time: ${dto.travelDate}` : `Preferred Time: ${dto.travelDate}`;
    }

    const { score, notes } = scoreLead({
      source: dto.source,
      email: dto.email,
      message: dto.message ?? undefined,
      destination: dto.destination,
      travelDate: parsedTravelDate,
      season,
      budget: dto.budget,
      nights: dto.nights,
      adults: dto.adults,
      gclid: dto.gclid,
      fbclid: dto.fbclid,
      enquiryCount: 1,
      minBudgetPerPaxNight,
    });

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        city: dto.city ?? null,
        country: dto.country ?? null,
        destination: dto.destination ?? null,
        travelDate: parsedTravelDate,
        nights: dto.nights ?? null,
        adults: dto.adults ?? null,
        children: dto.children ?? null,
        budget: dto.budget ?? null,
        message: leadMessage,
        tags: dto.tags ?? [],
        source: dto.source ?? LeadSource.OTHER,
        status: LeadStatus.NEW,
        score,
        scoreNotes: notes,
        // First-contact SLA starts ticking immediately (5 min).
        nextFollowUp: computeNextFollowUp(LeadStatus.NEW, new Date()),
        utmSource: pick('utmSource') ?? null,
        utmMedium: pick('utmMedium') ?? null,
        utmCampaign: pick('utmCampaign') ?? dto.campaign ?? null,
        utmTerm: pick('utmTerm') ?? null,
        utmContent: pick('utmContent') ?? null,
        gclid: pick('gclid') ?? null,
        fbclid: pick('fbclid') ?? null,
        landingPage: dto.landingPage ?? visit?.pagePath ?? null,
        referrer: pick('referrer') ?? null,
        keyword: pick('keyword') ?? null,
        device: ctx.device ?? visit?.device ?? null,
        userAgent: ctx.userAgent ?? visit?.userAgent ?? null,
        ipAddress: ctx.ipAddress ?? visit?.ipAddress ?? null,
        visitId: visit?.id ?? null,
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: lead.id,
        type: ActivityType.SYSTEM,
        content: `Lead captured from ${lead.source}${
          dto.landingPage ? ` (${dto.landingPage})` : ''
        }. Score ${score} [${notes}]`,
      },
    });

    // Auto-assignment for new incoming leads
    if (!dto.assignedToId) {
      try {
        const route = await this.assignment.assignNewLead(score, lead.source);
        if (route.assignedToId) {
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { assignedToId: route.assignedToId },
          });
          await this.prisma.activity.create({
            data: {
              leadId: lead.id,
              type: ActivityType.SYSTEM,
              content: `[Auto-Assignment] ${route.reason}`,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Auto-assignment error for lead ${lead.id}: ${err?.message || err}`);
      }
    }

    // Automated Speed-to-Lead WhatsApp Nurturing (<1 minute acknowledgment)
    try {
      await this.nurturing.dispatchInstantAcknowledgment({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        destination: lead.destination,
        score: lead.score,
        source: lead.source,
      });
    } catch (err: any) {
      this.logger.warn(`Speed-to-lead nurturing trigger failed: ${err?.message || err}`);
    }

    return { duplicate: false, leadId: lead.id, score };
  }

  /**
   * Manual add by a logged-in operator (phone-in, walk-in, forwarded WhatsApp).
   * Runs through the same capture pipeline so dedupe, scoring and the timeline
   * work identically. Two differences from the public route:
   *   - defaults source to PHONE instead of OTHER (the common case)
   *   - assigns to the caller if the lead is brand new (not a re-enquiry),
   *     so it doesn't land in the unassigned bucket the operator will then
   *     have to claim in a second click.
   */
  async manualCreate(dto: CaptureLeadDto, actor: Actor) {
    const source = dto.source ?? ('PHONE' as any);
    const result = await this.capture({ ...dto, source }, {});

    if (!result.duplicate) {
      // Owner/admin/sales-manager may assign to anyone; everyone else's lead
      // auto-assigns to themselves. Silently coerce so a sales-exec cannot
      // spawn leads owned by other people.
      let target = actor.id;
      if (dto.assignedToId !== undefined && canAssignLeads(actor.role)) {
        target = dto.assignedToId ?? actor.id;
      }
      await this.prisma.lead.update({
        where: { id: result.leadId },
        data: { assignedToId: target },
      });
      await this.prisma.activity.create({
        data: {
          leadId: result.leadId,
          userId: actor.id,
          type: 'SYSTEM' as any,
          content:
            target === actor.id
              ? 'Added manually, auto-assigned to creator'
              : `Added manually by ${actor.id}, assigned to ${target}`,
        },
      });
    }

    return result;
  }

  async findAll(q: QueryLeadsDto, actor: Actor) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;

    const where: Prisma.LeadWhereInput = {};

    // Sales execs are hard-scoped to their own leads — a query param
    // cannot widen this.
    if (!canSeeAllLeads(actor.role)) {
      where.assignedToId = actor.id;
    } else if (q.assignedToId) {
      where.assignedToId = q.assignedToId;
    }

    if (q.status) where.status = q.status;
    if (q.source) where.source = q.source;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { destination: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [total, rawData] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const data = rawData.map((lead) => ({
      ...lead,
      urgency: this.deriveUrgency(lead),
    }));

    return { total, page, limit, pages: Math.ceil(total / limit), data };
  }

  async findOne(id: string, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    this.assertCanTouch(lead, actor);
    return {
      ...lead,
      urgency: this.deriveUrgency(lead),
    };
  }

  /**
   * Pure read-time urgency derivation.
   * Dynamically evaluates priority (P1 to P4) based on age, ad channel,
   * travel date proximity, and qualification score without requiring background cron updates.
   */
  deriveUrgency(lead: {
    createdAt: Date | string;
    firstContactAt?: Date | string | null;
    travelDate?: Date | string | null;
    source?: string | null;
    score: number;
    status: string;
  }) {
    const isClosed = ['LOST', 'CANCELLED', 'CONFIRMED'].includes(lead.status);
    if (isClosed) {
      return {
        tier: 'P4' as const,
        label: 'Resolved',
        badgeColor: 'slate' as const,
        reason: `Lead is ${lead.status.toLowerCase()}`,
      };
    }

    const createdTime = new Date(lead.createdAt).getTime();
    const ageMinutes = (Date.now() - createdTime) / 60000;
    const travelTime = lead.travelDate ? new Date(lead.travelDate).getTime() : null;
    const daysToDeparture = travelTime ? (travelTime - Date.now()) / (1000 * 60 * 60 * 24) : null;
    const isPaidAd = ['GOOGLE_ADS', 'META_ADS', 'LANDING_PAGE'].includes(lead.source ?? '');
    const uncontacted = !lead.firstContactAt;

    // P1: Critical / Immediate action (< 15-30m SLA or departure inside 21 days)
    if (uncontacted && isPaidAd && ageMinutes < 30) {
      return {
        tier: 'P1' as const,
        label: 'Call Now',
        badgeColor: 'rose' as const,
        reason: 'Fresh paid ad lead (<30m)',
      };
    }
    if (uncontacted && daysToDeparture !== null && daysToDeparture >= 0 && daysToDeparture <= 21) {
      return {
        tier: 'P1' as const,
        label: 'Urgent Trip',
        badgeColor: 'rose' as const,
        reason: 'Departure in < 21 days',
      };
    }

    // P2: High Priority (< 2h SLA or departure inside 45 days or high qualification)
    if (uncontacted && ageMinutes < 120) {
      return {
        tier: 'P2' as const,
        label: 'High Priority',
        badgeColor: 'amber' as const,
        reason: 'Inquiry under 2h old',
      };
    }
    if (daysToDeparture !== null && daysToDeparture > 21 && daysToDeparture <= 45) {
      return {
        tier: 'P2' as const,
        label: 'Approaching',
        badgeColor: 'amber' as const,
        reason: 'Departure in 3-6 weeks',
      };
    }
    if (lead.score >= 70 && lead.status === 'NEW') {
      return {
        tier: 'P2' as const,
        label: 'High Fit',
        badgeColor: 'amber' as const,
        reason: 'High qualification score',
      };
    }

    // P3: Standard active queue
    if (daysToDeparture === null || daysToDeparture > 45) {
      return {
        tier: 'P3' as const,
        label: 'Standard',
        badgeColor: 'blue' as const,
        reason: 'Standard active queue',
      };
    }

    // P4: Nurture / Low priority
    return {
      tier: 'P4' as const,
      label: 'Nurture',
      badgeColor: 'slate' as const,
      reason: 'Low urgency / distant travel',
    };
  }

  async update(id: string, dto: UpdateLeadDto, actor: Actor) {
    const actorId = actor.id;
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    this.assertCanTouch(lead, actor);

    // Only owner/super-admin can reassign a lead. Sales manager sees every
    // lead and edits its stage/notes, but cannot change ownership.
    if (dto.assignedToId !== undefined && !canAssignLeads(actor.role)) {
      throw new ForbiddenException('Only the owner can reassign leads');
    }

    const data: Prisma.LeadUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.destination !== undefined) data.destination = this.normaliseDestination(dto.destination);
    if (dto.nights !== undefined) data.nights = dto.nights;
    if (dto.adults !== undefined) data.adults = dto.adults;
    if (dto.children !== undefined) data.children = dto.children;
    if (dto.budget !== undefined) data.budget = dto.budget;
    if (dto.lostReason !== undefined) data.lostReason = dto.lostReason;
    if (dto.travelDate !== undefined)
      data.travelDate = parseTravelDate(dto.travelDate).date;
    // Human picked a date -> mark manual so the cadence scheduler leaves it
    // alone. Clearing the date reverts to auto-cadence.
    if (dto.nextFollowUp !== undefined) {
      const picked = toDateOrNull(dto.nextFollowUp);
      data.nextFollowUp = picked;
      data.followUpManual = picked !== null;
      if (picked !== null) data.slaBreachAt = null;
    }
    // Status advance -> resume auto-cadence for the new stage (manual date
    // was tied to the old stage's context).
    if (dto.status !== undefined && dto.status !== lead.status) {
      data.status = dto.status;
      if (dto.nextFollowUp === undefined) {
        data.nextFollowUp = computeNextFollowUp(dto.status, new Date());
        data.followUpManual = false;
      }
      data.slaBreachAt = null;
    } else if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.assignedToId !== undefined) {
      data.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }

    const qualificationUpdated =
      dto.budget !== undefined ||
      dto.travelDate !== undefined ||
      dto.nights !== undefined ||
      dto.adults !== undefined ||
      dto.destination !== undefined;

    if (qualificationUpdated) {
      const effTravelDate = dto.travelDate !== undefined ? parseTravelDate(dto.travelDate).date : lead.travelDate;
      const effSeason = effTravelDate ? parseTravelDate(effTravelDate).season : undefined;
      const floor = await this.getEstimatedBudgetFloor(effSeason);
      const { score, notes } = scoreLead({
        source: lead.source,
        email: dto.email ?? lead.email,
        message: lead.message,
        destination: dto.destination !== undefined ? this.normaliseDestination(dto.destination) : lead.destination,
        travelDate: effTravelDate,
        season: effSeason,
        budget: dto.budget !== undefined ? dto.budget : lead.budget,
        nights: dto.nights !== undefined ? dto.nights : lead.nights,
        adults: dto.adults !== undefined ? dto.adults : lead.adults,
        enquiryCount: lead.enquiryCount,
        minBudgetPerPaxNight: floor,
      });
      data.score = score;
      data.scoreNotes = notes;
    }

    const updated = await this.prisma.lead.update({ where: { id }, data });

    // audit trail: status + assignment changes are logged automatically
    if (dto.status !== undefined && dto.status !== lead.status) {
      await this.prisma.activity.create({
        data: {
          leadId: id,
          userId: actorId ?? null,
          type: ActivityType.STATUS_CHANGE,
          content: `Status ${lead.status} -> ${dto.status}${
            dto.lostReason ? ` (${dto.lostReason})` : ''
          }`,
        },
      });
    }
    if (
      dto.assignedToId !== undefined &&
      dto.assignedToId !== lead.assignedToId
    ) {
      await this.prisma.activity.create({
        data: {
          leadId: id,
          userId: actorId ?? null,
          type: ActivityType.ASSIGNMENT,
          content: dto.assignedToId
            ? `Assigned to user ${dto.assignedToId}`
            : 'Unassigned',
        },
      });
    }

    return updated;
  }

  /**
   * Permanent deletion of a lead record (e.g. test lead, spam submission).
   * Blocked if the lead has active bookings or invoices (use deactivate/LOST instead).
   */
  async deleteLead(id: string, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        bookings: { select: { id: true } },
        invoices: { select: { id: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const isAdminOrOwner = ['SUPER_ADMIN', 'OWNER'].includes(actor.role);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only administrators can delete or archive leads.');
    }

    // Soft-delete to preserve business attribution, bookings, and financial audit history
    return this.deactivate(id, actor, 'Archived via administrative deletion');
  }

  /**
   * Soft-close a lead — status → LOST with a system reason. We never destroy
   * the row: it may have bookings, activities and attribution attached that
   * accountants and marketing still need.
   */
  async deactivate(id: string, actor: Actor, reason: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    this.assertCanTouch(lead, actor);

    if (lead.status === LeadStatus.LOST) return { id, alreadyClosed: true };

    await this.prisma.lead.update({
      where: { id },
      data: {
        status: LeadStatus.LOST,
        lostReason: reason,
      },
    });
    await this.prisma.activity.create({
      data: {
        leadId: id,
        userId: actor.id ?? null,
        type: ActivityType.STATUS_CHANGE,
        content: `Status ${lead.status} -> LOST (Reason: ${reason})`,
      },
    });
    return { id, closed: true };
  }

  async addActivity(leadId: string, dto: CreateActivityDto, actor: Actor) {
    const actorId = actor.id;
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    this.assertCanTouch(lead, actor);

    const contactTypes: ActivityType[] = [
      ActivityType.CALL,
      ActivityType.WHATSAPP,
      ActivityType.EMAIL,
      ActivityType.MEETING,
    ];
    const type = dto.type ?? ActivityType.NOTE;

    if (contactTypes.includes(type)) {
      // Contact happened -> refresh the SLA clock (unless human picked date).
      const next = lead.followUpManual
        ? undefined
        : computeNextFollowUp(lead.status, new Date());
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          lastContact: new Date(),
          ...(lead.firstContactAt ? {} : { firstContactAt: new Date() }),
          ...(next !== undefined ? { nextFollowUp: next } : {}),
          slaBreachAt: null,
        },
      });
    }

    return this.prisma.activity.create({
      data: { leadId, userId: actorId ?? null, type, content: dto.content },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async stats(actor: Actor) {
    const scope: Prisma.LeadWhereInput = canSeeAllLeads(actor.role)
      ? {}
      : { assignedToId: actor.id };

    const [byStatus, bySource, total, unassigned] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: scope,
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: scope,
        _count: { _all: true },
      }),
      this.prisma.lead.count({ where: scope }),
      this.prisma.lead.count({ where: { ...scope, assignedToId: null } }),
    ]);

    return {
      total,
      unassigned,
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      bySource: bySource.map((r) => ({
        source: r.source,
        count: r._count._all,
      })),
    };
  }

  /**
   * Team scorecard for the owner dashboard. Per-user pipeline snapshot:
   * assigned count, contacted today, quotes sent this week, bookings
   * confirmed this month, current SLA breaches, avg first-response
   * minutes over the last 30 days. Owner uses this weekly for 1:1s.
   *
   * Returns rows only for users with an active login AND at least one
   * lead attached — silent staff who don't handle inbound don't pad
   * the table.
   */
  async teamScorecard() {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    const dow = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - ((dow + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    const rows = await Promise.all(
      users.map(async (u) => {
        const [assigned, contactedToday, quotesThisWeek, bookingsThisMonth, breaches, respondedLeads] = await Promise.all([
          this.prisma.lead.count({ where: { assignedToId: u.id } }),
          this.prisma.lead.count({
            where: { assignedToId: u.id, lastContact: { gte: startOfDay } },
          }),
          this.prisma.itinerary.count({
            where: { createdById: u.id, createdAt: { gte: startOfWeek } },
          }),
          this.prisma.booking.count({
            where: {
              lead: { assignedToId: u.id },
              status: 'CONFIRMED',
              createdAt: { gte: startOfMonth },
            },
          }),
          this.prisma.lead.count({
            where: {
              assignedToId: u.id,
              nextFollowUp: { lt: now },
              status: { notIn: ['CONFIRMED','LOST','CANCELLED','FUTURE_FOLLOWUP'] },
            },
          }),
          this.prisma.lead.findMany({
            where: {
              assignedToId: u.id,
              firstContactAt: { not: null, gte: thirtyDaysAgo },
            },
            select: { createdAt: true, firstContactAt: true },
            take: 500,
          }),
        ]);

        const responseMinutes = respondedLeads.length
          ? Math.round(
              respondedLeads.reduce(
                (sum, l) =>
                  sum + Math.max(0, (l.firstContactAt!.getTime() - l.createdAt.getTime()) / 60000),
                0,
              ) / respondedLeads.length,
            )
          : null;

        return {
          userId: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          assigned,
          contactedToday,
          quotesThisWeek,
          bookingsThisMonth,
          slaBreaches: breaches,
          avgFirstResponseMinutes: responseMinutes,
        };
      }),
    );

    // Only rows that have any activity worth showing.
    return rows.filter(
      (r) =>
        r.assigned > 0 ||
        r.contactedToday > 0 ||
        r.quotesThisWeek > 0 ||
        r.bookingsThisMonth > 0 ||
        r.slaBreaches > 0,
    );
  }

  /**
   * Bulk reassign N leads to one user (or unassign with null). Writes one
   * ASSIGNMENT activity per lead so the audit trail matches single-lead edits.
   * Idempotent — leads already on the target user are counted as skipped.
   */
  async bulkAssign(
    leadIds: string[],
    assignedToId: string | null,
    actor: Actor,
  ) {
    // Validate target exists (avoid setting to a stale user id)
    if (assignedToId) {
      const target = await this.prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, isActive: true, name: true },
      });
      if (!target || !target.isActive) {
        throw new NotFoundException('Target user not found or inactive');
      }
    }

    const before = await this.prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, assignedToId: true },
    });
    const changed = before.filter((l) => l.assignedToId !== assignedToId);
    const skippedSameOwner = before.length - changed.length;
    const missing = leadIds.length - before.length;

    if (changed.length === 0) {
      return { updated: 0, skippedSameOwner, missing };
    }

    await this.prisma.lead.updateMany({
      where: { id: { in: changed.map((l) => l.id) } },
      data: { assignedToId },
    });

    // One activity per lead so the timeline reflects the reassignment.
    await this.prisma.activity.createMany({
      data: changed.map((l) => ({
        leadId: l.id,
        userId: actor.id ?? null,
        type: ActivityType.ASSIGNMENT,
        content: assignedToId
          ? `Bulk-assigned to user ${assignedToId}`
          : 'Bulk-unassigned',
      })),
    });

    return { updated: changed.length, skippedSameOwner, missing };
  }

  /**
   * Worklist for the /follow-ups page. Returns leads with `nextFollowUp`
   * set to today or earlier (so they must be actioned today) plus a small
   * "upcoming this week" bucket so ops can plan ahead.
   *
   * Scoped per role — sales execs only see their own queue.
   */
  async followUps(actor: Actor) {
    const scope: Prisma.LeadWhereInput = canSeeAllLeads(actor.role)
      ? {}
      : { assignedToId: actor.id };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const endOfWeek = new Date(startOfDay);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const active = {
      status: {
        notIn: [
          LeadStatus.CONFIRMED,
          LeadStatus.LOST,
          LeadStatus.CANCELLED,
        ],
      },
    };

    const [overdue, dueToday, upcoming] = await Promise.all([
      this.prisma.lead.findMany({
        where: { ...scope, ...active, nextFollowUp: { lt: startOfDay } },
        orderBy: { nextFollowUp: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
        take: 200,
      }),
      this.prisma.lead.findMany({
        where: {
          ...scope, ...active,
          nextFollowUp: { gte: startOfDay, lt: endOfDay },
        },
        orderBy: { nextFollowUp: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
        take: 200,
      }),
      this.prisma.lead.findMany({
        where: {
          ...scope, ...active,
          nextFollowUp: { gte: endOfDay, lt: endOfWeek },
        },
        orderBy: { nextFollowUp: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
        take: 200,
      }),
    ]);

    return { overdue, dueToday, upcoming };
  }

  /**
   * Global search — leads only. Bookings/vendors/itineraries each have their
   * own search endpoints; the ⌘K palette calls them in parallel.
   */
  async searchLeads(actor: Actor, q: string) {
    const scope: Prisma.LeadWhereInput = canSeeAllLeads(actor.role)
      ? {}
      : { assignedToId: actor.id };
    return this.prisma.lead.findMany({
      where: {
        ...scope,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, phone: true, status: true },
    });
  }

  /**
   * Operational dashboard metrics — what the ops floor should see when they
   * log in. Deliberately distinct from `stats`, which is the pipeline shape
   * used on the finance page and lead-list header.
   *
   * Cost-per-lead uses today's AdSpend across all channels divided by today's
   * lead count. Zero-denominator returns null (not zero) so the UI can render
   * "—" instead of a misleading ₹0.
   */
  async opsStats(actor: Actor) {
    const scope: Prisma.LeadWhereInput = canSeeAllLeads(actor.role)
      ? {}
      : { assignedToId: actor.id };

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfDay);

    // Week starts Monday (Indian workweek convention).
    const startOfWeek = new Date(startOfDay);
    const day = startOfWeek.getDay(); // 0=Sun, 1=Mon, ...
    const daysSinceMonday = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

    const [
      leadsToday,
      leadsThisWeek,
      unassigned,
      overdueFollowUps,
      dueTodayFollowUps,
      yesterdaySpendRows,
      newLeadsYesterday,
      itinerariesAwaitingPricing,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { ...scope, createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      this.prisma.lead.count({
        where: { ...scope, createdAt: { gte: startOfWeek } },
      }),
      this.prisma.lead.count({ where: { ...scope, assignedToId: null } }),
      this.prisma.lead.count({
        where: {
          ...scope,
          nextFollowUp: { lt: startOfDay },
          status: {
            notIn: [
              LeadStatus.CONFIRMED,
              LeadStatus.LOST,
              LeadStatus.CANCELLED,
            ],
          },
        },
      }),
      this.prisma.lead.count({
        where: {
          ...scope,
          nextFollowUp: { gte: startOfDay, lt: endOfDay },
        },
      }),
      // AdSpend not scoped by actor — spend is agency-wide.
      this.prisma.adSpend.aggregate({
        where: { spendDate: { gte: startOfYesterday, lt: endOfYesterday } },
        _sum: { amount: true },
      }),
      this.prisma.lead.count({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
      }),
      this.prisma.itinerary.count({
        where: {
          days: {
            some: {
              items: {
                some: { pricing: { none: {} } },
              },
            },
          },
        },
      }),
    ]);

    // AdSpend.amount is paise; divide by 100 to compare with lead-count in ₹.
    const spendYesterday = (yesterdaySpendRows._sum.amount ?? 0) / 100;
    const costPerLeadYesterday = newLeadsYesterday > 0 ? Math.round(spendYesterday / newLeadsYesterday) : null;

    return {
      leadsToday,
      leadsThisWeek,
      unassigned,
      overdueFollowUps,
      dueTodayFollowUps,
      itinerariesAwaitingPricing,
      spendYesterday: Math.round(spendYesterday),
      costPerLeadYesterday,
    };
  }

  async captureFromWebhook(data: {
    name: string;
    email?: string | null;
    phone: string;
    externalId: string;
    externalSource: string;
    message?: string;
    source?: LeadSource;
  }) {
    const leadSource = data.source ?? LeadSource.OTHER;
    const scoreResult = scoreLead({
      budget: 0,
      adults: 1,
      source: leadSource,
      message: data.message,
    });
    
    const existing = await this.prisma.lead.findFirst({
      where: { externalId: data.externalId },
    });
    
    if (existing) return existing;

    const lead = await this.prisma.lead.create({
      data: {
        name: data.name,
        email: data.email ?? null,
        phone: data.phone,
        message: data.message ?? null,
        source: leadSource,
        status: LeadStatus.NEW,
        score: scoreResult.score,
        scoreNotes: scoreResult.notes,
        externalId: data.externalId,
        externalSource: data.externalSource,
        nextFollowUp: computeNextFollowUp(LeadStatus.NEW, new Date()),
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: lead.id,
        type: ActivityType.SYSTEM,
        content: `Lead imported automatically from ${data.externalSource} webhook. Score ${scoreResult.score} [${scoreResult.notes}]`,
      },
    });

    // Auto-assignment for webhook-ingested leads
    try {
      const route = await this.assignment.assignNewLead(scoreResult.score, lead.source);
      if (route.assignedToId) {
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { assignedToId: route.assignedToId },
        });
        await this.prisma.activity.create({
          data: {
            leadId: lead.id,
            type: ActivityType.SYSTEM,
            content: `[Auto-Assignment] ${route.reason}`,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Auto-assignment failed for webhook lead ${lead.id}: ${err.message}`);
    }

    return lead;
  }

  async sendWhatsAppMessage(id: string, message: string, actor: Actor) {
    const lead = await this.findOne(id, actor);
    
    if (!lead.phone) {
      throw new BadRequestException('Lead has no phone number.');
    }

    await this.whatsapp.sendMessage(lead.phone, message);

    return this.addActivity(id, {
      type: 'WHATSAPP',
      content: `[Sent via CRM] ${message}`,
    }, actor);
  }

  async importCsv(fileBuffer: Buffer, actor: Actor) {
    const parsed = Papa.parse(fileBuffer.toString(), { header: true });
    const data = parsed.data as any[];
    let imported = 0;
    for (const row of data) {
      if (!row.phone) continue;
      
      const phoneKey = this.normalisePhone(String(row.phone));
      const existing = await this.prisma.lead.findFirst({
        where: { phone: { endsWith: phoneKey } },
      });
      
      if (!existing) {
        await this.prisma.lead.create({
          data: {
            name: row.name || 'Unknown',
            email: row.email || null,
            phone: String(row.phone),
            status: 'NEW',
            source: 'WALK_IN',
            score: 50,
          }
        });
        imported++;
      }
    }
    return { imported };
  }

  async getPendingCloseRequests() {
    return this.prisma.leadApprovalRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        lead: { select: { name: true, status: true, assignedToId: true } },
        requestedBy: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewCloseRequest(requestId: string, approve: boolean, actor: Actor) {
    const req = await this.prisma.leadApprovalRequest.findUnique({
      where: { id: requestId },
      include: { lead: true }
    });
    if (!req) throw new NotFoundException();
    if (req.status !== 'PENDING') throw new BadRequestException('Request already processed');

    return this.prisma.$transaction(async (tx) => {
      await tx.leadApprovalRequest.update({
        where: { id: requestId },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          reviewedById: actor.id,
        },
      });

      if (approve) {
        await tx.lead.update({
          where: { id: req.leadId },
          data: { status: 'LOST', lostReason: req.reason },
        });
      }

      await tx.activity.create({
        data: {
          leadId: req.leadId,
          type: 'NOTE',
          content: approve ? `Close request approved by ${actor.id}` : `Close request rejected by ${actor.id}`,
        },
      });

      return req;
    });
  }

  async requestClose(id: string, actor: Actor, reason: string) {
    const lead = await this.findOne(id, actor);

    return this.prisma.$transaction(async (tx) => {
      const req = await tx.leadApprovalRequest.create({
        data: {
          leadId: id,
          requestedById: actor.id,
          reason,
        },
      });
      await tx.activity.create({
        data: {
          leadId: id,
          type: 'NOTE',
          content: `Requested to close lead. Reason: ${reason}`,
        },
      });
      return req;
    });
  }


  async generateB2bQuote(id: string, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        b2bPartner: true,
      }
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!lead.b2bPartner) throw new BadRequestException('Lead is not linked to a B2B Partner. Please register and select the agent first.');
    
    // White-labelled B2B quote PDFs are not built yet. The inherited stub
    // returned a made-up S3 address (glitz-itineraries.s3.aws.com) that never
    // existed; say so plainly instead of handing out a dead link. Nothing in
    // the CRM calls this endpoint today.
    return {
      message: 'White-labelled B2B quotes are not generated yet.',
      partner: lead.b2bPartner,
      quoteUrl: null,
    };
  }

  async generateAiDraft
(id: string, actor: Actor) {
    const lead = await this.findOne(id, actor);
    return { draft: `Hi ${lead.name.split(' ')[0]}, just following up on your travel inquiry. Do you have a moment to chat?` };
  }

}
