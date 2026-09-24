import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class ExtractDraftDto {
  @IsNotEmpty()
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  preferredProvider?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  propertyType?: string; // HOTEL | CAMP | HOUSEBOAT
}
