-- Add custom_service_name column to garment_service table
-- This script adds support for custom services

-- First, make service_id nullable to support custom services
ALTER TABLE garment_service 
ALTER COLUMN service_id DROP NOT NULL;

-- Add custom_service_name column
ALTER TABLE garment_service 
ADD COLUMN custom_service_name VARCHAR(255);

-- Add a check constraint to ensure either service_id or custom_service_name is provided
ALTER TABLE garment_service 
ADD CONSTRAINT check_service_or_custom 
CHECK (
  (service_id IS NOT NULL AND custom_service_name IS NULL) OR 
  (service_id IS NULL AND custom_service_name IS NOT NULL)
);

-- Update the primary key to handle the case where service_id might be null
ALTER TABLE garment_service DROP CONSTRAINT garment_service_pkey;

-- Add a new ID column for the primary key
ALTER TABLE garment_service 
ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Create a unique constraint on garment_id + service_id for regular services
-- and garment_id + custom_service_name for custom services
CREATE UNIQUE INDEX idx_garment_service_unique_regular 
ON garment_service (garment_id, service_id) 
WHERE service_id IS NOT NULL;

CREATE UNIQUE INDEX idx_garment_service_unique_custom 
ON garment_service (garment_id, custom_service_name) 
WHERE custom_service_name IS NOT NULL;
