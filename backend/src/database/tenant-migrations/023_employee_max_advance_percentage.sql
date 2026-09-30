-- Employee maximum advance percentage
-- Version: 023

ALTER TABLE employees ADD COLUMN IF NOT EXISTS max_advance_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00;
