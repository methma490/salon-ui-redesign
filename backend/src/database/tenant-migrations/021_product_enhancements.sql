-- Tenant Schema Migration: 021_product_enhancements
-- Description: Add product image_url and product_branches table for branch assignment

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS product_branches (
  product_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, branch_id),
  CONSTRAINT pb_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT pb_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pb_product_id ON product_branches(product_id);
CREATE INDEX IF NOT EXISTS idx_pb_branch_id ON product_branches(branch_id);
