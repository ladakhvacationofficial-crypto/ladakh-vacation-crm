import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { FleetOwnership, VehicleType } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsString()
  @IsNotEmpty()
  makeModel: string;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsEnum(FleetOwnership)
  @IsOptional()
  ownership?: FleetOwnership;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  seatingConfig?: string;

  @IsString()
  @IsOptional()
  fuelType?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  defaultDriverId?: string;

  @IsOptional()
  insuranceExpiry?: string;

  @IsOptional()
  fitnessExpiry?: string;

  @IsOptional()
  permitExpiry?: string;

  @IsOptional()
  pucExpiry?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
