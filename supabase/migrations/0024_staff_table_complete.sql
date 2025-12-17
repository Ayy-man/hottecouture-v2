-- Complete staff table setup (idempotent - safe to run multiple times)
-- Run this in Supabase SQL Editor

-- Step 1: Create staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create index for active staff queries
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

-- Step 3: Disable RLS (service role client bypasses it anyway)
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Staff readable by authenticated users" ON staff;
DROP POLICY IF EXISTS "Staff manageable by authenticated users" ON staff;

-- Step 5: Seed with existing staff ONLY if table is empty
INSERT INTO staff (name, is_active)
SELECT name, is_active FROM (VALUES
  ('Audrey', true),
  ('Solange', true),
  ('Audrey-Anne', true)
) AS seed(name, is_active)
WHERE NOT EXISTS (SELECT 1 FROM staff LIMIT 1);

-- Step 6: Verify the table exists and show contents
SELECT * FROM staff ORDER BY name;
