-- Tenant Schema P&L Enhancements Migration
-- Version: 028
-- Description: Add cost_price to sale_items for historical COGS snapshot, ensure all P&L expense categories exist

-- 1. Add cost_price snapshot column to sale_items
DO $$ BEGIN
  ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Backfill existing product sale items with product cost price if 0
UPDATE sale_items si
SET cost_price = COALESCE(p.cost_price, 0)
FROM products p
WHERE si.product_id = p.id
  AND si.item_type = 'product'
  AND (si.cost_price IS NULL OR si.cost_price = 0);

-- 3. Ensure required expense categories exist for P&L reporting
INSERT INTO expense_categories (code, name, description)
SELECT v.code, v.name, v.description
FROM (VALUES
  ('RENT', 'Rent', 'Store rent and lease payments'),
  ('UTILITIES', 'Utilities', 'Electricity, water, internet, and bills'),
  ('MARKETING', 'Marketing', 'Advertising and promotions'),
  ('MAINTENANCE', 'Maintenance', 'Repairs and equipment maintenance'),
  ('STAFF_COMMISSION', 'Staff Commission', 'Staff commissions and service incentives'),
  ('SUPPLIES', 'Supplies', 'Salon consumables and supplies'),
  ('TRANSPORT', 'Transport', 'Travel, delivery, and transportation costs'),
  ('OTHER', 'Other', 'Miscellaneous operating expenses')
) AS v(code, name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories ec WHERE ec.code = v.code
);

-- 4. Indexes for optimal P&L aggregation
CREATE INDEX IF NOT EXISTS idx_sales_pnl_filter ON sales (status, branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_pnl ON sale_items (sale_id, item_type, product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_pnl_filter ON expenses (status, branch_id, expense_date);
