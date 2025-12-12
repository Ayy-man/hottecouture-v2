# AGENT B — Integrations Workstream

> **Your Mission:** Connect external services for payments, invoicing, and scheduling.
> 
> **Start Time:** Hour 2 (after Agent A confirms order flow works)

---

## First Actions

1. **Wait for Agent A confirmation** that order creation/status changes work
2. **Verify integration access:**
   - Make.com account access
   - Stripe test keys
   - Google Calendar OAuth credentials
3. **Create your folder structure:**
   ```bash
   mkdir -p src/lib/integrations
   mkdir -p src/app/api/webhooks
   mkdir -p src/app/api/integrations
   mkdir -p src/app/booking
   ```
4. **Log to progress.md** that you're starting

---

## Your Files

### You OWN (full control):
```
/src/lib/integrations/
/src/app/api/webhooks/
/src/app/api/integrations/
/src/app/api/calendar/
/src/app/booking/
```

### You READ (don't modify):
```
/src/lib/supabase.ts
/src/types/
/src/app/api/orders/  (Agent A owns)
```

### You NEVER touch:
```
/src/app/orders/
/src/components/orders/
/src/app/api/chat/
/src/components/chat/
```

---

## Deliverables Checklist

### P0 - Critical (Must Work)

#### QuickBooks via Make.com
- [ ] Webhook endpoint `/api/webhooks/order-status` receives order data
- [ ] Make.com scenario configured to receive webhook
- [ ] Make.com creates invoice in QuickBooks
- [ ] Invoice URL returned and saved to order record
- [ ] Tested end-to-end: order complete → invoice exists in QB

#### Stripe Payments
- [ ] Stripe account connected (test mode first)
- [ ] Payment link generation works
- [ ] `/api/webhooks/stripe` receives payment events
- [ ] Order `payment_status` updated on successful payment
- [ ] Payment link included in SMS (coordinate with Agent C)

### P1 - Important

#### Google Calendar
- [ ] OAuth flow for connecting Audrey's calendar
- [ ] `/api/calendar/slots` returns available times
- [ ] `/api/calendar/book` creates event
- [ ] Booking page UI at `/booking`
- [ ] Confirmation email/SMS (coordinate with Agent C)

### P2 - Nice to Have
- [ ] Retry logic for failed webhooks
- [ ] Webhook signature verification
- [ ] Calendar sync shows existing appointments

---

## Integration Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Hotte App     │────►│    Make.com     │────►│   QuickBooks    │
│  (Next.js)      │     │   (Middleware)  │     │   (Invoicing)   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │ Webhook
         ▼
┌─────────────────┐
│     Stripe      │
│   (Payments)    │
└─────────────────┘
         │
         │ Webhook
         ▼
┌─────────────────┐
│   Hotte App     │
│ (Update Order)  │
└─────────────────┘
```

---

## QuickBooks Integration (via Make.com)

### Why Make.com instead of direct API?
- Make has already passed Intuit's security review
- No 2-6 week approval process
- Setup in hours, not weeks

### Make.com Scenario Setup

1. **Create scenario:** "Hotte Order → QuickBooks Invoice"
2. **Trigger:** Webhook (custom)
3. **Steps:**
   - Receive order data from Hotte
   - Search/Create customer in QB
   - Create invoice with line items
   - Return invoice URL via HTTP response

### Webhook Payload (from Hotte → Make)

```json
{
  "event": "order.status_changed",
  "order_id": "uuid",
  "order_number": 12345,
  "new_status": "complete",
  "client": {
    "name": "Jean Tremblay",
    "email": "jean@example.com",
    "phone": "+15141234567"
  },
  "line_items": [
    {
      "description": "Pantalon - Ourlet",
      "quantity": 1,
      "unit_price_cents": 2500
    },
    {
      "description": "Veste - Ajustement épaules", 
      "quantity": 1,
      "unit_price_cents": 4500
    }
  ],
  "subtotal_cents": 7000,
  "tps_cents": 350,
  "tvq_cents": 698,
  "total_cents": 8048
}
```

### Webhook Endpoint Code

```typescript
// src/app/api/webhooks/order-status/route.ts
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const payload = await request.json();
  
  // Only process certain status changes
  if (!['complete', 'ready_for_pickup'].includes(payload.new_status)) {
    return Response.json({ success: true, message: 'No action needed' });
  }
  
  // Forward to Make.com
  const makeResponse = await fetch(process.env.MAKE_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const makeResult = await makeResponse.json();
  
  // Update order with invoice URL
  if (makeResult.invoice_url) {
    const supabase = createClient();
    await supabase
      .from('order')
      .update({ 
        invoice_url: makeResult.invoice_url,
        invoice_number: makeResult.invoice_number 
      })
      .eq('id', payload.order_id);
  }
  
  return Response.json({ success: true });
}
```

---

## Stripe Integration

### Setup Steps
1. Get test keys from Stripe dashboard
2. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Payment Link Generation

```typescript
// src/lib/integrations/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createPaymentLink(order: Order): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: order.garment_services.map(gs => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: gs.service.name_fr,
        },
        unit_amount: gs.price_cents,
      },
      quantity: gs.quantity,
    })),
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=cancelled`,
    metadata: {
      order_id: order.id,
      order_number: order.order_number.toString(),
    },
  });
  
  return session.url!;
}
```

### Stripe Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    
    // Update order payment status
    const supabase = createClient();
    await supabase
      .from('order')
      .update({ 
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent as string
      })
      .eq('id', orderId);
      
    // Trigger notification (Agent C's endpoint)
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/sms`, {
      method: 'POST',
      body: JSON.stringify({
        template: 'payment_received',
        order_id: orderId
      })
    });
  }
  
  return Response.json({ received: true });
}
```

---

## Google Calendar Integration

### OAuth Setup
1. Create project in Google Cloud Console
2. Enable Calendar API
3. Create OAuth credentials
4. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
   ```

### Files to Create
```
/src/lib/integrations/google-calendar.ts
/src/app/api/integrations/google/connect/route.ts
/src/app/api/integrations/google/callback/route.ts
/src/app/api/calendar/slots/route.ts
/src/app/api/calendar/book/route.ts
/src/app/booking/page.tsx
```

---

## Coordination Points

### With Agent A (Orders):
- They trigger `/api/webhooks/order-status` on status change
- Agree on exact payload format
- You update order with `invoice_url` after QB sync

### With Agent C (Comms):
- Share payment link for inclusion in SMS
- They may call your calendar endpoints from chatbot
- Notify them when payment received so they can send confirmation SMS

---

## Environment Variables You Need

```env
# Make.com
MAKE_WEBHOOK_URL=https://hook.make.com/xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Google Calendar
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=xxx
```

---

## Definition of Done

You're done when:
1. Order completion creates invoice in QuickBooks
2. Invoice URL is saved to order and available for SMS
3. Stripe payment link works, updates order on payment
4. Appointment booking creates Google Calendar event
5. All P0 items checked off

---

*Log everything to progress.md. Coordinate with other agents on shared contracts.*
