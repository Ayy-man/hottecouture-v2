-- Add Marie as main seamstress (EXP-06)
-- Safe to run multiple times - uses upsert pattern

-- First check if there's a unique constraint on name, add one if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_name_unique'
  ) THEN
    -- Add unique constraint if it doesn't exist
    ALTER TABLE staff ADD CONSTRAINT staff_name_unique UNIQUE (name);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Insert Marie if she doesn't exist, or update her to active if she does
INSERT INTO staff (name, is_active)
VALUES ('Marie', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Verify Marie exists and is active
SELECT id, name, is_active, created_at FROM staff WHERE LOWER(name) = 'marie';
