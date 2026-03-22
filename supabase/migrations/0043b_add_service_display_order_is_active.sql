-- MKT-117: Add display_order and is_active columns to service table
-- Required by migration 0044_seed_fabric_services.sql which INSERTs using these columns
-- Also referenced by performance indexes in 20240101_performance_indexes.sql

ALTER TABLE service ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE service ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
