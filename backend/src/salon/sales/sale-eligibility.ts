/** Centralized rule: which sale statuses count toward sales & commission. */

export const ELIGIBLE_SALE_STATUSES = ['COMPLETED'] as const;

export type EligibleSaleStatus = (typeof ELIGIBLE_SALE_STATUSES)[number];

export const EXCLUDED_SALE_STATUSES = ['PENDING', 'CANCELLED', 'REFUNDED'] as const;

export function isSaleEligibleForSales(status: string): boolean {
  return (ELIGIBLE_SALE_STATUSES as readonly string[]).includes(status);
}

/** SQL fragment: alias.column IN ('COMPLETED') — keep in sync with ELIGIBLE_SALE_STATUSES. */
export function eligibleSaleStatusSql(alias = 's'): string {
  const list = ELIGIBLE_SALE_STATUSES.map((s) => `'${s}'`).join(', ');
  return `${alias}.status::text IN (${list})`;
}

/** Net eligible amount after refunds (full REFUNDED → 0 via status exclusion). */
export function netSaleAmountSql(alias = 's'): string {
  return `GREATEST(0, ${alias}.total - COALESCE(${alias}.refunded_amount, 0))`;
}

/**
 * Service line value for commission, scaled by sale-level partial refunds.
 * Products are excluded by joining only item_type = 'service'.
 */
export function commissionableServiceLineSql(saleAlias = 's', itemAlias = 'si'): string {
  return `CASE
    WHEN COALESCE(${saleAlias}.total, 0) <= 0 THEN 0
    ELSE ROUND(
      (
        ${itemAlias}.total
        * GREATEST(0, ${saleAlias}.total - COALESCE(${saleAlias}.refunded_amount, 0))
        / ${saleAlias}.total
      )::numeric,
      2
    )
  END`;
}
