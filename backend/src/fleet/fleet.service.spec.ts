import { BadRequestException } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { FleetAssignmentStatus } from '@prisma/client';

describe('FleetService', () => {
  let service: FleetService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      vehicle: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      driver: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
      },
      fleetAssignment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new FleetService(prismaMock);
  });

  it('prevents vehicle double-booking during overlapping circuits', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'book-2',
      bookingNumber: 'LV-BK-2026-0002',
    });

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'veh-1',
      plateNumber: 'JK10-1234',
    });

    // An active overlapping trip exists for this vehicle
    prismaMock.fleetAssignment.findFirst.mockResolvedValue({
      id: 'assign-1',
      circuit: 'Leh - Nubra - Pangong',
      startDate: new Date('2026-09-25'),
      endDate: new Date('2026-09-30'),
      booking: { bookingNumber: 'LV-BK-2026-0001' },
    });

    await expect(
      service.assignFleet({
        bookingId: 'book-2',
        vehicleId: 'veh-1',
        startDate: '2026-09-28',
        endDate: '2026-10-02',
        circuit: 'Sham Valley - Leh',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('successfully creates fleet assignment when vehicle and driver are free', async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'book-3',
      bookingNumber: 'LV-BK-2026-0003',
    });

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'veh-1',
      plateNumber: 'JK10-1234',
    });

    prismaMock.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      name: 'Stanzin Namgail',
    });

    // No conflicting assignments
    prismaMock.fleetAssignment.findFirst.mockResolvedValue(null);

    prismaMock.fleetAssignment.create.mockResolvedValue({
      id: 'assign-2',
      bookingId: 'book-3',
      vehicleId: 'veh-1',
      driverId: 'drv-1',
      circuit: 'Leh - Hanle - Tso Moriri',
      status: FleetAssignmentStatus.ASSIGNED,
    });

    const result = await service.assignFleet({
      bookingId: 'book-3',
      vehicleId: 'veh-1',
      driverId: 'drv-1',
      startDate: '2026-10-05',
      endDate: '2026-10-10',
      circuit: 'Leh - Hanle - Tso Moriri',
    });

    expect(result.id).toBe('assign-2');
    expect(result.circuit).toBe('Leh - Hanle - Tso Moriri');
    expect(prismaMock.fleetAssignment.create).toHaveBeenCalled();
  });
});
