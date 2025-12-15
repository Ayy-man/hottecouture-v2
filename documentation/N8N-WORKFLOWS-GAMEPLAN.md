# n8n Workflows Build Guide - Hotte Couture

> **For:** Claude Web Agent building n8n workflows
> **n8n Instance:** https://otomato456321.app.n8n.cloud
> **Purpose:** SMS notifications, Google Calendar, GHL CRM sync

---

## ACTIVE WEBHOOKS SUMMARY

| Workflow | Webhook URL | Status |
|----------|-------------|--------|
| SMS Notifications | `https://otomato456321.app.n8n.cloud/webhook/1743ff28-5a28-4b8f-ab4f-23bab551943a` | Needs Build |
| Google Calendar | `https://otomato456321.app.n8n.cloud/webhook/5dbb6949-31c0-422a-ae40-987135dd831c` | Needs Build |
| GHL CRM Sync | `https://otomato456321.app.n8n.cloud/webhook/e7b5e81d-53e1-496f-a8d1-1d5100b653a2` | Needs Build |

---

# WORKFLOW 1: GHL CRM SYNC

## Purpose
When a new client is created in Hotte Couture, sync them to GoHighLevel CRM.

## Webhook URL
```
https://otomato456321.app.n8n.cloud/webhook/e7b5e81d-53e1-496f-a8d1-1d5100b653a2
```

## Incoming Payload
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

## Required Response
```json
{
  "success": true,
  "contactId": "ghl_abc123",
  "contact_id": "ghl_abc123"
}
```

---

## BUILD STEPS

### Step 1: Create Webhook Trigger
1. Create new workflow named: `Hotte Couture - GHL CRM Sync`
2. Add node: **Webhook**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** Use existing path or set to `e7b5e81d-53e1-496f-a8d1-1d5100b653a2`
   - **Response Mode:** "Respond to Webhook"

### Step 2: Split Name
1. Add node: **Code** (or Function)
2. Code:
```javascript
const fullName = $input.first().json.name;
const parts = fullName.trim().split(' ');
const firstName = parts[0] || '';
const lastName = parts.slice(1).join(' ') || '';

return [{
  json: {
    ...$input.first().json,
    firstName,
    lastName
  }
}];
```

### Step 3: GHL API - Create/Update Contact
1. Add node: **HTTP Request**
2. Configure:
   - **Method:** POST
   - **URL:** `https://rest.gohighlevel.com/v1/contacts/`
   - **Authentication:** Header Auth
     - **Name:** `Authorization`
     - **Value:** `Bearer YOUR_GHL_API_KEY`
   - **Headers:**
     - `Content-Type`: `application/json`
   - **Body (JSON):**
```json
{
  "firstName": "{{$json.firstName}}",
  "lastName": "{{$json.lastName}}",
  "email": "{{$json.email}}",
  "phone": "{{$json.phone}}",
  "tags": {{$json.tags}},
  "source": "{{$json.source}}",
  "customField": {
    "communication_preference": "{{$json.preference}}"
  }
}
```

### Step 4: Respond to Webhook
1. Add node: **Respond to Webhook**
2. Configure:
   - **Respond With:** JSON
   - **Response Body:**
```json
{
  "success": true,
  "contactId": "{{$json.contact.id}}",
  "contact_id": "{{$json.contact.id}}"
}
```

### Step 5: Error Handling
1. Add error workflow or try/catch
2. On error, respond with:
```json
{
  "success": false,
  "error": "{{$json.message}}"
}
```

---

# WORKFLOW 2: SMS NOTIFICATIONS

## Purpose
Send SMS notifications for order status changes and reminders via GHL or Twilio.

## Webhook URL
```
https://otomato456321.app.n8n.cloud/webhook/1743ff28-5a28-4b8f-ab4f-23bab551943a
```

## TWO Payload Formats

### Format A: Simple (contactId-based)
```json
{
  "contactId": "ghl_abc123",
  "action": "add"
}
```

### Format B: Detailed (phone-based)
```json
{
  "phone": "+18197171424",
  "message": "Bonjour Jean-Pierre, vos alterations sont pretes!",
  "template": "ready_for_pickup",
  "order_id": "uuid",
  "order_number": 123,
  "client_name": "Jean-Pierre Tremblay",
  "language": "fr"
}
```

### Format C: Reminder (from cron)
```json
{
  "template": "reminder_3week",
  "phone": "+18197171424",
  "firstName": "Jean-Pierre",
  "orderNumber": 123
}
```

## Required Response
```json
{
  "success": true,
  "messageId": "msg_xxx"
}
```

---

## BUILD STEPS

### Step 1: Create Webhook Trigger
1. Create new workflow named: `Hotte Couture - SMS Notifications`
2. Add node: **Webhook**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `1743ff28-5a28-4b8f-ab4f-23bab551943a`
   - **Response Mode:** "Respond to Webhook"

### Step 2: Detect Payload Type
1. Add node: **IF**
2. Condition: `{{$json.contactId}}` exists (is not empty)
3. True branch → Format A (GHL contact-based)
4. False branch → Format B/C (phone-based)

---

### Branch A: GHL Contact-Based SMS

1. Add node: **HTTP Request** (GHL Send SMS)
2. Configure:
   - **Method:** POST
   - **URL:** `https://rest.gohighlevel.com/v1/contacts/{{$json.contactId}}/notes/`

   **Note:** GHL doesn't have a direct SMS API in v1. Options:
   - Use workflows/triggers in GHL
   - Use Twilio directly
   - Add contact to a campaign that sends SMS

**Alternative - Add to GHL Workflow:**
```
POST https://rest.gohighlevel.com/v1/contacts/{{$json.contactId}}/workflow/WORKFLOW_ID
```

---

### Branch B/C: Phone-Based SMS

#### Option 1: Twilio
1. Add node: **Twilio > Send SMS**
2. Configure:
   - **From:** Your Twilio number
   - **To:** `{{$json.phone}}`
   - **Message:** Use Switch node based on template

#### Option 2: GHL Conversations API
1. Add node: **HTTP Request**
2. Configure:
   - **Method:** POST
   - **URL:** `https://rest.gohighlevel.com/v1/conversations/messages`
   - **Body:**
```json
{
  "type": "SMS",
  "contactId": "lookup_by_phone_first",
  "message": "{{$json.message}}"
}
```

### Step 3: Template Message Generation
1. Add node: **Switch** (based on `template` field)
2. Cases:
   - `ready_for_pickup`
   - `reminder_3week`
   - `reminder_1month`
   - `payment_received`
   - Default (use provided message)

3. For each case, add **Set** node with message:

**ready_for_pickup:**
```
FR: Bonjour {{$json.firstName}}, vos alterations sont pretes! Passez les recuperer chez Hotte Design & Couture. - Audrey
EN: Hello {{$json.firstName}}, your alterations are ready! Pick them up at Hotte Design & Couture. - Audrey
```

**reminder_3week:**
```
FR: Rappel: Commande #{{$json.orderNumber}} prete depuis 3 semaines. Passez la recuperer SVP!
EN: Reminder: Order #{{$json.orderNumber}} has been ready for 3 weeks. Please pick it up!
```

**reminder_1month:**
```
FR: Dernier rappel: Commande #{{$json.orderNumber}}. Articles non recuperes seront donnes.
EN: Final reminder: Order #{{$json.orderNumber}}. Unclaimed items will be donated.
```

**payment_received:**
```
FR: Merci! Paiement recu pour la commande #{{$json.orderNumber}}.
EN: Thank you! Payment received for order #{{$json.orderNumber}}.
```

### Step 4: Language Selection
1. Add node: **IF** (check `language` field)
2. `language === 'en'` → English message
3. Else → French message (default)

### Step 5: Send via Twilio
1. Add node: **Twilio > Send SMS**
   - **Credentials:** Add your Twilio Account SID + Auth Token
   - **From:** Your Twilio phone number
   - **To:** `{{$json.phone}}`
   - **Body:** `{{$json.finalMessage}}`

### Step 6: Respond to Webhook
1. Add node: **Respond to Webhook**
2. Body:
```json
{
  "success": true,
  "messageId": "{{$json.sid}}"
}
```

---

# WORKFLOW 3: GOOGLE CALENDAR

## Purpose
Create calendar events when orders are assigned with due dates.

## Webhook URL
```
https://otomato456321.app.n8n.cloud/webhook/5dbb6949-31c0-422a-ae40-987135dd831c
```

## Incoming Payload
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

## Required Response
```json
{
  "success": true,
  "event_id": "google_event_id",
  "calendar_link": "https://calendar.google.com/..."
}
```

---

## BUILD STEPS

### Step 1: Create Webhook Trigger
1. Create new workflow named: `Hotte Couture - Google Calendar`
2. Add node: **Webhook**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `5dbb6949-31c0-422a-ae40-987135dd831c`
   - **Response Mode:** "Respond to Webhook"

### Step 2: Calculate End Date (if not provided)
1. Add node: **Code**
2. Code:
```javascript
const data = $input.first().json;

let endDate = data.end_date;
if (!endDate && data.start_date && data.estimated_hours) {
  const start = new Date(data.start_date);
  start.setHours(start.getHours() + data.estimated_hours);
  endDate = start.toISOString();
}

return [{
  json: {
    ...data,
    end_date: endDate || data.start_date
  }
}];
```

### Step 3: Create Google Calendar Event
1. Add node: **Google Calendar > Create Event**
2. Configure:
   - **Credentials:** Connect your Google account
   - **Calendar:** Select the business calendar (or use calendar ID)
   - **Start:** `{{$json.start_date}}`
   - **End:** `{{$json.end_date}}`
   - **Summary:** `{{$json.title}}`
   - **Description:**
```
{{$json.description}}

Order #{{$json.order_number}}
Client: {{$json.client_name}}
Assigned to: {{$json.assignee}}
```
   - **Color:** (optional) Set based on assignee

### Step 4: Respond to Webhook
1. Add node: **Respond to Webhook**
2. Body:
```json
{
  "success": true,
  "event_id": "{{$json.id}}",
  "calendar_link": "{{$json.htmlLink}}"
}
```

### Step 5: Handle Updates/Deletes (Optional)
1. Add node: **Switch** (based on `action` field)
2. Cases:
   - `create` → Create event (as above)
   - `update` → Google Calendar > Update Event
   - `delete` → Google Calendar > Delete Event

---

# CREDENTIALS REQUIRED

## For GHL CRM Sync
- **GHL API Key:** Get from GoHighLevel Settings > API Keys
- Store as HTTP Header Auth credential in n8n

## For SMS Notifications
- **Twilio Account SID:** From Twilio Console
- **Twilio Auth Token:** From Twilio Console
- **Twilio Phone Number:** Your SMS-enabled number
- OR use GHL's built-in SMS if available

## For Google Calendar
- **Google OAuth:** Connect via n8n's Google Calendar node
- Requires: Calendar read/write permissions
- **Calendar ID:** Get from Google Calendar settings

---

# TESTING EACH WORKFLOW

## Test GHL CRM Sync
```bash
curl -X POST https://otomato456321.app.n8n.cloud/webhook/e7b5e81d-53e1-496f-a8d1-1d5100b653a2 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+15551234567",
    "preference": "Text Messages",
    "tags": ["test"],
    "source": "hotte_couture_app"
  }'
```

## Test SMS Notification
```bash
curl -X POST https://otomato456321.app.n8n.cloud/webhook/1743ff28-5a28-4b8f-ab4f-23bab551943a \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+15551234567",
    "template": "ready_for_pickup",
    "firstName": "Test",
    "orderNumber": 999,
    "language": "en"
  }'
```

## Test Google Calendar
```bash
curl -X POST https://otomato456321.app.n8n.cloud/webhook/5dbb6949-31c0-422a-ae40-987135dd831c \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "title": "Order #999 - Test Client",
    "description": "Test alteration",
    "start_date": "2025-01-20T10:00:00-05:00",
    "estimated_hours": 2,
    "assignee": "Audrey",
    "order_number": 999,
    "client_name": "Test Client"
  }'
```

---

# WORKFLOW DIAGRAM SUMMARY

## GHL CRM Sync
```
[Webhook] → [Split Name] → [GHL Create Contact] → [Respond]
```

## SMS Notifications
```
[Webhook] → [IF contactId?]
               |
      [Yes]    |    [No]
         ↓           ↓
   [GHL SMS]    [Switch template]
         ↓           ↓
         ↓      [Build message]
         ↓           ↓
         ↓      [Select language]
         ↓           ↓
         ↓      [Twilio Send]
         ↓           ↓
         └─────[Respond]─────┘
```

## Google Calendar
```
[Webhook] → [Calculate end_date] → [Switch action]
                                        |
                           ┌────────────┼────────────┐
                        [create]     [update]     [delete]
                           ↓            ↓            ↓
                      [Create Event] [Update]    [Delete]
                           └────────────┼────────────┘
                                        ↓
                                   [Respond]
```

---

*Document created: 2025-12-15*
*For use with Claude Web Agent*
