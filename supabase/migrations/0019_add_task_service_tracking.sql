-- Add service tracking fields to task table
-- This enables per-item time tracking at the service level

ALTER TABLE task
ADD COLUMN service_id UUID REFERENCES service(id),
ADD COLUMN time_tracking_session_id UUID,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX idx_task_service_id ON task(service_id);
CREATE INDEX idx_task_garment_service ON task(garment_id, service_id);

-- Add comment to explain the new fields
COMMENT ON COLUMN task.service_id IS 'Links task to specific service for granular time tracking';
COMMENT ON COLUMN task.time_tracking_session_id IS 'Identifier for continuous time tracking sessions';
COMMENT ON COLUMN task.updated_at IS 'Last update timestamp for the task';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_updated_at
    BEFORE UPDATE ON task
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();