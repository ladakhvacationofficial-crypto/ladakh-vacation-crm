import { PermitsService } from './permits.service';
import { PermitStatus, PermitType } from '@prisma/client';

describe('PermitsService', () => {
  let service: PermitsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      booking: {
        findUnique: jest.fn(),
      },
      permitApplication: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      permitTraveller: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      activity: {
        create: jest.fn(),
      },
    };

    service = new PermitsService(prismaMock);
  });

  it('calculates government statutory fees accurately', () => {
    // 4 travellers for 5 days:
    // Green fee: 400 * 4 = 1,600
    // Red Cross: 100 * 4 = 400
    // Wildlife fee: 20 * 5 * 4 = 400
    // Total = 1,600 + 400 + 400 = 2,400
    const from = new Date('2026-09-01');
    const to = new Date('2026-09-05'); // 5 days inclusive

    const fees = service.calculateStatutoryFees(4, from, to);

    expect(fees.days).toBe(5);
    expect(fees.environmentalFee).toBe(1600);
    expect(fees.redCrossFee).toBe(400);
    expect(fees.wildlifeFee).toBe(400);
    expect(fees.totalFee).toBe(2400);
  });

  it('creates permit application with travellers and logs activity', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'book-1',
      bookingNumber: 'LV-BK-2026-0001',
      leadId: 'lead-1',
    });

    prismaMock.permitApplication.create.mockResolvedValue({
      id: 'permit-1',
      bookingId: 'book-1',
      permitType: PermitType.ILP_DOMESTIC,
      status: PermitStatus.DOCS_VERIFIED,
      totalFee: 2400,
    });

    const result = await service.createPermit({
      bookingId: 'book-1',
      permitType: PermitType.ILP_DOMESTIC,
      sectors: ['NUBRA', 'PANGONG', 'HANLE'],
      validFrom: '2026-09-01',
      validTo: '2026-09-05',
      travellers: [
        { fullName: 'Anil Gupta', idNumber: '123456789012', idType: 'AADHAAR' },
        { fullName: 'Sunita Gupta', idNumber: '987654321098', idType: 'AADHAAR' },
      ],
    });

    expect(result.id).toBe('permit-1');
    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'NOTE',
        }),
      }),
    );
  });
});
