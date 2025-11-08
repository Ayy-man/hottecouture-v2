-- Add unit column to service table for unit-based pricing
-- Unit is optional - if null, service is priced as a whole
-- If provided, price is per unit (e.g., $10.00/meter)

ALTER TABLE service 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Create index for unit-based queries (optional, for filtering)
CREATE INDEX IF NOT EXISTS idx_service_unit ON service(unit) WHERE unit IS NOT NULL;

