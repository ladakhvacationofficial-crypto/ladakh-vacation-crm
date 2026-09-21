import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';
import { SocialPlatform, SocialPost, SocialAccount, SocialPostStatus } from '@prisma/client';

export interface PublishResult {
  ok: boolean;
  externalPostId?: string;
  errorMessage?: string;
  simulated?: boolean;
}

@Injectable()
export class SocialPublisherService {
  private readonly logger = new Logger(SocialPublisherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Publishes a post to the designated platform with duplicate guards and rate limiting.
   */
  async publishPost(
    post: SocialPost,
    account?: SocialAccount | null,
  ): Promise<PublishResult> {
    this.logger.log(`Initiating publish for SocialPost ${post.id} to ${post.platform}`);

    // 1. Duplicate detection guard: prevent posting identical text within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const duplicate = await this.prisma.socialPost.findFirst({
      where: {
        id: { not: post.id },
        platform: post.platform,
        status: SocialPostStatus.PUBLISHED,
        caption: post.caption,
        publishedAt: { gte: thirtyDaysAgo },
      },
    });

    if (duplicate) {
      this.logger.warn(`Duplicate caption detected for ${post.platform} published on ${duplicate.publishedAt}`);
      return {
        ok: false,
        errorMessage: `Duplicate content warning: An identical caption was already published to ${post.platform} within the past 30 days.`,
      };
    }

    // 2. Platform rate-limit checks
    const rateLimitError = await this.checkRateLimit(post.platform);
    if (rateLimitError) {
      this.logger.warn(`Rate limit hit for ${post.platform}: ${rateLimitError}`);
      return { ok: false, errorMessage: rateLimitError };
    }

    // 3. Dispatch to platform adapter
    switch (post.platform) {
      case SocialPlatform.INSTAGRAM:
        return this.publishToInstagram(post, account);
      case SocialPlatform.FACEBOOK:
        return this.publishToFacebook(post, account);
      case SocialPlatform.PINTEREST:
        return this.publishToPinterest(post, account);
      case SocialPlatform.LINKEDIN:
      case SocialPlatform.X:
      default:
        return this.simulatePublish(post, account);
    }
  }

  private async publishToInstagram(
    post: SocialPost,
    account?: SocialAccount | null,
  ): Promise<PublishResult> {
    if (!account || !account.accessToken || !account.externalId) {
      return this.simulatePublish(post, account);
    }

    try {
      const token = decryptSecret(account.accessToken);
      const igUserId = account.externalId;
      const imageUrl = post.mediaUrls[0] || 'https://ladakhvacation.in/img/ladakh-hero.webp'; // the website's own hero photo

      // Step 1: Create media container
      const containerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
      const createRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: post.caption,
          access_token: token,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        this.logger.error(`Instagram container creation failed: ${errText}`);
        return { ok: false, errorMessage: `Instagram API Error: ${errText}` };
      }

      const containerData = await createRes.json();
      const creationId = containerData.id;

      // Step 2: Publish media container
      const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
      const pubRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token,
        }),
      });

      if (!pubRes.ok) {
        const errText = await pubRes.text();
        return { ok: false, errorMessage: `Instagram Publish Error: ${errText}` };
      }

      const pubData = await pubRes.json();
      return { ok: true, externalPostId: pubData.id };
    } catch (e: any) {
      return { ok: false, errorMessage: e.message || 'Instagram publishing failed' };
    }
  }

  private async publishToFacebook(
    post: SocialPost,
    account?: SocialAccount | null,
  ): Promise<PublishResult> {
    if (!account || !account.accessToken || !account.externalId) {
      return this.simulatePublish(post, account);
    }

    try {
      const token = decryptSecret(account.accessToken);
      const pageId = account.externalId;
      const imageUrl = post.mediaUrls[0];

      let endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      let bodyData: any = { message: post.caption, access_token: token };

      if (imageUrl) {
        endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`;
        bodyData = { url: imageUrl, caption: post.caption, access_token: token };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, errorMessage: `Facebook API Error: ${errText}` };
      }

      const data = await res.json();
      return { ok: true, externalPostId: data.id || data.post_id };
    } catch (e: any) {
      return { ok: false, errorMessage: e.message || 'Facebook publishing failed' };
    }
  }

  private async publishToPinterest(
    post: SocialPost,
    account?: SocialAccount | null,
  ): Promise<PublishResult> {
    if (!account || !account.accessToken) {
      return this.simulatePublish(post, account);
    }

    try {
      const token = decryptSecret(account.accessToken);
      const res = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.caption.slice(0, 80),
          description: post.caption,
          media_source: {
            source_type: 'image_url',
            url: post.mediaUrls[0] || 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, errorMessage: `Pinterest API Error: ${errText}` };
      }

      const data = await res.json();
      return { ok: true, externalPostId: data.id };
    } catch (e: any) {
      return { ok: false, errorMessage: e.message || 'Pinterest publishing failed' };
    }
  }

  /**
   * Simulated development mode when third-party OAuth app is not configured.
   */
  private simulatePublish(
    post: SocialPost,
    account?: SocialAccount | null,
  ): PublishResult {
    const mockId = `${post.platform.toLowerCase()}_post_${Date.now()}`;
    this.logger.log(
      `[SIMULATED SOCIAL PUBLISH] Platform: ${post.platform} | Account: ${
        account?.accountName || 'Demo Account'
      } | Caption: "${post.caption.slice(0, 60)}..."`,
    );

    return {
      ok: true,
      externalPostId: mockId,
      simulated: true,
    };
  }

  /**
   * Per-platform daily publishing rate limits.
   *
   * Limits (conservative / safe):
   *   Instagram    25 posts / 24 h  (Meta enforced hard cap)
   *   Facebook     25 posts / 24 h  (Meta policy recommendation)
   *   Pinterest    50 pins  / 24 h  (Pinterest guideline)
   *   LinkedIn     25 posts / 24 h  (LinkedIn policy)
   *   X            50 posts / 24 h  (Twitter v2 free tier writes)
   *
   * Returns an error string if the limit is hit, or null if safe to publish.
   */
  private async checkRateLimit(platform: SocialPlatform): Promise<string | null> {
    const DAILY_LIMITS: Record<string, number> = {
      INSTAGRAM: 25,
      FACEBOOK: 25,
      PINTEREST: 50,
      LINKEDIN: 25,
      X: 50,
    };

    const cap = DAILY_LIMITS[platform as string] ?? 25;

    const windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0); // midnight local — aligned to calendar day

    const publishedToday = await this.prisma.socialPost.count({
      where: {
        platform,
        status: SocialPostStatus.PUBLISHED,
        publishedAt: { gte: windowStart },
      },
    });

    if (publishedToday >= cap) {
      return `Daily rate limit reached for ${platform}: ${publishedToday}/${cap} posts published today. Try again tomorrow or reduce posting frequency.`;
    }

    // Warn at 80 % threshold (e.g. 20/25 for Instagram)
    if (publishedToday >= Math.floor(cap * 0.8)) {
      this.logger.warn(
        `${platform} approaching daily cap: ${publishedToday}/${cap} posts published today`,
      );
    }

    return null; // safe to publish
  }
}
