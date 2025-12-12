# AGENT C — Communications & AI Workstream

> **Your Mission:** Build notification system and read-only chatbots.
> 
> **Start Time:** Hour 1 (can start once you understand the data model)

---

## First Actions

1. **Understand the data model:**
   ```bash
   # Check existing schema
   cat supabase/migrations/*.sql
   # Or query directly
   # SELECT * FROM "order" LIMIT 5;
   ```

2. **Create your folder structure:**
   ```bash
   mkdir -p src/app/api/chat
   mkdir -p src/app/api/notifications
   mkdir -p src/components/chat
   mkdir -p src/app/status
   mkdir -p src/app/embed
   ```

3. **Test querying orders:**
   - Can you get order by number?
   - Can you get orders by client phone?
   - Can you get recent orders?

4. **Log to progress.md** that you're starting

---

## Your Files

### You OWN (full control):
```
/src/app/api/chat/
/src/app/api/notifications/
/src/components/chat/
/src/app/status/
/src/app/embed/
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
/src/app/api/webhooks/  (Agent B owns)
/src/app/api/integrations/
```

---

## Deliverables Checklist

### P0 - Critical (Must Work)

#### SMS Notifications (via n8n → GHL)
- [ ] Endpoint `/api/notifications/sms` accepts template + order_id
- [ ] n8n workflow receives request, sends via GHL
- [ ] "Ready for Pickup" SMS sends within 5 min of status change
- [ ] Bilingual templates (FR default, EN if client.language = 'en')
- [ ] Notification logged to `notification_log` table

#### Internal Status Bot
- [ ] Chat UI component for internal dashboard
- [ ] Query: "Status of order #12345" → returns order details
- [ ] Query: "Today's pending orders" → returns list
- [ ] Query: "Overdue orders" → returns list with due dates
- [ ] Read-only (no mutations ever)

### P1 - Important

#### External Status Widget
- [ ] Public page `/status` for customer lookup
- [ ] Search by phone OR order number
- [ ] Shows: order number, status, item count, estimated date
- [ ] No PII exposed (no names, no detailed notes)
- [ ] Embeddable version at `/embed/status`

#### Reminder System
- [ ] 3-week reminder for unclaimed orders
- [ ] 1-month final reminder
- [ ] Track `notification_count` to avoid spam

### P2 - Nice to Have
- [ ] Chat history persistence
- [ ] Typing indicators
- [ ] Natural language date parsing ("orders from last week")

---

## Chatbot Architecture

### Read-Only Principle
**CRITICAL:** These bots NEVER modify data. They only:
- SELECT from database
- Format responses
- Log queries

No INSERT, UPDATE, DELETE ever. Not even "mark as read" or "acknowledge."

### Internal Bot Flow
```
User Query
    │
    ▼
┌─────────────────┐
│  Parse Intent   │ ← Simple keyword matching OR OpenAI
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query Database │ ← Parameterized SQL, no raw input
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Format Response │ ← Templates or OpenAI formatting
└────────┬────────┘
         │
         ▼
Response to User
```

### External Bot Flow
```
Phone/Order# Input
    │
    ▼
┌─────────────────┐
│ Validate Input  │ ← Sanitize, rate limit
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lookup Order   │ ← Simple SELECT
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Status   │ ← Minimal info, no PII
└─────────────────┘
```

---

## SMS Templates

### French (Default)

**ready_for_pickup:**
```
Bonjour {name}, ici Hotte Design & Couture 🧵
Vos altérations sont prêtes à être récupérées.
Nous sommes ouverts du lundi au vendredi de 9h à 17h.
À bientôt! ☺️
```

**reminder_3_weeks:**
```
Bonjour {name}, ici Hotte Design & Couture 🧵
Juste un petit rappel que vos altérations sont prêtes depuis 3 semaines.
Nous sommes ouverts du lundi au vendredi de 9h à 17h.
À bientôt! ☺️
```

**reminder_1_month:**
```
Bonjour {name}, ici Hotte Design & Couture 🧵
Rappel final: vos articles seront donnés à une œuvre de charité 
si non réclamés dans les 7 prochains jours.
SVP contactez-nous au (819) 717-1424.
```

**payment_received:**
```
Bonjour {name}, ici Hotte Design & Couture 🧵
Merci! Votre paiement de {amount} a été reçu.
Votre commande #{order_number} est confirmée.
```

### English

**ready_for_pickup:**
```
Hi {name}, this is Hotte Design & Couture 🧵
Your alterations are ready for pickup!
We're open Monday to Friday, 9am to 5pm.
See you soon! ☺️
```

*(Similar translations for other templates)*

---

## n8n Workflow Setup

### Workflow: "Send SMS via GHL"

**Trigger:** Webhook
**URL:** `https://otomato456321.app.n8n.cloud/webhook/send-sms`

**Steps:**
1. Receive payload: `{ template, order_id, language }`
2. Query Supabase for order + client details
3. Select template based on `template` + `language`
4. Replace variables: `{name}`, `{order_number}`, `{amount}`
5. Call GHL API to send SMS
6. Return success/failure

**Payload from App:**
```json
{
  "template": "ready_for_pickup",
  "order_id": "uuid-here",
  "language": "fr"
}
```

**Response to App:**
```json
{
  "success": true,
  "message_id": "ghl-message-id"
}
```

---

## API Endpoints

### Internal Chat
```typescript
// POST /api/chat/internal
// Request:
{ "query": "What's the status of order 12345?" }

// Response:
{
  "response": "Order #12345 for Jean Tremblay is In Progress...",
  "type": "order_status",
  "data": { /* order object */ }
}
```

### External Status Lookup
```typescript
// GET /api/status/lookup?phone=+15141234567
// OR
// GET /api/status/lookup?order=12345

// Response:
{
  "found": true,
  "orders": [
    {
      "order_number": 12345,
      "status": "in_progress",
      "status_label": "En cours",
      "items_count": 2,
      "estimated_completion": "2024-12-15"
    }
  ]
}
```

### Trigger SMS
```typescript
// POST /api/notifications/sms
// Request:
{
  "template": "ready_for_pickup",
  "order_id": "uuid"
}

// Response:
{
  "success": true,
  "message_id": "n8n-execution-id"
}
```

---

## Database Queries You'll Use

### Get order by number
```sql
SELECT o.*, c.first_name, c.last_name, c.phone, c.language,
       COUNT(g.id) as garment_count
FROM "order" o
JOIN client c ON o.client_id = c.id
LEFT JOIN garment g ON g.order_id = o.id
WHERE o.order_number = $1
GROUP BY o.id, c.id;
```

### Get orders by client phone
```sql
SELECT o.order_number, o.status, o.created_at, o.due_date,
       COUNT(g.id) as garment_count
FROM "order" o
JOIN client c ON o.client_id = c.id
LEFT JOIN garment g ON g.order_id = o.id
WHERE c.phone = $1 AND o.is_archived = false
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT 5;
```

### Get overdue orders
```sql
SELECT o.*, c.first_name, c.last_name, c.phone
FROM "order" o
JOIN client c ON o.client_id = c.id
WHERE o.due_date < NOW()
  AND o.status NOT IN ('delivered', 'ready_for_pickup')
  AND o.is_archived = false
ORDER BY o.due_date ASC;
```

### Get orders needing reminders
```sql
SELECT o.*, c.first_name, c.phone, c.language
FROM "order" o
JOIN client c ON o.client_id = c.id
WHERE o.status = 'ready_for_pickup'
  AND o.last_notification_sent_at < NOW() - INTERVAL '3 weeks'
  AND o.notification_count < 2
  AND o.is_archived = false;
```

---

## Internal Chat UI Component

```tsx
// src/components/chat/InternalChat.tsx
'use client';

import { useState } from 'react';

export function InternalChat() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    
    const response = await fetch('/api/chat/internal', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    setQuery('');
    setLoading(false);
  };
  
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask about orders, clients, status..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? '...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
```

---

## External Widget (Embeddable)

```tsx
// src/app/embed/status/page.tsx
// This is a standalone page that can be embedded via iframe

export default function EmbeddableStatus() {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui' }}>
        <StatusLookupWidget />
      </body>
    </html>
  );
}
```

**Embed code for client's website:**
```html
<iframe 
  src="https://hotte-couture-six.vercel.app/embed/status"
  width="400"
  height="300"
  frameborder="0"
></iframe>
```

---

## Coordination Points

### With Agent A (Orders):
- You query their order data
- Status changes trigger your notification endpoint
- Ensure order status values match your templates

### With Agent B (Integrations):
- They call your SMS endpoint when payment received
- Include payment link in pickup notification
- Calendar booking confirmation may need SMS

---

## Definition of Done

You're done when:
1. "Ready for Pickup" triggers SMS automatically
2. Reminders go out at 3 weeks and 1 month
3. Internal bot answers status queries correctly
4. External widget lets customers check by phone/order#
5. All P0 items checked off

---

*Log everything to progress.md. Read-only means READ-ONLY.*
