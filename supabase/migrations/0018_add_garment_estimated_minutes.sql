-- Add estimated_minutes column to garment table
ALTER TABLE garment 
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 0;

-- Constraint to ensure non-negative values
ALTER TABLE garment
ADD CONSTRAINT check_garment_estimated_minutes_non_negative 
CHECK (estimated_minutes >= 0);
