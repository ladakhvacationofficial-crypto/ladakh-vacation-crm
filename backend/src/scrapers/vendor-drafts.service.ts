import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperPoolService } from './scraper-pool.service';
import { ExtractDraftDto } from './dto/extract-draft.dto';
import { BatchExtractDto } from './dto/batch-extract.dto';
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

  async extractAndSave(dto: ExtractDraftDto, userId?: string) {
    const extracted = await this.scraperPool.extractProperty(dto.url, {
      preferredProvider: dto.preferredProvider,
      city: dto.city,
      propertyType: dto.propertyType,
    });

    const draft = await this.prisma.vendorDraft.create({
      data: {
        sourceProvider: extracted.sourceProvider,
        sourceUrl: extracted.sourceUrl,
        name: extracted.name,
        city: extracted.city,
        propertyType: extracted.propertyType,
        phone: extracted.phone,
        email: extracted.email,
        address: extracted.address,
        starRating: extracted.starRating,
        roomCount: extracted.roomCount,
        checkInTime: extracted.checkInTime,
        checkOutTime: extracted.checkOutTime,
        roomCategories: (extracted.roomCategories as any) ?? [],
        seasonalFrom: extracted.seasonalFrom,
        seasonalTo: extracted.seasonalTo,
        reportedAmenities: extracted.reportedAmenities,
        rawPayload: (extracted.rawPayload as any) ?? {},
        status: ScrapeDraftStatus.PENDING_REVIEW,
      },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

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
        const d = res.data;
        const draft = await this.prisma.vendorDraft.create({
          data: {
            sourceProvider: d.sourceProvider,
            sourceUrl: d.sourceUrl,
            name: d.name,
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
            rawPayload: (d.rawPayload as any) ?? {},
            status: ScrapeDraftStatus.PENDING_REVIEW,
          },
        });
        createdDrafts.push(draft);
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

      // 2. Create room category rate variants
      const roomCats = Array.isArray(draft.roomCategories) ? (draft.roomCategories as any[]) : [];
      for (const cat of roomCats) {
        if (!cat.name) continue;
        await tx.vendorRate.create({
          data: {
            vendorId: vendor.id,
            variant: cat.name,
            maxOccupancy: cat.maxOccupancy ?? 3,
            extraBedRate: cat.extraBedRate ?? null,
            childRate: cat.childRate ?? null,
            netRate: 0, // Placeholder: contract netRate must be entered by ops/purchasing
            validFrom: draft.seasonalFrom,
            validTo: draft.seasonalTo,
            notes: `Auto-populated from ${draft.sourceProvider} bed-wise extraction.`,
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
