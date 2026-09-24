import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FleetAssignmentStatus } from '@prisma/client';

export class AssignFleetDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  circuit: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropLocation?: string;

  @IsEnum(FleetAssignmentStatus)
  @IsOptional()
  status?: FleetAssignmentStatus;

  @IsString()
  @IsOptional()
  dutySlipNumber?: string;

  @IsInt()
  @IsOptional()
  startKm?: number;

  @IsInt()
  @IsOptional()
  endKm?: number;

  @IsInt()
  @IsOptional()
  fuelAllowance?: number;

  @IsInt()
  @IsOptional()
  driverBatta?: number;

  @IsInt()
  @IsOptional()
  parkingTollPaid?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
