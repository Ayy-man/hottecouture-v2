-- Set Audrey's role to admin so she can manage the team
-- Other staff default to seamstress if role is NULL

-- Add role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'role'
  ) THEN
    ALTER TABLE staff ADD COLUMN role VARCHAR(50) DEFAULT 'seamstress';
  END IF;
END $$;

-- Set Audrey as admin
UPDATE staff SET role = 'admin' WHERE name = 'Audrey' AND (role IS NULL OR role != 'admin');
