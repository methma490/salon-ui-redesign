-- Tenant Schema Transactions Migration
-- Version: 003
-- Description: Create transaction tables (stock movements, sales, payments)

-- Enums
DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Stock movements table
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL,
  product_id UUID NOT NULL,
  type stock_movement_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_movements_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT stock_movements_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL,
  customer_id UUID,
  sale_number VARCHAR(50) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status sale_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_sale_number_unique UNIQUE (sale_number),
  CONSTRAINT sales_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT sales_customer_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Sale items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  item_type VARCHAR(20) NOT NULL, -- 'service' or 'product'
  service_id UUID,
  product_id UUID,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sale_items_sale_fkey FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT sale_items_service_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT sale_items_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT sale_items_item_check CHECK (
    (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL) OR
    (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL)
  )
);

-- Sale item employees (who performed the service)
CREATE TABLE sale_item_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sale_item_employees_sale_item_fkey FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
  CONSTRAINT sale_item_employees_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'COMPLETED',
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_sale_fkey FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX stock_movements_branch_id_idx ON stock_movements(branch_id);
CREATE INDEX stock_movements_product_id_idx ON stock_movements(product_id);
CREATE INDEX sales_branch_id_idx ON sales(branch_id);
CREATE INDEX sales_customer_id_idx ON sales(customer_id);
CREATE INDEX sales_created_at_idx ON sales(created_at);
CREATE INDEX sale_items_sale_id_idx ON sale_items(sale_id);
CREATE INDEX payments_sale_id_idx ON payments(sale_id);

-- Apply updated_at triggers
CREATE TRIGGER sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
