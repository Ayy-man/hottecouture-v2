# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**Supabase (Primary Backend):**
- Database, Auth, Storage
- SDK: `@supabase/supabase-js`, `@supabase/ssr`
- Client: `src/lib/supabase/client.ts` (browser)
- Server: `src/lib/supabase/server.ts` (API routes)
- Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Stripe (Payments):**
- Payment processing, checkout sessions, webhooks
- SDK: `stripe` ^20.0.0
- Client: `src/lib/integrations/stripe.ts`
- Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Features: Checkout sessions, payment intents, refunds
- Webhook: `src/app/api/webhooks/stripe/route.ts`

**GoHighLevel (CRM & Messaging):**
- Contact management, SMS/email messaging, invoicing
- Client: `src/lib/ghl/client.ts`
- Modules:
  - `src/lib/ghl/contacts.ts` - Contact CRUD
  - `src/lib/ghl/messaging.ts` - SMS/email templates
  - `src/lib/ghl/invoices.ts` - Invoice generation
  - `src/lib/ghl/tags.ts` - Contact tagging
- Auth: `GHL_API_KEY`, `GHL_LOCATION_ID`
- API Base: `https://services.leadconnectorhq.com`

**Google Calendar:**
- Appointment booking and scheduling
- SDK: `googleapis` ^168.0.0
- Client: `src/lib/integrations/google-calendar.ts`
- Auth: OAuth2 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
- Features: Available slots, booking creation, cancellation

**n8n (Workflow Automation):**
- CRM sync, payment notifications, messaging
- Client: `src/lib/webhooks/n8n-webhooks.ts`
- Webhooks:
  - GHL Contact Sync: `N8N_CRM_WEBHOOK_URL`
  - Messaging: `N8N_MESSAGING_WEBHOOK_URL`
  - Calendar: `N8N_CALENDAR_WEBHOOK_URL`
- Endpoints: `/demande-depot`, `/pret-ramassage`, `/paiement-recu`

**Make.com (QuickBooks Integration):**
- Invoice generation via QuickBooks
- Client: `src/lib/integrations/make.ts`
- Auth: `MAKE_WEBHOOK_URL`
- Events: `order.status_changed`, `order.payment_received`

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Schema: `src/lib/types/database.ts`
  - Tables: `client`, `order`, `garment`, `garment_service`, `service`, `category`, `task`, `staff`, `timer`, `event_log`, `document`
  - Migrations: `supabase/migrations/`

**File Storage:**
- Supabase Storage
- Client: `src/lib/storage.ts`
- Buckets:
  - `photos` - Garment photos (10MB max, images)
  - `labels` - Print labels (5MB max, images/PDF)
  - `receipts` - Payment receipts (5MB max, images/PDF)
  - `docs` - Documents (20MB max, PDF/Word)

**Caching:**
- None (server-side) - Relies on Supabase and Next.js ISR
- API caching via Next.js headers (`s-maxage=60, stale-while-revalidate=300`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
- Implementation: Magic link / email auth
- Client component: `src/components/auth/auth-provider.tsx`
- Server: `src/lib/supabase/server.ts` (service role for API routes)
- User types: Admin users via Supabase Auth, Staff via PIN system

**Staff Authentication:**
- PIN-based identification (not full auth)
- API routes: `src/app/api/staff/verify-pin/route.ts`, `src/app/api/staff/set-pin/route.ts`
- Provider: `src/components/staff/staff-session-provider.tsx`

## Monitoring & Observability

**Error Tracking:**
- None (console logging only)

**Logs:**
- Console logging throughout
- Event log table in Supabase (`event_log`)
- Tracks: status changes, payments, notifications

## CI/CD & Deployment

**Hosting:**
- Vercel
- Config: `vercel.json`
- Output: Standalone
- Functions timeout: 30s

**CI Pipeline:**
- GitHub Actions (`.github/` directory present)
- Husky pre-commit hooks for lint/format

**Cron Jobs (Vercel Cron):**
- `/api/cron/reminders` - 9am daily - Pickup reminders (3-week, 1-month)
- `/api/cron/auto-archive` - 9am daily - Archive old completed orders
- `/api/cron/stale-timers` - Hourly - Clean up abandoned timers

## Environment Configuration

**Required env vars:**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# GoHighLevel
GHL_API_KEY
GHL_LOCATION_ID

# n8n Webhooks
N8N_CRM_WEBHOOK_URL
N8N_MESSAGING_WEBHOOK_URL

# Cron authentication
CRON_SECRET

# App
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

**Optional env vars:**
```
# Google Calendar
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_CALENDAR_ID

# Make.com
MAKE_WEBHOOK_URL

# Pricing
RUSH_FEE_SMALL_CENTS
RUSH_FEE_LARGE_CENTS
GST_PST_RATE_BPS
```

**Secrets location:**
- Environment variables (Vercel dashboard for production)
- `.env` file for local development
- Template: `env.example`

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook: `POST /api/webhooks/stripe`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- GHL Invoice webhook: `POST /api/webhooks/ghl-invoice`
- Order ready webhook: `POST /api/webhooks/order-ready`
- Order status webhook: `POST /api/webhooks/order-status`
- Payment webhook: `POST /api/webhooks/payment`

**Outgoing:**
- n8n GHL sync: On order creation
- n8n deposit request: On custom order creation
- n8n ready notification: On order ready
- n8n payment received: On payment completion
- Make.com: On status change / payment received

## Internationalization

**Provider:** next-intl ^3.0.0
**Config:** `src/i18n/request.ts`
**Locales:**
- French (`locales/fr.json`) - Default
- English (`locales/en.json`)

**Usage:**
- Server: `getRequestConfig` from `next-intl/server`
- Client: `useTranslations` hook
- Language stored in client record

## API Route Structure

**Admin:** `src/app/api/admin/`
- Categories, services, garment types, measurement templates
- Worklist export, delete operations

**Orders:** `src/app/api/orders/`, `src/app/api/order/`
- CRUD, search, archive, status updates

**Payments:** `src/app/api/payments/`
- Create checkout, create intent, create link, record manual, status

**Clients:** `src/app/api/clients/`
- CRUD, measurements

**Timer/Tasks:** `src/app/api/timer/`, `src/app/api/tasks/`
- Start, stop, pause, resume, update

**Integrations:** `src/app/api/integrations/`
- Google OAuth callback/connect

**Cron:** `src/app/api/cron/`
- Reminders, auto-archive, stale-timers

---

*Integration audit: 2026-01-20*
