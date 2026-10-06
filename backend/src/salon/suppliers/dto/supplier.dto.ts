import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListSuppliersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(['all', 'ACTIVE', 'INACTIVE'])
  status?: 'all' | 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  all?: boolean | string;
}

export class CreateSupplierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @IsOptional()
  @ValidateIf((o) => Boolean(o.email))
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  address?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @IsOptional()
  @ValidateIf((o) => Boolean(o.email))
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  address?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === null ? undefined : typeof value === 'string' ? value.trim() : value))
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSupplierStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}
