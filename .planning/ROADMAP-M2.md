# Roadmap: Milestone 2 — Production Launch

**Created:** 2026-03-04
**Updated:** 2026-03-18
**Phases:** 11
**Requirements:** 4 bugs (M2 original) + 7 items (Mar 13 client brief)

## Execution Waves

```
WAVE 1 (Ship-Blocker — Sequential)
└── Phase 1: Verify & Complete Order Submission Fix ✅
└── Phase 5: Restore Empty Files (BLOCKER for all downstream)

WAVE 2 (Original Bug Fixes — Parallel)
├── Phase 2: French-ify All Customer-Facing Templates
├── Phase 3: Garment Type Admin CRUD
└── Phase 4: Emoji Picker Touch Fix

WAVE 3 (URGENT — Sequential, architectural)
└── Phase 6: Order Form Restructure — 4 Sections [MKT-116]
└── Phase 7: Fabric Items in Accessories [MKT-117]

WAVE 4 (URGENT — Parallel)
├── Phase 8: Notification Workflow Overhaul [MKT-118]
└── Phase 9: Kanban Bugs — Cancelled/Editing [MKT-72]

WAVE 5 (Polish — Parallel)
├── Phase 10: Full French Translation [MKT-71]
└── Phase 11: iPad UX & Mobile Responsive [MKT-111]
```

## Phase Overview

| # | Phase | Goal | Requirement | Wave | Status |
|---|-------|------|-------------|------|--------|
| 1 | Order Submission Fix | Verify e2e order creation works | BUG-1 | 1 | ✅ CODE COMPLETE |
| 2 | French Templates | All customer-facing text in French | BUG-3 | 2 | ✅ COMPLETE |
| 3 | Garment Type Admin | Edit/delete/reorder garment types | BUG-5 | 2 | ✅ COMPLETE |
| 4 | Emoji Picker Touch | Fix iPad emoji picker closing | BUG-6 | 2 | ✅ COMPLETE |
| 5 | Restore Empty Files | Restore api/orders/route.ts (only empty file) from git | INFRA-1 | 1 | ✅ COMPLETE |
| 6 | Order Form Restructure | Split into 4 sections: Client/Alteration/Accessories/Pricing | MKT-116 | 3 | ✅ COMPLETE |
| 7 | Fabric Items | Add fabric-by-yard and fabric-by-sqft in Accessories | MKT-117 | 3 | ⏳ |
| 8 | Notification Workflow | Auto SMS at pending, SMS+voice at ready, invoices at ready only | MKT-118 | 4 | ⏳ |
| 9 | Kanban Bugs | Fix labels, add cancelled status, enable order editing | MKT-72 | 4 | ⏳ |
| 10 | French Translation | Wire next-intl into all components, full French UI | MKT-71 | 5 | ⏳ |
| 11 | iPad UX & Mobile | Compact iPad layout, Save+Close, exports, phone responsive | MKT-111 | 5 | ⏳ |

---

## Phase 1: Verify & Complete Order Submission Fix

**Goal:** Confirm order creation works end-to-end after Quick Task 2 fixes. If still failing, debug remaining issues.

**Requirements:** BUG-1
**Type:** Quick phase
**Dependencies:** None (builds on Quick Task 2 commits: 8a22cb3, fc58bff)

**Success Criteria:**
1. Can create order through full 5-step intake flow without errors
2. Order appears in board/kanban after creation
3. Error messages show actual API error (not generic "Failed to submit order")
4. Custom services with `custom_` prefix don't cause pricing loop failures

**Key Files:**
- `src/app/(protected)/intake/page.tsx`
- `src/app/api/intake/route.ts`

---

## Phase 2: French-ify All Customer-Facing Templates

**Goal:** Replace all remaining English customer-facing strings with French equivalents in order-summary.tsx and fix hardcoded phone number in track page.

**Requirements:** BUG-3
**Type:** Quick phase
**Dependencies:** None
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — French string replacement in order-summary.tsx + track page phone fix (commits 7001f1d, 65649f7)

**Success Criteria:**
1. All SMS notification templates are in French
2. All email templates are in French
3. All form labels visible to customers are in French
4. Backend/dev comments remain in English
5. `locales/fr.json` is the primary locale, complete and accurate

**Key Files:**
- `src/components/intake/order-summary.tsx`
- `src/app/(protected)/track/[id]/page.tsx`

---

## Phase 3: Garment Type Admin CRUD

**Goal:** Build admin UI to manage garment types (edit, delete, reorder) and clean up test data.

**Requirements:** BUG-5
**Type:** Quick phase
**Dependencies:** None
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Migrations (display_order column + test data cleanup) + extend PUT API handler (commits 28f0b9e, d36a332)
- [x] 03-02-PLAN.md — Admin page at /admin/garment-types with inline edit, delete, reorder (commit dc54f48)

**Success Criteria:**
1. Admin page lists all garment types with name and emoji
2. Can edit garment type name inline
3. Can edit garment type emoji
4. Can delete garment types (with usage check)
5. Can reorder garment types (drag or up/down)
6. Test entries ("h", "testingG", "TAPIS") cleaned from database

**Key Files:**
- `src/app/api/admin/garment-types/route.ts` (extended PUT handler)
- `src/app/(protected)/admin/garment-types/page.tsx` (new admin page)
- `supabase/migrations/0041_add_garment_type_display_order.sql`
- `supabase/migrations/0042_cleanup_test_garment_types.sql`

---

## Phase 4: Emoji Picker Touch Fix

**Goal:** Fix emoji picker closing immediately on iPad touch.

**Requirements:** BUG-6
**Type:** Quick phase
**Dependencies:** None

**Success Criteria:**
1. Emoji picker stays open when tapped on iPad Safari
2. Can browse and select emojis without picker closing
3. Picker still closes on genuine outside clicks/taps
4. Works on both iPad and desktop

**Key Files:**
- `src/components/ui/emoji-picker.tsx`
- `src/components/intake/garments-step.tsx` (click-outside handler)

---

## Phase 5: Restore Empty Files from Git

**Goal:** Restore `src/app/api/orders/route.ts` — the only file emptied to 0 bytes — from commit `0f76a39` (Phase 27 version with seamstress RBAC filtering).

**Requirements:** INFRA-1
**Type:** Quick phase (BLOCKER)
**Dependencies:** None — must complete before Phases 6-11
**Plans:** 1 plan

Plans:
- [x] 05-01-PLAN.md — Restore api/orders/route.ts from commit 0f76a39 + verify build (commit a317fd8)

**Research note:** The ROADMAP originally listed many files as 0 bytes, but commit `563d2cd` already restored all except `src/app/api/orders/route.ts`. The referenced commit `32990c2` does not exist in this repo (repo was reinitialized after APFS corruption). The correct source is `0f76a39`.

**Success Criteria:**
1. `src/app/api/orders/route.ts` restored from commit `0f76a39` (120 lines, includes `get_orders_with_details` RPC)
2. No empty source files remain in `src/`
3. TypeScript compiles without errors
4. Phase 27 seamstress RBAC filtering preserved (seamstressId query param + RPC call)

**Key Files:**
- `src/app/api/orders/route.ts` (currently 0 bytes — only file needing restoration)

---

## Phase 6: Order Form Restructure — 4 Sections [MKT-116]

**Goal:** Split the intake form into 4 distinct sections: Client Info, Alteration (labour), Accessories (products), Pricing/Finalization.

**Requirements:** MKT-116
**Type:** Major phase (architectural)
**Dependencies:** Phase 5 (restored files)
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — DB migration (NUMERIC qty + service recategorization) + dto.ts decimal qty + isAccessory flag in IntakeFormData (commits c0220ac, c72e34d)
- [x] 06-02-PLAN.md — AlterationStep + AccessoriesStep components + intake page 6-step flow (commits 9a8a35e, 8d84ba9)
- [x] 06-03-PLAN.md — Intake API accessory bypass + calendar gate + AssignmentStep filter (commits 69c0d87, 78d2db4)

**Success Criteria:**
1. Form has 4 clear sections: Client Info → Alteration → Accessories → Pricing/Finalization
2. Both Alteration and Accessories are OPTIONAL (order can be either or both)
3. Product items (invisible zippers, separable zips, thread, buttons, velcro) moved to Accessories
4. Only Alteration items (with time values) feed into production calendar
5. Accessories appear on invoice only — zero calendar/workload impact
6. Time estimates per alteration item are editable on the fly
7. Accessories support decimal quantities (0.25, 0.5, 1.75)

**Key Changes:**
- Split `GarmentServicesStep` into `AlterationStep` and `AccessoriesStep`
- DB migration: `garment_service.quantity` INTEGER → NUMERIC(10,2)
- Update `dto.ts`: qty validation from `z.number().int()` to `z.number()`
- Update `calendar-webhook.ts`: filter by category, only `alterations` feed calendar
- Recategorize product services from `alterations` → `accessories` in DB
- Update `calcTotal.ts` to handle decimal quantities

**Key Files:**
- `src/components/intake/garment-services-step.tsx` (split)
- `src/app/(protected)/intake/page.tsx` (step flow)
- `src/app/api/intake/route.ts` (submission)
- `src/lib/pricing/calcTotal.ts`
- `src/lib/dto.ts`
- `src/lib/webhooks/calendar-webhook.ts`
- New migration for quantity type change + service recategorization

---

## Phase 7: Fabric Items in Accessories [MKT-117]

**Goal:** Add two pre-built fabric products with unit-based pricing.

**Requirements:** MKT-117
**Type:** Small phase
**Dependencies:** Phase 6 (Accessories section must exist)

**Success Criteria:**
1. "Fabric by the yard" available in Accessories with decimal quantity, unit label "yard"
2. "Fabric by the square foot" available in Accessories with decimal quantity, unit label "sq ft"
3. Price formula: quantity × price per unit (both editable at order time)
4. Neither item appears in production calendar
5. Both items appear on invoice correctly

**Key Changes:**
- Seed migration: insert 2 fabric service records with unit column populated
- Accessories UI: show unit label next to quantity input
- Price display: "X yards × $Y/yard = $Z"

**Key Files:**
- New Supabase migration (seed data)
- `src/components/intake/` (Accessories section from Phase 6)

---

## Phase 8: Notification Workflow Overhaul [MKT-118]

**Goal:** Reconfigure order notification lifecycle with automatic triggers.

**Requirements:** MKT-118
**Type:** Medium phase
**Dependencies:** Phase 5 (restored webhook routes)

**Success Criteria:**
1. Auto SMS at `pending`: welcome message with portal tracking link
2. No notification at `in progress`
3. SMS + voice call at `ready`: payment amount + Stripe link + tracking link + GHL voice broadcast
4. No notification at `done`
5. Invoices (Stripe + QuickBooks) ONLY generated when status reaches `ready`
6. All SMS templates in French (bilingual fallback based on client.language)

**Key Changes:**
- Add welcome SMS template for `pending` status
- Wire auto-SMS into order creation flow (intake API)
- Implement status change handler that triggers notifications
- Integrate GHL voice broadcast API for `ready` status
- Enforce invoice timing: only at `ready`
- Remove manual SMS confirmation modal for automated statuses

**Key Files:**
- `src/lib/ghl/messaging.ts` (new template)
- `src/app/api/intake/route.ts` (auto-SMS at creation)
- `src/app/api/order/[id]/status/route.ts` (status change triggers)
- `src/app/api/webhooks/order-ready/route.ts`
- `src/lib/ghl/invoices.ts` (timing enforcement)
- `src/components/board/sms-confirmation-modal.tsx`

---

## Phase 9: Kanban Bugs — Cancelled/Editing [MKT-72]

**Goal:** Fix 3 Kanban bugs: duplicate labels, cancelled orders, order editing.

**Requirements:** MKT-72
**Type:** Medium phase
**Dependencies:** Phase 5 (restored label/board files)

**Success Criteria:**
1. Exactly 1 label generated per product (not 2)
2. `cancelled` status exists in order_status enum
3. Cancelled orders excluded from revenue/invoice calculations
4. Orders fully editable at any Kanban stage: add/remove items, change prices, update quantities, edit client info
5. Dashboard analytics exclude cancelled orders

**Key Changes:**
- Fix label config: `copyCount: 2` → `copyCount: 1` in `production.ts`
- DB migration: add `cancelled` to order_status enum
- Update `stage-transitions.ts`: allow transitions to/from `cancelled`
- Build "Edit Order" mode in order detail modal
- Add cancel button in order detail modal
- Update dashboard/analytics queries to exclude `cancelled`

**Key Files:**
- `src/lib/config/production.ts` (label config)
- `src/lib/board/stage-transitions.ts`
- `src/components/board/order-detail-modal.tsx` (edit mode)
- `src/app/(protected)/dashboard/analytics/page.tsx`
- New Supabase migration for cancelled status

---

## Phase 10: Full French Translation [MKT-71]

**Goal:** Wire next-intl translations into every component for complete French UI.

**Requirements:** MKT-71
**Type:** Large phase
**Dependencies:** None (can run parallel with Phase 11)

**Success Criteria:**
1. Every user-facing string uses `useTranslations()` hook
2. `NextIntlClientProvider` wrapper added to root layout
3. All labels, buttons, status names, form fields, error messages in French
4. AI chatbot (Pupuce) responds in French by default
5. Language toggle switches all UI between FR/EN
6. Mobile nav labels translated
7. Backend/admin technical references remain in English

**Key Changes:**
- Add `NextIntlClientProvider` to `src/app/layout.tsx`
- Systematically replace hardcoded strings in ~50+ components
- Update `locales/fr.json` and `locales/en.json` with any missing keys
- Wire chatbot to use locale from cookie
- Update API responses to respect locale where applicable

**Key Files:**
- `src/app/layout.tsx` (provider)
- `locales/fr.json`, `locales/en.json`
- Every component in `src/components/` with hardcoded strings
- `src/components/chat/internal-chat.tsx` (chatbot language)
- `src/components/navigation/mobile-bottom-nav.tsx`

---

## Phase 11: iPad UX & Mobile Responsive [MKT-111]

**Goal:** Optimize iPad layout, fix task panel, restore exports, ensure phone responsive.

**Requirements:** MKT-111
**Type:** Medium phase
**Dependencies:** Phase 5 (restored export routes)

**Success Criteria:**
1. Order detail modal compact on iPad 8th gen — collapsible sections, reduced field sizes
2. "Save and Close" button works on task panel (saves + auto-closes)
3. Export functionality restored: (1) task list per employee, (2) active projects, (3) weekly capacity
4. App fully responsive on phones (secondary to iPad)
5. Per-garment seamstress assignment verified on real device

**Key Changes:**
- Refactor order detail modal with collapsible `<details>` or accordion sections
- Fix `onSaveAndClose` callback in task management modal
- Restore and verify export API routes
- Audit all pages for phone breakpoint (< 640px)
- Test touch interactions on iPad Safari

**Key Files:**
- `src/components/board/order-detail-modal.tsx` (compact layout)
- `src/components/tasks/task-management-modal.tsx` (save+close)
- `src/app/api/admin/export/` routes
- `src/components/board/worklist-export.tsx`

---

*Milestone 2 — Production launch with restructured intake, notifications, and full French UI.*
*Domain migration (MKT-119) blocked on client action — not included as a phase.*
