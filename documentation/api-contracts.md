# API CONTRACTS — Hotte Couture

> **Purpose:** Document all API endpoints so agents can integrate without conflicts.
> 
> **Rule:** Define the contract HERE before implementing. Other agents may depend on it.

---

## Existing Endpoints (Already Built)

### Orders
| Method | Endpoint | Owner | Description |
|--------|----------|-------|-------------|
| GET | `/api/orders` | Agent A | List orders with filters |
| GET | `/api/orders/[id]` | Agent A | Get single order |
| POST | `/api/orders` | Agent A | Create new order |
| PATCH | `/api/orders/[id]` | Agent A | Update order |
| DELETE | `/api/orders/[id]` | Agent A | Delete order |

### Clients
| Method | Endpoint | Owner | Description |
|--------|----------|-------|-------------|
| GET | `/api/clients` | Agent A | List/search clients |
| GET | `/api/clients/[id]` | Agent A | Get single client |
| POST | `/api/clients` | Agent A | Create new client |
| PATCH | `/api/clients/[id]` | Agent A | Update client |

### Services
| Method | Endpoint | Owner | Description |
|--------|----------|-------|-------------|
| GET | `/api/services` | Agent A | List services |
| POST | `/api/services` | Agent A | Create service |

---

## New Endpoints (Phase 2)

### Webhooks (Agent B)

#### Order Status Webhook (for Make.com)
```
POST /api/webhooks/order-status
```
**Status:** ✅ IMPLEMENTED by Agent A (2024-12-12)

**Triggered:** When order status changes to "ready" or "delivered" (called from `/api/order/[id]/stage`)

**Environment Variable:** `MAKE_WEBHOOK_URL` - Set to your Make.com scenario webhook URL

**Payload:**
```json
{
  "event": "order.status_changed",
  "order_id": "uuid",
  "order_number": 12345,
  "new_status": "ready_for_pickup",
  "client": {
    "id": "uuid",
    "name": "Jean Tremblay",
    "phone": "+15141234567",
    "email": "jean@example.com",
    "language": "fr"
  },
  "items": [
    {
      "garment_type": "pants",
      "services": ["hem", "take_in_waist"],
      "total_cents": 4500
    }
  ],
  "totals": {
    "subtotal_cents": 4500,
    "tps_cents": 225,
    "tvq_cents": 449,
    "total_cents": 5174
  },
  "timestamp": "2024-12-12T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook received"
}
```

---

#### Payment Webhook (Stripe)
```
POST /api/webhooks/stripe
```
**Owner:** Agent B

**Handles:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**Updates:**
- `order.payment_status` → "paid" | "failed"
- `order.paid_at` → timestamp

---

### Chat Endpoints (Agent C)

#### Internal Chat Query
```
POST /api/chat/internal
```
**Owner:** Agent C

**Request:**
```json
{
  "query": "What's the status of order 12345?",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "response": "Order #12345 for Jean Tremblay is currently In Progress. It contains 2 items: pants hemming and jacket repair. Estimated completion: Dec 15.",
  "sources": [
    { "type": "order", "id": "uuid" }
  ]
}
```

---

#### External Status Lookup
```
GET /api/status/lookup?phone=+15141234567
GET /api/status/lookup?order=12345
```
**Owner:** Agent C

**Response:**
```json
{
  "found": true,
  "orders": [
    {
      "order_number": 12345,
      "status": "in_progress",
      "status_label": "En cours",
      "items_count": 2,
      "created_at": "2024-12-10",
      "estimated_completion": "2024-12-15"
    }
  ]
}
```

**Privacy Note:** Only returns order numbers and status, no PII.

---

### Notification Endpoints (Agent C)

#### Trigger SMS
```
POST /api/notifications/sms
```
**Owner:** Agent C

**Request:**
```json
{
  "template": "ready_for_pickup",
  "order_id": "uuid",
  "language": "fr"
}
```

**Templates:**
- `ready_for_pickup`
- `reminder_3_weeks`
- `reminder_1_month`
- `payment_received`

**Response:**
```json
{
  "success": true,
  "message_id": "n8n-execution-id"
}
```

---

### Calendar Endpoints (Agent B)

#### Get Available Slots
```
GET /api/calendar/slots?date=2024-12-15&duration=60
```
**Owner:** Agent B

**Response:**
```json
{
  "date": "2024-12-15",
  "slots": [
    { "start": "09:00", "end": "10:00", "available": true },
    { "start": "10:00", "end": "11:00", "available": false },
    { "start": "11:00", "end": "12:00", "available": true }
  ]
}
```

---

#### Book Appointment
```
POST /api/calendar/book
```
**Owner:** Agent B

**Request:**
```json
{
  "client_id": "uuid",
  "date": "2024-12-15",
  "start_time": "09:00",
  "duration_minutes": 60,
  "type": "consultation",
  "notes": "Custom wedding dress inquiry"
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "google-calendar-event-id",
  "confirmation": "Appointment booked for Dec 15 at 9:00 AM"
}
```

---

## Webhook URLs (External Services)

### Make.com → App
```
Receives from Make: POST /api/webhooks/make/invoice-created
Payload: { order_id, invoice_url, invoice_number }
```

### n8n → App
```
Receives from n8n: POST /api/webhooks/n8n/sms-status
Payload: { message_id, status, error? }
```

### App → Make.com
```
Sends to Make: https://hook.make.com/[SCENARIO_ID]
Payload: Order data (see order-status webhook above)
```

### App → n8n
```
Sends to n8n: https://otomato456321.app.n8n.cloud/webhook/[WORKFLOW_ID]
Payload: SMS request (see trigger SMS above)
```

---

## Authentication

### Internal Endpoints
All `/api/*` endpoints (except webhooks) require:
- Supabase session token in Authorization header
- Or Supabase cookie (for browser requests)

### Webhook Endpoints
- `/api/webhooks/stripe` - Verified via Stripe signature
- `/api/webhooks/make/*` - Verified via shared secret in header
- `/api/webhooks/n8n/*` - Verified via shared secret in header

### Public Endpoints
- `/api/status/lookup` - No auth, rate limited (10 req/min per IP)
- `/api/chat/external` - No auth, rate limited

---

## Rate Limits

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/api/status/*` | 10 | 1 min |
| `/api/chat/*` | 20 | 1 min |
| All others | 100 | 1 min |

---

*Update this document when adding or modifying endpoints.*
