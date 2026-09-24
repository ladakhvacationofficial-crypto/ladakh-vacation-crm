import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateItineraryDto } from './create-itinerary.dto';

/** leadId is immutable — an itinerary can't be moved between leads. */
export class UpdateItineraryDto extends PartialType(
  OmitType(CreateItineraryDto, ['leadId'] as const),
) {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  fxRate?: number;
}

