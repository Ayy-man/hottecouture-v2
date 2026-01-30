-- Fix negative timer values in the database
-- This migration ensures all timer values are non-negative

-- Update any negative total_work_seconds to 0
UPDATE "order" 
SET total_work_seconds = 0 
WHERE total_work_seconds < 0;

-- Update any negative actual_work_minutes to 0
UPDATE "order" 
SET actual_work_minutes = 0 
WHERE actual_work_minutes < 0;

-- Add a check constraint to prevent future negative values
ALTER TABLE "order" 
ADD CONSTRAINT check_total_work_seconds_non_negative 
CHECK (total_work_seconds >= 0);

ALTER TABLE "order" 
ADD CONSTRAINT check_actual_work_minutes_non_negative 
CHECK (actual_work_minutes >= 0);

-- Add comments for clarity
COMMENT ON COLUMN "order".total_work_seconds IS 'Total work time in seconds (always non-negative)';
COMMENT ON COLUMN "order".actual_work_minutes IS 'Actual work time in minutes (always non-negative)';
