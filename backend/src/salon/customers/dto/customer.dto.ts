import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  phone!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;
}

export class UpdateCustomerStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE', 'BLOCKED'])
  status!: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

export class ListCustomersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'BLOCKED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

  /** When true, returns only id, code, name, phone (for autocomplete/search). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  summary?: boolean;
}
