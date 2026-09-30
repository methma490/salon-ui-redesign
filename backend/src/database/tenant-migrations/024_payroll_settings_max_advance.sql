-- Payroll settings max salary advance percentage
-- Version: 024

ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS max_salary_advance_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00;
