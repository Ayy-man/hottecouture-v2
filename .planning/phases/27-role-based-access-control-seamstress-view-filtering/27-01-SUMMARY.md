---
phase: 27-role-based-access-control-seamstress-view-filtering
plan: 01
subsystem: api, ui, auth
tags: [rbac, seamstress, board, filtering, mobile-nav, staff-session]

# Dependency graph
requires:
  - phase: 26-staff-infrastructure
    provides: StaffSessionProvider, useStaffSession hook, staffRole field on StaffSession
  - phase: 26-staff-infrastructure
    provides: p_assigned_seamstress_id param in get_orders_with_details RPC (migration 0040)

provides:
  - API-level seamstress filtering via p_assigned_seamstress_id RPC param
  - Board page role-conditional UI (hides Nouvelle Commande, 3-dot menu, AssigneeFilter, WorklistExport for seamstresses)
  - Mobile bottom nav restricted to Board + Calendar for seamstresses
  - Double-fetch prevention via isStaffLoading gate before fetchOrders

affects:
  - 27-02 (order detail RBAC)
  - 27-03 (calendar/workload RBAC)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "!isSeamstress conditional JSX pattern for hiding admin-only UI elements"
    - "isStaffLoading gate pattern to prevent double-fetch during localStorage hydration"
    - "SEAMSTRESS_NAV allowlist pattern for role-filtered navigation"

key-files:
  created: []
  modified:
    - src/app/api/orders/route.ts
    - src/app/board/page.tsx
    - src/components/navigation/mobile-bottom-nav.tsx

key-decisions:
  - "Gate fetchOrders on !isStaffLoading to prevent double-fetch: during hydration isSeamstress is false (null session), which would cause unfiltered fetch then filtered fetch once session resolves"
  - "Use orders array length for count when seamstressId provided: avoids a separate join-based count query that would duplicate the RPC join logic"
  - "SEAMSTRESS_NAV allowlist for mobile nav: explicit list of allowed paths is safer than a denylist"
  - "!isSeamstress conditional JSX (not CSS display:none): clean DOM, no hidden sensitive UI"

patterns-established:
  - "isSeamstress derivation: currentStaff?.staffRole === 'seamstress' — use this pattern in all subsequent RBAC tasks"
  - "isStaffLoading gate: add to fetchOrders dependency array and return early — prevents double-fetch during hydration"
  - "Role-conditional JSX: {!isSeamstress && (...)} wrapping admin-only elements"

requirements-completed: [RBAC-01, RBAC-02, RBAC-06]

# Metrics
duration: 7min
completed: 2026-02-22
---

# Phase 27 Plan 01: RBAC Seamstress Filtering Summary

**API-level board filtering for seamstresses via p_assigned_seamstress_id RPC param, with role-conditional board UI and mobile nav restricted to Board + Calendar**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T13:49:17Z
- **Completed:** 2026-02-22T13:56:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Seamstress board fetch appends `?seamstressId=<uuid>` and the API forwards it to `p_assigned_seamstress_id` in the `get_orders_with_details` RPC, giving DB-level order filtering
- Board page gates `fetchOrders` on `!isStaffLoading` to prevent a double-fetch during localStorage hydration (first unfiltered, then filtered)
- Board page hides Nouvelle Commande button, 3-dot dropdown menu, AssigneeFilter, and WorklistExport button for seamstresses using `{!isSeamstress && (...)}` conditional JSX
- Mobile bottom nav shows only Board + Calendar for seamstresses, all 5 items for managers/admins

## Task Commits

Each task was committed atomically:

1. **Task 1: Add seamstressId param to Orders API and wire board page fetch** - `0f76a39` (feat)
2. **Task 2: Filter mobile bottom nav by staff role** - `1625b2b` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/app/api/orders/route.ts` - Reads `seamstressId` query param, passes as `p_assigned_seamstress_id` to RPC, uses orders array length for count when filtering by seamstress
- `src/app/board/page.tsx` - Imports `useStaffSession`, derives `isSeamstress`, gates `fetchOrders` on `!isStaffLoading`, appends `seamstressId` to fetch URL for seamstresses, wraps admin-only UI in `{!isSeamstress && (...)}`
- `src/components/navigation/mobile-bottom-nav.tsx` - Imports `useStaffSession`, derives `isSeamstress`, filters navItems to SEAMSTRESS_NAV allowlist `['/board', '/calendar']`

## Decisions Made

- **Gate on isStaffLoading:** During localStorage hydration the staff session is null and `isSeamstress` would be `false`, causing an unfiltered fetch immediately followed by a filtered fetch once the session resolves. Adding `isStaffLoading` to the dependency array and returning early prevents this double-fetch.
- **Count from orders array when filtering:** When `seamstressId` is provided, use `orders?.length` instead of running a separate `order` table count query. The separate count would need the same garment_service join that the RPC already performs, so reusing the result is simpler and correct.
- **SEAMSTRESS_NAV allowlist:** An explicit list of allowed paths (`/board`, `/calendar`) is safer than a denylist and clearly communicates intent.
- **Conditional JSX not CSS:** Using `{!isSeamstress && (...)}` removes elements from the DOM entirely rather than hiding them with CSS, which is both cleaner and safer.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Board-level RBAC for seamstresses is complete
- Ready for Plan 27-02: order detail RBAC (hide pricing, payments, client contact from seamstresses)
- Ready for Plan 27-03: calendar and workload RBAC (filter to assigned tasks only)
- Pattern established: `isSeamstress` derivation and `!isSeamstress` conditional JSX

---
*Phase: 27-role-based-access-control-seamstress-view-filtering*
*Completed: 2026-02-22*
