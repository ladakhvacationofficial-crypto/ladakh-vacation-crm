import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FleetAssignmentStatus, FleetOwnership, Prisma, VehicleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { AssignFleetDto } from './dto/assign-fleet.dto';
import { toDateOrNull } from '../common/dates';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  // --- vehicles -------------------------------------------------------------

  async listVehicles(params?: {
    type?: VehicleType;
    ownership?: FleetOwnership;
    activeOnly?: boolean;
  }) {
    const where: Prisma.VehicleWhereInput = {};
    if (params?.type) where.vehicleType = params.type;
    if (params?.ownership) where.ownership = params.ownership;
    if (params?.activeOnly) where.isActive = true;

    return this.prisma.vehicle.findMany({
      where,
      orderBy: { plateNumber: 'asc' },
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
        defaultDriver: { select: { id: true, name: true, phone: true } },
        _count: { select: { assignments: true } },
      },
    });
  }

  async getVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
        defaultDriver: { select: { id: true, name: true, phone: true } },
        assignments: {
          orderBy: { startDate: 'desc' },
          take: 10,
          include: {
            driver: { select: { id: true, name: true, phone: true } },
            booking: { select: { id: true, bookingNumber: true, packageName: true } },
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async createVehicle(dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { plateNumber: dto.plateNumber.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Vehicle with plate number ${dto.plateNumber} already exists`);
    }

    return this.prisma.vehicle.create({
      data: {
        plateNumber: dto.plateNumber.trim().toUpperCase(),
        makeModel: dto.makeModel,
        vehicleType: dto.vehicleType ?? VehicleType.INNOVA_CRYSTA,
        ownership: dto.ownership ?? FleetOwnership.ATTACHED_TAXI_UNION,
        capacity: dto.capacity ?? 6,
        seatingConfig: dto.seatingConfig ?? null,
        fuelType: dto.fuelType ?? null,
        vendorId: dto.vendorId ?? null,
        defaultDriverId: dto.defaultDriverId ?? null,
        insuranceExpiry: toDateOrNull(dto.insuranceExpiry),
        fitnessExpiry: toDateOrNull(dto.fitnessExpiry),
        permitExpiry: toDateOrNull(dto.permitExpiry),
        pucExpiry: toDateOrNull(dto.pucExpiry),
        isActive: dto.isActive ?? true,
        notes: dto.notes ?? null,
      },
    });
  }

  async updateVehicle(id: string, dto: Partial<CreateVehicleDto>) {
    await this.getVehicle(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.plateNumber ? { plateNumber: dto.plateNumber.trim().toUpperCase() } : {}),
        ...(dto.makeModel !== undefined ? { makeModel: dto.makeModel } : {}),
        ...(dto.vehicleType !== undefined ? { vehicleType: dto.vehicleType } : {}),
        ...(dto.ownership !== undefined ? { ownership: dto.ownership } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.seatingConfig !== undefined ? { seatingConfig: dto.seatingConfig } : {}),
        ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType } : {}),
        ...(dto.vendorId !== undefined ? { vendorId: dto.vendorId } : {}),
        ...(dto.defaultDriverId !== undefined ? { defaultDriverId: dto.defaultDriverId } : {}),
        ...(dto.insuranceExpiry !== undefined ? { insuranceExpiry: toDateOrNull(dto.insuranceExpiry) } : {}),
        ...(dto.fitnessExpiry !== undefined ? { fitnessExpiry: toDateOrNull(dto.fitnessExpiry) } : {}),
        ...(dto.permitExpiry !== undefined ? { permitExpiry: toDateOrNull(dto.permitExpiry) } : {}),
        ...(dto.pucExpiry !== undefined ? { pucExpiry: toDateOrNull(dto.pucExpiry) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  // --- drivers --------------------------------------------------------------

  async listDrivers(params?: {
    verifiedOnly?: boolean;
    localOnly?: boolean;
    activeOnly?: boolean;
  }) {
    const where: Prisma.DriverWhereInput = {};
    if (params?.verifiedOnly) where.policeVerified = true;
    if (params?.localOnly) where.isLocalLadakhi = true;
    if (params?.activeOnly) where.isActive = true;

    return this.prisma.driver.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        vendor: { select: { id: true, name: true } },
        employee: { select: { id: true, designation: true } },
        _count: { select: { assignments: true } },
      },
    });
  }

  async getDriver(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, designation: true } },
        assignments: {
          orderBy: { startDate: 'desc' },
          take: 10,
          include: {
            vehicle: { select: { id: true, plateNumber: true, makeModel: true } },
            booking: { select: { id: true, bookingNumber: true, packageName: true } },
          },
        },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async createDriver(dto: CreateDriverDto) {
    const existing = await this.prisma.driver.findUnique({
      where: { licenseNumber: dto.licenseNumber.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Driver with license number ${dto.licenseNumber} already exists`);
    }

    return this.prisma.driver.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        altPhone: dto.altPhone?.trim() ?? null,
        licenseNumber: dto.licenseNumber.trim().toUpperCase(),
        licenseExpiry: toDateOrNull(dto.licenseExpiry),
        policeVerified: dto.policeVerified ?? true,
        bloodGroup: dto.bloodGroup ?? null,
        isLocalLadakhi: dto.isLocalLadakhi ?? true,
        badgeNumber: dto.badgeNumber?.trim() ?? null,
        vendorId: dto.vendorId ?? null,
        employeeId: dto.employeeId ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async updateDriver(id: string, dto: Partial<CreateDriverDto>) {
    await this.getDriver(id);
    return this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.altPhone !== undefined ? { altPhone: dto.altPhone?.trim() ?? null } : {}),
        ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber.trim().toUpperCase() } : {}),
        ...(dto.licenseExpiry !== undefined ? { licenseExpiry: toDateOrNull(dto.licenseExpiry) } : {}),
        ...(dto.policeVerified !== undefined ? { policeVerified: dto.policeVerified } : {}),
        ...(dto.bloodGroup !== undefined ? { bloodGroup: dto.bloodGroup } : {}),
        ...(dto.isLocalLadakhi !== undefined ? { isLocalLadakhi: dto.isLocalLadakhi } : {}),
        ...(dto.badgeNumber !== undefined ? { badgeNumber: dto.badgeNumber?.trim() ?? null } : {}),
        ...(dto.vendorId !== undefined ? { vendorId: dto.vendorId } : {}),
        ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  // --- assignments & dispatch ----------------------------------------------

  async assignFleet(dto: AssignFleetDto, assignedById?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { id: true, bookingNumber: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Vehicle conflict detection
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
        select: { id: true, plateNumber: true },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');

      const conflict = await this.prisma.fleetAssignment.findFirst({
        where: {
          vehicleId: dto.vehicleId,
          status: { notIn: [FleetAssignmentStatus.CANCELLED, FleetAssignmentStatus.COMPLETED] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
        include: {
          booking: { select: { bookingNumber: true } },
        },
      });

      if (conflict) {
        throw new BadRequestException(
          `Vehicle ${vehicle.plateNumber} is already scheduled on "${conflict.circuit}" for booking ${conflict.booking.bookingNumber} (${conflict.startDate.toISOString().slice(0, 10)} to ${conflict.endDate.toISOString().slice(0, 10)})`,
        );
      }
    }

    // Driver conflict detection
    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
        select: { id: true, name: true },
      });
      if (!driver) throw new NotFoundException('Driver not found');

      const conflict = await this.prisma.fleetAssignment.findFirst({
        where: {
          driverId: dto.driverId,
          status: { notIn: [FleetAssignmentStatus.CANCELLED, FleetAssignmentStatus.COMPLETED] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
        include: {
          booking: { select: { bookingNumber: true } },
        },
      });

      if (conflict) {
        throw new BadRequestException(
          `Driver ${driver.name} is already assigned on "${conflict.circuit}" for booking ${conflict.booking.bookingNumber} (${conflict.startDate.toISOString().slice(0, 10)} to ${conflict.endDate.toISOString().slice(0, 10)})`,
        );
      }
    }

    return this.prisma.fleetAssignment.create({
      data: {
        bookingId: dto.bookingId,
        vehicleId: dto.vehicleId ?? null,
        driverId: dto.driverId ?? null,
        startDate: start,
        endDate: end,
        circuit: dto.circuit,
        pickupLocation: dto.pickupLocation ?? null,
        dropLocation: dto.dropLocation ?? null,
        status: dto.status ?? FleetAssignmentStatus.ASSIGNED,
        dutySlipNumber: dto.dutySlipNumber ?? null,
        startKm: dto.startKm ?? null,
        endKm: dto.endKm ?? null,
        fuelAllowance: dto.fuelAllowance ?? 0,
        driverBatta: dto.driverBatta ?? 0,
        parkingTollPaid: dto.parkingTollPaid ?? 0,
        notes: dto.notes ?? null,
        assignedById: assignedById ?? null,
      },
      include: {
        vehicle: true,
        driver: true,
        booking: { select: { bookingNumber: true, packageName: true } },
      },
    });
  }

  async listAssignments(params?: {
    bookingId?: string;
    status?: FleetAssignmentStatus;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: Prisma.FleetAssignmentWhereInput = {};
    if (params?.bookingId) where.bookingId = params.bookingId;
    if (params?.status) where.status = params.status;
    if (params?.fromDate) {
      const from = new Date(params.fromDate);
      if (!isNaN(from.getTime())) where.endDate = { gte: from };
    }
    if (params?.toDate) {
      const to = new Date(params.toDate);
      if (!isNaN(to.getTime())) where.startDate = { lte: to };
    }

    return this.prisma.fleetAssignment.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        vehicle: true,
        driver: true,
        booking: { select: { id: true, bookingNumber: true, packageName: true, adults: true, children: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });
  }

  async updateAssignment(id: string, dto: Partial<AssignFleetDto>) {
    const existing = await this.prisma.fleetAssignment.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Fleet assignment not found');

    return this.prisma.fleetAssignment.update({
      where: { id },
      data: {
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
        ...(dto.driverId !== undefined ? { driverId: dto.driverId } : {}),
        ...(dto.circuit !== undefined ? { circuit: dto.circuit } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dutySlipNumber !== undefined ? { dutySlipNumber: dto.dutySlipNumber } : {}),
        ...(dto.startKm !== undefined ? { startKm: dto.startKm } : {}),
        ...(dto.endKm !== undefined ? { endKm: dto.endKm } : {}),
        ...(dto.fuelAllowance !== undefined ? { fuelAllowance: dto.fuelAllowance } : {}),
        ...(dto.driverBatta !== undefined ? { driverBatta: dto.driverBatta } : {}),
        ...(dto.parkingTollPaid !== undefined ? { parkingTollPaid: dto.parkingTollPaid } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        vehicle: true,
        driver: true,
        booking: { select: { bookingNumber: true } },
      },
    });
  }

  async getSchedule(startDate: string, endDate: string) {
    const from = new Date(startDate);
    const to = new Date(endDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    const assignments = await this.prisma.fleetAssignment.findMany({
      where: {
        status: { not: FleetAssignmentStatus.CANCELLED },
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: {
        vehicle: true,
        driver: true,
        booking: { select: { id: true, bookingNumber: true, packageName: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      range: { startDate, endDate },
      totalAssignments: assignments.length,
      assignments,
    };
  }
}
