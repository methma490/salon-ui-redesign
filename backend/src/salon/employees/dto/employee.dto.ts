import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
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
}

export class UpdateEmployeeDto {
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
}

export class UpdateEmployeeStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE', 'RESIGNED'])
  status!: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
}

export class ListEmployeesQueryDto {
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
