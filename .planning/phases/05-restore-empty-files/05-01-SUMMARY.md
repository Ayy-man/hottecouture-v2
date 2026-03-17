---
phase: 05-restore-empty-files
plan: 01
subsystem: api
tags: [nextjs, supabase, rpc, rbac, orders]

# Dependency graph
requires:
  - phase: phase-27-rbac
    provides: "get_orders_with_details RPC with seamstress filtering (p_assigned_seamstress_id param)"
provides:
  - "GET /api/orders endpoint returning order data with Phase 27 RBAC filtering restored"
  - "Zero empty source files in src/"
affects:
  - 06-order-form-restructure
  - 07-fabric-items
  - 09-kanban-bugs
  - board
  - calendar
  - workload
  - archived
  - clients

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "git checkout <commit> -- <file> pattern for targeted file restoration from history"

key-files:
  created: []
  modified:
    - src/app/api/orders/route.ts

key-decisions:
  - "Restored from commit 0f76a39 (not bbd4871 remote branch): 0f76a39 includes Phase 27 seamstress RBAC filtering via get_orders_with_details RPC; bbd4871 uses simple .from('order').select('*') without filtering"

patterns-established:
  - "Targeted git restoration: use git checkout <hash> -- <path> to restore a single file from a specific commit without disturbing other changes"

requirements-completed: [INFRA-1]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 5 Plan 01: Restore Empty Files Summary

**Restored `src/app/api/orders/route.ts` (emptied in 563d2cd) from commit 0f76a39 — 120-line GET /api/orders endpoint with Supabase RPC `get_orders_with_details` and Phase 27 seamstress RBAC filtering via `seamstressId` query param**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-18T00:00:00Z
- **Completed:** 2026-03-18T00:08:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Restored `src/app/api/orders/route.ts` from 0 bytes to 120 lines using `git checkout 0f76a39 -- src/app/api/orders/route.ts`
- Phase 27 seamstress RBAC filtering fully intact: `supabase.rpc('get_orders_with_details', { p_assigned_seamstress_id: seamstressId || null })`
- Confirmed zero empty source files remain in `src/` directory
- TypeScript compilation passes cleanly (no errors)

## Task Commits

Each task was committed atomically:

1. **Task 1 & 2: Restore and verify route.ts** - `a317fd8` (restore)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/app/api/orders/route.ts` - Restored GET /api/orders endpoint with RPC-based order fetching, pagination, client filtering, and seamstress RBAC filtering

## Decisions Made
- Used commit `0f76a39` (not remote `bbd4871`) because 0f76a39 preserves the Phase 27 RPC call with `p_assigned_seamstress_id` filtering; the remote branch version would have broken seamstress view filtering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `git checkout 0f76a39 -- src/app/api/orders/route.ts` restored the file cleanly. TypeScript compilation produced no errors. No other empty files were found.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 13 consumers of `/api/orders` (board, calendar, today view, workload, print/tasks, client detail, archive, status, orders history, order-detail-modal, archive-button, measurements sub-route) can now fetch order data
- Phase 5 blocker (INFRA-1) resolved — downstream phases 6-11 are unblocked
- No further restoration work needed in `src/`

---
*Phase: 05-restore-empty-files*
*Completed: 2026-03-18*
