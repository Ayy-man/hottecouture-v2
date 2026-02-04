-- Add archive-related columns to orders table
ALTER TABLE "order" 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Create index for better performance on archive queries
CREATE INDEX IF NOT EXISTS idx_order_archived ON "order"(is_archived, archived_at);
CREATE INDEX IF NOT EXISTS idx_order_status_archived ON "order"(status, is_archived);

-- Update existing delivered orders to set is_archived = false
UPDATE "order" 
SET is_archived = FALSE 
WHERE is_archived IS NULL;

-- Add RLS policy for archived orders (only show non-archived by default)
-- This will be handled in the API layer for now
