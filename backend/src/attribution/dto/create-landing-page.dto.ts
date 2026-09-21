import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLandingPageDto {
  /** URL slug — lowercased, dash-separated, matched against the beacon. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message:
      'slug must be lowercase letters, numbers and dashes only (e.g. ladakh-honeymoon-2026)',
  })
  slug: string;

  @IsString() @MinLength(2) @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(500)
  url?: string;

  @IsOptional() @IsString() @MaxLength(120)
  campaign?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
