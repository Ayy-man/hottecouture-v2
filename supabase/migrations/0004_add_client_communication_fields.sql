-- Add communication preference and newsletter consent fields to client table
-- Migration: 0004_add_client_communication_fields.sql

-- Add new columns to client table
ALTER TABLE client 
ADD COLUMN preferred_contact VARCHAR(10) DEFAULT 'email' CHECK (preferred_contact IN ('email', 'sms')),
ADD COLUMN newsletter_consent BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN client.preferred_contact IS 'Preferred method of communication: email or sms';
COMMENT ON COLUMN client.newsletter_consent IS 'Whether the client has consented to receive newsletter updates';

-- Update existing clients to have default values (this is safe since we set defaults)
UPDATE client 
SET preferred_contact = 'email', newsletter_consent = false 
WHERE preferred_contact IS NULL OR newsletter_consent IS NULL;
