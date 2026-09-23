import { OfflineConversionsService } from './offline-conversions.service';
import { encryptSecret } from '../common/crypto';

describe('OfflineConversionsService', () => {
  let service: OfflineConversionsService;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.INTEGRATION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    mockPrisma = {
      integration: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      activity: {
        create: jest.fn().mockResolvedValue({ id: 'act-1' }),
      },
    };
    service = new OfflineConversionsService(mockPrisma);
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('handles leads with no ad click identifiers gracefully', async () => {
    const res = await service.uploadBookingConversion({
      bookingId: 'b-1',
      bookingNumber: 'LV-B-2026-0001',
      totalSell: 65000,
      lead: {
        id: 'l-1',
        name: 'Organic Inquirer',
        phone: '9876543210',
      },
    });

    expect(res.googleUploaded).toBe(false);
    expect(res.metaUploaded).toBe(false);
    expect(res.summary).toContain('No ad click identifiers');
    expect(mockPrisma.activity.create).not.toHaveBeenCalled();
  });

  it('reports unconfigured status when gclid is present but integration is not set', async () => {
    const res = await service.uploadBookingConversion({
      bookingId: 'b-2',
      bookingNumber: 'LV-B-2026-0002',
      totalSell: 75000,
      lead: {
        id: 'l-2',
        name: 'Rahul Verma',
        phone: '9812345678',
        gclid: 'CjwKCAjw_test_gclid_12345',
      },
    });

    expect(res.googleUploaded).toBe(false);
    expect(res.metaUploaded).toBe(false);
    expect(res.summary).toContain('Google Ads unconfigured');
    expect(mockPrisma.activity.create).toHaveBeenCalled();
  });

  it('uploads offline conversion for Google Ads when integration is configured', async () => {
    mockPrisma.integration.findFirst.mockResolvedValueOnce({
      provider: 'google_ads',
      isActive: true,
      credentials: encryptSecret(
        JSON.stringify({
          customerId: '123-456-7890',
          developerToken: 'dev-token',
          accessToken: 'access-token',
          conversionActionId: 'action-123',
        }),
      ),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const res = await service.uploadBookingConversion({
      bookingId: 'b-2',
      bookingNumber: 'LV-B-2026-0002',
      totalSell: 75000,
      lead: {
        id: 'l-2',
        name: 'Rahul Verma',
        phone: '9812345678',
        gclid: 'CjwKCAjw_test_gclid_12345',
      },
    });

    expect(res.googleUploaded).toBe(true);
    expect(res.metaUploaded).toBe(false);
    expect(res.summary).toContain('Google Ads');
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'l-2',
          content: expect.stringContaining('Closed-Loop Attribution'),
        }),
      }),
    );
  });

  it('uploads offline conversion for Meta CAPI when configured', async () => {
    mockPrisma.integration.findFirst.mockResolvedValueOnce({
      provider: 'meta_ads',
      isActive: true,
      credentials: encryptSecret(
        JSON.stringify({
          pixelId: 'pixel-999',
          accessToken: 'meta-token',
        }),
      ),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const res = await service.uploadBookingConversion({
      bookingId: 'b-3',
      bookingNumber: 'LV-B-2026-0003',
      totalSell: 92000,
      lead: {
        id: 'l-3',
        name: 'Sara Ali',
        phone: '+91 9900112233',
        email: 'sara@example.com',
        fbclid: 'IwAR123456_test_fbclid_meta',
      },
    });

    expect(res.googleUploaded).toBe(false);
    expect(res.metaUploaded).toBe(true);
    expect(res.summary).toContain('Meta CAPI');
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'l-3',
          content: expect.stringContaining('Closed-Loop Attribution'),
        }),
      }),
    );
  });

  it('uploads to both platforms when both are configured', async () => {
    mockPrisma.integration.findFirst
      .mockResolvedValueOnce({
        provider: 'google_ads',
        isActive: true,
        credentials: encryptSecret(
          JSON.stringify({
            customerId: '123-456-7890',
            developerToken: 'dev-token',
            accessToken: 'google-token',
          }),
        ),
      })
      .mockResolvedValueOnce({
        provider: 'meta_ads',
        isActive: true,
        credentials: encryptSecret(
          JSON.stringify({
            pixelId: 'pixel-999',
            accessToken: 'meta-token',
          }),
        ),
      });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const res = await service.uploadBookingConversion({
      bookingId: 'b-4',
      bookingNumber: 'LV-B-2026-0004',
      totalSell: 125000,
      lead: {
        id: 'l-4',
        name: 'Multi-Channel Traveler',
        phone: '9800000000',
        gclid: 'gclid_multi_123',
        fbclid: 'fbclid_multi_456',
      },
    });

    expect(res.googleUploaded).toBe(true);
    expect(res.metaUploaded).toBe(true);
    expect(res.summary).toContain('Google Ads');
    expect(res.summary).toContain('Meta CAPI');
  });
});
