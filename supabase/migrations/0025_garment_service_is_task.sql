-- Migration: garment_service IS the task
-- This eliminates the separate task table by adding task-related fields directly to garment_service
-- The task table is kept READ-ONLY for historical data

-- Add task/timer fields to garment_service
ALTER TABLE garment_service ADD COLUMN IF NOT EXISTS stage VARCHAR(20) DEFAULT 'pending';
ALTER TABLE garment_service ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE garment_service ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE garment_service ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;
ALTER TABLE garment_service ADD COLUMN IF NOT EXISTS assignee VARCHAR(100);

-- Create index for active timers (performance)
CREATE INDEX IF NOT EXISTS idx_garment_service_active ON garment_service(is_active) WHERE is_active = true;

-- Create index for stage queries
CREATE INDEX IF NOT EXISTS idx_garment_service_stage ON garment_service(stage);

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'garment_service'
AND column_name IN ('stage', 'is_active', 'started_at', 'stopped_at', 'assignee');
