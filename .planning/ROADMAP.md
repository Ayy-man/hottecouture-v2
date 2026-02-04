# Roadmap: Hotte Couture Final Modifications

**Created:** 2026-01-20
**Updated:** 2026-02-04
**Phases:** 21 (11 original + 10 new from Feb 3 UAT)
**Requirements:** 39 original + 12 new from client feedback

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

WAVE 4 (Feb 3 UAT Feedback - Critical Fixes) ← CURRENT
├── Phase 12: Verify & Fix Item-Level Assignment (FIRST - client says broken)
├── Phase 13: Fix Price Editing Regression
└── Phase 14: Mandatory Time Field

WAVE 5 (Feb 3 UAT Feedback - UX Fixes, parallel)
├── Phase 15: Label Printing Format
├── Phase 16: Assignment Dropdown Scroll
├── Phase 17: Contact Field Validation
├── Phase 18: Popup Modals (Workload + Kanban)
├── Phase 19: Workflow Auto-Advance Fix
└── Phase 20: Stripe Payment Link Cleanup

WAVE 6 (Final Verification)
└── Phase 21: Verify Responsive on Real Devices
```

## Phase Overview

| # | Phase | Goal | Source | Wave | Status |
|---|-------|------|--------|------|--------|
| 1 | Item-Level Assignment | Assign seamstresses to items, not orders | Jan 13 | 1 | ✓ |
| 2 | Item-Level Pricing | Editable final price per item | Jan 13 | 1 | ✓ |
| 3 | Merge Steps | Combine garment + service selection | Jan 13 | 2 | ✓ |
| 4 | Reduce Space | 40% vertical space reduction | Jan 13 | 2 | ✓ |
| 5 | List View | Grid/List toggle + product names | Jan 13 | 2 | ✓ |
| 6 | Manage Task | Per-item button + Save & Close | Jan 13 | 2 | ✓ |
| 7 | Exports | CSV exports for tasks, orders, capacity | Jan 13 | 2 | ✓ |
| 8 | Timer Removal | Remove stopwatch, add manual input | Jan 13 | 2 | ✓ |
| 9 | Responsive | iPhone + iPad portrait support | Jan 13 | 2 | ✓ |
| 10 | Calendar | Fix scrolling + unassigned category | Jan 13 | 2 | ✓ |
| 11 | Cleanup & Polish | Close implementation gaps | Jan 13 | 3 | ✓ |
| 12 | Verify Item Assignment | Client says still broken in demo | Feb 3 | 4 | ✓ |
| 13 | Price Editing Regression | Was working, now broken | Feb 3 | 4 | ✓ |
| 14 | Mandatory Time Field | Required for workload planning | Feb 3 | 4 | ✓ |
| 15 | Label Printing Format | Individual labels, not full page | Feb 3 | 5 | ✓ |
| 16 | Dropdown Scroll Fix | Assignment dropdown cut off at bottom | Feb 3 | 5 | ✓ |
| 17 | Contact Validation | SMS + Email mandatory, landline option | Feb 3 | 5 | ✓ |
| 18 | Popup Modals | Order details in popup, not page nav | Feb 3 | 5 | |
| 19 | Workflow Auto-Advance | Stay on page after adding item | Feb 3 | 5 | |
| 20 | Stripe Cleanup | Clean URL, logo, correct phone | Feb 3 | 5 | |
| 21 | Responsive Verification | Test on real iPad + iPhone devices | Feb 3 | 6 | |

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

**Status:** ✓ Complete
**Plans:** 3/3 complete

Plans:
- [x] 02-01-PLAN.md — Database schema (final_price_cents column, price_change_log table, TypeScript types)
- [x] 02-02-PLAN.md — Pricing logic update and API endpoint for item price changes
- [x] 02-03-PLAN.md — UI for item-level price editing in order detail modal

---

## Phase 3: Merge Garment/Service Steps

**Goal:** Reduce page navigation during order intake by combining garment and service selection.

**Status:** ✓ Complete
**Plans:** 2/2 complete

Plans:
- [x] 03-01-PLAN.md — Create merged GarmentServicesStep component
- [x] 03-02-PLAN.md — Wire into intake page, Add to Order functionality

---

## Phase 4: Reduce Vertical Space

**Goal:** Reduce page height by 40% to eliminate "endless scrolling" complaint.

**Status:** ✓ Complete
**Plans:** 2/2 complete

---

## Phase 5: List View + Product Names

**Goal:** Add list view option and replace generic item codes with actual product names.

**Status:** ✓ Complete
**Plans:** 1/1 complete

---

## Phase 6: Manage Task Button + Client Fields

**Goal:** Add per-item task management button with Save & Close behavior, plus phone field.

**Status:** ✓ Complete
**Plans:** 2/2 complete

---

## Phase 7: Export Features

**Goal:** Add CSV export capabilities and team member management.

**Status:** ✓ Complete
**Plans:** 3/3 complete

---

## Phase 8: Timer Removal

**Goal:** Remove stopwatch completely, replace with manual time input.

**Status:** ✓ Complete
**Plans:** 2/2 complete

---

## Phase 9: Responsive Design

**Goal:** Full iPhone support and iPad portrait optimization.

**Status:** ✓ Complete
**Implementation:** MobileBottomNav component with md:hidden, 44px touch targets, safe-area-bottom

---

## Phase 10: Calendar Fixes

**Goal:** Fix calendar scrolling and add unassigned items category.

**Status:** ✓ Complete
**Implementation:** unassignedTasks section in calendar/page.tsx

---

## Phase 11: Cleanup & Polish

**Goal:** Close remaining implementation gaps identified during Technical Specifications review.

**Status:** ✓ Complete
**Plans:** 1/1 complete

---

## Phase 12: Verify & Fix Item-Level Assignment

**Goal:** Client reports item-level assignment is "still broken" in Feb 3 demo. Investigate and fix.

**Source:** Feb 3 UAT — BLOCKER 1
**Client Quote:** "Still assigning entire orders to one person in demo"

**Success Criteria:**
1. Creating order with 3 items assigns each to a different seamstress
2. Board view filters correctly by per-item assignment
3. Workload page shows correct per-item workload
4. Demo-able to client without issues

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Phase 14 (time field depends on item data model working)

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 12-01-PLAN.md — Investigate and fix item-level assignment in production

---

## Phase 13: Fix Price Editing Regression

**Goal:** Re-enable price editing in services table (regression - was working, now broken). Add three-dot context menu.

**Source:** Feb 3 UAT — BLOCKER 5 (REGRESSION)
**Client Quote:** "Avant on etait rendu que quand que c'etait un tableau, on pouvait modifier le prix"

**Success Criteria:**
1. Can edit service price in table view
2. Three-dot menu with Modify/Export/Delete options
3. Changes persist to database
4. No regressions to intake form

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 13-01-PLAN.md — Fix price editing regression and add context menu

---

## Phase 14: Mandatory Time Field

**Goal:** Make time estimate mandatory for every item/service when creating an order.

**Source:** Feb 3 UAT — BLOCKER 6
**Client Quote:** "Est-ce qu'il serait oblige de mettre du temps pour planifier les journees"

**Success Criteria:**
1. Cannot add item without time estimate
2. API rejects items with missing/zero time
3. Visual required indicator on field
4. Existing orders with no time still viewable

**Dependencies:** Phase 12 (item model must work)
**Blocked by:** Phase 12
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 14-01-PLAN.md — Add time estimate validation to intake and API

---

## Phase 15: Label Printing Format

**Goal:** Generate individual labels for label printer instead of multi-label page layout.

**Source:** Feb 3 UAT — BLOCKER 4
**Client Quote:** "Moi j'ai une machine a 4... Il faut que ca soit comme un etiquette par la machine"

**Success Criteria:**
1. Individual label per garment (not full page)
2. Label dimensions match printer hardware
3. Print button on each item card
4. Batch print sends labels sequentially

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 15-01-PLAN.md — Individual label printing format

---

## Phase 16: Assignment Dropdown Scroll Fix

**Goal:** Fix assignment dropdown that gets cut off at bottom of viewport.

**Source:** Feb 3 UAT — HIGH 3
**Client Quote:** "Regarde, on pouvait pas aller plus bas"

**Success Criteria:**
1. All team members visible in dropdown
2. Opens upward when near viewport bottom
3. Works on iPad portrait

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 16-01-PLAN.md — Fix dropdown scroll direction

---

## Phase 17: Contact Field Validation

**Goal:** Make SMS and Email both mandatory. Add landline to preferred contact options.

**Source:** Feb 3 UAT — HIGH 4 + HIGH 5
**Client Quote:** "Je mettrais SMS obligatoire email obligatoire puis telephone en dessous optionnel"

**Success Criteria:**
1. Both SMS and Email required for new clients
2. Landline phone option in preferred contact
3. Existing clients without both fields still viewable

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** ✓ Complete
**Plans:** 1/1 complete

Plans:
- [x] 17-01-PLAN.md — Make mobile/SMS + email mandatory, add landline to preferred contact

---

## Phase 18: Popup Modals

**Goal:** Show order details in popup modal instead of page navigation (workload + kanban views).

**Source:** Feb 3 UAT — HIGH 6
**Client Quote:** "Faudrait que ca sorte un popup... on veut pas etre oblige de revenir comme la"

**Success Criteria:**
1. Clicking order in workload opens popup (no navigation)
2. Clicking order in kanban opens popup (no navigation)
3. Modal has close button, backdrop click, ESC
4. "Open Full Page" option inside modal

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 18-01-PLAN.md — Popup modals for order details in workload and kanban

---

## Phase 19: Workflow Auto-Advance Fix

**Goal:** Fix behavior after adding item: stay on page, don't auto-advance.

**Source:** Feb 3 UAT — MEDIUM 1
**Client Quote:** "Ah ben non, parce que si j'ai plusieurs vertices"

**Success Criteria:**
1. Adding item does NOT advance to next step
2. Form resets for next item
3. Added items visible in summary list
4. "Next" only enabled with 1+ items

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1 plan

Plans:
- [ ] 19-01-PLAN.md — Add toast success feedback after adding item to order

---

## Phase 20: Stripe Payment Link Cleanup

**Goal:** Clean up Stripe payment page: logo, phone number, URL display.

**Source:** Feb 3 UAT — MEDIUM 2
**Client Quote:** "Tu as plein de textes bizarres la"

**Success Criteria:**
1. Payment page shows Audrey's logo
2. Shop phone number (not personal cell)
3. No ugly search parameters in displayed URL
4. Payment flow works end-to-end

**Dependencies:** None
**Blocked by:** Nothing
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 20-01-PLAN.md — Stripe payment link visual cleanup

---

## Phase 21: Verify Responsive on Real Devices

**Goal:** Proactively audit and fix responsive issues before client tests on real iPad/iPhone.

**Source:** Feb 3 UAT — CRITICAL VALIDATION
**Client Quote:** "Faudrait que je l'essaye sur l'iPad du bureau"

**Success Criteria:**
1. All pages render without horizontal scroll on iPhone
2. All pages render without horizontal scroll on iPad portrait
3. Full order workflow completable on both devices
4. All touch targets minimum 44px

**Dependencies:** Phases 12-20 (test after all fixes applied)
**Blocked by:** Phases 12-20
**Blocks:** Nothing

**Status:** Pending
**Plans:** 1/1

Plans:
- [ ] 21-01-PLAN.md — Comprehensive responsive audit and fixes

---

## Suggested Schedule

```
Week 1 (Feb 4-7):
  Wave 4 (Critical): Phase 12, 13, 14 (sequential)

Week 2 (Feb 10-14):
  Wave 5 (Parallel): Phases 15-20

Week 3 (Feb 17-21):
  Wave 6: Phase 21 (responsive verification)
  Buffer for fixes from Audrey's iPad testing
```

---
*Roadmap updated: 2026-02-04 — Added 10 phases from Feb 3 UAT feedback*
