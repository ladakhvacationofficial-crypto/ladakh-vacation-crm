import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class HandoverBookingDto {
  @IsString()
  @IsNotEmpty()
  operationsOwnerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
