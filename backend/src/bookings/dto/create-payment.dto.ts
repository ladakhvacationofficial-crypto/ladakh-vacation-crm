import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt() @Min(1) amount: number;

  @IsOptional() @IsEnum(PaymentMode) mode?: PaymentMode;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  /** Records the amount as money going back out to the client. */
  @IsOptional() @IsBoolean() isRefund?: boolean;
  @IsOptional() @IsString() verificationStatus?: string;
}
