-- Add is_active column to service_categories table
-- Version: 018

ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
