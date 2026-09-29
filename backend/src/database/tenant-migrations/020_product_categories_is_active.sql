-- Add is_active column to product_categories table
-- Version: 020

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
