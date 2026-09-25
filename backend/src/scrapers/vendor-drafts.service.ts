import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperPoolService, isQualifiedPropertyUrl } from './scraper-pool.service';
import { ExtractDraftDto } from './dto/extract-draft.dto';
import { BatchExtractDto } from './dto/batch-extract.dto';
import { DiscoverDraftsDto } from './dto/discover-drafts.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { ScrapeDraftStatus, VendorType } from '@prisma/client';

@Injectable()
export class VendorDraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperPool: ScraperPoolService,
  ) {}

  async list(filter?: {
    status?: ScrapeDraftStatus;
    city?: string;
    sourceProvider?: string;
    q?: string;
  }) {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.city) where.city = { contains: filter.city, mode: 'insensitive' };
    if (filter?.sourceProvider) where.sourceProvider = filter.sourceProvider;
    if (filter?.q) {
      where.OR = [
        { name: { contains: filter.q, mode: 'insensitive' } },
        { city: { contains: filter.q, mode: 'insensitive' } },
        { address: { contains: filter.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.vendorDraft.findMany({
      where,
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        createdVendor: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const draft = await this.prisma.vendorDraft.findUnique({
      where: { id },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        createdVendor: { select: { id: true, name: true, city: true } },
      },
    });
    if (!draft) throw new NotFoundException('Vendor draft not found');
    return draft;
  }

  private async upsertDraftFromExtraction(d: any) {
    if (!d || !d.name || d.name.trim().length < 2) return null;

    const trimmedName = d.name.trim();

    // Check if name is generic or portal junk
    const JUNK_NAMES = [
      'search hotels', 'expedia', 'hotel', 'hotels', 'the cannonball', 'hotel abc',
      'oceanview resort', 'seaside resort', 'luxury glamping', 'resort', 'camp',
      'hotels in', 'resorts in', 'best hotels in', 'tour packages', 'travel guide',
    ];
    if (trimmedName.length < 3 || JUNK_NAMES.some((j) => trimmedName.toLowerCase() === j)) {
      return null;
    }

    // Geolocation boundary guard: reject foreign or placeholder addresses
    const fullGeoText = `${trimmedName} ${d.address || ''} ${d.city || ''}`.toLowerCase();
    const DISQUALIFIED_LOCATIONS = [
      'california', 'ca 9', 'ca 1', 'florida', 'fl 3', 'nevada', 'nv 8', 'texas',
      'lake tahoe', 'las vegas', 'kissimmee', 'malibu', 'oceanview', 'bandung',
      'indonesia', 'brazil', 'sample city', '123 sample', '123 beach', '123 ocean',
      'united states', 'usa',
    ];
    if (DISQUALIFIED_LOCATIONS.some((loc) => fullGeoText.includes(loc))) {
      return null;
    }

    if (
      /instagram|facebook|youtube|twitter/i.test(trimmedName) ||
      /instagram\.com|facebook\.com|youtube\.com/i.test(d.sourceUrl)
    ) {
      return null;
    }

    // Check if an active supplier already exists on the books
    const activeVendor = await this.prisma.vendor.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });

    const existing = await this.prisma.vendorDraft.findFirst({
      where: {
        OR: [
          { sourceUrl: d.sourceUrl },
          { name: { equals: trimmedName, mode: 'insensitive' } },
        ],
      },
    });

    const settlementLabel = d.matchedSettlement
      ? `${d.matchedSettlement} (${d.matchedValley || d.city || 'Ladakh'})`
      : `${d.city || 'Ladakh'}`;
    const altitudeLabel = d.altitudeMeters ? ` · ${d.altitudeMeters}m` : '';
    const confLabel = d.confidence ? ` · Confidence: ${Math.round(d.confidence * 100)}%` : '';
    const autoNote = `Auto-qualified: ${settlementLabel}${altitudeLabel}${confLabel}`;

    const rawPayloadWithSettlement = {
      ...(typeof d.rawPayload === 'object' && d.rawPayload !== null ? d.rawPayload : {}),
      settlementInfo: {
        settlement: d.matchedSettlement ?? null,
        valley: d.matchedValley ?? null,
        altitudeMeters: d.altitudeMeters ?? null,
        confidence: d.confidence ?? null,
      },
    };

    if (existing) {
      if (existing.status !== ScrapeDraftStatus.PENDING_REVIEW) {
        return existing;
      }
      return this.prisma.vendorDraft.update({
        where: { id: existing.id },
        data: {
          sourceProvider: d.sourceProvider,
          sourceUrl: d.sourceUrl || existing.sourceUrl,
          city: d.city || existing.city,
          propertyType: d.propertyType || existing.propertyType,
          phone: d.phone || existing.phone,
          email: d.email || existing.email,
          address: d.address || existing.address,
          starRating: d.starRating ?? existing.starRating,
          roomCount: d.roomCount ?? existing.roomCount,
          checkInTime: d.checkInTime || existing.checkInTime,
          checkOutTime: d.checkOutTime || existing.checkOutTime,
          roomCategories:
            d.roomCategories && d.roomCategories.length > 0
              ? (d.roomCategories as any)
              : (existing.roomCategories as any),
          seasonalFrom: d.seasonalFrom || existing.seasonalFrom,
          seasonalTo: d.seasonalTo || existing.seasonalTo,
          reportedAmenities:
            d.reportedAmenities && d.reportedAmenities.length > 0
              ? d.reportedAmenities
              : existing.reportedAmenities,
          notes: existing.notes || autoNote,
          rawPayload: rawPayloadWithSettlement as any,
        },
      });
    }

    return this.prisma.vendorDraft.create({
      data: {
        sourceProvider: d.sourceProvider,
        sourceUrl: d.sourceUrl,
        name: trimmedName,
        city: d.city,
        propertyType: d.propertyType,
        phone: d.phone,
        email: d.email,
        address: d.address,
        starRating: d.starRating,
        roomCount: d.roomCount,
        checkInTime: d.checkInTime,
        checkOutTime: d.checkOutTime,
        roomCategories: (d.roomCategories as any) ?? [],
        seasonalFrom: d.seasonalFrom,
        seasonalTo: d.seasonalTo,
        reportedAmenities: d.reportedAmenities,
        notes: autoNote,
        rawPayload: rawPayloadWithSettlement as any,
        status: activeVendor ? ScrapeDraftStatus.MERGED : ScrapeDraftStatus.PENDING_REVIEW,
        createdVendorId: activeVendor?.id ?? null,
      },
    });
  }

  async extractAndSave(dto: ExtractDraftDto, userId?: string) {
    const qualCheck = isQualifiedPropertyUrl(dto.url);
    if (!qualCheck.qualified) {
      throw new BadRequestException(`Unqualified URL: ${qualCheck.reason}`);
    }

    const extracted = await this.scraperPool.extractProperty(dto.url, {
      preferredProvider: dto.preferredProvider,
      city: dto.city,
      propertyType: dto.propertyType,
    });

    const draft = await this.upsertDraftFromExtraction(extracted);
    if (!draft) {
      throw new BadRequestException('Extracted URL is not a recognized property listing or is outside valid geographic boundaries.');
    }

    return {
      draft,
      warnings: extracted.warnings,
    };
  }

  async batchExtractAndSave(dto: BatchExtractDto, userId?: string) {
    const results = await this.scraperPool.batchExtract(dto.urls, {
      city: dto.city,
      propertyType: dto.propertyType,
    });

    const createdDrafts: any[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const res of results) {
      if (res.success && res.data) {
        const draft = await this.upsertDraftFromExtraction(res.data);
        if (draft) {
          createdDrafts.push(draft);
        }
      } else {
        errors.push({ url: res.url, error: res.error ?? 'Unknown extraction error' });
      }
    }

    return {
      total: dto.urls.length,
      succeeded: createdDrafts.length,
      failed: errors.length,
      drafts: createdDrafts,
      errors,
    };
  }

  async discoverByKeywordAndSave(dto: DiscoverDraftsDto, userId?: string) {
    const results = await this.scraperPool.discoverByKeyword(dto.query, {
      city: dto.city,
      propertyType: dto.propertyType,
      limit: dto.limit,
    });

    const createdDrafts: any[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const res of results) {
      if (res.success && res.data) {
        const draft = await this.upsertDraftFromExtraction(res.data);
        if (draft) {
          createdDrafts.push(draft);
        }
      } else {
        errors.push({ url: res.url, error: res.error ?? 'Unknown extraction error' });
      }
    }

    return {
      query: dto.query,
      totalDiscovered: results.length,
      succeeded: createdDrafts.length,
      failed: errors.length,
      drafts: createdDrafts,
      errors,
    };
  }

  async update(id: string, dto: UpdateDraftDto, userId?: string) {
    await this.findById(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.starRating !== undefined) data.starRating = dto.starRating;
    if (dto.roomCount !== undefined) data.roomCount = dto.roomCount;
    if (dto.checkInTime !== undefined) data.checkInTime = dto.checkInTime;
    if (dto.checkOutTime !== undefined) data.checkOutTime = dto.checkOutTime;
    if (dto.roomCategories !== undefined) data.roomCategories = dto.roomCategories;
    if (dto.seasonalFrom !== undefined) data.seasonalFrom = dto.seasonalFrom ? new Date(dto.seasonalFrom) : null;
    if (dto.seasonalTo !== undefined) data.seasonalTo = dto.seasonalTo ? new Date(dto.seasonalTo) : null;
    if (dto.reportedAmenities !== undefined) data.reportedAmenities = dto.reportedAmenities;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.vendorDraft.update({
      where: { id },
      data,
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        createdVendor: { select: { id: true, name: true, city: true } },
      },
    });
  }

  /**
   * Approves a drafted property:
   * 1. Creates a live Vendor record with provenance-tagged amenities.
   * 2. Creates initial contract VendorRate variants for each discovered room category with netRate placeholder.
   * 3. Marks draft as APPROVED and links createdVendorId and reviewedById.
   */
  async approve(id: string, userId: string) {
    const draft = await this.findById(id);
    if (draft.status === ScrapeDraftStatus.APPROVED && draft.createdVendorId) {
      throw new BadRequestException('Draft has already been approved and created as a Vendor');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create live Vendor
      const vendor = await tx.vendor.create({
        data: {
          name: draft.name,
          type: draft.propertyType,
          city: draft.city,
          address: draft.address,
          phone: draft.phone,
          email: draft.email,
          starRating: draft.starRating,
          roomCount: draft.roomCount,
          checkInTime: draft.checkInTime,
          checkOutTime: draft.checkOutTime,
          amenities: draft.reportedAmenities,
          notes: `Created from intelligence draft (${draft.sourceProvider}) from ${draft.sourceUrl}. Amenities flagged as reported online.`,
        },
      });

      // 2. Create unactivated draft rate variants
      // IMPORTANT: isActive is explicitly false so placeholder ₹0 rates cannot be picked in quotes.
      // Ops/purchasing must enter the negotiated B2B net before activation.
      // Do NOT copy unnegotiated extra-bed or child prices into contract fields.
      // Do NOT copy operational season into commercial contract validity.
      const roomCats = Array.isArray(draft.roomCategories) ? (draft.roomCategories as any[]) : [];
      for (const cat of roomCats) {
        if (!cat.name) continue;
        await tx.vendorRate.create({
          data: {
            vendorId: vendor.id,
            variant: cat.name,
            maxOccupancy: typeof cat.maxOccupancy === 'number' ? cat.maxOccupancy : null,
            extraBedRate: null,
            childRate: null,
            netRate: 0,
            isActive: false, // Must remain inactive until reservations/purchasing sets verified net!
            validFrom: null,
            validTo: null,
            notes: `Discovered variant from ${draft.sourceProvider} draft. Set verified netRate and toggle active when contracted. (Scraped info: extraBed=${cat.extraBedRate ?? 'N/A'}, childRate=${cat.childRate ?? 'N/A'}).`,
          },
        });
      }

      // 3. Mark draft as APPROVED
      const updatedDraft = await tx.vendorDraft.update({
        where: { id: draft.id },
        data: {
          status: ScrapeDraftStatus.APPROVED,
          reviewedById: userId,
          reviewedAt: new Date(),
          createdVendorId: vendor.id,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
          createdVendor: true,
        },
      });

      return {
        draft: updatedDraft,
        vendor,
      };
    });

    return result;
  }

  async reject(id: string, userId: string, notes?: string) {
    await this.findById(id);
    return this.prisma.vendorDraft.update({
      where: { id },
      data: {
        status: ScrapeDraftStatus.REJECTED,
        reviewedById: userId,
        reviewedAt: new Date(),
        notes: notes ? notes : undefined,
      },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.vendorDraft.delete({ where: { id } });
  }
}
