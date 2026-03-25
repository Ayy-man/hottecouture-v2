---
phase: quick-260326-0ku
plan: "01"
subsystem: board
tags: [rack, ux, grid-picker, api]
dependency_graph:
  requires: []
  provides: [rack-grid-picker, rack-occupancy-api]
  affects: [order-detail-modal]
tech_stack:
  added: []
  patterns: [client-side fetch on mount, CSS grid layout, next-intl translations]
key_files:
  created:
    - src/app/api/rack-occupancy/route.ts
    - src/components/board/rack-grid-picker.tsx
  modified:
    - src/components/board/order-detail-modal.tsx
    - locales/fr.json
    - locales/en.json
decisions:
  - Reused existing createClient pattern from /api/order/[id] instead of createServiceRoleClient for consistency
  - Used window.confirm() for reassignment confirmation per codebase convention (seen in order-detail-modal)
  - Build failure in worktree is pre-existing styled-jsx/dist/index infrastructure issue, not caused by our changes
metrics:
  duration: "~15 minutes"
  completed: "2026-03-25"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
---

# Quick Task 260326-0ku: BUG-11 Replace Rack Position Dropdown with Visual Grid Picker

**One-liner:** Visual 3x10 grid picker (rows A/B/C x cols 1-10) replaces dropdown in order-detail-modal, with real-time occupancy from dedicated API endpoint.

## What Was Built

Replaced the rack position `<select>` dropdown in the order detail modal with an interactive visual grid that shows all 30 positions at once, color-coded by availability.

### New Files

**`src/app/api/rack-occupancy/route.ts`**
- GET endpoint returning `{ occupancy: { "A1": { orderId, orderNumber }, ... } }`
- Queries all non-archived orders in `ready`/`delivered` status with a rack_position set
- Returns map keyed by position string for O(1) lookups in the component

**`src/components/board/rack-grid-picker.tsx`**
- Derives rows (A/B/C) and columns (1-10) dynamically from `RACK_CONFIG.positions`
- CSS grid layout: `auto repeat(10, 40px)` with 4px gap
- Three visual cell states:
  - Available: `bg-gray-50 border border-gray-200` — shows position label (e.g., "A3")
  - Occupied (other order): `bg-gray-200 text-gray-500` — shows order number (e.g., "#42")
  - Selected (current order): `bg-blue-600 text-white` — shows position label
- Tap behaviors: empty→assign, current→unassign, occupied→window.confirm then reassign (clears other order first)
- "Autre position..." link expands to inline input for custom entries
- Saving indicator while PATCH requests are in flight
- Fetches occupancy on mount and after every save

### Modified Files

**`src/components/board/order-detail-modal.tsx`**
- Added `RackGridPicker` import
- Removed 3 unused state variables: `rackPosition`, `customRackPosition`, `savingRack`
- Removed `useEffect` that synced `detailedOrder.rack_position` to dropdown state
- Removed reset calls for those state vars from the `!isOpen` useEffect
- Replaced ~80 lines of dropdown JSX with 15-line `<RackGridPicker ... />` block
- Non-editable display (other statuses) unchanged — still shows plain text value

**`locales/fr.json` + `locales/en.json`**
- Added `rackReassignConfirm`, `rackCustomEntry`, `rackUnassigned` under `board.modal`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create rack-occupancy API and RackGridPicker component | 8a0479c | rack-occupancy/route.ts, rack-grid-picker.tsx, locales |
| 2 | Replace dropdown with RackGridPicker in order-detail-modal | b7c0148 | order-detail-modal.tsx |

## Deviations from Plan

None — plan executed exactly as written.

Note: `npx next build` failed in the worktree due to a pre-existing `styled-jsx/dist/index` module-not-found error unrelated to our changes. TypeScript check (`npx tsc --noEmit`) passed with zero errors in the files we created/modified.

## Known Stubs

None — occupancy data is fetched from real orders, positions save to real orders via PATCH API.

## Self-Check: PASSED

- [x] `src/app/api/rack-occupancy/route.ts` — FOUND
- [x] `src/components/board/rack-grid-picker.tsx` — FOUND
- [x] Commit 8a0479c — FOUND
- [x] Commit b7c0148 — FOUND
