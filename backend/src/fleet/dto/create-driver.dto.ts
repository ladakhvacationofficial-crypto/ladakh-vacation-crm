import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  altPhone?: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsOptional()
  licenseExpiry?: string;

  @IsBoolean()
  @IsOptional()
  policeVerified?: boolean;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsBoolean()
  @IsOptional()
  isLocalLadakhi?: boolean;

  @IsString()
  @IsOptional()
  badgeNumber?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
