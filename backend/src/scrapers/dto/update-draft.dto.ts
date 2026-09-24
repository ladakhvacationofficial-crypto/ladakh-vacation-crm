import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ScrapeDraftStatus, VendorType } from '@prisma/client';

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(VendorType)
  propertyType?: VendorType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  starRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  roomCount?: number;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsArray()
  roomCategories?: any[];

  @IsOptional()
  seasonalFrom?: string | Date;

  @IsOptional()
  seasonalTo?: string | Date;

  @IsOptional()
  @IsArray()
  reportedAmenities?: string[];

  @IsOptional()
  @IsEnum(ScrapeDraftStatus)
  status?: ScrapeDraftStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
