-- Migration: garment IS the task (not garment_service)
-- Each garment has ONE timer, regardless of how many services it has
-- Services are just line items for pricing

-- Add task/timer fields to garment table
ALTER TABLE garment ADD COLUMN IF NOT EXISTS stage VARCHAR(20) DEFAULT 'pending';
ALTER TABLE garment ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE garment ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE garment ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;
ALTER TABLE garment ADD COLUMN IF NOT EXISTS actual_minutes INTEGER DEFAULT 0;
ALTER TABLE garment ADD COLUMN IF NOT EXISTS assignee VARCHAR(100);

-- Create index for active timers (performance)
CREATE INDEX IF NOT EXISTS idx_garment_active ON garment(is_active) WHERE is_active = true;

-- Create index for stage queries
CREATE INDEX IF NOT EXISTS idx_garment_stage ON garment(stage);

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'garment'
AND column_name IN ('stage', 'is_active', 'started_at', 'stopped_at', 'actual_minutes', 'assignee');
