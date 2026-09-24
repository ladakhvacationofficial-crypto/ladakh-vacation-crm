import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class DiscoverDraftsDto {
  @IsNotEmpty()
  @IsString()
  query!: string; // e.g. "Srinagar houseboats" or "Nubra luxury camps"

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  propertyType?: string; // HOTEL | CAMP | HOUSEBOAT

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
