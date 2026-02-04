-- Add mobile_phone column to client table for SMS notifications
-- Separate from phone field which may be landline

ALTER TABLE client
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20);

-- Add comment for clarity
COMMENT ON COLUMN client.mobile_phone IS 'Mobile phone number for SMS notifications';
COMMENT ON COLUMN client.phone IS 'Phone number (may be landline or mobile)';
