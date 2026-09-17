-- Split salary-advance recovery from loan installments on payroll items
ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0;
