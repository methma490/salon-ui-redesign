-- Tenant Schema Migration: 019_service_category_branches
-- Description: Enable branch assignment for service categories

CREATE TABLE IF NOT EXISTS service_category_branches (
  category_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (category_id, branch_id),
  CONSTRAINT scb_category_fkey FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
  CONSTRAINT scb_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scb_category_id ON service_category_branches(category_id);
CREATE INDEX IF NOT EXISTS idx_scb_branch_id ON service_category_branches(branch_id);
