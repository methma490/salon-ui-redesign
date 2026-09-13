import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsString()
  @MaxLength(100)
  designation!: string;

  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  /** When set, creates a login user and assigns this role (requires email + password). */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  roleCode?: string;

  @ValidateIf((dto: CreateEmployeeDto) => !!dto.roleCode)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  roleCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}

export class UpdateEmployeeStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE', 'RESIGNED'])
  status!: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
}

export class ListEmployeesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'RESIGNED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';

  @IsOptional()
  @IsString()
  search?: string;
}
