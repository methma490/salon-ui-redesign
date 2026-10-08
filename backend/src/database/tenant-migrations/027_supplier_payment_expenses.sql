-- Migration 027: Link Supplier Payments to Expenses
-- Version: 027

-- 1. Ensure SUPPLIER_PAYMENT expense category exists
INSERT INTO expense_categories (code, name, description)
SELECT 'SUPPLIER_PAYMENT', 'Supplier Payments', 'Payments made to suppliers for stock purchases'
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories WHERE code = 'SUPPLIER_PAYMENT'
);

-- 2. Add columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_payment_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Foreign key to supplier_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'expenses_supplier_payment_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_supplier_payment_fkey
      FOREIGN KEY (supplier_payment_id) REFERENCES supplier_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Unique index on supplier_payment_id (one expense per supplier payment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_supplier_payment_unique
  ON expenses(supplier_payment_id)
  WHERE supplier_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_is_system_generated
  ON expenses(is_system_generated);

-- 5. Safe idempotent backfill for existing confirmed supplier payments
DO $$
DECLARE
  r RECORD;
  cat_id UUID;
  default_branch_id UUID;
  default_user_id UUID;
  supplier_name VARCHAR;
  exp_title VARCHAR;
  exp_notes TEXT;
  exp_code VARCHAR;
  next_num INT;
BEGIN
  SELECT id INTO cat_id FROM expense_categories WHERE code = 'SUPPLIER_PAYMENT' LIMIT 1;
  SELECT id INTO default_branch_id FROM branches ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO default_user_id FROM users ORDER BY created_at ASC LIMIT 1;

  IF cat_id IS NOT NULL AND default_branch_id IS NOT NULL AND default_user_id IS NOT NULL THEN
    FOR r IN (
      SELECT sp.id, sp.supplier_id, sp.payment_date, sp.amount, sp.payment_method::text AS payment_method,
             sp.reference_number, sp.cheque_number, sp.notes, sp.created_by,
             COALESCE(
               (SELECT g.branch_id FROM supplier_payment_allocations spa JOIN grns g ON spa.grn_id = g.id WHERE spa.payment_id = sp.id LIMIT 1),
               default_branch_id
             ) AS branch_id
      FROM supplier_payments sp
      WHERE (sp.payment_method IN ('CASH', 'BANK_TRANSFER') OR sp.cheque_status = 'CLEARED')
        AND NOT EXISTS (
          SELECT 1 FROM expenses e WHERE e.supplier_payment_id = sp.id
        )
      ORDER BY sp.payment_date ASC, sp.created_at ASC
    ) LOOP
      SELECT name INTO supplier_name FROM suppliers WHERE id = r.supplier_id;
      exp_title := 'Supplier Payment - ' || COALESCE(supplier_name, 'Supplier');
      exp_notes := 'Supplier: ' || COALESCE(supplier_name, 'Supplier') ||
                   CASE WHEN r.reference_number IS NOT NULL AND r.reference_number <> '' THEN E'\nPayment Reference: ' || r.reference_number ELSE '' END ||
                   CASE WHEN r.cheque_number IS NOT NULL AND r.cheque_number <> '' THEN E'\nCheque Number: ' || r.cheque_number ELSE '' END ||
                   CASE WHEN r.notes IS NOT NULL AND r.notes <> '' THEN E'\nNotes: ' || r.notes ELSE '' END;
      
      SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '^EXP-', ''), '')::bigint), 0) + 1 INTO next_num FROM expenses;
      exp_code := 'EXP-' || LPAD(next_num::text, 6, '0');

      INSERT INTO expenses (
        code, branch_id, category_id, title, amount, expense_date,
        payment_method, notes, status, created_by, supplier_payment_id, is_system_generated
      ) VALUES (
        exp_code,
        r.branch_id,
        cat_id,
        exp_title,
        r.amount,
        r.payment_date,
        r.payment_method,
        exp_notes,
        'ACTIVE',
        COALESCE(r.created_by, default_user_id),
        r.id,
        true
      );
    END LOOP;
  END IF;
END $$;
