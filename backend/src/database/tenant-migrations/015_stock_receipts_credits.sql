-- Stock receipts + credit payments (no supplier module)
-- Version: 015

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'stock_receipt_payment_status'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE stock_receipt_payment_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'stock_credit_payment_method'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE stock_credit_payment_method AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stock_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL,
  reference_no VARCHAR(100),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status stock_receipt_payment_status NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_receipts_branch_fkey
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT stock_receipts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT stock_receipts_amounts_check
    CHECK (
      total_amount >= 0
      AND paid_amount >= 0
      AND outstanding_amount >= 0
      AND paid_amount <= total_amount
    )
);

CREATE TABLE IF NOT EXISTS stock_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_receipt_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_receipt_items_receipt_fkey
    FOREIGN KEY (stock_receipt_id) REFERENCES stock_receipts(id) ON DELETE CASCADE,
  CONSTRAINT stock_receipt_items_product_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT stock_receipt_items_qty_check CHECK (quantity > 0),
  CONSTRAINT stock_receipt_items_cost_check CHECK (unit_cost >= 0)
);

CREATE TABLE IF NOT EXISTS stock_credit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_receipt_id UUID NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method stock_credit_payment_method NOT NULL DEFAULT 'CASH',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_credit_payments_receipt_fkey
    FOREIGN KEY (stock_receipt_id) REFERENCES stock_receipts(id) ON DELETE CASCADE,
  CONSTRAINT stock_credit_payments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT stock_credit_payments_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS stock_receipts_branch_idx ON stock_receipts (branch_id);
CREATE INDEX IF NOT EXISTS stock_receipts_purchase_date_idx ON stock_receipts (purchase_date DESC);
CREATE INDEX IF NOT EXISTS stock_receipts_payment_status_idx ON stock_receipts (payment_status);
CREATE INDEX IF NOT EXISTS stock_receipts_reference_no_idx ON stock_receipts (reference_no);
CREATE INDEX IF NOT EXISTS stock_receipt_items_receipt_idx ON stock_receipt_items (stock_receipt_id);
CREATE INDEX IF NOT EXISTS stock_receipt_items_product_idx ON stock_receipt_items (product_id);
CREATE INDEX IF NOT EXISTS stock_credit_payments_receipt_idx ON stock_credit_payments (stock_receipt_id);
CREATE INDEX IF NOT EXISTS stock_credit_payments_date_idx ON stock_credit_payments (payment_date DESC);
