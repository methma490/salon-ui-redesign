-- Migration 026: Suppliers, GRN (Goods Received Notes), Supplier Payments & Allocations
-- Version: 026

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'grn_status' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE grn_status AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'grn_payment_status' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE grn_payment_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supplier_payment_method' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE supplier_payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supplier_cheque_status' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE supplier_cheque_status AS ENUM ('PENDING', 'CLEARED', 'BOUNCED');
  END IF;
END $$;

-- 2. Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. GRNs table
CREATE TABLE IF NOT EXISTS grns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number VARCHAR(50) NOT NULL,
  supplier_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  supplier_invoice_number VARCHAR(100),
  grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status grn_payment_status NOT NULL DEFAULT 'UNPAID',
  grn_status grn_status NOT NULL DEFAULT 'DRAFT',
  received_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT grns_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT grns_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT grns_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT grns_grn_number_unique UNIQUE (grn_number),
  CONSTRAINT grns_amounts_check CHECK (
    subtotal >= 0 AND discount_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0 AND outstanding_amount >= 0 AND paid_amount <= total_amount
  )
);

-- 4. GRN items table
CREATE TABLE IF NOT EXISTS grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT grn_items_grn_fkey FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
  CONSTRAINT grn_items_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT grn_items_qty_check CHECK (quantity > 0),
  CONSTRAINT grn_items_cost_check CHECK (unit_cost >= 0)
);

-- 5. Supplier payments table
CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method supplier_payment_method NOT NULL DEFAULT 'CASH',
  reference_number VARCHAR(100),
  bank_name VARCHAR(100),
  cheque_number VARCHAR(50),
  cheque_date DATE,
  cheque_status supplier_cheque_status NOT NULL DEFAULT 'CLEARED',
  cleared_at TIMESTAMP,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_payments_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT supplier_payments_amount_check CHECK (amount > 0)
);

-- 6. Supplier payment allocations table
CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  grn_id UUID NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_payment_allocations_payment_fkey FOREIGN KEY (payment_id) REFERENCES supplier_payments(id) ON DELETE CASCADE,
  CONSTRAINT supplier_payment_allocations_grn_fkey FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE RESTRICT,
  CONSTRAINT supplier_payment_allocations_amount_check CHECK (allocated_amount > 0)
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS suppliers_is_active_idx ON suppliers (is_active);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON suppliers (name);
CREATE INDEX IF NOT EXISTS grns_supplier_idx ON grns (supplier_id);
CREATE INDEX IF NOT EXISTS grns_branch_idx ON grns (branch_id);
CREATE INDEX IF NOT EXISTS grns_status_idx ON grns (grn_status);
CREATE INDEX IF NOT EXISTS grns_payment_status_idx ON grns (payment_status);
CREATE INDEX IF NOT EXISTS grns_grn_date_idx ON grns (grn_date DESC);
CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON grn_items (grn_id);
CREATE INDEX IF NOT EXISTS grn_items_product_idx ON grn_items (product_id);
CREATE INDEX IF NOT EXISTS supplier_payments_supplier_idx ON supplier_payments (supplier_id);
CREATE INDEX IF NOT EXISTS supplier_payments_date_idx ON supplier_payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS supplier_payment_allocations_payment_idx ON supplier_payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS supplier_payment_allocations_grn_idx ON supplier_payment_allocations (grn_id);

-- 8. Updated_at triggers
DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS grns_updated_at ON grns;
CREATE TRIGGER grns_updated_at BEFORE UPDATE ON grns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS supplier_payments_updated_at ON supplier_payments;
CREATE TRIGGER supplier_payments_updated_at BEFORE UPDATE ON supplier_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert permissions idempotently
INSERT INTO permissions (code, name) VALUES
  ('SUPPLIERS_VIEW', 'View Suppliers'),
  ('SUPPLIERS_CREATE', 'Create Suppliers'),
  ('SUPPLIERS_EDIT', 'Edit Suppliers'),
  ('SUPPLIERS_DELETE', 'Delete/Deactivate Suppliers'),
  ('GRN_VIEW', 'View GRN / Purchases'),
  ('GRN_CREATE', 'Create GRN / Purchases'),
  ('GRN_EDIT', 'Edit GRN / Purchases'),
  ('GRN_RECEIVE', 'Receive GRN and Increment Stock'),
  ('GRN_CANCEL', 'Cancel GRN'),
  ('SUPPLIER_PAYMENTS_VIEW', 'View Supplier Payments'),
  ('SUPPLIER_PAYMENTS_CREATE', 'Record Supplier Payments'),
  ('SUPPLIER_OUTSTANDING_VIEW', 'View Supplier Outstanding')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to SALON_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SALON_ADMIN'
  AND p.code IN (
    'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT', 'SUPPLIERS_DELETE',
    'GRN_VIEW', 'GRN_CREATE', 'GRN_EDIT', 'GRN_RECEIVE', 'GRN_CANCEL',
    'SUPPLIER_PAYMENTS_VIEW', 'SUPPLIER_PAYMENTS_CREATE',
    'SUPPLIER_OUTSTANDING_VIEW'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to STOCK_KEEPER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'STOCK_KEEPER'
  AND p.code IN (
    'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT',
    'GRN_VIEW', 'GRN_CREATE', 'GRN_EDIT', 'GRN_RECEIVE',
    'SUPPLIER_OUTSTANDING_VIEW'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
