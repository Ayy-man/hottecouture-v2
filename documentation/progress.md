# PROGRESS LOG — Hotte Couture Phase 2

> **Format:** `## [YYYY-MM-DD HH:MM] Task [ID] - [Title]`
> **After each task:** Log result, files changed, test outcome

---

## CURRENT TASK

**Task:** Phase 4 Sprint A - Production Readiness
**Status:** In Progress

---

## Phase 4: Production Readiness Sprint

### Sprint A: Quick Wins (Target: Today)
| Task | Status | Priority |
|------|--------|----------|
| Test customer portal button | ✅ Done | P0 |
| Duplicate client detection | ✅ Done | P0 |
| Vercel cron for reminders | ✅ Done | P0 |
| Client measurements UI | ✅ Done | P1 |
| Customer portal with tracking timeline | ✅ Done | P0 |
| Label download as PNG | ✅ Done | P1 |

### Sprint B: Medium Effort (Target: This Week)
| Task | Status | Priority |
|------|--------|----------|
| Auto-archive cron | ⏳ Pending | P1 |
| Rack position UI | ✅ Done | P2 |
| Printable to-do list | ✅ Done | P1 |
| Dual labels per print | ✅ Done | P1 |

### Sprint C: Deferred (Needs External Access)
| Task | Status | Blocker |
|------|--------|---------|
| Customer status chatbot | ⏳ Pending | Custom build needed (simple status lookup, not AI) |
| QuickBooks integration | ⏳ Pending | QB credentials needed |

### Completion Status
- Complete: 13/15 (87%)
- Partial: 1/15 (7%)
- Missing: 1/15 (6%)

---

## VERIFICATION STATUS (2025-12-14)

### Supabase Realtime - Implemented ✅
- [x] DB triggers (`broadcast_changes_filter`) on `order` and `task` tables
- [x] Frontend hook updated to use broadcast with private channels
- [x] Subscribes to both `order` and `task` channels with auth

### Phase 3A Features - All Verified ✅
- [x] Today's Tasks View (`/board/today`) - Working
- [x] Deposit Entry UI (custom orders) - Working (fixed `deposit_cents` column)
- [x] Photo Upload (garments step) - Working
- [x] Smart AI Chat Assistant - Working (requires OPENROUTER_API_KEY env var)

---

## COMPLETED TASKS

### [2025-12-14] Rack Position, Printable Tasks, Dual Labels

**What:** Implemented 3 production features: rack position tracking, printable task list, dual label copies

**Files:**
- `src/lib/config/production.ts` - NEW: Config constants for rack positions, print settings, label config
- `src/components/board/order-detail-modal.tsx` - Rack position dropdown for ready/delivered orders
- `src/app/api/order/[id]/route.ts` - NEW: PATCH endpoint for rack_position
- `src/components/board/draggable-order-card.tsx` - 📍 badge for rack position
- `src/components/board/order-list-view.tsx` - Rack column in list view
- `src/app/print/tasks/page.tsx` - NEW: Printable task list page
- `src/app/board/today/page.tsx` - Print button opens /print/tasks
- `src/app/labels/[orderId]/page.tsx` - Dual copies with "1 de 2" indicator

**Features:**
- **Rack Position:** Dropdown with A1-C10 presets + "Autre" free-text, only editable when ready/delivered
- **Printable Tasks:** Clean table with checkbox, order#, client, services, due date, priority, notes
- **Dual Labels:** 2 copies per garment with "1 de 2" / "2 de 2" indicator

**Config:** All settings in `src/lib/config/production.ts` for easy changes

**Test Result:** Lint passes

---

### [2025-12-14] Label Download as PNG

**What:** Added direct PNG download for garment labels alongside print option

**Files:**
- `src/app/labels/[orderId]/page.tsx` - Added canvas-based PNG generation and download button

**Features:**
- "Télécharger PNG" button generates clean label image
- Canvas renders all labels with QR codes, order info, client name
- Downloads as `labels-order-{orderNumber}.png`
- French button labels

**Test Result:** Build passes

---

### [2025-12-14] Customer Portal with Tracking Timeline

**What:** Created public customer-facing order status portal with animated timeline

**Files:**
- `src/app/portal/page.tsx` - NEW: Customer portal with phone/order# search
- `src/app/api/portal/lookup/route.ts` - NEW: Public API for order lookup
- `src/components/ui/tracking-timeline.tsx` - NEW: Framer-motion animated timeline

**Features:**
- Search by phone OR order number
- 5-stage animated timeline (Reçue → En cours → Terminé → Prêt → Livré)
- Pulsing animation for current stage
- French labels throughout
- No admin links or pricing exposed

**Test Result:** Build passes

---

### [2025-12-14] Supabase Realtime with Broadcast

**What:** Implemented realtime updates using Supabase broadcast triggers

**Files:**
- `src/lib/hooks/useRealtimeOrders.ts` - Switched from `postgres_changes` to `broadcast` events with private channels
- DB: `broadcast_changes_filter()` function + triggers on `order` and `task` tables

**Features:**
- Private channels with `setAuth()` authentication
- Subscribes to both `order` and `task` broadcast channels
- Triggers fire on status, assigned_to, stage, timer changes (started_at/stopped_at)
- RLS policies on `realtime.messages` for authenticated users

**Test Result:** Build passes
**Notes:** Requires DB triggers to be deployed via Supabase SQL editor

---

### [2025-12-14] Phase 3A - Today's Tasks, Deposit Entry, Photo Upload

**What:** Implemented 3 Phase 3A features

**Files:**
- `src/app/board/today/page.tsx` - NEW: Today's Tasks View with drag reordering, seamstress filter, print support
- `src/components/intake/pricing-step.tsx` - Added deposit entry UI for custom orders
- `src/components/intake/garments-step.tsx` - Added photo capture/upload functionality
- `src/app/api/intake/route.ts` - Added deposit_amount_cents to order creation

**Test Result:** Build passes
**Notes:** 
- Today's Tasks shows orders due within 3 days with drag-to-reorder
- Deposit UI appears for custom orders only, shows remaining balance
- Photo capture uses device camera, uploads to Supabase storage

### [2025-12-14] Smart AI Chat Assistant

**What:** Upgraded internal chat from mock responses to real AI with database queries

**Files:**
- `src/app/api/chat/internal/route.ts` - Complete rewrite with OpenRouter + DB queries
- `src/components/chat/internal-chat.tsx` - Added conversation history, updated welcome message

**Features:**
- OpenRouter API (Claude 3.5 Sonnet)
- System prompt with business info, pricing, team details
- DB queries: order lookup, today's orders, overdue, pending, ready, client search, stats
- Conversation context (last 6 messages)
- French responses (québécois professional)
- Fallback to DB results if AI unavailable

**Test Result:** Build passes
**Notes:** Requires `OPENROUTER_API_KEY` env var in Vercel
**Test Result:** Build passes

---

### [2025-12-14] Phase 3B - Productivity Stats & Critical Fixes

**What:** Added productivity analytics and resolved 4 critical bugs (Mutations, Notes 500, Disappearing Data, 2023 Date)

**Files:**
- `src/app/api/chat/internal/route.ts` - Added `get_productivity_stats` tool, Fixed `get_order` to read notes, Injected current date
- `src/app/api/garment/[id]/route.ts` - Fixed 500 error on manual note edit
- `src/app/api/order/[id]/details/route.ts` - Fixed "disappearing on refresh" bug (added estimated_minutes to fetch)
- `supabase/migrations/0017_add_updated_at.sql` - Added updated_at column (enables mutation tools)
- `supabase/migrations/0018_add_garment_estimated_minutes.sql` - Added estimated_minutes column (fixes 500 error)

**Features:**
- **Productivity Stats:** "How is Audrey doing?", "Stats for this week"
- **Robust Notes:** Manual edits now work and persist. Chatbot now sees and adds notes correctly.
- **Accurate Date:** Chatbot now knows today's date (2025 context).
- **Mutations:** Moving orders and assigning staff now works.

**Test Result:** All Verified ✅

---

### [2025-12-14] Fix Deposit Column Name

**What:** Fixed 500 error on order submission with deposit

**Files:**
- `src/app/api/intake/route.ts` - Changed `deposit_amount_cents` to `deposit_cents` (matching DB schema)

**Test Result:** Verified working in production

---

### [2025-12-14] Hourly Pricing & French Translations

**What:** Fixed hourly pricing calculation, estimated_minutes tracking, and French UI

**Files:**
- `src/components/intake/pricing-step.tsx` - Hourly pricing uses `hourly_rate_cents × qty`, all labels in French
- `src/app/api/intake/route.ts` - Sets `estimated_minutes` on garment_service (hourly: qty×60, fixed: service default)

**Test Result:** Build passes
**Notes:** Hourly services now correctly priced and tracked

---

### [2025-12-14] Hide Phone/Email Privacy Feature

**What:** Customer phone/email masked by default, tap to reveal

**Files:**
- `src/components/intake/client-step.tsx` - Added maskPhone/maskEmail functions, tap to reveal toggle

**Test Result:** Build passes
**Notes:** Phone shows as `***-***-1234`, email as `j***@domain.com`

---

### [2025-12-13] Task B2 - Seamstress Assignment at Step 5

**What:** Added assignment step to intake wizard for selecting seamstress

**Files:**
- `src/components/intake/assignment-step.tsx` - New component for seamstress selection (Audrey/Solange)
- `src/app/intake/page.tsx` - Added assignment step between pricing and summary
- `src/lib/dto.ts` - Added assigned_to to orderCreateSchema
- `src/lib/types/database.ts` - Added assigned_to to order table types
- `src/app/api/intake/route.ts` - Save assigned_to when creating order
- `supabase/migrations/0014_add_order_assigned_to.sql` - Database migration

**Test Result:** Build passes
**Notes:** Assignment is now step 6. Order creation button moved from pricing to assignment step.

---

### [2025-12-13] Task B1 - Auto-Advance on Card Click

**What:** Clicking pipeline card now auto-advances to next step after 300ms delay

**Files:**
- `src/components/intake/pipeline-selector.tsx` - Added setTimeout to auto-advance after card selection

**Test Result:** Build passes
**Notes:** Provides faster flow - select pipeline and automatically move to garments step

---

### [2025-12-13] Task A4 - Remove "Starting at" Text

**What:** Simplified pricing display on pipeline selector

**Files:**
- `src/components/intake/pipeline-selector.tsx` - Removed "Starting at" label, now shows "$15+" for alteration and "Gratuit" for custom consultation

**Test Result:** Build passes
**Notes:** Cleaner, more direct pricing display

---

### [2025-12-13] Task A3 - Prevent Accidental SMS on Kanban Drag

**What:** Added confirmation modal before sending SMS when moving order to "ready" status

**Files:**
- `src/components/board/sms-confirmation-modal.tsx` - New confirmation modal component
- `src/app/board/page.tsx` - Added modal state, split handleOrderUpdate into two functions
- `src/app/api/order/[id]/stage/route.ts` - SMS only sent when sendNotification: true
- `src/lib/dto.ts` - Added sendNotification field to orderStageSchema

**Test Result:** Build passes
**Notes:** Dragging to "ready" now shows modal. "Send SMS" sends notification, "Skip SMS" moves order without SMS.

---

### [2025-12-13] Task A2 - Fix "Change Customer" Bug

**What:** Fixed the "Change Client" button to actually clear client selection

**Files:**
- `src/components/intake/client-step.tsx` - Fixed Change button to call `onUpdate(null)` and updated header to conditionally show back button

**Test Result:** Build passes
**Notes:** Change Client button now properly clears selection and returns to search/create view

---

### [2025-12-13] Task A1 - Customer Step First

**What:** Reordered intake flow so customer selection is step 1

**Files:**
- `src/app/intake/page.tsx` - Swapped steps array order, changed initial state to 'client'
- `src/components/intake/pipeline-selector.tsx` - Added onPrev prop usage for back button

**Test Result:** Build passes
**Notes:** Client step now shows first. Pipeline selection is step 2 with back button.

---

### [2025-12-13 00:00] Step 0 - Cleanup & Setup

**What:** Deleted old agent docs, created fresh GAMEPLAN.md and progress.md

**Files:**
- Deleted: `agent-a-orders.md`, `agent-b-integrations.md`, `agent-c-comms.md`, `api-contracts.md`, `schema-changes.md`
- Created: `GAMEPLAN.md`, `progress.md`

**Test Result:** N/A
**Notes:** Ready to begin Phase A tasks

---

## BLOCKED

*None currently*

---

## TEST LOG

| Task | Test | Result | Notes |
|------|------|--------|-------|
| - | - | - | - |

---

## DECISIONS

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-13 | Single agent execution | Parallel agents overclaimed, need sequential verification |
| 2025-12-13 | n8n for Calendar | Simpler than direct OAuth in app |
| 2025-12-13 | Confirmation modal for SMS | Debounce alone insufficient, need explicit user action |
