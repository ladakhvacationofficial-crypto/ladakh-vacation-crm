import { SeoAiFixService } from './seo-ai-fix.service';

describe('SeoAiFixService', () => {
  let service: SeoAiFixService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      integration: {
        findFirst: jest.fn().mockResolvedValue(null), // Test domain synthesis fallback
      },
    };

    service = new SeoAiFixService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('honest-advice check', () => {
    it('generates honest "what to skip" advice tailored to the destination', async () => {
      const res = await service.generateFix({
        checkId: 'honest-advice',
        url: '/packages/nubra-valley-tour',
        pageTitle: 'Nubra Valley Tour Packages',
        targetKeyword: 'nubra valley tour packages',
      });

      expect(res.checkId).toBe('honest-advice');
      expect(res.fixType).toBe('copy');
      expect(res.headline).toContain('Nubra Valley');
      expect(res.suggestion).toContain('Who This Nubra Valley Tour Is NOT For');
      expect(res.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('indexable-images and image-alt check', () => {
    it('generates Next.js <Image /> code with SEO alt text to replace CSS backgrounds', async () => {
      const res = await service.generateFix({
        checkId: 'indexable-images',
        url: '/packages/nubra-valley-tour',
        detail: 'No <img> tags; 4 images set as CSS backgrounds',
        task: 'Show photos with <img> elements and alt text',
      });

      expect(res.checkId).toBe('indexable-images');
      expect(res.fixType).toBe('code');
      expect(res.suggestion).toContain('<Image');
      expect(res.suggestion).toContain('alt=');
      expect(res.suggestion).toContain('Nubra Valley');
    });
  });

  describe('meta-description check', () => {
    it('generates high-CTR 155-character meta descriptions with primary keyword', async () => {
      const res = await service.generateFix({
        checkId: 'meta-description',
        url: '/packages/nubra-valley-tour',
        targetKeyword: 'nubra valley tour packages',
      });

      expect(res.checkId).toBe('meta-description');
      expect(res.fixType).toBe('meta');
      expect(res.suggestion).toContain('<meta name="description"');
      expect(res.suggestion).toContain('Nubra Valley');
    });
  });

  describe('unique-content check', () => {
    it('generates non-duplicated destination highlights and insider advice', async () => {
      const res = await service.generateFix({
        checkId: 'unique-content',
        url: '/destinations/hanle',
        pageTitle: 'Hanle Stargazing Tours',
      });

      expect(res.checkId).toBe('unique-content');
      expect(res.fixType).toBe('copy');
      expect(res.headline).toContain('Hanle');
      expect(res.suggestion).toContain('Hanle');
    });
  });

  describe('author check', () => {
    it('generates author byline and schema markup for E-E-A-T', async () => {
      const res = await service.generateFix({
        checkId: 'author',
        url: '/packages/ladakh-honeymoon-packages',
      });

      expect(res.checkId).toBe('author');
      expect(res.fixType).toBe('editorial');
      expect(res.suggestion).toContain('[Author name]');
      expect(res.suggestion).toContain('Ladakh Vacation');
      expect(res.suggestion).toContain('schema.org');
    });
  });
});
