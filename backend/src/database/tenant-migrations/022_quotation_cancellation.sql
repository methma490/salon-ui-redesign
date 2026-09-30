-- Quotation cancellation details
-- Version: 022

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
