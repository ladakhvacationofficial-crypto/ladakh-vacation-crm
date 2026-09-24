import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PermitStatus } from '@prisma/client';

export class UpdatePermitDto {
  @IsEnum(PermitStatus)
  @IsOptional()
  status?: PermitStatus;

  @IsString()
  @IsOptional()
  permitNumber?: string;

  @IsString()
  @IsOptional()
  dcOfficeRef?: string;

  @IsOptional()
  issuedAt?: string;

  @IsInt()
  @IsOptional()
  environmentalFee?: number;

  @IsInt()
  @IsOptional()
  wildlifeFee?: number;

  @IsInt()
  @IsOptional()
  redCrossFee?: number;

  @IsInt()
  @IsOptional()
  totalFee?: number;

  @IsString()
  @IsOptional()
  feeReceiptNumber?: string;

  @IsString()
  @IsOptional()
  documentScanUrl?: string;

  @IsString()
  @IsOptional()
  rejectedReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
