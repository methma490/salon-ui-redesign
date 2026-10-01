-- Persist the employee assigned to each appointment so calendar rows remain stable.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS employee_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_employee_fkey'
      AND connamespace = current_schema()::regnamespace
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_employee_fkey
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_employee_date
  ON appointments (employee_id, appointment_date);
