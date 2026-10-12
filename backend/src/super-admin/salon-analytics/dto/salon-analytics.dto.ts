import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
const SALON_STATUSES = ['ACTIVE', 'SUSPENDED', 'ARCHIVED', 'TRIAL', 'PROVISIONING', 'ALL'] as const;

export class SalonAnalyticsListQueryDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'from date must be a valid date or timestamp' })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'to date must be a valid date or timestamp' })
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(SALON_STATUSES)
  status?: (typeof SALON_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'revenue';

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SalonAnalyticsDateRangeDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'from date must be a valid date or timestamp' })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'to date must be a valid date or timestamp' })
  to?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class SalonAnalyticsCustomersQueryDto extends SalonAnalyticsDateRangeDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'spend';

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SalonAnalyticsSalesQueryDto extends SalonAnalyticsDateRangeDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SalonAnalyticsServicesQueryDto extends SalonAnalyticsDateRangeDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'most_booked';

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SalonAnalyticsAppointmentsQueryDto extends SalonAnalyticsDateRangeDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
