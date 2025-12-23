# HOTTE COUTURE — DELIVERABLES STATUS

**Last Updated:** December 23, 2025
**Status:** Pre-Launch Testing Phase

---

## QUICK SUMMARY

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Complete | 32 | 71% |
| ⚠️ Partial | 7 | 16% |
| ❌ Missing/Blocked | 6 | 13% |

---

## CORE DELIVERABLES (11 Categories)

### 1. CLIENT MANAGEMENT — 85% ⚠️

| Feature | Status | Notes |
|---------|--------|-------|
| Digital client intake form (tablet-optimized) | ✅ | 7-step wizard |
| Client database with contact info | ✅ | Supabase `client` table |
| New vs existing customer detection | ✅ | Phone-based duplicate detection |
| Client lookup by name/phone | ✅ | Search works |
| Measurement profiles | ⚠️ | **UI exists but NOT saved to DB** |
| Photo documentation of every garment | ✅ | Camera capture, Supabase storage |
| Newsletter consent capture | ✅ | Law 25 compliant |
| French language interface | ✅ | French default |

**Gap:** Measurements collected in UI but never persisted to database.

---

### 2. ALTERATION WORKFLOW — 95% ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Visual clothing type selection with icons | ✅ | Emoji icons |
| Service selection with predetermined pricing | ✅ | Grid layout, categorized |
| Custom price option for unlisted services | ✅ | Custom service name + price |
| Multi-step form flow | ✅ | 7 steps |
| Large UI elements for iPad 8 | ✅ | Touch-friendly |
| Basic notes field | ✅ | Per garment and per order |
| Support for commercial/custom design | ✅ | Pipeline selector |

**Complete.**

---

### 3. TASK MANAGEMENT — 90% ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Kanban board with drag-and-drop | ✅ | @dnd-kit library |
| Task stages (Pending→Working→Done→Ready→Delivered) | ✅ | 5-stage workflow |
| One-tap time tracking | ✅ | Start/Pause/Resume/Stop |
| Auto-archiving after 7 days | ✅ | Cron job |
| Color-coded urgency levels | ✅ | Rush = red |
| Simple priority ordering | ✅ | Rush skips queue |

**Gap:** "Block Done until hours entered" not enforced.

---

### 4. PHYSICAL-DIGITAL HYBRID — 100% ✅

| Feature | Status | Notes |
|---------|--------|-------|
| QR codes/labels for garment tracking | ✅ | Links to `/board?order=X` |
| Printable clothing identification papers | ✅ | Full label layout |
| Paper printouts for priority lists | ✅ | `/print/tasks` route |
| Rack organization system | ✅ | A1-C10 presets + custom |
| Two labels per print | ✅ | "1 de 2", "2 de 2" |
| PNG download | ✅ | Canvas-based generation |

**Complete.**

---

### 5. PAYMENT & INVOICING — 90% ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Invoice total calculation (GST/HST) | ✅ | TPS 5% + TVQ 9.975% |
| GHL Invoice integration | ✅ | Create, send, webhook |
| SMS/email invoice with payment links | ✅ | Via GHL |
| Payment status tracking | ✅ | pending → deposit_paid → paid |
| 50% deposit for custom orders | ✅ | Deposit flow implemented |
| Manual cash payment recording | ✅ | API endpoint |
| QuickBooks sync | ⚠️ | Ready via GHL, needs connection |

**Action:** Connect QuickBooks in GHL Settings → Integrations.

---

### 6. AUTOMATED COMMUNICATIONS — 80% ⚠️

| Feature | Status | Notes |
|---------|--------|-------|
| "Ready for pickup" SMS | ✅ | Triggered on stage change |
| 3-week reminder | ✅ | Cron job |
| 1-month final reminder | ✅ | Cron job |
| New client welcome sequence | ⚠️ | Tags only (`sequence_bienvenue`) |
| Newsletter automation | ❌ | Not built |

**Gap:** Nurture is just a tag, not full GHL workflow. Newsletter not implemented.

---

### 7. SCHEDULING — 30% ❌

| Feature | Status | Notes |
|---------|--------|-------|
| Google Calendar integration | ❌ | Missing OAuth credentials |
| Online appointment booking | ❌ | UI exists, returns 503 |
| Calendar view within app | ❌ | Not built |
| Push to Google Calendar | ❌ | n8n ready, needs OAuth |

**Blocker:** Missing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, tokens.

---

### 8. CUSTOMER-FACING CHATBOT — 0% ❌

| Feature | Status | Notes |
|---------|--------|-------|
| Website chatbot | ❌ | Not implemented |
| Order status via chat | ❌ | — |
| FAQ responses | ❌ | — |
| Appointment booking via chat | ❌ | — |

**Alternative:** Form-based portal at `/portal` for order lookup (phone + order#).

---

### 9. INTERNAL AI ASSISTANT — 95% ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Employee-facing AI | ✅ | GPT-4o-mini via OpenRouter |
| Context-aware responses | ✅ | Business data included |
| Help with pricing/procedures | ✅ | System prompt |
| Integrated with database | ✅ | 10 tools |

**Tools:** `get_order`, `search_clients`, `get_stats`, `update_order_status`, `get_productivity_stats`, etc.

---

### 10. PHONE SYSTEM (GHL) — 100% ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Canadian GHL phone number | ✅ | Via GHL location |
| Basic SMS capabilities | ✅ | Direct GHL API |

**Complete.**

---

### 11. HIGH-TICKET INTAKE — 85% ⚠️

| Feature | Status | Notes |
|---------|--------|-------|
| Alterations vs Custom Design branching | ✅ | Pipeline selector |
| Custom project form | ✅ | Same multi-step wizard |
| 50% deposit notation | ✅ | Deposit field in pricing |
| Measurements on estimate | ⚠️ | UI only, not saved |

**Gap:** Same as Client Management — measurements not persisted.

---

## TEAM CHECKLIST

### UI / Branding ✅
- [x] Replace logos with H-only PNG
- [x] French interface labels
- [x] Compact card layout

### Order Flow ✅
- [x] Customer step first
- [x] Steps in left sidebar
- [x] Remove top stepper
- [x] Auto-advance on card click
- [x] Keep "Next" only when required
- [x] Fix "Change Customer" behavior

### Customer Privacy & Search ✅
- [x] Search by name and phone
- [x] Hide phone/email by default
- [x] Reveal on tap

### CRM Automation ⚠️
- [x] Auto-create customer on creation
- [x] Push customer to CRM (GHL)
- [ ] Auto-enroll nurture sequence (tags only, not full workflow)

### Services / Product Configuration ✅
- [x] UI for add/edit/remove services
- [x] Fix duplicate entries
- [x] List, Kanban, Gantt views

### Pricing & Lead Times ✅
- [x] Remove "Starting at"
- [x] 10-day alteration lead time
- [x] 4-week custom design lead time
- [x] Consultation = Free
- [x] Auto-generate due dates

### Hourly Items ⚠️
- [x] Show initial estimate
- [ ] Edit hours in In Progress (partial)
- [ ] Prevent Done until hours entered
- [x] 1 qty = 1 hour
- [x] Per-item time tracking

### Notifications ✅
- [x] Automated SMS/email sequences
- [x] Prevent accidental notifications on drag

### Printing ✅
- [x] Two labels per print
- [x] Auto-print option on order creation

### Assignment ⚠️
- [x] Assign seamstress at step 5
- [ ] Push tasks to Google Calendar (needs OAuth)
- [x] Automated workload schedule (Gantt exists)

### Integrations ⚠️
- [ ] QuickBooks (GHL→QB ready, needs connection)
- [x] Stripe → Replaced by GHL invoices
- [ ] Google Workspace + Calendar (needs credentials)
- [x] Label printer setup

### Client Dependency ❌
- [ ] Receive standard task duration list (blocked on client)

---

## CRITICAL ACTION ITEMS

### 🔴 P0 — Before Launch

| Task | Owner | Time |
|------|-------|------|
| Connect GHL → QuickBooks | Admin | 5 min |
| Publish GHL invoice webhook workflow | Admin | 10 min |
| Add `GHL_WEBHOOK_SECRET` to Vercel | Admin | 2 min |

### 🟡 P1 — Should Fix

| Task | Owner | Time |
|------|-------|------|
| Persist measurements to database | Dev | 2 hrs |
| Block "Done" status until hours entered | Dev | 1 hr |
| Build full nurture workflow in GHL | Admin | 30 min |

### 🔵 P2 — Nice to Have

| Task | Owner | Time |
|------|-------|------|
| Google Calendar OAuth setup | Admin | Needs creds |
| Customer chatbot (or accept portal as-is) | Dev | 4+ hrs |

### ⚪ Blocked

| Task | Blocker |
|------|---------|
| Task duration list | Waiting on client to provide |

---

## TESTING CHECKLIST

### Order Flow
- [ ] Create new alteration order
- [ ] Create new custom design order
- [ ] Search existing client
- [ ] Create new client
- [ ] Add multiple garments
- [ ] Add services to garments
- [ ] Verify pricing calculation
- [ ] Verify tax calculation (TPS + TVQ)
- [ ] Assign to seamstress
- [ ] Print labels

### Kanban Board
- [ ] Drag order between stages
- [ ] Verify SMS confirmation modal on "Ready"
- [ ] Open order detail modal
- [ ] Start/pause/stop timer
- [ ] View tasks

### Payments (GHL)
- [ ] Click "Envoyer lien de paiement"
- [ ] Verify GHL invoice created
- [ ] Mark invoice as paid in GHL
- [ ] Verify webhook updates order status

### Customer Portal
- [ ] Visit `/portal`
- [ ] Look up order by phone
- [ ] Look up order by order number
- [ ] Verify status timeline displays

### Admin
- [ ] Add new service (`/admin/services`)
- [ ] Add new category (`/admin/categories`)
- [ ] Manage staff (`/admin/staff`)

---

## ENVIRONMENT VARIABLES

### Configured ✅
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GHL_API_KEY
GHL_LOCATION_ID
OPENROUTER_API_KEY
```

### Needs Adding
```
GHL_WEBHOOK_SECRET=hotte-couture-ghl-webhook-2024
```

### Not Needed (GHL replaces Stripe)
```
STRIPE_SECRET_KEY (optional)
STRIPE_WEBHOOK_SECRET (optional)
```

### Blocked (Needs Credentials)
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_ACCESS_TOKEN
GOOGLE_REFRESH_TOKEN
```

---

## KEY URLS

| Environment | URL |
|-------------|-----|
| Production | https://hottecouture-v2.vercel.app |
| GHL Webhook | https://hottecouture-v2.vercel.app/api/webhooks/ghl-invoice |
| Customer Portal | https://hottecouture-v2.vercel.app/portal |

---

## GHL WEBHOOK SETUP

**URL:** `https://hottecouture-v2.vercel.app/api/webhooks/ghl-invoice`

**Header:** `x-webhook-secret: hotte-couture-ghl-webhook-2024`

**Body:**
```json
{
  "type": "InvoicePaid",
  "invoice": {
    "invoiceNumber": "{{invoice.number}}",
    "status": "paid",
    "amountPaid": "{{invoice.amount_paid}}",
    "total": "{{invoice.total_price}}"
  }
}
```

---

*Document generated: December 23, 2025*
