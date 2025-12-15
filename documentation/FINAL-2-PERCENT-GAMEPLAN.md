# HOTTE COUTURE - FINAL 2% GAMEPLAN

> **Status:** 98% Complete. This document covers the remaining items to reach 100%.
> **Created:** 2025-12-15
> **For:** Claude n8n workflow builder + implementation

---

## REMAINING ITEMS

| Item | Priority | Status | Complexity |
|------|----------|--------|------------|
| QuickBooks Invoice Sync | P1 | Not Started | Medium (Make.com + n8n) |
| Auto-Archive Cron | P1 | API exists, cron needed | Low |
| Customer Status Chatbot | P2 | Portal exists, chatbot needed | Low |

---

## ITEM 1: QUICKBOOKS INVOICE SYNC

### What It Does
When an order status changes to "ready", automatically create an invoice in QuickBooks and store the invoice URL.

### Current State
- **App code:** 80% complete
  - `src/lib/integrations/make.ts` - `sendToMake()`, `triggerQuickBooksInvoice()` exist
  - `src/app/api/webhooks/order-status/route.ts` - calls `sendToMake()` on status change
  - Database columns `invoice_url` and `invoice_number` exist on `order` table
- **Missing:** `MAKE_WEBHOOK_URL` environment variable is empty

### Payload Structure (App sends to Make.com)
```json
{
  "event": "order.status_changed",
  "order_id": "uuid",
  "order_number": 123,
  "new_status": "ready",
  "client": {
    "id": "uuid",
    "name": "Jean-Pierre Tremblay",
    "phone": "+18197171424",
    "email": "jp@example.com",
    "language": "fr"
  },
  "items": [
    {
      "garment_type": "Pants",
      "services": ["Hemming", "Waist adjustment"],
      "total_cents": 4500
    }
  ],
  "totals": {
    "subtotal_cents": 8000,
    "tps_cents": 400,
    "tvq_cents": 798,
    "total_cents": 9198
  },
  "timestamp": "2025-01-15T14:30:00Z"
}
```

### Expected Response
```json
{
  "success": true,
  "invoice_url": "https://quickbooks.intuit.com/...",
  "invoice_number": "INV-2025-0123"
}
```

### Tax Calculation (Quebec)
- TPS (GST): 5% of subtotal
- TVQ (QST): 9.975% of subtotal

### Implementation Steps
1. Create Make.com scenario with QuickBooks module
2. Set `MAKE_WEBHOOK_URL` in Vercel environment
3. OR create n8n workflow that calls QuickBooks API directly

---

## ITEM 2: AUTO-ARCHIVE CRON

### What It Does
Automatically archive orders that have been in "delivered" status for 10+ days.

### Current State
- **App code:** 100% complete
  - `src/app/api/orders/auto-archive/route.ts` - POST endpoint exists
  - Accepts `{ daysOld: number }` parameter (default: 10)
  - Updates `status = 'archived'` for matching orders
- **Missing:** Cron trigger

### Existing Cron Pattern (Reminders)
File: `src/app/api/cron/reminders/route.ts`
- Uses `CRON_SECRET` for auth
- Configured in `vercel.json`

### vercel.json Current Config
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Implementation Options

#### Option A: Vercel Cron (Recommended)
1. Create `src/app/api/cron/auto-archive/route.ts`
2. Add to `vercel.json` crons array
3. Use same auth pattern as reminders

#### Option B: n8n Scheduled Workflow
1. Create cron trigger in n8n (daily at 9 AM)
2. Call `POST /api/orders/auto-archive` with `{ daysOld: 10 }`

### Auto-Archive Route Implementation (if creating new cron route)
```typescript
// src/app/api/cron/auto-archive/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 10)

  const { data, error } = await supabase
    .from('order')
    .update({ status: 'archived' })
    .eq('status', 'delivered')
    .lt('created_at', cutoffDate.toISOString())
    .select('order_number')

  return NextResponse.json({
    success: true,
    archived_count: data?.length || 0,
    archived_orders: data?.map(o => o.order_number) || []
  })
}
```

---

## ITEM 3: CUSTOMER STATUS CHATBOT

### What It Does
Simple chatbot widget for customers to check their order status. NOT AI-powered - just rules-based lookup.

### Current State
- **Customer Portal:** 100% complete at `/portal`
  - Search by phone or order number
  - Shows order status with visual timeline
  - Public (no auth required)
- **Embed Widget:** 100% complete at `/embed/status`
  - Lightweight for embedding on external sites
  - Uses `/api/status/lookup` endpoint
- **Internal AI Chat:** 100% complete
  - Uses OpenRouter + GPT-4
  - For staff only

### What's Missing
A conversational interface over the existing lookup. Currently customers must use the portal page or embed widget.

### Implementation Options

#### Option A: Enhance Embed Widget (Simplest)
The embed widget at `/embed/status` already works. Consider it "done" for MVP.

#### Option B: Add Simple Chat UI to Portal
1. Add chat bubble to `/portal` page
2. Parse user input for phone/order patterns
3. Call existing `/api/status/lookup`
4. Return conversational response

#### Option C: External Chatbot Service
Use Tidio, Intercom, or similar with custom API integration.

### Existing Lookup Endpoint
**GET** `/api/status/lookup?phone=+18197171424` or `?order=123`

Response:
```json
{
  "found": true,
  "orders": [
    {
      "order_number": 123,
      "status": "ready",
      "status_label": "Pret a recuperer",
      "items_count": 2,
      "estimated_completion": "2025-01-15",
      "created_at": "2024-12-10"
    }
  ]
}
```

---

## N8N WORKFLOW SPECIFICATIONS

### Active Webhooks (Already Configured in App)
```
N8N_SMS_WEBHOOK_URL=https://otomato456321.app.n8n.cloud/webhook/1743ff28-5a28-4b8f-ab4f-23bab551943a
N8N_CALENDAR_WEBHOOK_URL=https://otomato456321.app.n8n.cloud/webhook/5dbb6949-31c0-422a-ae40-987135dd831c
N8N_CRM_WEBHOOK_URL=https://otomato456321.app.n8n.cloud/webhook/e7b5e81d-53e1-496f-a8d1-1d5100b653a2
```

### Missing Webhook
```
MAKE_WEBHOOK_URL=<needs configuration for QuickBooks>
```

---

## WORKFLOW 1: GHL CRM SYNC

**Webhook:** `N8N_CRM_WEBHOOK_URL`
**Trigger:** New client created during order intake

### Incoming Payload
```json
{
  "name": "Jean-Pierre Tremblay",
  "email": "jp@example.com",
  "phone": "+18197171424",
  "preference": "Text Messages",
  "tags": ["new_client", "nurture_sequence"],
  "source": "hotte_couture_app"
}
```

### Required Response
```json
{
  "success": true,
  "contactId": "ghl_abc123",
  "contact_id": "ghl_abc123"
}
```

### n8n Workflow Steps
1. Webhook trigger (POST)
2. Split name into firstName/lastName
3. GHL HTTP request - Create/Update Contact
4. Return contactId in response

---

## WORKFLOW 2: SMS NOTIFICATIONS

**Webhook:** `N8N_SMS_WEBHOOK_URL`
**Trigger:** Order status change or cron reminders

### TWO Payload Formats

**Format A (Simple - Order Ready/Delivered):**
```json
{
  "contactId": "ghl_abc123",
  "action": "add"
}
```

**Format B (Detailed - Reminders/Payments):**
```json
{
  "phone": "+18197171424",
  "message": "Bonjour Jean-Pierre, ici Hotte Design & Couture...",
  "template": "ready_for_pickup",
  "order_id": "uuid",
  "order_number": 123,
  "client_name": "Jean-Pierre Tremblay",
  "language": "fr"
}
```

### n8n Workflow Steps
1. Webhook trigger (POST)
2. IF node - check if `contactId` exists
3. Format A: GHL send SMS via contact
4. Format B: Twilio/GHL send SMS to phone number
5. Return success response

### SMS Templates (Pre-rendered in App)
| Template | French | English |
|----------|--------|---------|
| ready_for_pickup | "Vos alterations sont pretes..." | "Your alterations are ready..." |
| reminder_3_weeks | "Rappel: pretes depuis 3 semaines..." | "Reminder: ready for 3 weeks..." |
| reminder_1_month | "Rappel final: donnes a charite..." | "Final reminder: donated to charity..." |
| payment_received | "Merci! Paiement de {amount} recu..." | "Thank you! Payment of {amount} received..." |

---

## WORKFLOW 3: GOOGLE CALENDAR

**Webhook:** `N8N_CALENDAR_WEBHOOK_URL`
**Trigger:** Order assigned with due date

### Incoming Payload
```json
{
  "action": "create",
  "title": "Order #123 - Jean-Pierre Tremblay",
  "description": "Pants hemming, Jacket alterations",
  "start_date": "2025-01-15T09:00:00-05:00",
  "end_date": "2025-01-15T11:00:00-05:00",
  "assignee": "Audrey",
  "order_id": "uuid",
  "order_number": 123,
  "client_name": "Jean-Pierre Tremblay",
  "estimated_hours": 2
}
```

### Required Response
```json
{
  "success": true,
  "event_id": "google_event_id",
  "calendar_link": "https://calendar.google.com/..."
}
```

### n8n Workflow Steps
1. Webhook trigger (POST)
2. Calculate end_date if not provided (start + estimated_hours)
3. Google Calendar - Create Event
4. Return event_id and calendar_link

---

## WORKFLOW 4: QUICKBOOKS (NEW)

**Webhook:** Create new, set as `MAKE_WEBHOOK_URL`
**Trigger:** Order status changes to "ready"

### Incoming Payload
```json
{
  "event": "order.status_changed",
  "order_id": "uuid",
  "order_number": 123,
  "new_status": "ready",
  "client": {
    "id": "uuid",
    "name": "Jean-Pierre Tremblay",
    "phone": "+18197171424",
    "email": "jp@example.com",
    "language": "fr"
  },
  "items": [
    {
      "garment_type": "Pants",
      "services": ["Hemming", "Waist adjustment"],
      "total_cents": 4500
    }
  ],
  "totals": {
    "subtotal_cents": 8000,
    "tps_cents": 400,
    "tvq_cents": 798,
    "total_cents": 9198
  },
  "timestamp": "2025-01-15T14:30:00Z"
}
```

### Required Response
```json
{
  "success": true,
  "invoice_url": "https://quickbooks.intuit.com/...",
  "invoice_number": "INV-2025-0123"
}
```

### n8n Workflow Steps
1. Webhook trigger (POST)
2. IF node - only process if `new_status === 'ready'`
3. QuickBooks - Find or Create Customer
4. QuickBooks - Create Invoice with line items
5. Return invoice_url and invoice_number

### QuickBooks Field Mapping
| App Field | QuickBooks Field |
|-----------|------------------|
| client.name | Customer.DisplayName |
| client.email | Customer.PrimaryEmailAddr |
| client.phone | Customer.PrimaryPhone |
| items[].garment_type + services | Line.Description |
| items[].total_cents / 100 | Line.Amount |
| totals.tps_cents / 100 | TaxLine (GST 5%) |
| totals.tvq_cents / 100 | TaxLine (QST 9.975%) |

---

## WORKFLOW 5: AUTO-ARCHIVE CRON

**Type:** Scheduled (not webhook)
**Schedule:** Daily at 9 AM (America/Toronto)

### n8n Workflow Steps
1. Cron trigger - `0 9 * * *`
2. HTTP Request - POST to `/api/orders/auto-archive`
3. Body: `{ "daysOld": 10 }`
4. Log results

### Expected Response
```json
{
  "success": true,
  "archived_count": 5,
  "archived_orders": [123, 124, 125, 126, 127]
}
```

---

## ENVIRONMENT VARIABLES CHECKLIST

### Already Set (Verify in Vercel)
- [x] `N8N_SMS_WEBHOOK_URL`
- [x] `N8N_CALENDAR_WEBHOOK_URL`
- [x] `N8N_CRM_WEBHOOK_URL`
- [x] `CRON_SECRET`
- [x] `WEBHOOK_SECRET`

### Needs Configuration
- [ ] `MAKE_WEBHOOK_URL` - After creating QuickBooks workflow

---

## DEFINITION OF DONE

The system is 100% complete when:

1. **QuickBooks:** Order marked "ready" creates invoice automatically
2. **Auto-Archive:** Delivered orders archived after 10 days automatically
3. **Customer Chatbot:** Customers can check status (portal/embed counts as done)

---

## FILE REFERENCES

### Integration Code
- `src/lib/integrations/make.ts` - Make.com/QuickBooks
- `src/lib/integrations/stripe.ts` - Stripe payments
- `src/lib/integrations/google-calendar.ts` - Calendar
- `src/lib/webhooks/ghl-webhook.ts` - GHL CRM
- `src/lib/webhooks/sms-webhook.ts` - SMS
- `src/lib/webhooks/calendar-webhook.ts` - Calendar events

### Webhook Endpoints
- `src/app/api/webhooks/order-status/route.ts` - Triggers QuickBooks
- `src/app/api/webhooks/stripe/route.ts` - Stripe events
- `src/app/api/webhooks/payment/route.ts` - Payment confirmations

### Cron Jobs
- `src/app/api/cron/reminders/route.ts` - SMS reminders

### Archive
- `src/app/api/orders/auto-archive/route.ts` - Auto-archive endpoint

### Customer Facing
- `src/app/portal/page.tsx` - Customer portal
- `src/app/embed/status/page.tsx` - Embeddable widget
- `src/app/api/status/lookup/route.ts` - Status lookup API

---

## NEXT STEPS

1. **Restart Claude Code** with n8n MCP installed
2. **Build n8n workflows** using this specification
3. **Set `MAKE_WEBHOOK_URL`** after QuickBooks workflow created
4. **Add auto-archive cron** to vercel.json (or use n8n)
5. **Test end-to-end** with real orders

---

*This document is the source of truth for completing the final 2%.*
