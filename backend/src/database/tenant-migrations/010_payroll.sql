-- Tenant Schema Payroll Migration
-- Version: 010
-- Description: Employee salary fields, loans, payroll settings/runs/items, loan repayments

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS epf_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS etf_enabled BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_run_status AS ENUM ('DRAFT', 'FINALIZED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_epf_rate NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  employer_epf_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  employer_etf_rate NUMERIC(5,2) NOT NULL DEFAULT 3.00,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_settings_employee_epf_rate_check CHECK (employee_epf_rate >= 0 AND employee_epf_rate <= 100),
  CONSTRAINT payroll_settings_employer_epf_rate_check CHECK (employer_epf_rate >= 0 AND employer_epf_rate <= 100),
  CONSTRAINT payroll_settings_employer_etf_rate_check CHECK (employer_etf_rate >= 0 AND employer_etf_rate <= 100)
);

INSERT INTO payroll_settings (employee_epf_rate, employer_epf_rate, employer_etf_rate)
SELECT 8.00, 12.00, 3.00
WHERE NOT EXISTS (SELECT 1 FROM payroll_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  loan_type VARCHAR(100) NOT NULL,
  original_amount NUMERIC(12,2) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL,
  monthly_installment NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  status loan_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_loans_original_amount_check CHECK (original_amount > 0),
  CONSTRAINT employee_loans_remaining_balance_check CHECK (remaining_balance >= 0),
  CONSTRAINT employee_loans_monthly_installment_check CHECK (monthly_installment > 0),
  CONSTRAINT employee_loans_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_loans_employee ON employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_status ON employee_loans(status);
CREATE INDEX IF NOT EXISTS idx_employee_loans_employee_status ON employee_loans(employee_id, status);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL,
  status payroll_run_status NOT NULL DEFAULT 'DRAFT',
  total_basic NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  finalized_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMP,
  paid_at TIMESTAMP,
  CONSTRAINT payroll_runs_month_check CHECK (month >= 1 AND month <= 12),
  CONSTRAINT payroll_runs_year_check CHECK (year >= 2000 AND year <= 2100),
  CONSTRAINT payroll_runs_year_month_unique UNIQUE (year, month),
  CONSTRAINT payroll_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT payroll_runs_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(year DESC, month DESC);

CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(7,4) NOT NULL DEFAULT 0,
  commission_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  employee_epf NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_epf NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_etf NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_items_run_employee_unique UNIQUE (payroll_run_id, employee_id),
  CONSTRAINT payroll_items_run_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  CONSTRAINT payroll_items_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(employee_id);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL,
  payroll_item_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT loan_repayments_amount_check CHECK (amount > 0),
  CONSTRAINT loan_repayments_loan_fkey FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
  CONSTRAINT loan_repayments_payroll_item_fkey FOREIGN KEY (payroll_item_id) REFERENCES payroll_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_payroll_item ON loan_repayments(payroll_item_id);

DO $$ BEGIN
  CREATE TRIGGER payroll_settings_updated_at
    BEFORE UPDATE ON payroll_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER employee_loans_updated_at
    BEFORE UPDATE ON employee_loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER payroll_items_updated_at
    BEFORE UPDATE ON payroll_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
