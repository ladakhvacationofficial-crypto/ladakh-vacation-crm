import { MlClusteringService } from './ml-clustering.service';

describe('MlClusteringService', () => {
  let service: MlClusteringService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new MlClusteringService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates 4 customer cohorts with actionable pitches', async () => {
    const res = await service.getTravelerClusters();

    expect(res.clusters.length).toBe(4);
    expect(res.clusters.some((c) => c.id === 'luxury-couples')).toBe(true);
    expect(res.clusters.some((c) => c.id === 'family-leisure')).toBe(true);
    expect(res.clusters.some((c) => c.id === 'adventure-trekkers')).toBe(true);
    expect(res.clusters.some((c) => c.id === 'value-explorers')).toBe(true);

    const luxury = res.clusters.find((c) => c.id === 'luxury-couples');
    expect(luxury?.conversionRate).toBe(0);
    expect(res.totalLeadsAnalyzed).toBe(0);
    expect(res.clusters.every(c => c.size === 0)).toBe(true);
    expect(luxury?.sampleWhatsAppPitch).toContain('{name}');
  });
});
