# HOTTE COUTURE — PHASE 2 GAMEPLAN

**Project:** Custom Fashion Management System  
**Client:** Hotte Couture (Audrey - Owner, Solange - Seamstress)  
**Status:** ~98% Complete (Phase 3A Done)  
**Last Updated:** 2025-12-14

---

## SITUATION SUMMARY

### What Happened
- Original 3-week, $2,450 project is now 3+ months late
- Previous developer departed mid-build
- Core app is ~55% complete with working foundation
- Critical integrations (QuickBooks, Payments, Calendar, SMS) are 0% complete

### What Works
- ✅ Order intake (multi-step wizard, tablet-optimized)
- ✅ Kanban board (drag-drop, real-time, filtering)
- ✅ Client management (search, CRUD, lookup)
- ✅ Time tracking (start/pause/stop/resume)
- ✅ Service catalog with pricing (including hourly services)
- ✅ Label generation (2 per garment, Print/PDF buttons)
- ✅ Authentication (Supabase magic links)
- ✅ Bilingual FR/EN (pricing step fully French)
- ✅ Tax calculations (TPS/TVQ Quebec)
- ✅ Customer privacy (phone/email masked, tap to reveal)
- ✅ Seamstress assignment at intake
- ✅ Workload scheduler with Gantt view
- ✅ SMS confirmation modal (prevents accidental sends)
- ✅ Auto-advance on card click
- ✅ CRM integration (GHL contact sync)
- ✅ Google Calendar integration
- ✅ Stripe payment integration

### Phase 3A Features (Complete)
- ✅ Today's Tasks View (`/board/today`) with drag reordering
- ✅ Deposit Entry UI for custom orders
- ✅ Photo Upload in garments step

### What's Missing
- ❌ QuickBooks invoice sync (only remaining item)

---

## DEFINITION OF DONE

The system is "done" when Audrey can:

1. **Take an order** on the iPad → saved to database
2. **See Solange's queue** prioritized on Kanban board
3. **Track time** per order with one tap
4. **Mark complete** → triggers SMS to customer
5. **Generate invoice** in QuickBooks automatically
6. **Accept payment** via Stripe link in SMS
7. **Book appointments** via Google Calendar embed
8. **Check order status** via chatbot (internal)
9. **Let customers check** their order status (external widget)

---

## ARCHITECTURE

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Supabase Edge Functions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic links) |
| Hosting | Vercel |
| Integrations | Make.com (QuickBooks), n8n (SMS), GHL (CRM) |
| Payments | Stripe |
| Calendar | Google Calendar API |

### Key URLs
| Service | URL |
|---------|-----|
| Production App | https://hotte-couture-six.vercel.app |
| GitHub Repo | https://github.com/Ayy-man/hottecouture-v2 |
| Supabase | [Check dashboard - OTOMATO456321's Org] |
| n8n | https://otomato456321.app.n8n.cloud |
| Make.com | [Configured for QuickBooks] |

### Database Schema (Key Tables)
```
client          - Customer records (ghl_contact_id for CRM sync)
order           - Orders with status, priority, due_date, timer fields
garment         - Individual items within an order
service         - Service catalog with pricing
garment_service - Junction: which services on which garments
task            - Work items for the Kanban board
time_tracking   - Time logs per order
```

---

## AGENT ASSIGNMENTS

### Agent A: Order System
**Mission:** Complete the order lifecycle from intake to completion

**Owns:**
```
/src/app/orders/
/src/app/clients/
/src/components/orders/
/src/components/clients/
/src/app/api/orders/
/src/app/api/clients/
/src/app/labels/
```

**Deliverables:**
1. Fix any broken order creation flows
2. Ensure Kanban drag-drop updates status correctly
3. Time tracking start/stop/resume working perfectly
4. Label printing (2 per page)
5. "Ready for Pickup" status change triggers webhook
6. Client search with privacy (hide phone/email until tap)
7. Order history per client

**Does NOT touch:**
- Integration code
- Chat components
- External API calls (except internal Supabase)

---

### Agent B: Integrations
**Mission:** Connect external services for payments, invoicing, scheduling

**Owns:**
```
/src/lib/integrations/
/src/app/api/integrations/
/src/app/api/webhooks/
/src/app/booking/
/docs/api-contracts.md
```

**Deliverables:**
1. **QuickBooks via Make.com:**
   - Webhook endpoint receives "order complete" event
   - Make scenario creates invoice in QB
   - Returns invoice URL for SMS

2. **Stripe Payments:**
   - Payment link generation
   - Webhook for payment confirmation
   - Update order.payment_status

3. **Google Calendar:**
   - OAuth connection for Audrey's calendar
   - Booking page for consultations
   - Push appointments to calendar

**Does NOT touch:**
- Order UI components
- Chat functionality
- Direct database queries (use API routes)

---

### Agent C: Communications & AI
**Mission:** Build notification system and chatbots

**Owns:**
```
/src/app/api/chat/
/src/app/api/notifications/
/src/components/chat/
/src/app/status/          (public order status page)
/src/app/embed/           (embeddable widget)
```

**Deliverables:**
1. **SMS Notifications (via n8n → GHL):**
   - "Ready for Pickup" immediate
   - 3-week reminder
   - 1-month final reminder
   - Bilingual templates (FR default)

2. **Internal Chatbot:**
   - Query: "What's the status of order #123?"
   - Query: "Show me today's pending orders"
   - Query: "Which orders are overdue?"
   - Read-only, no mutations

3. **External Status Widget:**
   - Customer enters phone or order number
   - Shows order status, estimated completion
   - Embeddable script for website
   - No auth required (lookup by phone/order#)

**Does NOT touch:**
- Order creation/editing logic
- Payment processing
- Calendar booking flow

---

## FILE OWNERSHIP RULES

### Shared Files (Coordinate Before Editing)
```
/src/types/              - Shared TypeScript types
/src/lib/supabase.ts     - Database client
/src/lib/utils.ts        - Shared utilities
/supabase/migrations/    - Schema changes (MUST document first)
```

### Conflict Prevention Protocol
1. **Before creating a new type:** Post to progress.md, wait for acknowledgment
2. **Before adding a migration:** Post to schema-changes.md, get approval
3. **API contracts:** Document in api-contracts.md before implementing
4. **Shared components:** If you need one another agent owns, request it

---

## SEQUENCING

```
HOUR 0 ─────────────────────────────────────────────────────────
  │
  ├─► Agent A: Clone repo, verify order flow works end-to-end
  │
  └─► All: Read GAMEPLAN.md, understand boundaries

HOUR 1 ─────────────────────────────────────────────────────────
  │
  ├─► Agent A: Begin order system fixes/improvements
  │
  └─► Agent C: Start internal chatbot (can query existing data)

HOUR 2 ─────────────────────────────────────────────────────────
  │
  ├─► Agent B: Start integrations (order webhooks need to exist)
  │
  └─► All three running in parallel

HOUR 4+ ────────────────────────────────────────────────────────
  │
  ├─► Agent A: Completes order system, available for support
  │
  ├─► Agent B: QuickBooks + Stripe working
  │
  └─► Agent C: Both chatbots functional

HOUR 8+ ────────────────────────────────────────────────────────
  │
  └─► Integration testing, bug fixes, polish
```

---

## ENVIRONMENT SETUP

### Required Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Make.com (webhooks are URL-based, no keys needed in app)

# n8n (webhooks are URL-based)
N8N_WEBHOOK_BASE_URL=https://otomato456321.app.n8n.cloud/webhook/

# OpenAI (for chatbots)
OPENAI_API_KEY=
```

### Local Development
```bash
git clone https://github.com/Ayy-man/hottecouture-v2.git
cd hottecouture-v2
npm install
cp .env.example .env.local
# Fill in env vars
npm run dev
```

---

## COMMUNICATION PROTOCOL

### progress.md Updates
Every significant action gets logged:
```markdown
## [TIMESTAMP] Agent [A/B/C] - [Action]
**What:** Brief description
**Files:** List of files created/modified
**Status:** Complete | In Progress | Blocked
**Blockers:** Any dependencies on other agents
---
```

### Requesting Help
If blocked on another agent's domain:
1. Post in progress.md with `BLOCKED:` prefix
2. Tag the specific agent needed
3. Continue with other work if possible

### Schema Changes
1. Post proposed change to `schema-changes.md`
2. Wait for "APPROVED" from project lead
3. Create migration file
4. Run migration
5. Update progress.md

---

## SUCCESS METRICS

### For Client (Audrey)
- [ ] Can create order in < 2 minutes on iPad
- [ ] Solange sees prioritized task list
- [ ] Customer gets SMS within 5 min of completion
- [ ] Invoice appears in QuickBooks automatically
- [ ] Payment link works, updates order when paid
- [ ] Can check any order status via chatbot

### For Project
- [ ] Zero critical bugs
- [ ] All 3 agents complete without merge conflicts
- [ ] Full documentation in /docs
- [ ] Handoff-ready for future maintenance

---

## WHAT NOT TO BUILD (Phase 3+)

Explicitly OUT OF SCOPE for this phase:
- Shopify integration
- 4-employee routing (stick with 2: Audrey, Solange)
- WhatsApp integration
- Document scanning
- Gantt view
- Dynamic capacity planning
- Mobile app

---

## CONTACTS

| Role | Name | For |
|------|------|-----|
| Project Lead | Ayman | Decisions, approvals, blockers |
| Client | Audrey | Business logic questions |
| Seamstress | Solange | Workflow validation |

---

*This document is the source of truth. When in doubt, refer here.*
