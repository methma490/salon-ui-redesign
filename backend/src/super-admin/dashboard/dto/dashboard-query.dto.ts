import { IsIn, IsOptional } from 'class-validator';

export type DashboardPeriod = '7d' | '30d' | 'mtd';

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', 'mtd'])
  period?: DashboardPeriod = '30d';
}
