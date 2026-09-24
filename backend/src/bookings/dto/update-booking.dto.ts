import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingDto {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsString() @MaxLength(200) packageName?: string;
  @IsOptional() @IsDateString() travelStartDate?: string;
  @IsOptional() @IsDateString() travelEndDate?: string;
  @IsOptional() @IsInt() @Min(1) adults?: number;
  @IsOptional() @IsInt() @Min(0) children?: number;
  @IsOptional() @IsInt() @Min(0) nights?: number;
  @IsOptional() @IsInt() @Min(0) totalSell?: number;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsOptional() @IsString() @MaxLength(500) cancelledReason?: string;
  @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @IsOptional() fxRate?: number;
}
