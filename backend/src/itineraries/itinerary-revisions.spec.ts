import { ItinerariesService } from './itineraries.service';
import { Actor } from '../common/access';
import { Role } from '@prisma/client';

describe('ItinerariesService Revisions', () => {
  let service: ItinerariesService;
  let prismaMock: any;
  let settingsMock: any;

  const actor: Actor = {
    id: 'user-sales-1',
    role: Role.SALES_EXEC,
  };

  beforeEach(() => {
    prismaMock = {
      itinerary: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      itineraryDay: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      itineraryItem: {
        create: jest.fn(),
      },
      itineraryOption: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      itineraryItemPricing: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      itineraryRevision: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      activity: {
        create: jest.fn(),
      },
    };

    settingsMock = {
      getPricing: jest.fn().mockResolvedValue({
        defaultMarkupPercent: 20,
        roundTo: 100,
        gstPercent: 5,
        minMarginPercent: 10,
      }),
    };

    service = new ItinerariesService(prismaMock, settingsMock);
  });

  it('creates an itinerary revision with an incremented version and frozen snapshot', async () => {
    const mockItinerary = {
      id: 'iti-1',
      code: 'LV-ITI-2026-0001',
      title: '6D Magical Ladakh',
      totalPax: 4,
      leadId: 'lead-1',
      lead: { id: 'lead-1', name: 'Dr. Sharma', assignedToId: 'user-sales-1' },
      options: [
        {
          id: 'opt-1',
          name: 'Standard',
          isRecommended: true,
          totalNet: 40000,
          totalSell: 52000,
          perPersonSell: 13000,
          pricing: [],
        },
      ],
      days: [
        {
          id: 'day-1',
          dayNumber: 1,
          city: 'Leh',
          items: [{ id: 'item-1', title: 'Airport Pickup & Acclimatization' }],
        },
      ],
    };

    prismaMock.itinerary.findUnique.mockResolvedValue(mockItinerary);
    prismaMock.itineraryRevision.findFirst.mockResolvedValue(null); // No prior revision
    prismaMock.itineraryRevision.create.mockImplementation(({ data }: any) => ({
      id: 'rev-1',
      ...data,
      createdAt: new Date(),
    }));

    const rev = await service.createRevision(
      'iti-1',
      'Initial quote presented to client',
      actor,
    );

    expect(rev.revisionNumber).toBe(1);
    expect(rev.title).toBe('LV-ITI-2026-0001 (v1)');
    expect(rev.totalSell).toBe(52000);
    expect(rev.changeSummary).toBe('Initial quote presented to client');
    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'NOTE',
        }),
      }),
    );
  });

  it('compares two revisions and computes sell and net differences', async () => {
    prismaMock.itinerary.findUnique.mockResolvedValue({
      id: 'iti-1',
      lead: { assignedToId: 'user-sales-1' },
    });

    prismaMock.itineraryRevision.findUnique
      .mockResolvedValueOnce({
        id: 'rev-1',
        itineraryId: 'iti-1',
        revisionNumber: 1,
        totalSell: 50000,
        totalNet: 40000,
        totalPax: 2,
        snapshot: { days: [{}, {}] },
      })
      .mockResolvedValueOnce({
        id: 'rev-2',
        itineraryId: 'iti-1',
        revisionNumber: 2,
        totalSell: 56000,
        totalNet: 43000,
        totalPax: 2,
        snapshot: { days: [{}, {}, {}] },
      });

    const comparison = await service.compareRevisions('iti-1', 'rev-1', 'rev-2', actor);

    expect(comparison.delta.sellDiff).toBe(6000);
    expect(comparison.delta.netDiff).toBe(3000);
    expect(comparison.delta.daysDiff).toBe(1);
    expect(comparison.delta.marginDiff).toBe(3000); // 13,000 margin vs 10,000 margin
  });
});
