import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class BatchExtractDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  urls!: string[];

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  propertyType?: string;
}
