-- Migration: Create price_change_log audit table
-- Purpose: Track all price changes for accountability and auditing
-- Phase: 02-item-level-pricing

-- First, ensure garment_service.id has a unique constraint
-- (The primary key is composite (garment_id, service_id) but we need to reference by id)
ALTER TABLE garment_service ADD CONSTRAINT garment_service_id_unique UNIQUE (id);

-- Create the price_change_log table for audit trail
CREATE TABLE IF NOT EXISTS price_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  garment_service_id UUID NOT NULL REFERENCES garment_service(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  changed_by VARCHAR(100) NOT NULL,
  old_price_cents INTEGER,
  new_price_cents INTEGER NOT NULL,
  reason TEXT
);

-- Add table comment for documentation
COMMENT ON TABLE price_change_log IS
  'Audit log for price changes on garment_service items. Records who changed what, when, and why. Added Phase 2.';

-- Create indexes for common query patterns
-- Index for looking up all price changes for a specific item
CREATE INDEX IF NOT EXISTS idx_pcl_garment_service
ON price_change_log(garment_service_id);

-- Index for looking up all price changes for an order
CREATE INDEX IF NOT EXISTS idx_pcl_order
ON price_change_log(order_id);

-- Index for chronological queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_pcl_created_at
ON price_change_log(created_at DESC);

-- Index for filtering by who made the change
CREATE INDEX IF NOT EXISTS idx_pcl_changed_by
ON price_change_log(changed_by);

-- Enable Row Level Security
ALTER TABLE price_change_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to select/insert
-- Audit logs should be append-only (no updates/deletes by application)
CREATE POLICY "Allow authenticated users to read price_change_log"
ON price_change_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert price_change_log"
ON price_change_log FOR INSERT
TO authenticated
WITH CHECK (true);
