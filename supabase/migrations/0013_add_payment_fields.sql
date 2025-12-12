-- Add payment tracking fields to order table
-- Requested by: Agent B (Integrations)
-- Purpose: Stripe payment integration and invoice tracking

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS invoice_number text;

-- Add notification tracking
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS last_notification_sent_at timestamptz;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS notification_count integer DEFAULT 0;

-- Add indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_order_payment_status ON "order"(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_stripe_payment_intent ON "order"(stripe_payment_intent_id);

-- Add constraint for payment_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_payment_status_check'
  ) THEN
    ALTER TABLE "order" ADD CONSTRAINT order_payment_status_check 
      CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;
