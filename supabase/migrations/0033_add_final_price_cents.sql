-- Migration: Add final_price_cents to garment_service
-- Purpose: Enable item-level pricing adjustments after invoice creation
-- Phase: 02-item-level-pricing

-- Add final_price_cents column to garment_service table
-- NULL = use custom_price_cents or base price (three-tier hierarchy)
-- When set, this becomes the authoritative price for the item
ALTER TABLE garment_service
ADD COLUMN IF NOT EXISTS final_price_cents INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN garment_service.final_price_cents IS
  'Final price after work completion. NULL = use custom_price_cents or base price. Editable post-invoice. Added Phase 2.';

-- Create partial index for efficient filtering of items with final prices
-- This helps queries that need to find items where final price has been set
CREATE INDEX IF NOT EXISTS idx_garment_service_has_final_price
ON garment_service(id) WHERE final_price_cents IS NOT NULL;
