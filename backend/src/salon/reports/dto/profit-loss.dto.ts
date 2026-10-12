import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ProfitLossQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export interface ProfitLossReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  branch: {
    id: string | null;
    name: string;
  };
  summary: {
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    grossProfitMargin: number;
    totalExpenses: number;
    netProfit: number;
    netProfitMargin: number;
  };
  income: {
    serviceRevenue: number;
    productRevenue: number;
    grossSales: number;
    discounts: number;
    refunds: number;
    netRevenue: number;
  };
  costOfSales: {
    productCogs: number;
    totalCostOfSales: number;
  };
  operatingExpenses: {
    categories: Array<{
      categoryCode: string;
      categoryName: string;
      amount: number;
      percentage: number;
    }>;
    totalExpenses: number;
  };
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  }>;
}
