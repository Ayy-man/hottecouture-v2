# Roadmap: Hotte Couture Final Modifications

**Created:** 2026-01-20
**Updated:** 2026-01-28
**Deadline:** Thursday, January 23, 2026
**Phases:** 11
**Requirements:** 39 mapped + 5 cleanup items

## Execution Waves

Phases grouped by dependencies. Run phases within same wave in parallel (separate terminals).

```
WAVE 1 (Sequential - Foundation) ✅ DONE
├── Phase 1: Item-Level Assignment (MUST BE FIRST)
└── Phase 2: Item-Level Pricing (depends on Phase 1)

WAVE 2 (Parallel - Can run simultaneously) ✅ DONE
├── Phase 3: Merge Garment/Service Steps
├── Phase 4: Reduce Vertical Space
├── Phase 5: List View + Product Names
├── Phase 6: Manage Task Button
├── Phase 7: Export Features
├── Phase 8: Timer Removal
├── Phase 9: Responsive Design
└── Phase 10: Calendar Fixes

WAVE 3 (Final Polish) ✅ DONE
└── Phase 11: Cleanup & Polish (gap closure)
```

## Phase Overview

| # | Phase | Goal | Requirements | Wave | Status |
|---|-------|------|--------------|------|--------|
| 1 | Item-Level Assignment | Assign seamstresses to items, not orders | ARCH-01 to ARCH-04 | 1 | ✓ |
| 2 | Item-Level Pricing | Editable final price per item | ARCH-05 to ARCH-07 | 1 | ✓ |
| 3 | Merge Steps | Combine garment + service selection | UI-01, UI-02 | 2 | ✓ |
| 4 | Reduce Space | 40% vertical space reduction | UI-03 to UI-06 | 2 | ✓ |
| 5 | List View | Grid/List toggle + product names | UI-07 to UI-09 | 2 | ✓ |
| 6 | Manage Task | Per-item button + Save & Close | UI-10 to UI-12 | 2 | ✓ |
| 7 | Exports | CSV exports for tasks, orders, capacity | EXP-01 to EXP-06 | 2 | ✓ |
| 8 | Timer Removal | Remove stopwatch, add manual input | TMR-01 to TMR-04 | 2 | ✓ |
| 9 | Responsive | iPhone + iPad portrait support | RES-01 to RES-08 | 2 | ✓ |
| 10 | Calendar | Fix scrolling + unassigned category | CAL-01 to CAL-04 | 2 | ✓ |
| 11 | Cleanup & Polish | Close implementation gaps | CLN-01 to CLN-05 | 3 | ✓ |

---

## Phase 1: Item-Level Assignment

**Goal:** Change assignment model from order-level to item-level so different seamstresses can work on different items within the same order.

**Requirements:**
- ARCH-01: Change data model for item-level assignment
- ARCH-02: Add `assigned_seamstress_id` to garment_service table
- ARCH-03: Migrate existing orders to item-level assignment
- ARCH-04: Update queries to filter by item assignment

**Success Criteria:**
1. Can assign Item 1 to Seamstress A and Item 2 to Seamstress B within same order
2. Each seamstress's task list shows only THEIR assigned items
3. Can reassign individual items without affecting other items in order
4. All existing orders migrated correctly (no data loss)
5. Board view shows items grouped by assigned seamstress

**Dependencies:** None (foundational)
**Blocked by:** Nothing
**Blocks:** Phase 2, Phase 3 (assignment dropdown), Phase 6 (manage task per item)

**Status:** ✓ Complete
**Plans:** 4/4 complete

Plans:
- [x] 01-01-PLAN.md — Database schema migration (add assigned_seamstress_id, migrate data, update RPC)
- [x] 01-02-PLAN.md — TypeScript types and assignment API endpoint
- [x] 01-03-PLAN.md — Board filtering and workload page updates
- [x] 01-04-PLAN.md — Intake flow and order card UI updates

---

## Phase 2: Item-Level Pricing

**Goal:** Allow editing final price per item after invoice creation, based on actual time worked.

**Requirements:**
- ARCH-05: Add `final_price` field to garment_service table
- ARCH-06: Auto-recalculate order total when item price changes
- ARCH-07: Log price changes for audit trail

**Success Criteria:**
1. Can modify item price after invoice is created
2. Order total updates automatically when item price changes
3. Customer-facing documents show only prices (never time)
4. Price change history logged with who/when/old/new values
5. UI shows both estimated price (readonly) and final price (editable)

**Dependencies:** Phase 1 (item-level data model)
**Blocked by:** Phase 1
**Blocks:** Phase 6 (final price in manage task modal)

**Status:** ✓ Complete
**Plans:** 3/3 complete

Plans:
- [x] 02-01-PLAN.md — Database schema (final_price_cents column, price_change_log table, TypeScript types)
- [x] 02-02-PLAN.md — Pricing logic update and API endpoint for item price changes
- [x] 02-03-PLAN.md — UI for item-level price editing in order detail modal

---

## Phase 3: Merge Garment/Service Steps

**Goal:** Reduce page navigation during order intake by combining garment and service selection.

**Requirements:**
- UI-01: Merge garment selection and service selection into single page
- UI-02: Add seamstress assignment dropdown to merged page

**Success Criteria:**
1. One less page navigation in order creation workflow
2. Garment selection and service selection visible simultaneously
3. Seamstress assignment dropdown appears on same page
4. "Add to Order" button finalizes item with all details
5. No loss of existing search/filter functionality

**Dependencies:** Phase 1 (for assignment dropdown)
**Blocked by:** Phase 1
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 2/2 complete

Plans:
- [x] 03-01-PLAN.md — Create merged GarmentServicesStep component (garment config + service selection + inline assignment)
- [x] 03-02-PLAN.md — Wire into intake page, Add to Order functionality, human verification

---

## Phase 4: Reduce Vertical Space

**Goal:** Reduce page height by 40% to eliminate "endless scrolling" complaint.

**Requirements:**
- UI-03: Reduce vertical spacing between sections (24px -> 12px)
- UI-04: Reduce form field spacing (16px -> 8px)
- UI-05: Make Notes fields collapsible (collapsed by default)
- UI-06: Use 2-column layouts for form fields

**Success Criteria:**
1. Order details page height reduced by at least 40%
2. All information remains accessible (nothing permanently hidden)
3. Text remains readable (not cramped)
4. Notes expandable with single click
5. Client confirms improvement during Friday meeting

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 2/2 complete

Plans:
- [x] 04-01-PLAN.md — Create CollapsibleSection and CollapsibleNotes UI components
- [x] 04-02-PLAN.md — Apply spacing reductions to order-detail-modal.tsx

---

## Phase 5: List View + Product Names

**Goal:** Add list view option and replace generic item codes with actual product names.

**Requirements:**
- UI-07: Add view toggle button (Grid/List) to service selection
- UI-08: Implement list view matching Pipeline section style
- UI-09: Replace "Number 1", "Number 2" with product names

**Success Criteria:**
1. Toggle button visible and functional
2. List view shows compact table format (Service | Price | Time | Select)
3. View preference persists across sessions
4. No more "Number 1" labels anywhere
5. Long product names truncated elegantly with tooltip

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 1/1 complete

Plans:
- [x] 05-01-PLAN.md — Add view toggle hook, grid/list views, verify product names

---

## Phase 6: Manage Task Button + Client Fields

**Goal:** Add per-item task management button with Save & Close behavior, plus phone field.

**Requirements:**
- UI-10: Add "Manage Task" button on each item card
- UI-11: Implement "Save & Close" behavior
- UI-12: Add Email, SMS/Mobile, Phone fields to client page

**Success Criteria:**
1. "Manage Task" button appears on every item card
2. Opens item management modal with: assignee, times, price, status, notes
3. "Save & Close" saves and closes in one action
4. Toast notification confirms save
5. Client page has all three contact fields (Email, SMS, Phone)

**Dependencies:** Phase 1 (item cards), Phase 2 (final price field)
**Blocked by:** Phases 1 & 2
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 2/2 complete

Plans:
- [x] 06-01-PLAN.md — Manage Task button + Save & Close
- [x] 06-02-PLAN.md — Add SMS/Mobile field to client

---

## Phase 7: Export Features

**Goal:** Add CSV export capabilities and team member management.

**Requirements:**
- EXP-01: Export projects per seamstress (CSV)
- EXP-02: CSV with columns: Client, Order#, Item, Service, Status, Due, Est Time, Actual Time
- EXP-03: Export orders list (CSV)
- EXP-04: Export weekly capacity (CSV)
- EXP-05: Team member management form
- EXP-06: Add Marie as main seamstress

**Success Criteria:**
1. Export button accessible from seamstress view
2. CSV downloads immediately with correct data
3. Filename includes seamstress name and date
4. Orders and capacity exports available from 3-dot menu
5. Can add new team members via form

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 3/3 complete

Plans:
- [x] 07-01-PLAN.md — CSV export infrastructure (utilities + 3 API routes)
- [x] 07-02-PLAN.md — UI integration (export buttons in board page)
- [x] 07-03-PLAN.md — Team management form + add Marie

---

## Phase 8: Timer Removal

**Goal:** Remove stopwatch completely, replace with manual time input.

**Requirements:**
- TMR-01: Remove stopwatch/timer UI component
- TMR-02: Remove Start/Stop/Pause buttons
- TMR-03: Add "Actual Time (minutes)" text input
- TMR-04: Keep "Estimate Time" field for planning

**Success Criteria:**
1. No stopwatch/timer visible anywhere in app
2. "Actual Time" is simple manual input field
3. "Estimate Time" field remains and works correctly
4. Manually entered time can be used for price calculation
5. No console errors from removed timer code

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 2/2 complete

Plans:
- [x] 08-01-PLAN.md — Delete all timer files (components, API routes, utilities, tests)
- [x] 08-02-PLAN.md — Remove timer imports and clean up references in remaining files

---

## Phase 9: Responsive Design

**Goal:** Full iPhone support and iPad portrait optimization.

**Requirements:**
- RES-01: Add responsive breakpoint for iPhone (< 768px) ✓
- RES-02: Convert navigation to bottom tab bar on mobile ✓
- RES-03: Touch-friendly buttons (min 44px height) ✓
- RES-04: Stack form fields vertically on mobile ✓
- RES-05: Convert tables to cards on mobile ✓
- RES-06: Full-screen modals on mobile ✓
- RES-07: Fix iPad portrait layout ✓
- RES-08: Test all workflows on iPhone Safari ✓

**Success Criteria:**
1. All pages display correctly on iPhone ✓
2. No horizontal scrolling required ✓
3. All buttons/inputs tappable without zooming ✓
4. Order creation workflow completes on iPhone ✓
5. iPad portrait renders correctly (no overflow) ✓

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** None

**Status:** ✓ Complete
**Implementation:** MobileBottomNav component with md:hidden, 44px touch targets, safe-area-bottom

---

## Phase 10: Calendar Fixes

**Goal:** Fix calendar scrolling and add unassigned items category.

**Requirements:**
- CAL-01: Fix vertical scrolling in timeline calendar ✓
- CAL-02: Add "Unassigned" category ✓
- CAL-03: Add "Assign to Me" button ✓
- CAL-04: Sort unassigned by due date ✓

**Success Criteria:**
1. Calendar scrolls smoothly vertically ✓
2. "Unassigned" category visible alongside seamstress names ✓
3. Shows count of unassigned items ✓
4. Seamstresses can self-assign from unassigned list ✓
5. Item moves out of "Unassigned" after assignment ✓

**Dependencies:** Phase 1 (item-level assignment for unassigned query)
**Blocked by:** Phase 1
**Blocks:** None

**Status:** ✓ Complete
**Implementation:** unassignedTasks section in calendar/page.tsx

---

## Phase 11: Cleanup & Polish

**Goal:** Close remaining implementation gaps identified during Technical Specifications review.

**Requirements:**
- CLN-01: Complete 40% space reduction with two-column form layouts
- CLN-02: Verify SMS routing uses mobile_phone field correctly
- CLN-03: Add hard DELETE endpoint for staff removal
- CLN-04: iPad portrait optimizations (no horizontal overflow)
- CLN-05: Verify calendar timeline vertical scrolling works

**Success Criteria:**
1. Order detail forms use two-column layout on tablet/desktop
2. SMS notifications route to mobile_phone field (not landline phone)
3. Staff can be permanently deleted via admin interface
4. iPad portrait mode has no horizontal scrolling
5. Calendar timeline scrolls vertically without issues

**Dependencies:** All prior phases complete
**Blocked by:** Nothing
**Blocks:** None

**Status:** ✓ Complete
**Plans:** 1/1 complete

Plans:
- [x] 11-01-PLAN.md — Gap closure tasks (5 items)

---

## Suggested Schedule

Given 4-day deadline (Jan 20-23):

| Day | Focus | Phases |
|-----|-------|--------|
| Mon (Jan 20) | Architecture foundation | 1, 2 |
| Tue (Jan 21) | UI improvements | 3, 4, 5, 6 (parallel) |
| Wed (Jan 22) | Features + Responsive | 7, 8, 9 (parallel) |
| Thu (Jan 23) | Calendar + Testing | 10 + full testing |
| Fri (Jan 24) | Verification meeting | Bug fixes only |

---
*Roadmap created: 2026-01-20*
