-- Tenant Schema Expenses Migration
-- Version: 009
-- Description: Create expense_categories and expenses tables

DO $$ BEGIN
  CREATE TYPE expense_status AS ENUM ('ACTIVE', 'VOID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_categories_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  branch_id UUID NOT NULL,
  category_id UUID,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
  notes TEXT,
  status expense_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_code_unique UNIQUE (code),
  CONSTRAINT expenses_amount_positive CHECK (amount >= 0),
  CONSTRAINT expenses_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT expenses_category_fkey FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON expenses(branch_id, expense_date DESC);

DO $$ BEGIN
  CREATE TRIGGER expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO expense_categories (code, name, description)
SELECT v.code, v.name, v.description
FROM (VALUES
  ('RENT', 'Rent', 'Store rent and lease payments'),
  ('UTILITIES', 'Utilities', 'Electricity, water, internet, and bills'),
  ('SUPPLIES', 'Supplies', 'Salon consumables and supplies'),
  ('SALARIES', 'Salaries', 'Staff salaries and wages'),
  ('MARKETING', 'Marketing', 'Advertising and promotions'),
  ('MAINTENANCE', 'Maintenance', 'Repairs and equipment maintenance'),
  ('OTHER', 'Other', 'Miscellaneous expenses')
) AS v(code, name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories ec WHERE ec.code = v.code
);
