-- Tenant Schema Role System Flag
-- Version: 006
-- Description: Distinguish built-in roles from salon-created custom roles

ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

UPDATE roles SET is_system = true WHERE code IN ('SALON_ADMIN', 'CASHIER', 'STOCK_KEEPER');
