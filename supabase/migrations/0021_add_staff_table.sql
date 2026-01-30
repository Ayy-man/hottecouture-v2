-- Create staff table for dynamic employee management
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for active staff queries
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

-- Seed with existing staff
INSERT INTO staff (name, is_active) VALUES
  ('Audrey', true),
  ('Solange', true),
  ('Audrey-Anne', true);

-- Add RLS policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read staff
CREATE POLICY "Staff readable by authenticated users"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to manage staff (owner check would go in app layer)
CREATE POLICY "Staff manageable by authenticated users"
  ON staff FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
