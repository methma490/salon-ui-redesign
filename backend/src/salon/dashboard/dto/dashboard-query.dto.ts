import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export type SalonDashboardPeriod = 'today' | 'week' | 'month' | 'year';

export class SalonDashboardQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year'])
  period?: SalonDashboardPeriod = 'today';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
