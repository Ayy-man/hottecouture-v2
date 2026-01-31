-- Add custom_service_name column to garment_service table
-- This column stores a custom name when the service is not from the standard catalog

ALTER TABLE garment_service
ADD COLUMN IF NOT EXISTS custom_service_name TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN garment_service.custom_service_name IS 'Custom service name when not using a standard catalog service';
