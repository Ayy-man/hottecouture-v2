# SCHEMA CHANGES — Hotte Couture

> **CRITICAL:** Database changes affect ALL agents. Follow this process:
> 
> 1. **Propose** - Add your change request below with status `PENDING`
> 2. **Wait** - Project lead reviews and marks `APPROVED` or `REJECTED`
> 3. **Implement** - Only after approval, create migration
> 4. **Notify** - Update progress.md so other agents know

---

## Pending Changes

<!-- Add new requests here -->

*None currently*

---

## Approved Changes

### [2024-12-12] Add payment and notification fields to order table

**Requested By:** Agent B (Integrations)

**Status:** ✅ APPROVED

**Changes:**
```sql
-- Add payment tracking
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS invoice_number text;

-- Add notification tracking
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS last_notification_sent_at timestamptz;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS notification_count integer DEFAULT 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_order_payment_status ON "order"(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_stripe_payment_intent ON "order"(stripe_payment_intent_id);

-- Add constraint for payment_status
ALTER TABLE "order" ADD CONSTRAINT order_payment_status_check 
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
```

**Rationale:** Required for Stripe integration and SMS reminder tracking.

**Migration File:** `supabase/migrations/20241212_add_payment_fields.sql`

**Applied:** [ ] Not yet

---

### [2024-12-12] Add chat/notification logs table

**Requested By:** Agent C (Comms & AI)

**Status:** ✅ APPROVED

**Changes:**
```sql
-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES "order"(id) ON DELETE CASCADE,
  client_id uuid REFERENCES client(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'sms', 'email', 'push'
  template text NOT NULL, -- 'ready_for_pickup', 'reminder_3_weeks', etc.
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  external_id text, -- n8n execution ID or GHL message ID
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create chat_log table (for analytics, not persistence)
CREATE TABLE IF NOT EXISTS chat_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  type text NOT NULL, -- 'internal', 'external'
  user_id uuid REFERENCES admin_users(id), -- null for external
  query text NOT NULL,
  response text NOT NULL,
  tokens_used integer,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_order ON notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_client ON notification_log(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_chat_log_session ON chat_log(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_log_created ON chat_log(created_at DESC);

-- RLS policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification logs" ON notification_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert notification logs" ON notification_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view chat logs" ON chat_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert chat logs" ON chat_log
  FOR INSERT WITH CHECK (true);
```

**Rationale:** Need to track notification history and chat analytics.

**Migration File:** `supabase/migrations/20241212_add_notification_chat_logs.sql`

**Applied:** [ ] Not yet

---

## Rejected Changes

*None*

---

## Applied Changes History

| Date | Migration | Description | Applied By |
|------|-----------|-------------|------------|
| (existing) | Initial schema | All base tables | Previous dev |

---

## Existing Schema Reference

> Quick reference for existing tables. See full schema in `/supabase/migrations/`

### Core Tables
```
client
├── id (uuid, PK)
├── first_name, last_name
├── phone, email
├── language ('fr' | 'en')
├── ghl_contact_id (for CRM sync)
├── newsletter_consent
└── created_at, updated_at

order
├── id (uuid, PK)
├── order_number (serial)
├── client_id (FK → client)
├── status ('pending' | 'in_progress' | 'done' | 'ready_for_pickup' | 'delivered')
├── priority (1-5)
├── rush (boolean)
├── due_date
├── subtotal_cents, tps_cents, tvq_cents, total_cents
├── timer_started_at, total_work_seconds, is_timer_running
├── is_archived, archived_at
├── ghl_opportunity_id
└── created_at, updated_at

garment
├── id (uuid, PK)
├── order_id (FK → order)
├── garment_type_id (FK → garment_type)
├── notes
└── created_at

service
├── id (uuid, PK)
├── name_fr, name_en
├── price_cents
├── category_id (FK → category)
├── estimated_minutes
└── active (boolean)

garment_service
├── id (uuid, PK)
├── garment_id (FK → garment)
├── service_id (FK → service)
├── quantity
├── price_cents (override)
└── notes

time_tracking
├── id (uuid, PK)
├── order_id (FK → order)
├── user_id (FK → admin_users)
├── started_at
├── ended_at
├── duration_seconds
└── notes
```

---

*All schema changes must go through this document.*
