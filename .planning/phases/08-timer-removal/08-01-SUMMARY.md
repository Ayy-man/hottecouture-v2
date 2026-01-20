---
phase: 08-timer-removal
plan: 01
subsystem: cleanup
tags: [timer, stopwatch, feature-removal, cron]

# Dependency graph
requires: []
provides:
  - Timer component files deleted (timer-button.tsx)
  - Timer API routes deleted (6 routes)
  - Timer utilities and hooks deleted
  - Timer test files deleted
  - Stale-timers cron job deleted
affects: [08-02-PLAN (import cleanup)]

# Tech tracking
tech-stack:
  added: []
  patterns: [feature-removal-pattern]

key-files:
  created: []
  modified: []
  deleted:
    - src/components/timer/timer-button.tsx
    - src/components/staff/active-task-indicator.tsx
    - src/components/staff/one-task-warning-modal.tsx
    - src/app/api/timer/start/route.ts
    - src/app/api/timer/stop/route.ts
    - src/app/api/timer/pause/route.ts
    - src/app/api/timer/resume/route.ts
    - src/app/api/timer/status/route.ts
    - src/app/api/timer/update/route.ts
    - src/app/api/cron/stale-timers/route.ts
    - src/lib/timer/timer-utils.ts
    - src/lib/hooks/useActiveTask.ts
    - tests/unit/timer-utils.test.ts

key-decisions:
  - "Preserve other staff components (staff-indicator, staff-pin-modal, etc.)"
  - "Preserve other cron jobs (auto-archive, reminders)"
  - "Preserve other hooks (useStaff, useCurrentStaff, etc.)"
  - "Preserve other tests (pricing.test.ts)"

patterns-established:
  - "Feature removal: Delete files first, fix imports in subsequent plan"

# Metrics
duration: 2min
completed: 2026-01-20
---

# Phase 08 Plan 01: Delete Timer Files Summary

**Removed all timer/stopwatch source files: 13 files deleted across components, API routes, utilities, hooks, and tests (2050 lines removed)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-20T19:44:46Z
- **Completed:** 2026-01-20T19:46:26Z
- **Tasks:** 3
- **Files deleted:** 13

## Accomplishments
- Deleted timer component (timer-button.tsx) and timer directory
- Deleted timer-related staff components (active-task-indicator.tsx, one-task-warning-modal.tsx)
- Deleted all 6 timer API routes and timer API directory
- Deleted stale-timers cron job (preserved auto-archive and reminders crons)
- Deleted timer utilities (timer-utils.ts) and timer directory
- Deleted useActiveTask hook (preserved other hooks)
- Deleted timer-utils.test.ts (preserved pricing.test.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete timer components and staff indicator files** - `aacd8f6` (chore)
2. **Task 2: Delete timer API routes and cron job** - `4fa60e5` (chore)
3. **Task 3: Delete timer utilities and tests** - `2b35767` (chore)

## Files Deleted

### Components (Task 1)
- `src/components/timer/timer-button.tsx` - Main stopwatch UI component (540 lines)
- `src/components/staff/active-task-indicator.tsx` - Header timer indicator (225 lines)
- `src/components/staff/one-task-warning-modal.tsx` - Timer conflict modal (102 lines)

### API Routes (Task 2)
- `src/app/api/timer/start/route.ts` - Timer start endpoint
- `src/app/api/timer/stop/route.ts` - Timer stop endpoint
- `src/app/api/timer/pause/route.ts` - Timer pause endpoint
- `src/app/api/timer/resume/route.ts` - Timer resume endpoint
- `src/app/api/timer/status/route.ts` - Timer status endpoint
- `src/app/api/timer/update/route.ts` - Timer update endpoint
- `src/app/api/cron/stale-timers/route.ts` - Stale timers cleanup cron

### Utilities and Tests (Task 3)
- `src/lib/timer/timer-utils.ts` - Timer formatting utilities (76 lines)
- `src/lib/hooks/useActiveTask.ts` - Active task tracking hook (73 lines)
- `tests/unit/timer-utils.test.ts` - Timer utility tests (191 lines)

## Decisions Made
- Preserved other staff components (staff-indicator, staff-pin-modal, staff-pin-input, staff-session-provider, index.ts)
- Preserved other cron jobs (auto-archive, reminders) in src/app/api/cron/
- Preserved other hooks (useStaff, useCurrentStaff, useRealtimeOrders, useViewPreference)
- Preserved other tests (pricing.test.ts)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all deletions completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Timer source files removed
- Build will fail until import references are cleaned up
- Plan 02 will update all import statements referencing deleted files

**Important:** Do NOT run `npm run build` yet - Plan 02 handles import cleanup.

---
*Phase: 08-timer-removal*
*Completed: 2026-01-20*
