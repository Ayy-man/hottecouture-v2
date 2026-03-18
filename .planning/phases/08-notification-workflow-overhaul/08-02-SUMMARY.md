---
phase: 08-notification-workflow-overhaul
plan: 02
subsystem: api
tags: [ghl, sms, notifications, kanban, board]

# Dependency graph
requires:
  - phase: 08-01
    provides: sendWelcomeSms and sendVoiceBroadcast exported from src/lib/ghl/messaging.ts
provides:
  - intake/route.ts calls sendWelcomeSms after GHL contact sync — welcome SMS fires on every order creation
  - stage/route.ts auto-fires ready notifications without manual sendNotification flag
  - stage/route.ts calls sendVoiceBroadcast after SMS at ready transition
  - board/page.tsx has no SMS modal gate — ready transitions proceed immediately
affects:
  - board-ui
  - intake-flow
  - order-lifecycle

# Tech tracking
tech-stack:
  added: []
  patterns:
    - non-blocking SMS calls inside try/catch — failures warn but never break the parent operation
    - use ghlSyncResult.data contactId directly instead of a second findOrCreateContact call

key-files:
  created: []
  modified:
    - src/app/api/intake/route.ts
    - src/app/api/order/[id]/stage/route.ts
    - src/app/(protected)/board/page.tsx

key-decisions:
  - "Welcome SMS placed inside the existing if(ghlSyncResult.success) block to guarantee ghlSyncResult.data is in scope and is the contactId"
  - "shouldSendNotification variable declaration retained in stage/route.ts (line 207) — only removed from the ready condition, avoids DTO schema change"
  - "Task 2 changes (stage route + board page) were already committed in b168ad5 as part of Phase 07-01 docs commit — verified correct via git show"

patterns-established:
  - "Non-blocking GHL calls pattern: every sendWelcomeSms / sendVoiceBroadcast call is wrapped in try/catch with console.warn, never throws to parent"
  - "Server-side auto-fire: notifications triggered in stage handler, not client-side modal confirmation"

requirements-completed:
  - MKT-118

# Metrics
duration: 20min
completed: 2026-03-18
---

# Phase 08 Plan 02: Notification Workflow Wiring Summary

**Removed SMS confirmation modal gate and wired sendWelcomeSms at order creation and sendVoiceBroadcast at ready transition — all notifications now auto-fire server-side**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-18T15:10:00Z
- **Completed:** 2026-03-18T15:30:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `intake/route.ts` now calls `sendWelcomeSms` after a successful GHL contact sync — welcome SMS fires automatically on every new order, using the contactId from sync (no extra lookup)
- `stage/route.ts` auto-fires ready notifications on every ready transition — `shouldSendNotification` removed from the `if` condition, voice broadcast added after SMS
- `board/page.tsx` `handleOrderUpdate` now calls `executeOrderUpdate` directly for all statuses — no modal, no gate, no `pendingSmsConfirmation` state

## Task Commits

1. **Task 1: Add welcome SMS call to intake route** - `3ad6cc8` (feat)
2. **Task 2: Remove SMS modal gate + wire stage handler** - `b168ad5` (feat, included in Phase 07-01 docs commit)

## Files Created/Modified

- `src/app/api/intake/route.ts` — Added `sendWelcomeSms` import; added non-blocking call inside `ghlSyncResult.success` block
- `src/app/api/order/[id]/stage/route.ts` — Added `sendVoiceBroadcast` import; removed `shouldSendNotification` from ready condition; added voice broadcast block after SMS
- `src/app/(protected)/board/page.tsx` — Removed `SmsConfirmationModal` import and JSX; removed `PendingSmsConfirmation` interface, `pendingSmsConfirmation` state, and `handleSmsConfirm`; simplified `handleOrderUpdate` to direct call

## Decisions Made

- Welcome SMS placed inside `if (ghlSyncResult.success && ghlSyncResult.data)` block so `ghlSyncResult.data` (the contactId) is guaranteed in scope — no second `findOrCreateContact` call needed
- `shouldSendNotification` variable declaration left in stage/route.ts (line 207) to avoid a DTO schema change — only removed from the `if (newStage === 'ready' && ...)` condition
- Task 2 changes were found already committed in `b168ad5` (Phase 07-01 docs commit captured them while staged) — verified via `git show b168ad5` that all required changes were present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Task 2 git commit attempt failed because the stage route and board page changes were already committed in `b168ad5` (they were staged when Phase 07-01 docs were committed in a prior session). Verified via `git show b168ad5 --stat` and diff inspection that all required changes were already present and correct. TypeScript compiled clean (0 bytes output = 0 errors).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MKT-118 requirement is complete — automatic notifications are fully wired
- Welcome SMS fires on every order creation (intake)
- Ready SMS + optional voice broadcast auto-fire when kanban card moves to ready
- No staff action required for notifications
- `GHL_VOICE_CAMPAIGN_ID` env var can be set when Audrey records the voice script

---
*Phase: 08-notification-workflow-overhaul*
*Completed: 2026-03-18*
