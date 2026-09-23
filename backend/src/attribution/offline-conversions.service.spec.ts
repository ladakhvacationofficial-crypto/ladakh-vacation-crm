import { OfflineConversionsService } from './offline-conversions.service';

describe('OfflineConversionsService', () => {
  let service: OfflineConversionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      integration: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      activity: {
        create: jest.fn().mockResolvedValue({ id: 'act-1' }),
      },
    };
    service = new OfflineConversionsService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('handles leads with no ad click identifiers gracefully', async () => {
    const res = await service.uploadBookingConversion({
      bookingId: 'b-1',
      bookingNumber: 'GLZ-B-2026-0001',
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

  it('reports unconfigured conversion for Google Ads when gclid is present', async () => {
    const res = await service.uploadBookingConversion({
      bookingId: 'b-2',
      bookingNumber: 'GLZ-B-2026-0002',
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

  it('reports unconfigured conversion for Meta CAPI when fbclid is present', async () => {
    const res = await service.uploadBookingConversion({
      bookingId: 'b-3',
      bookingNumber: 'GLZ-B-2026-0003',
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
    expect(res.metaUploaded).toBe(false);
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

  it('does not claim either platform accepted an unconfigured upload', async () => {
    const res = await service.uploadBookingConversion({
      bookingId: 'b-4',
      bookingNumber: 'GLZ-B-2026-0004',
      totalSell: 125000,
      lead: {
        id: 'l-4',
        name: 'Multi-Channel Traveler',
        phone: '9800000000',
        gclid: 'gclid_multi_123',
        fbclid: 'fbclid_multi_456',
      },
    });

    expect(res.googleUploaded).toBe(false);
    expect(res.metaUploaded).toBe(false);
    expect(res.summary).toContain('Google Ads');
    expect(res.summary).toContain('Meta CAPI');
  });
});
