-- Quotations module (tenant-branded, no stock/sales side effects)
-- Version: 016

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'quotation_status'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE quotation_status AS ENUM (
      'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED', 'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'quotation_message_channel'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE quotation_message_channel AS ENUM ('WHATSAPP', 'SMS');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'quotation_message_status'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE quotation_message_status AS ENUM (
      'PENDING', 'OPENED_EXTERNALLY', 'SENT', 'DELIVERED', 'FAILED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no VARCHAR(50) NOT NULL,
  branch_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status quotation_status NOT NULL DEFAULT 'DRAFT',
  customer_notes TEXT,
  internal_notes TEXT,
  salon_name_snapshot VARCHAR(255) NOT NULL,
  public_token VARCHAR(64) NOT NULL,
  converted_sale_id UUID,
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason VARCHAR(100),
  accepted_ip VARCHAR(64),
  accepted_user_agent TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT quotations_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT quotations_customer_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT quotations_converted_sale_fkey FOREIGN KEY (converted_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT quotations_no_unique UNIQUE (quotation_no),
  CONSTRAINT quotations_token_unique UNIQUE (public_token),
  CONSTRAINT quotations_amounts_check CHECK (
    subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
  )
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL,
  service_id UUID,
  description_snapshot VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  original_service_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quotation_unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  employee_id UUID,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT quotation_items_quotation_fkey
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  CONSTRAINT quotation_items_service_fkey
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT quotation_items_employee_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT quotation_items_qty_check CHECK (quantity > 0),
  CONSTRAINT quotation_items_price_check CHECK (
    original_service_price >= 0 AND quotation_unit_price >= 0 AND discount_amount >= 0
  )
);

CREATE TABLE IF NOT EXISTS quotation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL,
  channel quotation_message_channel NOT NULL,
  recipient VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status quotation_message_status NOT NULL DEFAULT 'PENDING',
  provider_message_id VARCHAR(100),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT quotation_messages_quotation_fkey
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  CONSTRAINT quotation_messages_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS quotations_branch_idx ON quotations (branch_id);
CREATE INDEX IF NOT EXISTS quotations_customer_idx ON quotations (customer_id);
CREATE INDEX IF NOT EXISTS quotations_status_idx ON quotations (status);
CREATE INDEX IF NOT EXISTS quotations_date_idx ON quotations (quotation_date DESC);
CREATE INDEX IF NOT EXISTS quotation_items_quotation_idx ON quotation_items (quotation_id);
CREATE INDEX IF NOT EXISTS quotation_messages_quotation_idx ON quotation_messages (quotation_id);

-- Quotation permissions are seeded once by tenant-provisioning.service
-- (seedRolesAndPermissions) for new tenants, and by scripts/apply-quotations.ts
-- for existing tenants. Do not INSERT permissions here — that double-seeds
-- QUOTATION_VIEW during POST /api/public/signup.
