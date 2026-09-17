-- Tenant Schema: Separate employee advances from loans
-- Version: 012
-- Safe / additive — migrates existing "Salary Advance" rows out of employee_loans

DO $$ BEGIN
  CREATE TYPE advance_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS employee_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  original_amount NUMERIC(12,2) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL,
  monthly_installment NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  status advance_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_advances_original_amount_check CHECK (original_amount > 0),
  CONSTRAINT employee_advances_remaining_balance_check CHECK (remaining_balance >= 0),
  CONSTRAINT employee_advances_monthly_installment_check CHECK (monthly_installment > 0),
  CONSTRAINT employee_advances_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances(status);
CREATE INDEX IF NOT EXISTS idx_employee_advances_employee_status ON employee_advances(employee_id, status);

CREATE TABLE IF NOT EXISTS advance_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL,
  payroll_item_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT advance_repayments_amount_check CHECK (amount > 0),
  CONSTRAINT advance_repayments_advance_fkey FOREIGN KEY (advance_id) REFERENCES employee_advances(id) ON DELETE CASCADE,
  CONSTRAINT advance_repayments_payroll_item_fkey FOREIGN KEY (payroll_item_id) REFERENCES payroll_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advance_repayments_advance ON advance_repayments(advance_id);
CREATE INDEX IF NOT EXISTS idx_advance_repayments_payroll_item ON advance_repayments(payroll_item_id);

DO $$ BEGIN
  CREATE TRIGGER employee_advances_updated_at
    BEFORE UPDATE ON employee_advances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Migrate Salary Advance rows from employee_loans → employee_advances (preserve IDs)
INSERT INTO employee_advances (
  id, employee_id, original_amount, remaining_balance, monthly_installment,
  start_date, status, notes, created_at, updated_at
)
SELECT
  l.id,
  l.employee_id,
  l.original_amount,
  l.remaining_balance,
  l.monthly_installment,
  l.start_date,
  l.status::text::advance_status,
  l.notes,
  l.created_at,
  l.updated_at
FROM employee_loans l
WHERE LOWER(TRIM(l.loan_type)) = 'salary advance'
  AND NOT EXISTS (SELECT 1 FROM employee_advances a WHERE a.id = l.id);

-- Migrate repayments for those advances
INSERT INTO advance_repayments (
  id, advance_id, payroll_item_id, amount, balance_before, balance_after, paid_at
)
SELECT
  r.id,
  r.loan_id,
  r.payroll_item_id,
  r.amount,
  r.balance_before,
  r.balance_after,
  r.paid_at
FROM loan_repayments r
INNER JOIN employee_loans l ON l.id = r.loan_id
WHERE LOWER(TRIM(l.loan_type)) = 'salary advance'
  AND NOT EXISTS (SELECT 1 FROM advance_repayments ar WHERE ar.id = r.id);

-- Remove migrated advance repayments from loan_repayments
DELETE FROM loan_repayments r
USING employee_loans l
WHERE r.loan_id = l.id
  AND LOWER(TRIM(l.loan_type)) = 'salary advance';

-- Remove migrated advance rows from employee_loans
DELETE FROM employee_loans
WHERE LOWER(TRIM(loan_type)) = 'salary advance';
