import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class UpdatePayrollSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  employeeEpfRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  employerEpfRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  employerEtfRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxSalaryAdvancePercentage?: number;
}

export class CreateEmployeeLoanDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  loanType?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  originalAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyInstallment!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateEmployeeLoanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  loanType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyInstallment?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListEmployeeLoansQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateEmployeeAdvanceDto {
  @IsUUID()
  employeeId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  originalAmount!: number;

  /** Optional — advances are always fully deducted in the next/same payroll month. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyInstallment?: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateEmployeeAdvanceDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListEmployeeAdvancesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreatePayrollRunDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class UpdatePayrollItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  commissionPercentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionBase?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherDeduction?: number;
}

export class ListPayrollRunsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @IsEnum(['DRAFT', 'FINALIZED', 'PAID'])
  status?: 'DRAFT' | 'FINALIZED' | 'PAID';
}

export class ListPayslipsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
