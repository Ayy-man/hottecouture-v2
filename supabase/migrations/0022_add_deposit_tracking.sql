-- Migration: Add deposit tracking fields to order table
-- Created: 2025-12-17
-- Purpose: Support 50% deposits for custom orders and detailed payment tracking

-- Add deposit tracking fields
ALTER TABLE public."order"
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_payment_method TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public."order".deposit_paid_at IS 'Timestamp when deposit was received';
COMMENT ON COLUMN public."order".deposit_payment_method IS 'How deposit was paid: stripe, cash, card_terminal';
COMMENT ON COLUMN public."order".stripe_checkout_session_id IS 'Stripe checkout session ID for tracking';

-- Create indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_order_payment_status ON public."order"(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_deposit_paid ON public."order"(deposit_paid_at) WHERE deposit_paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_type_payment ON public."order"(type, payment_status);

-- Update the payment_status check constraint to include deposit states
-- First drop the existing constraint if it exists
ALTER TABLE public."order" DROP CONSTRAINT IF EXISTS order_payment_status_check;

-- Add updated constraint with deposit states
ALTER TABLE public."order" ADD CONSTRAINT order_payment_status_check
CHECK (payment_status = ANY (ARRAY[
  'unpaid'::text,
  'pending'::text,
  'deposit_pending'::text,
  'deposit_paid'::text,
  'paid'::text,
  'failed'::text,
  'refunded'::text,
  'partial'::text
]));
