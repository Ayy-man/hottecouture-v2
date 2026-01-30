-- Add TPS (GST) and TVQ (QST) tax columns to order table
-- TPS: 5% on subtotal + rush fee
-- TVQ: 9.975% on subtotal + rush fee
-- These replace the combined tax_cents for Quebec tax compliance

ALTER TABLE "order" 
ADD COLUMN IF NOT EXISTS tps_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tvq_cents INTEGER DEFAULT 0;

-- For existing orders, calculate TPS and TVQ from tax_cents
-- Assuming tax_cents was 12% combined (5% TPS + 9.975% TVQ ≈ 14.975% total)
-- We'll split it proportionally: TPS = tax_cents * (5/14.975), TVQ = tax_cents * (9.975/14.975)
-- But to be safe, we'll calculate from subtotal + rush_fee for existing orders
UPDATE "order" 
SET 
  tps_cents = ROUND((COALESCE(subtotal_cents, 0) + COALESCE(rush_fee_cents, 0)) * 0.05),
  tvq_cents = ROUND((COALESCE(subtotal_cents, 0) + COALESCE(rush_fee_cents, 0)) * 0.09975)
WHERE tps_cents = 0 AND tvq_cents = 0 AND (subtotal_cents > 0 OR rush_fee_cents > 0);

-- Add comments for clarity
COMMENT ON COLUMN "order".tps_cents IS 'TPS (GST) tax in cents - 5% on subtotal + rush fee';
COMMENT ON COLUMN "order".tvq_cents IS 'TVQ (QST) tax in cents - 9.975% on subtotal + rush fee';

