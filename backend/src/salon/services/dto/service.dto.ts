import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class CreateServiceCategoryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;
}

export class UpdateServiceCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;
}

export class UpdateCategoryStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}

export class CreateServiceDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;
}

export class UpdateServiceStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}
