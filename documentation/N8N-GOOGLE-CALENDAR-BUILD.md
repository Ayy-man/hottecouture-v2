# n8n Google Calendar Workflow - Build Spec

> **For:** Claude n8n Builder
> **Purpose:** Create calendar events when orders are assigned to seamstresses
> **Webhook URL:** Use existing `N8N_CALENDAR_WEBHOOK_URL` or create new one

---

## OVERVIEW

When an order is assigned to a seamstress with a due date, the Hotte Couture app sends a webhook. This workflow creates a calendar event on the correct person's Google Calendar based on who the order is assigned to.

---

## WEBHOOK PAYLOAD

The app sends this JSON:

```json
{
  "action": "create",
  "title": "Order #123 - Jean-Pierre Tremblay",
  "description": "Alteration order for Jean-Pierre Tremblay",
  "start_date": "2025-01-15T09:00:00-05:00",
  "end_date": "2025-01-15T11:00:00-05:00",
  "assignee": "Audrey",
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "order_number": 123,
  "client_name": "Jean-Pierre Tremblay",
  "estimated_hours": 2
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | Always "create" for now (future: "update", "delete") |
| `title` | string | Event title: "Order #X - Client Name" |
| `description` | string | Event description with order details |
| `start_date` | ISO 8601 | Due date/time (this is when work should be done BY) |
| `end_date` | ISO 8601 | Optional - calculated from start_date + estimated_hours if not provided |
| `assignee` | string | Staff name: "Audrey", "Solange", or "Audrey-Anne" |
| `order_id` | UUID | Database ID of the order |
| `order_number` | number | Human-readable order number |
| `client_name` | string | Customer name |
| `estimated_hours` | number | Estimated work time in hours |

---

## EXPECTED RESPONSE

Return this JSON on success:

```json
{
  "success": true,
  "event_id": "google_calendar_event_id_here",
  "calendar_link": "https://calendar.google.com/calendar/event?eid=xxxxx"
}
```

On error:

```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## WORKFLOW ARCHITECTURE

```
[1. Webhook Trigger]
        ↓
[2. Calculate End Date (if missing)]
        ↓
[3. Switch on Assignee]
        ↓
   ┌────┼────┬────┐
   ↓    ↓    ↓    ↓
[Audrey] [Solange] [Audrey-Anne] [Default/Error]
   ↓    ↓    ↓    ↓
[Google Calendar: Create Event] (each with different calendar)
   ↓    ↓    ↓    ↓
   └────┴────┴────┘
        ↓
[4. Respond to Webhook]
```

---

## BUILD STEPS

### Step 1: Create Webhook Trigger

1. Create new workflow: `Hotte Couture - Google Calendar`
2. Add node: **Webhook**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `hc-calendar` (or use existing path if updating)
   - **Response Mode:** "Respond to Webhook"
   - **Response Code:** 200

### Step 2: Calculate End Date (Code Node)

Add a **Code** node to calculate end_date if not provided:

```javascript
const data = $input.first().json;

let endDate = data.end_date;

if (!endDate && data.start_date) {
  const hours = data.estimated_hours || 1;
  const start = new Date(data.start_date);
  start.setHours(start.getHours() + hours);
  endDate = start.toISOString();
}

// If no end_date and no estimated_hours, default to 1 hour
if (!endDate) {
  const start = new Date(data.start_date);
  start.setHours(start.getHours() + 1);
  endDate = start.toISOString();
}

return [{
  json: {
    ...data,
    end_date: endDate
  }
}];
```

### Step 3: Switch Node (Route by Assignee)

Add a **Switch** node:

- **Mode:** Rules
- **Data Type:** String
- **Value:** `{{ $json.assignee }}`

**Rules:**

| Output | Operation | Value |
|--------|-----------|-------|
| 0 | Equals | Audrey |
| 1 | Equals | Solange |
| 2 | Equals | Audrey-Anne |
| 3 (Fallback) | - | (default route for unknown assignee) |

### Step 4: Google Calendar Nodes (One Per Person)

Create **3 Google Calendar nodes**, one for each output of the Switch.

#### Node: Create Event - Audrey

- **Resource:** Event
- **Operation:** Create
- **Calendar:** Select Audrey's calendar (or use Calendar ID)
- **Start:** `{{ $json.start_date }}`
- **End:** `{{ $json.end_date }}`
- **Summary:** `{{ $json.title }}`
- **Description:**
  ```
  {{ $json.description }}

  Order #{{ $json.order_number }}
  Client: {{ $json.client_name }}
  Estimated time: {{ $json.estimated_hours }} hours
  ```
- **Timezone:** America/Toronto

#### Node: Create Event - Solange

Same configuration as Audrey, but select **Solange's calendar**.

#### Node: Create Event - Audrey-Anne

Same configuration as Audrey, but select **Audrey-Anne's calendar**.

### Step 5: Handle Fallback (Unknown Assignee)

For the fallback output (output 3), add a **Set** node:

```json
{
  "success": false,
  "error": "Unknown assignee: {{ $json.assignee }}"
}
```

Then connect to Respond to Webhook.

### Step 6: Merge Results

Add a **Merge** node to combine all calendar outputs:
- **Mode:** Merge By Position
- Or just connect all calendar outputs to the same Respond node

### Step 7: Respond to Webhook

Add **Respond to Webhook** node:

**On Success (from Calendar nodes):**
```json
{
  "success": true,
  "event_id": "{{ $json.id }}",
  "calendar_link": "{{ $json.htmlLink }}"
}
```

**On Error (from fallback):**
```json
{
  "success": false,
  "error": "{{ $json.error }}"
}
```

---

## GOOGLE CALENDAR SETUP

### Option A: Service Account (Recommended)

1. Create Google Cloud project
2. Enable Google Calendar API
3. Create Service Account
4. Download JSON key
5. Share each person's calendar with the service account email
6. Use service account credentials in n8n

### Option B: OAuth Per Person

1. In n8n, create Google Calendar credentials
2. Each person authorizes their own calendar
3. Create separate credential for each person
4. Use the matching credential in each calendar node

---

## TESTING

### Test Payload

```bash
curl -X POST YOUR_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "title": "Order #999 - Test Client",
    "description": "Test alteration order",
    "start_date": "2025-01-20T10:00:00-05:00",
    "assignee": "Audrey",
    "order_id": "test-uuid-123",
    "order_number": 999,
    "client_name": "Test Client",
    "estimated_hours": 2
  }'
```

### Expected Result

1. Event appears on Audrey's Google Calendar
2. Response returns:
```json
{
  "success": true,
  "event_id": "abc123xyz",
  "calendar_link": "https://calendar.google.com/..."
}
```

---

## ENVIRONMENT VARIABLE

Once built, set in Vercel:

```
N8N_CALENDAR_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook/hc-calendar
```

---

## FUTURE ENHANCEMENTS (Not for initial build)

1. **Update events:** Handle `action: "update"` with event_id
2. **Delete events:** Handle `action: "delete"` with event_id
3. **Color coding:** Set event colors based on order type (alteration vs custom)
4. **Reminders:** Add popup reminders before due date

---

*Document created: 2025-12-17*
*For use with Claude n8n Builder*
