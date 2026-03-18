---
phase: 08-notification-workflow-overhaul
plan: 01
subsystem: api
tags: [ghl, sms, messaging, notifications, typescript]

# Dependency graph
requires: []
provides:
  - "MessagingAction union type includes 'ORDER_CREATED'"
  - "sendWelcomeSms(contactId, client, orderNumber) exported from messaging.ts"
  - "sendVoiceBroadcast(contactId) exported from messaging.ts with env var guard"
  - "ORDER_CREATED bilingual SMS template (fr/en) in MESSAGE_TEMPLATES"
affects:
  - 08-notification-workflow-overhaul (Plan 02 wires these functions into intake route and status transitions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct contactId pattern: sendWelcomeSms accepts contactId directly, skipping findOrCreateContact for performance"
    - "Env var guard pattern: sendVoiceBroadcast is a no-op returning success when GHL_VOICE_CAMPAIGN_ID is absent"
    - "Portal tracking URL: NEXT_PUBLIC_APP_URL/portal?order= pattern for order-specific tracking links"

key-files:
  created: []
  modified:
    - src/lib/ghl/types.ts
    - src/lib/ghl/messaging.ts

key-decisions:
  - "sendWelcomeSms accepts contactId directly (not AppClient) — avoids redundant findOrCreateContact lookup since intake route already has the GHL contact ID from prior sync"
  - "sendVoiceBroadcast gracefully skips when GHL_VOICE_CAMPAIGN_ID is absent — Audrey has not yet recorded the voice script, so campaign may not exist"
  - "ORDER_CREATED template uses /portal?order= path (not /track/) — welcome SMS links to customer portal, not just tracking timeline"

patterns-established:
  - "Direct contactId convenience functions: pass GHL contactId directly when already known, avoid redundant contact lookup"
  - "Env var guard for optional integrations: check env var at call time, return { success: true, data: { called: false } } when absent"

requirements-completed: [MKT-118]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 08 Plan 01: GHL Messaging Foundation Summary

**ORDER_CREATED template + sendWelcomeSms and sendVoiceBroadcast GHL functions added as typed contracts for Plan 02 wiring**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T14:47:32Z
- **Completed:** 2026-03-18T14:53:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `'ORDER_CREATED'` to `MessagingAction` union type, enabling type-safe use in sendNotification and buildMessage
- Added bilingual ORDER_CREATED SMS template (fr/en) to MESSAGE_TEMPLATES using the portal tracking URL pattern
- Implemented `sendWelcomeSms(contactId, client, orderNumber)` — sends SMS via ORDER_CREATED template, constructs portal URL as `${NEXT_PUBLIC_APP_URL}/portal?order=${orderNumber}`
- Implemented `sendVoiceBroadcast(contactId)` — returns `{ called: false }` no-op when `GHL_VOICE_CAMPAIGN_ID` not set, calls GHL campaign trigger endpoint when set

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ORDER_CREATED to MessagingAction union in types.ts** - `a789388` (feat)
2. **Task 2: Add ORDER_CREATED template + sendWelcomeSms + sendVoiceBroadcast to messaging.ts** - `82a6afc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/ghl/types.ts` - Added `'ORDER_CREATED'` as first entry in MessagingAction union
- `src/lib/ghl/messaging.ts` - Added ORDER_CREATED template, sendWelcomeSms export, sendVoiceBroadcast export

## Decisions Made
- `sendWelcomeSms` accepts `contactId: string` directly rather than `AppClient` — intake route already has the GHL contact ID after the findOrCreateContact sync, so passing it directly avoids a redundant lookup
- `sendVoiceBroadcast` uses graceful no-op pattern — the GHL voice campaign does not yet exist (Audrey's recorded script pending), so the function returns `{ success: true, data: { called: false } }` rather than failing
- ORDER_CREATED tracking URL uses `/portal?order=` (not `/track/`) — welcome SMS links to the interactive customer portal, consistent with the existing portal page pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for this plan. `GHL_VOICE_CAMPAIGN_ID` env var is optional and its absence is handled gracefully.

## Next Phase Readiness
- Plan 02 can now import `sendWelcomeSms` and `sendVoiceBroadcast` from `src/lib/ghl/messaging.ts`
- Both functions are TypeScript-clean and have been verified against the existing MessagingAction union
- No blockers — contracts are in place for the wiring tasks

---
*Phase: 08-notification-workflow-overhaul*
*Completed: 2026-03-18*
