# PROGRESS LOG — Hotte Couture Phase 2

> **Format:** `## [YYYY-MM-DD HH:MM] Task [ID] - [Title]`
> **After each task:** Log result, files changed, test outcome

---

## CURRENT TASK

**Task:** None - Phase 3A Complete ✅
**Status:** Only QuickBooks integration remaining

---

## VERIFICATION STATUS (2025-12-14)

### Phase 3A Features - All Verified ✅
- [x] Today's Tasks View (`/board/today`) - Working
- [x] Deposit Entry UI (custom orders) - Working (fixed `deposit_cents` column)
- [x] Photo Upload (garments step) - Working

---

## COMPLETED TASKS

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
