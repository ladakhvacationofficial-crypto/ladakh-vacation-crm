import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCostDto {
  @IsString() @MinLength(1) @MaxLength(300) description: string;

  @IsOptional() @IsString() vendorId?: string;

  @IsInt() @Min(0) amountDue: number;
  @IsOptional() @IsInt() @Min(0) amountPaid?: number;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsString() confirmationStatus?: string;
  @IsOptional() @IsString() confirmationRef?: string;
}
