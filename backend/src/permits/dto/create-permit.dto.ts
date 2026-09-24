import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PermitStatus, PermitType } from '@prisma/client';

export class CreatePermitTravellerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsInt()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  stateOrCountry?: string;

  @IsString()
  @IsOptional()
  idType?: string; // AADHAAR, PASSPORT, VOTER_ID, DRIVING_LICENSE

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsString()
  @IsOptional()
  idDocumentUrl?: string;

  @IsOptional()
  passportIssueDate?: string;

  @IsOptional()
  passportExpiryDate?: string;

  @IsString()
  @IsOptional()
  visaNumber?: string;

  @IsOptional()
  visaExpiryDate?: string;
}

export class CreatePermitDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsEnum(PermitType)
  @IsOptional()
  permitType?: PermitType;

  @IsEnum(PermitStatus)
  @IsOptional()
  status?: PermitStatus;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sectors: string[]; // ['NUBRA', 'PANGONG', 'TSO_MORIRI', 'HANLE', 'UMLING_LA']

  @IsString()
  @IsNotEmpty()
  validFrom: string;

  @IsString()
  @IsNotEmpty()
  validTo: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePermitTravellerDto)
  travellers: CreatePermitTravellerDto[];

  @IsString()
  @IsOptional()
  dcOfficeRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
