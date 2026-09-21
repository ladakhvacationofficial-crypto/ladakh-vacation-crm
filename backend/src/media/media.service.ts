import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { Actor } from '../common/access';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface PageManifestItem {
  url: string;
  title: string;
  h1?: string;
  tier?: number;
  family?: string;
  primary?: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: CreateMediaDto,
    actor: Actor,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!this.storage.isConfigured) {
      throw new BadRequestException(
        'File storage is not configured. Set AWS_ENDPOINT_URL_S3 and the storage keys in the environment.',
      );
    }

    const folder = dto.folder || 'website';
    const publicUrl = await this.storage.upload(
      file.buffer,
      file.originalname,
      folder,
    );

    let parsedTags: string[] = [];
    if (Array.isArray(dto.tags)) {
      parsedTags = dto.tags;
    } else if (typeof dto.tags === 'string') {
      parsedTags = dto.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    return this.prisma.mediaAsset.create({
      data: {
        url: publicUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        altText: dto.altText || '',
        caption: dto.caption || null,
        pageSlug: dto.pageSlug || null,
        tags: parsedTags,
        folder,
        uploadedById: actor.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(query: { pageSlug?: string; tag?: string; search?: string }) {
    const where: any = {};

    if (query.pageSlug) {
      where.pageSlug = query.pageSlug;
    }
    if (query.tag) {
      where.tags = { has: query.tag };
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { filename: { contains: q, mode: 'insensitive' } },
        { altText: { contains: q, mode: 'insensitive' } },
        { caption: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!asset) throw new NotFoundException('Media asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id);

    let parsedTags: string[] | undefined;
    if (Array.isArray(dto.tags)) {
      parsedTags = dto.tags;
    } else if (typeof dto.tags === 'string') {
      parsedTags = dto.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    return this.prisma.mediaAsset.update({
      where: { id },
      data: {
        altText: dto.altText !== undefined ? dto.altText : undefined,
        caption: dto.caption !== undefined ? dto.caption : undefined,
        pageSlug: dto.pageSlug !== undefined ? dto.pageSlug : undefined,
        folder: dto.folder !== undefined ? dto.folder : undefined,
        tags: parsedTags !== undefined ? parsedTags : undefined,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mediaAsset.delete({
      where: { id },
    });
  }

  /**
   * Return the list of website pages available for assignment.
   * Reads from seo/page-manifest.json or returns built-in routes.
   */
  getWebsitePages(): PageManifestItem[] {
    const possiblePaths = [
      path.resolve(process.cwd(), '../seo/page-manifest.json'),
      path.resolve(process.cwd(), 'seo/page-manifest.json'),
      path.resolve(__dirname, '../../../../seo/page-manifest.json'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          const data: any[] = JSON.parse(raw);
          return data.map((d) => ({
            url: d.url,
            title: d.title || d.h1 || d.url,
            h1: d.h1,
            tier: d.tier,
            family: d.family,
            primary: d.primary,
          }));
        } catch (e) {
          this.logger.warn(`Failed reading manifest from ${p}: ${e}`);
        }
      }
    }

    // Default fallback pages if file read fails
    return [
      { url: '/', title: 'Homepage | Ladakh Vacation' },
      { url: '/packages/kashmir-luxury-tour', title: 'Kashmir Luxury Tour Package' },
      { url: '/packages/kashmir-honeymoon-package', title: 'Kashmir Honeymoon Package' },
      { url: '/destinations/gulmarg', title: 'Gulmarg Destination Guide' },
      { url: '/destinations/pahalgam', title: 'Pahalgam Destination Guide' },
      { url: '/destinations/sonmarg', title: 'Sonmarg Destination Guide' },
    ];
  }
}
