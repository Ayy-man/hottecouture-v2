# Stripe Payment Flows Implementation Plan

> **Created:** 2025-12-17
> **Status:** Ready for Implementation
> **Estimated Effort:** 4-6 hours

---

## Overview

Implement automated Stripe payment collection for Hotte Couture with two distinct flows:

1. **Custom Orders** → 50% deposit required before work starts
2. **All Orders** → Balance payment when order is "Ready for Pickup"

---

## Payment Rules

| Order Type | Deposit | When Deposit Due | Final Payment | When Final Due |
|------------|---------|------------------|---------------|----------------|
| `alteration` | None | N/A | 100% | When "Ready" |
| `custom` | 50% | After quote approved | 50% balance | When "Ready" |

---

## Database Migration

### File: `supabase/migrations/0022_add_deposit_tracking.sql`

```sql
-- Add deposit tracking fields to order table
ALTER TABLE public.order
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_payment_method TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.order.deposit_paid_at IS 'Timestamp when deposit was received';
COMMENT ON COLUMN public.order.deposit_payment_method IS 'How deposit was paid: stripe, cash, card_terminal';
COMMENT ON COLUMN public.order.stripe_checkout_session_id IS 'Stripe checkout session ID for tracking';

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_order_payment_status ON public.order(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_deposit_paid ON public.order(deposit_paid_at) WHERE deposit_paid_at IS NOT NULL;
```

---

## API Endpoints

### 1. Create Checkout Session

**File:** `src/app/api/payments/create-checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreateCheckoutRequest {
  orderId: string;
  type: 'deposit' | 'balance' | 'full';
  sendSms?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutRequest = await request.json();
    const { orderId, type, sendSms = true } = body;

    const supabase = await createServiceRoleClient();

    // Fetch order with client details
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        type,
        total_cents,
        deposit_cents,
        balance_due_cents,
        payment_status,
        client:client_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          language
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate amount based on type
    let amountCents: number;
    let description: string;

    switch (type) {
      case 'deposit':
        // 50% deposit for custom orders
        amountCents = Math.ceil(order.total_cents / 2);
        description = `Dépôt 50% - Commande #${order.order_number}`;
        break;
      case 'balance':
        // Remaining balance (total - deposit already paid)
        amountCents = order.balance_due_cents || order.total_cents;
        description = `Solde - Commande #${order.order_number}`;
        break;
      case 'full':
        // Full amount
        amountCents = order.total_cents;
        description = `Commande #${order.order_number}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const client = order.client as any;
    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: description,
              description: `Client: ${clientName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?payment=success&type=${type}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?payment=cancelled`,
      customer_email: client?.email || undefined,
      metadata: {
        order_id: orderId,
        order_number: order.order_number.toString(),
        payment_type: type,
      },
      locale: client?.language === 'en' ? 'en' : 'fr-CA',
    });

    // Update order with checkout session ID
    await supabase
      .from('order')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: type === 'deposit' ? 'pending' : 'pending',
      })
      .eq('id', orderId);

    // Send SMS with payment link if requested
    if (sendSms && client?.phone && process.env.N8N_SMS_WEBHOOK_URL) {
      const smsMessage = type === 'deposit'
        ? `Bonjour ${client.first_name}, voici le lien pour votre dépôt de 50% (${(amountCents / 100).toFixed(2)}$): ${session.url}`
        : `Bonjour ${client.first_name}, vos retouches sont prêtes! Montant: ${(amountCents / 100).toFixed(2)}$. Payez ici: ${session.url}`;

      try {
        await fetch(process.env.N8N_SMS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: client.phone,
            message: smsMessage,
            template: type === 'deposit' ? 'deposit_request' : 'payment_ready',
            orderNumber: order.order_number,
            firstName: client.first_name,
            amount: (amountCents / 100).toFixed(2),
            paymentUrl: session.url,
            language: client.language || 'fr',
          }),
        });
      } catch (smsError) {
        console.warn('Failed to send SMS:', smsError);
      }
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount_cents: amountCents,
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

---

### 2. Record Manual Payment (Cash/Terminal)

**File:** `src/app/api/payments/record-manual/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface RecordManualPaymentRequest {
  orderId: string;
  type: 'deposit' | 'balance' | 'full';
  method: 'cash' | 'card_terminal' | 'other';
  amountCents?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecordManualPaymentRequest = await request.json();
    const { orderId, type, method, amountCents, notes } = body;

    const supabase = await createServiceRoleClient();

    // Fetch current order
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, total_cents, deposit_cents, balance_due_cents, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updateData: Record<string, any> = {};

    switch (type) {
      case 'deposit':
        const depositAmount = amountCents || Math.ceil(order.total_cents / 2);
        updateData = {
          deposit_cents: depositAmount,
          deposit_paid_at: now,
          deposit_payment_method: method,
          payment_status: 'pending', // Deposit received, balance pending
        };
        break;

      case 'balance':
      case 'full':
        updateData = {
          payment_status: 'paid',
          payment_method: method,
          paid_at: now,
        };
        // If full payment on a custom order, also mark deposit as paid
        if (type === 'full' && order.deposit_cents === 0) {
          updateData.deposit_cents = Math.ceil(order.total_cents / 2);
          updateData.deposit_paid_at = now;
          updateData.deposit_payment_method = method;
        }
        break;
    }

    // Add notes if provided
    if (notes) {
      const { data: currentOrder } = await supabase
        .from('order')
        .select('notes')
        .eq('id', orderId)
        .single();

      const existingNotes = currentOrder?.notes || {};
      updateData.notes = {
        ...existingNotes,
        payment_notes: notes,
        payment_recorded_at: now,
      };
    }

    const { error: updateError } = await supabase
      .from('order')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `${type} payment recorded via ${method}`,
    });
  } catch (error) {
    console.error('Record manual payment error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
```

---

### 3. Update Stripe Webhook Handler

**File:** `src/app/api/webhooks/stripe/route.ts` (update existing)

Add deposit handling to the existing webhook:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  const paymentType = session.metadata?.payment_type; // 'deposit', 'balance', or 'full'

  if (orderId) {
    const updateData: Record<string, any> = {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
    };

    if (paymentType === 'deposit') {
      // Deposit payment completed
      updateData.deposit_cents = session.amount_total;
      updateData.deposit_paid_at = new Date().toISOString();
      updateData.deposit_payment_method = 'stripe';
      updateData.payment_status = 'pending'; // Balance still pending

      console.log(`✅ Deposit received for order ${orderId}`);
    } else {
      // Balance or full payment completed
      updateData.payment_status = 'paid';
      updateData.payment_method = 'stripe';
      updateData.paid_at = new Date().toISOString();

      console.log(`✅ Full payment completed for order ${orderId}`);
    }

    await supabase
      .from('order')
      .update(updateData)
      .eq('id', orderId);

    // Send confirmation SMS
    // ... existing notification code ...
  }
  break;
}
```

---

## UI Components

### 1. Payment Status Section (Order Detail Modal)

**File:** `src/components/payments/payment-status-section.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PaymentStatusSectionProps {
  order: {
    id: string;
    type: 'alteration' | 'custom';
    total_cents: number;
    deposit_cents: number;
    deposit_paid_at: string | null;
    balance_due_cents: number;
    payment_status: string;
    paid_at: string | null;
  };
  onPaymentSent?: () => void;
}

export function PaymentStatusSection({ order, onPaymentSent }: PaymentStatusSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const isCustomOrder = order.type === 'custom';
  const depositRequired = isCustomOrder && !order.deposit_paid_at;
  const depositPaid = order.deposit_paid_at !== null;
  const fullyPaid = order.payment_status === 'paid';

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const sendPaymentRequest = async (type: 'deposit' | 'balance' | 'full') => {
    setLoading(type);
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          type,
          sendSms: true,
        }),
      });

      if (response.ok) {
        onPaymentSent?.();
        alert('Lien de paiement envoyé par SMS!');
      } else {
        throw new Error('Failed to create checkout');
      }
    } catch (error) {
      console.error('Payment request error:', error);
      alert('Erreur lors de l\'envoi du lien de paiement');
    } finally {
      setLoading(null);
    }
  };

  const recordCashPayment = async (type: 'deposit' | 'balance' | 'full') => {
    setLoading(`cash-${type}`);
    try {
      const response = await fetch('/api/payments/record-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          type,
          method: 'cash',
        }),
      });

      if (response.ok) {
        onPaymentSent?.();
        alert('Paiement comptant enregistré!');
      } else {
        throw new Error('Failed to record payment');
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(null);
    }
  };

  if (fullyPaid) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700">
          <span className="text-lg">✅</span>
          <span className="font-medium">Payé</span>
        </div>
        <p className="mt-1 text-sm text-green-600">
          {formatCurrency(order.total_cents)} • {new Date(order.paid_at!).toLocaleDateString('fr-CA')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Paiement</h3>

      {/* Totals */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium">{formatCurrency(order.total_cents)}</span>
        </div>

        {isCustomOrder && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">Dépôt (50%):</span>
              <span className={depositPaid ? 'text-green-600' : 'text-amber-600'}>
                {formatCurrency(order.deposit_cents || order.total_cents / 2)}
                {depositPaid && ' ✓'}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Solde:</span>
              <span className="font-semibold">
                {formatCurrency(order.balance_due_cents)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Deposit Required Warning */}
      {depositRequired && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            ⚠️ Un dépôt de 50% est requis avant de commencer le travail.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {depositRequired && (
          <>
            <Button
              onClick={() => sendPaymentRequest('deposit')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'deposit' ? '...' : '📱 Envoyer demande de dépôt'}
            </Button>
            <Button
              variant="outline"
              onClick={() => recordCashPayment('deposit')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'cash-deposit' ? '...' : '💵 Dépôt reçu (comptant)'}
            </Button>
          </>
        )}

        {!depositRequired && !fullyPaid && (
          <>
            <Button
              onClick={() => sendPaymentRequest(isCustomOrder ? 'balance' : 'full')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'balance' || loading === 'full'
                ? '...'
                : '📱 Envoyer lien de paiement'}
            </Button>
            <Button
              variant="outline"
              onClick={() => recordCashPayment(isCustomOrder ? 'balance' : 'full')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'cash-balance' || loading === 'cash-full'
                ? '...'
                : '💵 Paiement reçu (comptant)'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Auto-Trigger on "Ready" Status

**Update:** `src/app/api/order/[id]/stage/route.ts`

Add automatic payment link when order moves to "Ready":

```typescript
// After status update to 'ready', auto-send payment link
if (newStage === 'ready' && shouldSendNotification) {
  const client = (order as any).client;

  // Check if payment is still pending
  if (order.payment_status !== 'paid') {
    try {
      // Create checkout session and send SMS
      const paymentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/create-checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            type: order.type === 'custom' ? 'balance' : 'full',
            sendSms: true,
          }),
        }
      );

      if (paymentResponse.ok) {
        console.log(`✅ Payment link sent for order ${orderId}`);
      }
    } catch (paymentError) {
      console.warn('Failed to send payment link:', paymentError);
      // Don't fail the stage change if payment link fails
    }
  }
}
```

---

## n8n SMS Workflow Update

Add two new templates to handle payment links:

### Template: `deposit_request`

```
Bonjour {{firstName}},

Votre commande #{{orderNumber}} nécessite un dépôt de 50% ({{amount}}$) avant de commencer le travail.

Payez en ligne: {{paymentUrl}}

Merci!
- Hotte Design & Couture
```

### Template: `payment_ready`

```
Bonjour {{firstName}},

Vos retouches (Commande #{{orderNumber}}) sont prêtes!

Montant: {{amount}}$
Payez ici: {{paymentUrl}}

Nous sommes ouverts lun-ven 9h-17h.
- Hotte Design & Couture
```

---

## Implementation Checklist

### Phase 1: Database & API (1-2 hours)
- [ ] Create migration `0022_add_deposit_tracking.sql`
- [ ] Run migration in Supabase
- [ ] Create `/api/payments/create-checkout/route.ts`
- [ ] Create `/api/payments/record-manual/route.ts`
- [ ] Update `/api/webhooks/stripe/route.ts` for deposit handling

### Phase 2: UI Components (1-2 hours)
- [ ] Create `PaymentStatusSection` component
- [ ] Add to Order Detail Modal
- [ ] Test deposit flow for custom orders
- [ ] Test balance flow for alterations

### Phase 3: Auto-Trigger (1 hour)
- [ ] Update stage route to auto-send payment on "Ready"
- [ ] Test end-to-end flow

### Phase 4: n8n Updates (30 min)
- [ ] Add `deposit_request` template to Switch node
- [ ] Add `payment_ready` template to Switch node
- [ ] Include `{{paymentUrl}}` in SMS messages
- [ ] Test SMS delivery with links

---

## Testing Scenarios

### Scenario 1: Custom Order with Deposit
1. Create custom order ($500 total)
2. Click "Send Deposit Request" → SMS with Stripe link ($250)
3. Pay via Stripe → Webhook updates `deposit_paid_at`
4. Move to "Ready" → SMS with balance link ($250)
5. Pay via Stripe → Order marked "paid"

### Scenario 2: Alteration with Full Payment
1. Create alteration order ($100 total)
2. Move to "Ready" → Auto-SMS with Stripe link ($100)
3. Pay via Stripe → Order marked "paid"

### Scenario 3: Cash Payment (Solange)
1. Create order
2. Click "Record Cash Payment"
3. Order marked "paid" (no Stripe record)

---

## Security Notes

1. All Stripe webhooks verify signature
2. Checkout sessions include order metadata for verification
3. Cash payments are recorded but don't affect Stripe
4. Payment status is tracked separately from payment method

---

*Plan created: 2025-12-17*
*Ready for implementation*
