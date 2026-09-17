import { IsArray, IsEnum, IsNumber, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class SaleEmployeeAssignmentDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsEnum(['PRIMARY', 'ASSISTANT'])
  assignmentType?: 'PRIMARY' | 'ASSISTANT';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  allocationPercentage?: number;
}

export class SalesAnalyticsQueryDto extends PaginationQueryDto {
  @IsOptional()
  from?: string;

  @IsOptional()
  to?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  preset?: string;
}

export class EmployeeSalesQueryDto extends SalesAnalyticsQueryDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds?: string[];
}
