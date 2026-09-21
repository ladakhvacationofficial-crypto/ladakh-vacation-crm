import { AssignmentService } from './assignment.service';
import { Role, RoutingStrategy, LeadSource } from '@prisma/client';

describe('AssignmentService (Lead Auto-Assignment & Routing Engine)', () => {
  let service: AssignmentService;
  let prismaMock: any;

  const mockUsers = [
    { id: 'user-1', name: 'Alice Rep', email: 'alice@example.com', role: Role.SALES_EXEC, isActive: true },
    { id: 'user-2', name: 'Bob Rep', email: 'bob@example.com', role: Role.SALES_EXEC, isActive: true },
    { id: 'user-3', name: 'Charlie Rep', email: 'charlie@example.com', role: Role.SALES_EXEC, isActive: true },
  ];

  beforeEach(() => {
    prismaMock = {
      leadRoutingSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...args.data })),
      },
      user: {
        findMany: jest.fn().mockResolvedValue(mockUsers),
      },
      lead: {
        count: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        count: jest.fn(),
      },
    };

    service = new AssignmentService(prismaMock as any);
  });

  describe('ROUND_ROBIN strategy', () => {
    it('should rotate sequentially to the next user in rotation', async () => {
      prismaMock.leadRoutingSettings.findUnique.mockResolvedValue({
        id: 'default',
        isEnabled: true,
        strategy: RoutingStrategy.ROUND_ROBIN,
        highScoreThreshold: 60,
        lastAssignedUserId: 'user-1',
        excludedUserIds: [],
      });

      const result = await service.assignNewLead(45, LeadSource.WEBSITE);

      expect(result.assignedToId).toBe('user-2');
      expect(result.strategy).toBe(RoutingStrategy.ROUND_ROBIN);
      expect(result.reason).toContain('Bob Rep');
    });

    it('should wrap around to the first user when reaching the end of the list', async () => {
      prismaMock.leadRoutingSettings.findUnique.mockResolvedValue({
        id: 'default',
        isEnabled: true,
        strategy: RoutingStrategy.ROUND_ROBIN,
        highScoreThreshold: 60,
        lastAssignedUserId: 'user-3',
        excludedUserIds: [],
      });

      const result = await service.assignNewLead(50, LeadSource.WEBSITE);

      expect(result.assignedToId).toBe('user-1');
      expect(result.strategy).toBe(RoutingStrategy.ROUND_ROBIN);
    });
  });

  describe('PERFORMANCE_WEIGHTED strategy', () => {
    it('should route high-score leads (score >= threshold) to the highest-converting sales rep', async () => {
      prismaMock.leadRoutingSettings.findUnique.mockResolvedValue({
        id: 'default',
        isEnabled: true,
        strategy: RoutingStrategy.PERFORMANCE_WEIGHTED,
        highScoreThreshold: 60,
        lastAssignedUserId: 'user-1',
        excludedUserIds: [],
      });

      // Mock user 2 (Bob) having higher conversion rate (4 bookings / 10 leads = 40%) vs Alice (1 booking / 10 leads = 10%)
      prismaMock.lead.count.mockImplementation((args: any) => {
        if (args.where.assignedToId === 'user-2') return Promise.resolve(10);
        return Promise.resolve(10);
      });
      prismaMock.booking.count.mockImplementation((args: any) => {
        if (args.where.createdById === 'user-2') return Promise.resolve(4); // Bob: 40%
        if (args.where.createdById === 'user-1') return Promise.resolve(1); // Alice: 10%
        return Promise.resolve(0); // Charlie: 0%
      });

      const result = await service.assignNewLead(75, LeadSource.META_ADS); // high score 75 >= 60

      expect(result.assignedToId).toBe('user-2');
      expect(result.strategy).toBe(RoutingStrategy.PERFORMANCE_WEIGHTED);
      expect(result.reason).toContain('Bob Rep');
      expect(result.reason).toContain('40% conversion');
    });

    it('should fall back to round-robin when lead score is below threshold', async () => {
      prismaMock.leadRoutingSettings.findUnique.mockResolvedValue({
        id: 'default',
        isEnabled: true,
        strategy: RoutingStrategy.PERFORMANCE_WEIGHTED,
        highScoreThreshold: 60,
        lastAssignedUserId: 'user-1',
        excludedUserIds: [],
      });

      const result = await service.assignNewLead(40, LeadSource.WEBSITE); // 40 < 60

      expect(result.assignedToId).toBe('user-2'); // next in rotation
      expect(result.strategy).toBe(RoutingStrategy.ROUND_ROBIN);
    });
  });

  describe('LOAD_BALANCED strategy', () => {
    it('should assign to the sales rep with the lowest number of active open leads', async () => {
      prismaMock.leadRoutingSettings.findUnique.mockResolvedValue({
        id: 'default',
        isEnabled: true,
        strategy: RoutingStrategy.LOAD_BALANCED,
        highScoreThreshold: 60,
        lastAssignedUserId: 'user-1',
        excludedUserIds: [],
      });

      // Mock Charlie (user-3) having only 2 open leads, whereas Alice has 8 and Bob has 12
      prismaMock.lead.count.mockImplementation((args: any) => {
        if (args.where.status) {
          if (args.where.assignedToId === 'user-3') return Promise.resolve(2);
          if (args.where.assignedToId === 'user-2') return Promise.resolve(12);
          return Promise.resolve(8);
        }
        return Promise.resolve(10);
      });
      prismaMock.booking.count.mockResolvedValue(1);

      const result = await service.assignNewLead(50, LeadSource.PHONE);

      expect(result.assignedToId).toBe('user-3');
      expect(result.strategy).toBe(RoutingStrategy.LOAD_BALANCED);
      expect(result.reason).toContain('Charlie Rep');
      expect(result.reason).toContain('2 active leads');
    });
  });

  describe('Exclusions & Inactive users', () => {
    it('should skip users listed in excludedUserIds', async () => {
      prismaMock.leadRoutingSettings.findUnique.mockResolvedValue({
        id: 'default',
        isEnabled: true,
        strategy: RoutingStrategy.ROUND_ROBIN,
        highScoreThreshold: 60,
        lastAssignedUserId: 'user-1',
        excludedUserIds: ['user-2'], // Bob is on leave
      });

      // findMany should return only user-1 and user-3
      prismaMock.user.findMany.mockResolvedValue([mockUsers[0], mockUsers[2]]);

      const result = await service.assignNewLead(50, LeadSource.WEBSITE);

      expect(result.assignedToId).toBe('user-3'); // skips user-2
    });
  });
});
