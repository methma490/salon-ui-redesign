-- Tenant Schema Performance Indexes Migration
-- Version: 008
-- Description: Composite, partial, FK, and search indexes for salon operations
-- Note: pg_trgm must be installed once in the public schema (see bootstrap / apply script).

-- ── SALES / POS / REPORTS ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sales_completed_branch_created_idx
  ON sales (branch_id, created_at DESC)
  WHERE status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS sales_completed_created_idx
  ON sales (created_at DESC)
  WHERE status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS sales_status_branch_created_idx
  ON sales (status, branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_cashier_created_idx
  ON sales (cashier_id, created_at DESC)
  WHERE status = 'COMPLETED';

-- ── SALE ITEMS / PAYMENTS ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sale_items_sale_type_idx
  ON sale_items (sale_id, item_type);

CREATE INDEX IF NOT EXISTS sale_items_service_idx
  ON sale_items (service_id)
  WHERE item_type = 'service';

CREATE INDEX IF NOT EXISTS sale_items_product_idx
  ON sale_items (product_id)
  WHERE item_type = 'product';

CREATE INDEX IF NOT EXISTS sale_item_employees_employee_idx
  ON sale_item_employees (employee_id);

CREATE INDEX IF NOT EXISTS payments_sale_created_idx
  ON payments (sale_id, created_at);

-- ── CUSTOMERS ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS customers_status_idx
  ON customers (status);

CREATE INDEX IF NOT EXISTS customers_name_trgm_idx
  ON customers USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS customers_email_trgm_idx
  ON customers USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS customers_phone_trgm_idx
  ON customers USING gin (phone gin_trgm_ops);

-- ── EMPLOYEES / USERS ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS employees_branch_id_idx
  ON employees (branch_id);

CREATE INDEX IF NOT EXISTS employees_branch_status_name_idx
  ON employees (branch_id, status, name);

CREATE INDEX IF NOT EXISTS employees_user_id_idx
  ON employees (user_id);

CREATE INDEX IF NOT EXISTS employees_name_trgm_idx
  ON employees USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (LOWER(TRIM(email)));

-- ── CATALOG ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS services_category_id_idx
  ON services (category_id);

CREATE INDEX IF NOT EXISTS services_category_active_name_idx
  ON services (category_id, is_active, name);

CREATE INDEX IF NOT EXISTS products_category_id_idx
  ON products (category_id);

CREATE INDEX IF NOT EXISTS products_category_active_name_idx
  ON products (category_id, is_active, name);

-- ── INVENTORY / STOCK ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS stock_movements_branch_created_idx
  ON stock_movements (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stock_movements_branch_product_created_idx
  ON stock_movements (branch_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stock_movements_created_by_idx
  ON stock_movements (created_by);

CREATE INDEX IF NOT EXISTS stock_movements_reference_idx
  ON stock_movements (reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS branch_stock_low_qty_idx
  ON branch_stock (branch_id, quantity)
  WHERE quantity <= 10;

-- ── APPOINTMENTS ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS appointments_branch_date_time_idx
  ON appointments (branch_id, appointment_date, start_time);

CREATE INDEX IF NOT EXISTS appointments_date_time_idx
  ON appointments (appointment_date, start_time);

CREATE INDEX IF NOT EXISTS appointments_customer_date_idx
  ON appointments (customer_id, appointment_date DESC);

CREATE INDEX IF NOT EXISTS appointments_created_by_idx
  ON appointments (created_by);

-- ── RBAC (permission checks on every guarded API call) ────────────────────────

CREATE INDEX IF NOT EXISTS user_roles_role_id_idx
  ON user_roles (role_id);

CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx
  ON role_permissions (permission_id);
