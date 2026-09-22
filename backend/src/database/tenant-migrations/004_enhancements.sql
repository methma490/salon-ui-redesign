-- Tenant Schema Enhancements Migration
-- Version: 004
-- Description: Customer fields, branch stock, sales cashier, stock movement types, audit logs

-- Customer enhancements
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Branch stock (branch-wise inventory)
CREATE TABLE IF NOT EXISTS branch_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT branch_stock_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT branch_stock_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT branch_stock_unique UNIQUE (branch_id, product_id)
);

-- Sales cashier (separate from created_by audit field)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'sales_cashier_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_cashier_fkey
      FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Stock movement audit fields
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS created_by UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'stock_movements_created_by_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Extend stock movement enum values (PostgreSQL disallows ALTER TYPE inside DO $$ blocks)
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'STOCK_IN';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'SALE';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'DAMAGE';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'TRANSFER';

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS branch_stock_branch_id_idx ON branch_stock(branch_id);
CREATE INDEX IF NOT EXISTS branch_stock_product_id_idx ON branch_stock(product_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS sales_cashier_id_idx ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'branch_stock_updated_at'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TRIGGER branch_stock_updated_at BEFORE UPDATE ON branch_stock
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
