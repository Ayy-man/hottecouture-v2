-- Add assigned_to column to order table for seamstress assignment
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100);

-- Create index for filtering by assigned seamstress
CREATE INDEX IF NOT EXISTS idx_order_assigned_to ON "order"(assigned_to);

-- Comment for documentation
COMMENT ON COLUMN "order".assigned_to IS 'Name of the assigned seamstress (e.g., Audrey, Solange)';
