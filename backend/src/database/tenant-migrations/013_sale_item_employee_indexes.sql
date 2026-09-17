-- Support employee monthly service-sales aggregation (POS line assignment → payroll commission)
CREATE INDEX IF NOT EXISTS sale_item_employees_sale_item_id_idx
  ON sale_item_employees (sale_item_id);

CREATE INDEX IF NOT EXISTS sale_item_employees_employee_item_idx
  ON sale_item_employees (employee_id, sale_item_id);
