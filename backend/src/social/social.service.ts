import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AiGeneratorService, GenerateCopyDto } from './ai-generator.service';
import { SocialPublisherService } from './social-publisher.service';
import { encryptSecret } from '../common/crypto';
import {
  SocialPlatform,
  SocialPostStatus,
} from '@prisma/client';

export interface CreateSocialPostDto {
  platform: SocialPlatform;
  caption: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  accountId?: string;
  packageId?: string;
}

export interface UpdateSocialPostDto extends Partial<CreateSocialPostDto> {
  status?: SocialPostStatus;
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGenerator: AiGeneratorService,
    private readonly publisher: SocialPublisherService,
  ) {}

  // ─────────────────────────────── AI GENERATION ──────────────────────────────

  async generateCopy(dto: GenerateCopyDto) {
    return this.aiGenerator.generateSocialCopy(dto);
  }

  async generateImage(dto: any) {
    return this.aiGenerator.generateSocialImage(dto);
  }

  // ─────────────────────────────── ACCOUNTS ───────────────────────────────────

  async listAccounts() {
    return this.prisma.socialAccount.findMany({
      orderBy: { platform: 'asc' },
      select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true },
    });
  }

  async connectAccount(data: {
    platform: SocialPlatform;
    accountName: string;
    handle: string;
    externalId: string;
    accessToken: string;
    expiresAt?: string;
    avatarUrl?: string;
  }) {
    const encryptedToken = encryptSecret(data.accessToken);

    return this.prisma.socialAccount.upsert({
      select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true },
      where: { platform_externalId: { platform: data.platform, externalId: data.externalId } },
      update: {
        accountName: data.accountName,
        handle: data.handle,
        accessToken: encryptedToken,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        avatarUrl: data.avatarUrl,
        isActive: true,
      },
      create: {
        platform: data.platform,
        accountName: data.accountName,
        handle: data.handle,
        externalId: data.externalId,
        accessToken: encryptedToken,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async disconnectAccount(id: string) {
    await this.prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }

  // ─────────────────────────────── POSTS CRUD ─────────────────────────────────

  async createPost(dto: CreateSocialPostDto, createdById: string) {
    return this.prisma.socialPost.create({
      data: {
        platform: dto.platform,
        caption: dto.caption,
        mediaUrls: dto.mediaUrls ?? [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        accountId: dto.accountId,
        packageId: dto.packageId,
        createdById,
        status: dto.scheduledAt ? SocialPostStatus.SCHEDULED : SocialPostStatus.DRAFT,
      },
      include: { account: { select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true } } },
    });
  }

  async listPosts(filters: {
    platform?: SocialPlatform;
    status?: SocialPostStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;

    const where: any = {};
    if (filters.platform) where.platform = filters.platform;
    if (filters.status) where.status = filters.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.socialPost.findMany({
        where,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { account: { select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true } }, createdBy: { select: { id: true, name: true } } },
      }),
      this.prisma.socialPost.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPost(id: string) {
    const post = await this.prisma.socialPost.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async updatePost(id: string, dto: UpdateSocialPostDto) {
    const existing = await this.getPost(id);
    if ([SocialPostStatus.PUBLISHED, SocialPostStatus.PUBLISHING].includes(existing.status as any)) {
      throw new ForbiddenException('Cannot edit a published post');
    }

    if (dto.status && ![SocialPostStatus.DRAFT, SocialPostStatus.SCHEDULED].includes(dto.status as any)) throw new ForbiddenException('Publication status is controlled by the publisher.');

    return this.prisma.socialPost.update({
      where: { id },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption }),
        ...(dto.mediaUrls !== undefined && { mediaUrls: dto.mediaUrls }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(dto.packageId !== undefined && { packageId: dto.packageId }),
      },
      include: { account: { select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true } } },
    });
  }

  async deletePost(id: string) {
    const post = await this.getPost(id);
    if ([SocialPostStatus.PUBLISHED, SocialPostStatus.PUBLISHING].includes(post.status as any)) {
      throw new ForbiddenException('Cannot delete a published post');
    }
    await this.prisma.socialPost.delete({ where: { id } });
    return { ok: true };
  }

  // ─────────────────────────────── MANUAL PUBLISH ─────────────────────────────

  async publishNow(id: string) {
    const post = await this.getPost(id);

    if (post.status === SocialPostStatus.PUBLISHED) {
      throw new ForbiddenException('Post is already published');
    }

    const claim = await this.prisma.socialPost.updateMany({
      where: { id, status: { in: [SocialPostStatus.DRAFT, SocialPostStatus.SCHEDULED, SocialPostStatus.FAILED] } },
      data: { status: SocialPostStatus.PUBLISHING },
    });
    if (claim.count !== 1) throw new ForbiddenException('Post is already publishing or published.');

    const account = post.accountId
      ? await this.prisma.socialAccount.findUnique({ where: { id: post.accountId } })
      : null;

    let result;
    try {
      result = account && account.platform !== post.platform
        ? { ok: false, errorMessage: 'The selected account belongs to a different platform.' }
        : await this.publisher.publishPost(post, account);
    }
    catch { result = { ok: false, errorMessage: 'Publishing failed; check the provider before retrying.' }; }

    await this.prisma.socialPost.update({
      where: { id },
      data: {
        status: result.ok && !result.simulated ? SocialPostStatus.PUBLISHED : SocialPostStatus.FAILED,
        publishedAt: result.ok && !result.simulated ? new Date() : null,
        externalPostId: result.externalPostId,
        errorMessage: result.errorMessage,
      },
    });

    return result;
  }

  // ─────────────────────────────── CRON SCHEDULER ─────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueScheduledPosts() {
    const now = new Date();
    const due = await this.prisma.socialPost.findMany({
      where: {
        status: SocialPostStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      take: 10,
    });

    if (due.length === 0) return;
    this.logger.log(`Cron: processing ${due.length} scheduled social post(s)`);

    for (const post of due) {
      try {
        await this.publishNow(post.id);
      } catch (err: any) {
        this.logger.error(`Cron publish failed for post ${post.id}: ${err.message}`);
        await this.prisma.socialPost.updateMany({
          where: { id: post.id, status: SocialPostStatus.SCHEDULED },
          data: { status: SocialPostStatus.FAILED, errorMessage: err.message },
        });
      }
    }
  }

  // ─────────────────────────────── CALENDAR ────────────────────────────────────

  async getCalendar(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const posts = await this.prisma.socialPost.findMany({
      where: {
        OR: [
          { scheduledAt: { gte: start, lte: end } },
          { publishedAt: { gte: start, lte: end } },
        ],
      },
      include: { account: { select: { id: true, platform: true, accountName: true, handle: true, externalId: true, expiresAt: true, avatarUrl: true, isActive: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by date string
    const byDate: Record<string, typeof posts> = {};
    for (const p of posts) {
      const dt = p.scheduledAt ?? p.publishedAt;
      if (!dt) continue;
      const key = dt.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(p);
    }

    return byDate;
  }

  // ─────────────────────────────── ANALYTICS ───────────────────────────────────

  async getAnalytics() {
    const published = await this.prisma.socialPost.findMany({
      where: { status: SocialPostStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    const byPlatform: Record<string, { posts: number; totalReach: number; totalLikes: number; totalComments: number }> = {};

    for (const p of published) {
      if (!byPlatform[p.platform]) {
        byPlatform[p.platform] = { posts: 0, totalReach: 0, totalLikes: 0, totalComments: 0 };
      }
      const m = (p.metrics as any) || {};
      byPlatform[p.platform].posts++;
      byPlatform[p.platform].totalReach += m.reach ?? 0;
      byPlatform[p.platform].totalLikes += m.likes ?? 0;
      byPlatform[p.platform].totalComments += m.comments ?? 0;
    }

    const topPosts = [...published]
      .sort((a, b) => {
        const ar = (a.metrics as any)?.reach ?? 0;
        const br = (b.metrics as any)?.reach ?? 0;
        return br - ar;
      })
      .slice(0, 5);

    const totalReach = Object.values(byPlatform).reduce((s, v) => s + v.totalReach, 0);
    const totalPosts = published.length;

    return {
      totalPosts,
      totalReach,
      byPlatform,
      topPosts,
    };
  }

  // ─────────────────────────────── TRENDS ──────────────────────────────────────

  async getTrends() {
    // Static list of Ladakh keywords with the months they peak. The season
    // windows are facts about Ladakh; there are no search volumes here because
    // none have been measured. Replace with Google Trends / Search Console
    // data once an integration is connected.
    return {
      risingKeywords: [
        { keyword: 'Leh Ladakh tour package', trend: 'Peak Apr–Jun', volume: '' },
        { keyword: 'Pangong Lake trip', trend: 'Peak May–Sep', volume: '' },
        { keyword: 'Leh Ladakh bike trip', trend: 'Peak Jun–Sep', volume: '' },
        { keyword: 'Manali to Leh road trip', trend: 'Peak Jun–Sep', volume: '' },
        { keyword: 'Hanle stargazing', trend: 'Peak Sep–Oct', volume: '' },
        { keyword: 'Ladakh honeymoon package', trend: 'Peak May–Jun, Sep', volume: '' },
        { keyword: 'Nubra Valley camp', trend: 'Peak May–Sep', volume: '' },
        { keyword: 'Hemis festival', trend: 'Jun–Jul', volume: '' },
      ],
      bestHashtagsByPlatform: {
        instagram: ['#Ladakh', '#LehLadakh', '#PangongTso', '#NubraValley', '#LadakhVacation'],
        facebook: ['#LadakhTourism', '#LehLadakh', '#LadakhTour', '#IncredibleIndia'],
        pinterest: ['Ladakh Travel Guide', 'Leh Ladakh Road Trip', 'Pangong Lake', 'Hanle Dark Sky'],
      },
      bestTimeToPost: [
        { platform: 'INSTAGRAM', days: 'Wed, Fri, Sat', time: '7:00–9:30 PM IST' },
        { platform: 'FACEBOOK', days: 'Tue, Wed, Thu', time: '12:00–2:00 PM IST' },
        { platform: 'PINTEREST', days: 'Sat, Sun', time: '8:00–10:00 PM IST' },
      ],
    };
  }
}
