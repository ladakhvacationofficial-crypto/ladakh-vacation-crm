jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_MINUTE: '* * * * *',
  },
}));

import { SocialPlatform, SocialPostStatus, ContentTone } from '@prisma/client';
import { AiGeneratorService } from './ai-generator.service';
import { SocialPublisherService } from './social-publisher.service';

describe('Social Media Studio', () => {
  describe('AiGeneratorService', () => {
    it('generates 3 travel copy variants with hashtags for Leh', async () => {
      const prismaMock = {
        integration: {
          findFirst: jest.fn().mockResolvedValue(null), // fallback to specialized template engine
        },
      };

      const generator = new AiGeneratorService(prismaMock as any);

      const result = await generator.generateSocialCopy({
        destination: 'Leh',
        packageTitle: '5N/6D Autumn Serenade',
        season: 'Autumn',
      });

      expect(result.destination).toBe('Leh');
      expect(result.variants.length).toBe(3);
      expect(result.variants[0].tone).toBe(ContentTone.STORYTELLING);
      expect(result.variants[1].tone).toBe(ContentTone.PROMOTIONAL);
      expect(result.variants[2].tone).toBe(ContentTone.PUNCHY_REEL);
      expect(result.suggestedHashtags).toEqual(
        expect.arrayContaining(['#LehDiaries', '#LadakhVacation']),
      );
      expect(result.bestPostingTimes.length).toBeGreaterThan(0);
    });

    it('generates destination-specific hashtags for Ladakh', async () => {
      const prismaMock = {
        integration: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const generator = new AiGeneratorService(prismaMock as any);
      const result = await generator.generateSocialCopy({
        destination: 'Ladakh',
      });

      expect(result.suggestedHashtags).toEqual(
        expect.arrayContaining(['#LadakhTourism', '#PangongTso', '#LadakhVacation']),
      );
    });
  });

  describe('SocialPublisherService Guardrails', () => {
    it('blocks duplicate captions published within 30 days', async () => {
      const mockDuplicatePost = {
        id: 'post-existing-1',
        platform: SocialPlatform.INSTAGRAM,
        caption: 'Waking up to the gentle splash of oars on Dal Lake...',
        publishedAt: new Date(),
      };

      const prismaMock = {
        socialPost: {
          findFirst: jest.fn().mockResolvedValue(mockDuplicatePost),
          count: jest.fn().mockResolvedValue(0),
        },
      };

      const publisher = new SocialPublisherService(prismaMock as any);

      const res = await publisher.publishPost({
        id: 'post-new-2',
        platform: SocialPlatform.INSTAGRAM,
        caption: 'Waking up to the gentle splash of oars on Dal Lake...',
        mediaUrls: [],
        status: SocialPostStatus.DRAFT,
        scheduledAt: null,
        publishedAt: null,
        externalPostId: null,
        errorMessage: null,
        metrics: {},
        accountId: null,
        packageId: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(res.ok).toBe(false);
      expect(res.errorMessage).toContain('Duplicate content warning');
    });

    it('blocks publishing when daily rate limit is reached (25 for Instagram)', async () => {
      const prismaMock = {
        socialPost: {
          findFirst: jest.fn().mockResolvedValue(null), // no duplicate
          count: jest.fn().mockResolvedValue(25), // 25 posts already published today
        },
      };

      const publisher = new SocialPublisherService(prismaMock as any);

      const res = await publisher.publishPost({
        id: 'post-new-3',
        platform: SocialPlatform.INSTAGRAM,
        caption: 'Unique new caption about Gulmarg ski slopes',
        mediaUrls: [],
        status: SocialPostStatus.DRAFT,
        scheduledAt: null,
        publishedAt: null,
        externalPostId: null,
        errorMessage: null,
        metrics: {},
        accountId: null,
        packageId: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(res.ok).toBe(false);
      expect(res.errorMessage).toContain('Daily rate limit reached for INSTAGRAM');
    });

    it('simulates publish safely when no live credentials are provided', async () => {
      const prismaMock = {
        socialPost: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(3), // under daily cap
        },
      };

      const publisher = new SocialPublisherService(prismaMock as any);

      const res = await publisher.publishPost({
        id: 'post-new-4',
        platform: SocialPlatform.INSTAGRAM,
        caption: 'A breathtaking sunrise over Pahalgam valley',
        mediaUrls: ['https://example.com/pahalgam.jpg'],
        status: SocialPostStatus.DRAFT,
        scheduledAt: null,
        publishedAt: null,
        externalPostId: null,
        errorMessage: null,
        metrics: {},
        accountId: null,
        packageId: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(res.ok).toBe(true);
      expect(res.simulated).toBe(true);
      expect(res.externalPostId).toContain('instagram_post_');
    });
  });
});
