-- Update preferred_contact to include 'phone' (landline) option
-- Make mobile_phone and email mandatory for new clients (UI/API enforcement)
-- Migration: 0038_update_preferred_contact_and_fields.sql

-- Drop existing CHECK constraint on preferred_contact
ALTER TABLE client DROP CONSTRAINT IF EXISTS client_preferred_contact_check;

-- Add new CHECK constraint with 'phone' option
ALTER TABLE client ADD CONSTRAINT client_preferred_contact_check
CHECK (preferred_contact IN ('email', 'sms', 'phone'));

-- Update comment to reflect new options
COMMENT ON COLUMN client.preferred_contact IS 'Preferred contact method: email, sms, or phone (landline)';

-- Note: We do NOT add NOT NULL constraints to mobile_phone or email columns
-- because existing clients may have NULL values. New client creation will enforce
-- these requirements through UI validation and API schemas.
