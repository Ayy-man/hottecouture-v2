-- Add created_at column to task table
ALTER TABLE task 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing rows (optional, but good for ordering)
-- We can use started_at as a proxy for created_at if available, otherwise NOW()
UPDATE task 
SET created_at = COALESCE(started_at, NOW())
WHERE created_at IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_task_created_at ON task(created_at);
