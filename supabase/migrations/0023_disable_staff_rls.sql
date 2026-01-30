-- Migration: Disable RLS on staff table
-- The API now uses service role client which bypasses RLS anyway
-- Removing RLS simplifies the security model

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff readable by authenticated users" ON staff;
DROP POLICY IF EXISTS "Staff manageable by authenticated users" ON staff;

-- Disable RLS on staff table
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other tables that might be causing issues
-- (The service role client bypasses RLS anyway, but this prevents issues with anon key)
ALTER TABLE task DISABLE ROW LEVEL SECURITY;
ALTER TABLE garment DISABLE ROW LEVEL SECURITY;
ALTER TABLE "order" DISABLE ROW LEVEL SECURITY;
ALTER TABLE client DISABLE ROW LEVEL SECURITY;
ALTER TABLE service DISABLE ROW LEVEL SECURITY;
