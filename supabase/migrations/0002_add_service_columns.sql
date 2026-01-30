-- Add missing columns to service table
ALTER TABLE service ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE service ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

-- Add missing columns to task table for time tracking
ALTER TABLE task ADD COLUMN IF NOT EXISTS service_name VARCHAR(200);
ALTER TABLE task ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE task ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE task ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
