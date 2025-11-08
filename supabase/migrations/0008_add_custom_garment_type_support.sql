-- Add is_custom column to garment_type table
-- This distinguishes user-created custom types from predefined ones

ALTER TABLE garment_type 
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

-- Create index for custom types
CREATE INDEX IF NOT EXISTS idx_garment_type_is_custom ON garment_type(is_custom);

-- Update existing types to ensure they're not marked as custom
UPDATE garment_type SET is_custom = FALSE WHERE is_custom IS NULL;

