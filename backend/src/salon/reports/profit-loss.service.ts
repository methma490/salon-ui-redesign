import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { ProfitLossQueryDto, ProfitLossReportResponse } from './dto/profit-loss.dto';

const STANDARD_CATEGORIES: Array<{ code: string; name: string }> = [
  { code: 'RENT', name: 'Rent' },
  { code: 'UTILITIES', name: 'Utilities' },
  { code: 'MARKETING', name: 'Marketing' },
  { code: 'MAINTENANCE', name: 'Maintenance' },
  { code: 'STAFF_COMMISSION', name: 'Staff Commission' },
  { code: 'SUPPLIES', name: 'Supplies' },
  { code: 'TRANSPORT', name: 'Transport' },
  { code: 'OTHER', name: 'Other' },
];

@Injectable()
export class ProfitLossService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async getProfitLoss(
    schemaName: string,
    query: ProfitLossQueryDto,
    user?: AuthenticatedUser,
  ): Promise<ProfitLossReportResponse> {
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const now = new Date();
    const defaultStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultEnd = toDateStr(now);

    const startDate = query.startDate || query.from || defaultStart;
    const endDate = query.endDate || query.to || defaultEnd;

    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const products = tenantTable(schemaName, 'products');
    const expenses = tenantTable(schemaName, 'expenses');
    const expenseCategories = tenantTable(schemaName, 'expense_categories');
    const branches = tenantTable(schemaName, 'branches');
    const employees = tenantTable(schemaName, 'employees');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      // 1. Resolve branch filtering based on user permissions
      let effectiveBranchId: string | null = query.branchId || null;
      let branchName = 'All Branches';

      const isSalonAdmin = user?.roles?.includes('SALON_ADMIN');
      const isSuperAdmin = user?.userType === 'SUPER_ADMIN';

      if (user && !isSalonAdmin && !isSuperAdmin) {
        let userBranchId = (user as { branchId?: string }).branchId || null;
        if (!userBranchId) {
          // Find assigned branch for branch-level staff
          const empRows = await tx.$queryRawUnsafe<Array<{ branch_id: string }>>(
            `SELECT branch_id FROM ${employees} WHERE user_id = $1::uuid LIMIT 1`,
            user.id,
          );
          if (empRows.length > 0 && empRows[0].branch_id) {
            userBranchId = empRows[0].branch_id;
          }
        }

        if (userBranchId) {
          if (query.branchId && query.branchId !== userBranchId) {
            throw new ForbiddenException('You can only view reports for your assigned branch');
          }
          effectiveBranchId = userBranchId;
        }
      }

      if (effectiveBranchId) {
        const branchRows = await tx.$queryRawUnsafe<Array<{ name: string }>>(
          `SELECT name FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
          effectiveBranchId,
        );
        if (branchRows.length > 0) {
          branchName = branchRows[0].name;
        }
      }

      // Query parameters
      const dateParams: unknown[] = [startDate, endDate];
      let salesBranchCond = '';
      let expensesBranchCond = '';

      if (effectiveBranchId) {
        dateParams.push(effectiveBranchId);
        salesBranchCond = `AND s.branch_id = $3::uuid`;
        expensesBranchCond = `AND e.branch_id = $3::uuid`;
      }

      // 2. Query Revenue and Product COGS (excluding CANCELLED sales)
      const [incomeSummaryRows, salesDiscountRows] = await Promise.all([
        tx.$queryRawUnsafe<
          Array<{
            serviceRevenue: number;
            productRevenue: number;
            productCogs: number;
          }>
        >(
          `SELECT 
             COALESCE(SUM(CASE WHEN si.item_type = 'service' THEN si.total ELSE 0 END), 0)::float AS "serviceRevenue",
             COALESCE(SUM(CASE WHEN si.item_type = 'product' THEN si.total ELSE 0 END), 0)::float AS "productRevenue",
             COALESCE(SUM(CASE WHEN si.item_type = 'product' THEN COALESCE(NULLIF(si.cost_price, 0), p.cost_price, 0) * si.quantity ELSE 0 END), 0)::float AS "productCogs"
           FROM ${saleItems} si
           INNER JOIN ${sales} s ON s.id = si.sale_id
           LEFT JOIN ${products} p ON p.id = si.product_id
           WHERE s.status <> 'CANCELLED'
             AND s.created_at >= $1::date
             AND s.created_at < ($2::date + INTERVAL '1 day')
             ${salesBranchCond}`,
          ...dateParams,
        ),
        tx.$queryRawUnsafe<
          Array<{
            saleDiscounts: number;
            refunds: number;
            netSalesTotal: number;
          }>
        >(
          `SELECT 
             COALESCE(SUM(s.discount), 0)::float AS "saleDiscounts",
             COALESCE(SUM(COALESCE(s.refunded_amount, 0)), 0)::float AS "refunds",
             COALESCE(SUM(s.total), 0)::float AS "netSalesTotal"
           FROM ${sales} s
           WHERE s.status <> 'CANCELLED'
             AND s.created_at >= $1::date
             AND s.created_at < ($2::date + INTERVAL '1 day')
             ${salesBranchCond}`,
          ...dateParams,
        ),
      ]);

      const serviceRevenue = Number(incomeSummaryRows[0]?.serviceRevenue ?? 0);
      const productRevenue = Number(incomeSummaryRows[0]?.productRevenue ?? 0);
      const productCogs = Number(incomeSummaryRows[0]?.productCogs ?? 0);
      const grossSales = serviceRevenue + productRevenue;

      const discounts = Number(salesDiscountRows[0]?.saleDiscounts ?? 0);
      const refunds = Number(salesDiscountRows[0]?.refunds ?? 0);
      const netRevenue = Math.max(0, grossSales - discounts - refunds);
      const totalRevenue = netRevenue;

      const grossProfit = totalRevenue - productCogs;
      const grossProfitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;

      // 3. Query Operating Expenses (excluding VOID and CANCELLED)
      const expenseRows = await tx.$queryRawUnsafe<
        Array<{
          categoryCode: string;
          categoryName: string;
          amount: number;
        }>
      >(
        `SELECT 
           COALESCE(c.code, 'OTHER') AS "categoryCode",
           COALESCE(c.name, 'Other') AS "categoryName",
           COALESCE(SUM(e.amount), 0)::float AS "amount"
         FROM ${expenses} e
         LEFT JOIN ${expenseCategories} c ON c.id = e.category_id
         WHERE e.status::text NOT IN ('VOID', 'CANCELLED')
           AND e.expense_date >= $1::date
           AND e.expense_date <= $2::date
           ${expensesBranchCond}
         GROUP BY COALESCE(c.code, 'OTHER'), COALESCE(c.name, 'Other')
         ORDER BY "amount" DESC`,
        ...dateParams,
      );

      // Build structured breakdown with standard categories represented
      const categoryMap = new Map<string, { code: string; name: string; amount: number }>();
      for (const std of STANDARD_CATEGORIES) {
        categoryMap.set(std.code, { code: std.code, name: std.name, amount: 0 });
      }

      let totalExpenses = 0;
      for (const row of expenseRows) {
        const amt = Number(row.amount);
        totalExpenses += amt;
        const code = row.categoryCode.toUpperCase();
        if (categoryMap.has(code)) {
          const entry = categoryMap.get(code)!;
          entry.amount += amt;
        } else {
          categoryMap.set(code, {
            code,
            name: row.categoryName,
            amount: amt,
          });
        }
      }

      const categoriesList = Array.from(categoryMap.values()).map((cat) => ({
        categoryCode: cat.code,
        categoryName: cat.name,
        amount: Number(cat.amount.toFixed(2)),
        percentage: totalExpenses > 0 ? Number(((cat.amount / totalExpenses) * 100).toFixed(1)) : 0,
      }));

      // Sort with non-zero amounts first, then alphabetically
      categoriesList.sort((a, b) => b.amount - a.amount || a.categoryName.localeCompare(b.categoryName));

      const netProfit = grossProfit - totalExpenses;
      const netProfitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

      // 4. Query Monthly Trend (last 6-12 months or within filtered range)
      const [monthlySalesRows, monthlyExpensesRows] = await Promise.all([
        tx.$queryRawUnsafe<
          Array<{
            month: string;
            revenue: number;
            cogs: number;
          }>
        >(
          `SELECT
             TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS "month",
             COALESCE(SUM(s.total - COALESCE(s.refunded_amount, 0)), 0)::float AS "revenue",
             COALESCE(SUM(
               (SELECT COALESCE(SUM(COALESCE(NULLIF(si.cost_price, 0), p.cost_price, 0) * si.quantity), 0)
                FROM ${saleItems} si
                LEFT JOIN ${products} p ON p.id = si.product_id
                WHERE si.sale_id = s.id AND si.item_type = 'product')
             ), 0)::float AS "cogs"
           FROM ${sales} s
           WHERE s.status <> 'CANCELLED'
             AND s.created_at >= ($1::date - INTERVAL '6 months')
             AND s.created_at < ($2::date + INTERVAL '1 day')
             ${salesBranchCond}
           GROUP BY DATE_TRUNC('month', s.created_at)
           ORDER BY "month" ASC`,
          ...dateParams,
        ),
        tx.$queryRawUnsafe<
          Array<{
            month: string;
            expenses: number;
          }>
        >(
          `SELECT
             TO_CHAR(DATE_TRUNC('month', e.expense_date), 'YYYY-MM') AS "month",
             COALESCE(SUM(e.amount), 0)::float AS "expenses"
           FROM ${expenses} e
           WHERE e.status::text NOT IN ('VOID', 'CANCELLED')
             AND e.expense_date >= ($1::date - INTERVAL '6 months')
             AND e.expense_date <= $2::date
             ${expensesBranchCond}
           GROUP BY DATE_TRUNC('month', e.expense_date)
           ORDER BY "month" ASC`,
          ...dateParams,
        ),
      ]);

      const monthlyMap = new Map<
        string,
        { month: string; revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number }
      >();

      for (const row of monthlySalesRows) {
        const rev = Number(row.revenue);
        const cogs = Number(row.cogs);
        monthlyMap.set(row.month, {
          month: row.month,
          revenue: Number(rev.toFixed(2)),
          cogs: Number(cogs.toFixed(2)),
          grossProfit: Number((rev - cogs).toFixed(2)),
          expenses: 0,
          netProfit: Number((rev - cogs).toFixed(2)),
        });
      }

      for (const row of monthlyExpensesRows) {
        const exp = Number(row.expenses);
        if (monthlyMap.has(row.month)) {
          const entry = monthlyMap.get(row.month)!;
          entry.expenses = Number(exp.toFixed(2));
          entry.netProfit = Number((entry.grossProfit - exp).toFixed(2));
        } else {
          monthlyMap.set(row.month, {
            month: row.month,
            revenue: 0,
            cogs: 0,
            grossProfit: 0,
            expenses: Number(exp.toFixed(2)),
            netProfit: Number((-exp).toFixed(2)),
          });
        }
      }

      const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      return {
        period: {
          startDate,
          endDate,
        },
        branch: {
          id: effectiveBranchId,
          name: branchName,
        },
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          cogs: Number(productCogs.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          grossProfitMargin,
          totalExpenses: Number(totalExpenses.toFixed(2)),
          netProfit: Number(netProfit.toFixed(2)),
          netProfitMargin,
        },
        income: {
          serviceRevenue: Number(serviceRevenue.toFixed(2)),
          productRevenue: Number(productRevenue.toFixed(2)),
          grossSales: Number(grossSales.toFixed(2)),
          discounts: Number(discounts.toFixed(2)),
          refunds: Number(refunds.toFixed(2)),
          netRevenue: Number(netRevenue.toFixed(2)),
        },
        costOfSales: {
          productCogs: Number(productCogs.toFixed(2)),
          totalCostOfSales: Number(productCogs.toFixed(2)),
        },
        operatingExpenses: {
          categories: categoriesList,
          totalExpenses: Number(totalExpenses.toFixed(2)),
        },
        monthlyTrend,
      };
    });
  }
}
