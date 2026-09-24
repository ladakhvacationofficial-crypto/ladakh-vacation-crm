import { ScraperPoolService } from './scraper-pool.service';
import { VendorDraftsService } from './vendor-drafts.service';
import { ScrapeDraftStatus, VendorType } from '@prisma/client';

describe('Scrapers & Vendor Drafts Staging', () => {
  let scraperPool: ScraperPoolService;
  let vendorDrafts: VendorDraftsService;

  const mockActiveScrapers = [
    {
      id: 'sc-1',
      provider: 'firecrawl',
      label: 'Firecrawl Primary',
      priority: 10,
      credentials: { apiKey: 'fc_test_key' },
    },
    {
      id: 'sc-2',
      provider: 'jina',
      label: 'Jina Reader Free',
      priority: 5,
      credentials: { baseUrl: 'https://r.jina.ai' },
    },
  ];

  const mockPrisma: any = {
    vendorDraft: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vendor: {
      create: jest.fn(),
    },
    vendorRate: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockIntegrationsService: any = {
    listActiveScrapers: jest.fn().mockResolvedValue(mockActiveScrapers),
    pickAI: jest.fn().mockResolvedValue(null),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scraperPool = new ScraperPoolService(mockIntegrationsService);
    vendorDrafts = new VendorDraftsService(mockPrisma, scraperPool);
  });

  describe('ScraperPoolService Heuristics & Failover', () => {
    it('correctly detects property name, city, camp type, and bed variants via direct heuristic fallback', async () => {
      // Simulate no active scrapers so it falls back to direct heuristic extraction
      mockIntegrationsService.listActiveScrapers.mockResolvedValue([]);

      const sampleHtml = `
        <html>
          <head><title>Nubra Eco Luxury Camps | High Altitude Glamping</title></head>
          <body>
            <h1>Nubra Eco Luxury Camps</h1>
            <p>Welcome to Hunder, Nubra Valley. Contact: +91 9419123456, info@nubracamps.com</p>
            <div class="rooms">
              <h3>Deluxe Luxury Tent</h3>
              <p>King size bed, max 3 adults, heated bed warmers, electric blankets, attached washroom.</p>
              <h3>Royal Suite Tent</h3>
              <p>Twin beds, mountain view, extra bed available.</p>
            </div>
            <div>Amenities: Wi-Fi, Oxygen Cylinder on call, Campfire, 24/7 Power Backup, Restaurant</div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(sampleHtml),
      } as any);

      const result = await scraperPool.extractProperty('https://nubra-luxury-camps.com');

      expect(result).toBeDefined();
      expect(result.name).toContain('Nubra Eco Luxury Camps');
      expect(result.city).toBe('Nubra');
      expect(result.propertyType).toBe(VendorType.CAMP);
      expect(result.phone).toBe('+91 9419123456');
      expect(result.email).toBe('info@nubracamps.com');
      expect(result.roomCategories.length).toBeGreaterThanOrEqual(1);
      expect(result.reportedAmenities).toContain('Oxygen Cylinder');
      expect(result.reportedAmenities).toContain('Power Backup');
      expect(result.seasonalFrom).toBeDefined();
    });

    it('extracts structured data when Firecrawl succeeds', async () => {
      mockIntegrationsService.listActiveScrapers.mockResolvedValue(mockActiveScrapers);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          data: {
            extract: {
              name: 'The Grand Dragon Ladakh',
              city: 'Leh',
              propertyType: 'HOTEL',
              phone: '01982255888',
              email: 'reservation@thegranddragonladakh.com',
              address: 'Sheynam, Leh Ladakh',
              starRating: 5,
              roomCount: 76,
              checkInTime: '14:00',
              checkOutTime: '11:00',
              roomCategories: [
                { name: 'Deluxe Heritage Room', maxOccupancy: 3, bedType: 'King', extraBedRate: 2000 },
                { name: 'Premier Mountain View', maxOccupancy: 3, bedType: 'Twin', extraBedRate: 2500 },
              ],
              reportedAmenities: ['Central Heating', 'Wi-Fi', 'Oxygen Cylinder on Demand', 'Solar Heating'],
            },
          },
        }),
      } as any);

      const result = await scraperPool.extractProperty('https://thegranddragonladakh.com');

      expect(result).toBeDefined();
      expect(result.name).toBe('The Grand Dragon Ladakh');
      expect(result.city).toBe('Leh');
      expect(result.propertyType).toBe(VendorType.HOTEL);
      expect(result.starRating).toBe(5);
      expect(result.roomCategories.length).toBe(2);
      expect(result.roomCategories[0].name).toBe('Deluxe Heritage Room');
      expect(result.reportedAmenities).toContain('Oxygen Cylinder on Demand');
    });

    it('fails over to secondary provider when primary provider returns an error', async () => {
      mockIntegrationsService.listActiveScrapers.mockResolvedValue(mockActiveScrapers);

      // Firecrawl fails (402 credits exhausted), Jina succeeds
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 402,
          text: jest.fn().mockResolvedValue('Payment Required: Free credits exhausted'),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('# Hotel Srinagar Palace\nPhone: +91 9419000111\nDeluxe Room'),
        } as any);

      const result = await scraperPool.extractProperty('https://hotel-srinagar-palace.com');

      expect(result).toBeDefined();
      expect(result.sourceProvider).toBe('jina');
      expect(result.warnings?.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings?.[0]).toContain('Firecrawl');
    });
  });

  describe('VendorDraftsService Staging Review & Approval', () => {
    it('creates a staging draft with status PENDING_REVIEW', async () => {
      jest.spyOn(scraperPool, 'extractProperty').mockResolvedValue({
        sourceProvider: 'jina',
        sourceUrl: 'https://hotel-srinagar.com',
        name: 'The Lalit Grand Palace Srinagar',
        city: 'Srinagar',
        propertyType: VendorType.HOTEL,
        phone: '01942501001',
        email: 'reservations@thelalit.com',
        address: 'Gupkar Road, Srinagar',
        starRating: 5,
        roomCount: 112,
        checkInTime: '14:00',
        checkOutTime: '12:00',
        roomCategories: [
          { name: 'Deluxe Palace Room', maxOccupancy: 3, extraBedRate: 2500, childRate: 1200 },
          { name: 'Palace Suite', maxOccupancy: 4, extraBedRate: 3500 },
        ],
        seasonalFrom: null,
        seasonalTo: null,
        reportedAmenities: ['Wi-Fi', 'Central Heating', 'Doctor on Call'],
        rawPayload: {},
      });

      mockPrisma.vendorDraft.create.mockResolvedValue({
        id: 'draft-101',
        name: 'The Lalit Grand Palace Srinagar',
        status: ScrapeDraftStatus.PENDING_REVIEW,
      });

      const res = await vendorDrafts.extractAndSave({
        url: 'https://hotel-srinagar.com',
      });

      expect(res.draft).toBeDefined();
      expect(mockPrisma.vendorDraft.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ScrapeDraftStatus.PENDING_REVIEW,
            name: 'The Lalit Grand Palace Srinagar',
            propertyType: VendorType.HOTEL,
          }),
        }),
      );
    });

    it('approves a draft, creates live Vendor and contract rate variants with netRate=0', async () => {
      mockPrisma.vendorDraft.findUnique.mockResolvedValue({
        id: 'draft-101',
        name: 'The Lalit Grand Palace Srinagar',
        city: 'Srinagar',
        propertyType: VendorType.HOTEL,
        phone: '01942501001',
        email: 'reservations@thelalit.com',
        address: 'Gupkar Road, Srinagar',
        starRating: 5,
        roomCount: 112,
        checkInTime: '14:00',
        checkOutTime: '12:00',
        reportedAmenities: ['Wi-Fi', 'Central Heating'],
        roomCategories: [
          { name: 'Deluxe Palace Room', maxOccupancy: 3, extraBedRate: 2500, childRate: 1200 },
        ],
        seasonalFrom: null,
        seasonalTo: null,
        sourceProvider: 'jina',
        sourceUrl: 'https://hotel-srinagar.com',
        status: ScrapeDraftStatus.PENDING_REVIEW,
        createdVendorId: null,
      });

      mockPrisma.vendor.create.mockResolvedValue({
        id: 'vendor-777',
        name: 'The Lalit Grand Palace Srinagar',
        type: VendorType.HOTEL,
      });

      mockPrisma.vendorRate.create.mockResolvedValue({
        id: 'rate-1',
        variant: 'Deluxe Palace Room',
        netRate: 0,
      });

      mockPrisma.vendorDraft.update.mockResolvedValue({
        id: 'draft-101',
        status: ScrapeDraftStatus.APPROVED,
        createdVendorId: 'vendor-777',
      });

      const result = await vendorDrafts.approve('draft-101', 'user-admin-1');

      expect(result.vendor).toBeDefined();
      expect(result.vendor.id).toBe('vendor-777');
      expect(mockPrisma.vendor.create).toHaveBeenCalled();
      expect(mockPrisma.vendorRate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-777',
            variant: 'Deluxe Palace Room',
            netRate: 0,
            extraBedRate: 2500,
          }),
        }),
      );
      expect(mockPrisma.vendorDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-101' },
          data: expect.objectContaining({
            status: ScrapeDraftStatus.APPROVED,
            reviewedById: 'user-admin-1',
            createdVendorId: 'vendor-777',
          }),
        }),
      );
    });
  });
});
