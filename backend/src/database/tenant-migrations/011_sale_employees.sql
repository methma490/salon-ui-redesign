-- Tenant Schema: Sale employee assignment + commission foundations
-- Version: 011
-- Safe / additive — preserves existing sales and payroll data

-- Assignment type for sale-level performers
DO $$ BEGIN
  CREATE TYPE sale_assignment_type AS ENUM ('PRIMARY', 'ASSISTANT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Invoice (sale) ↔ employee with allocation (source of truth for sales & commission)
CREATE TABLE IF NOT EXISTS sale_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  assignment_type sale_assignment_type NOT NULL DEFAULT 'PRIMARY',
  allocation_percentage NUMERIC(7,4) NOT NULL DEFAULT 100,
  commissionable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sale_employees_sale_fkey FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT sale_employees_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT sale_employees_sale_employee_unique UNIQUE (sale_id, employee_id),
  CONSTRAINT sale_employees_allocation_range CHECK (
    allocation_percentage >= 0 AND allocation_percentage <= 100
  )
);

CREATE INDEX IF NOT EXISTS sale_employees_sale_id_idx ON sale_employees(sale_id);
CREATE INDEX IF NOT EXISTS sale_employees_employee_id_idx ON sale_employees(employee_id);
CREATE INDEX IF NOT EXISTS sale_employees_employee_sale_idx ON sale_employees(employee_id, sale_id);

-- Partial refund support (full REFUNDED status still supported)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sales_status_created_at_idx ON sales(status, created_at);
CREATE INDEX IF NOT EXISTS sales_branch_created_at_idx ON sales(branch_id, created_at);

-- Employee default commission settings
ALTER TABLE employees ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(7,4) NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS commission_type VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE_OF_INVOICE_SALES';

-- Payroll commission snapshot (immutable after finalize)
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS commission_invoice_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS commission_period_from DATE;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS commission_period_to DATE;

DO $$ BEGIN
  CREATE TRIGGER sale_employees_updated_at
    BEFORE UPDATE ON sale_employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill sale_employees from existing sale_item_employees (equal split per distinct employee)
WITH distinct_emps AS (
  SELECT
    s.id AS sale_id,
    sie.employee_id,
    MAX(s.total)::numeric AS sale_total,
    MIN(e.name) AS emp_name
  FROM sales s
  INNER JOIN sale_items si ON si.sale_id = s.id
  INNER JOIN sale_item_employees sie ON sie.sale_item_id = si.id
  INNER JOIN employees e ON e.id = sie.employee_id
  GROUP BY s.id, sie.employee_id
),
ranked AS (
  SELECT
    sale_id,
    employee_id,
    sale_total,
    ROW_NUMBER() OVER (PARTITION BY sale_id ORDER BY emp_name, employee_id) AS rn,
    COUNT(*) OVER (PARTITION BY sale_id) AS emp_count
  FROM distinct_emps
),
with_pct AS (
  SELECT
    sale_id,
    employee_id,
    sale_total,
    rn,
    emp_count,
    CASE
      WHEN emp_count = 1 THEN 100::numeric
      WHEN rn < emp_count THEN ROUND((100.0 / emp_count)::numeric, 4)
      ELSE ROUND(
        (100 - (ROUND((100.0 / emp_count)::numeric, 4) * (emp_count - 1)))::numeric,
        4
      )
    END AS pct
  FROM ranked
)
INSERT INTO sale_employees (
  sale_id, employee_id, assignment_type, allocation_percentage, commissionable_amount
)
SELECT
  sale_id,
  employee_id,
  CASE WHEN rn = 1 THEN 'PRIMARY'::sale_assignment_type ELSE 'ASSISTANT'::sale_assignment_type END,
  pct,
  ROUND((sale_total * pct / 100.0)::numeric, 2)
FROM with_pct w
WHERE NOT EXISTS (
  SELECT 1 FROM sale_employees se
  WHERE se.sale_id = w.sale_id AND se.employee_id = w.employee_id
);
