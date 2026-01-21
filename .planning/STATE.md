# Project State

**Project:** Hotte Couture Final Modifications
**Last Updated:** 2026-01-21

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-01-20)

**Core value:** Seamstresses can take orders on iPad/iPhone, assign items to team members, adjust prices, and print task lists.
**Current focus:** Phase 7 - Exports (2/3 complete)

## Current Status

- **Milestone:** Final Modifications (17 MODs -> 39 requirements)
- **Phase:** 7 of 10 (Exports) - In Progress
- **Plan:** 2 of 3 complete (07-01, 07-03 done, 07-02 pending)
- **Deadline:** Thursday, January 23, 2026

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 - Item-Level Assignment | COMPLETE | 4/4 |
| 2 - Item-Level Pricing | COMPLETE | 3/3 |
| 3 - Merge Steps | COMPLETE | 2/2 |
| 4 - Reduce Space | COMPLETE | 1/1 |
| 5 - List View | COMPLETE | 1/1 |
| 6 - Manage Task | COMPLETE | 2/2 |
| 7 - Exports | * In Progress | 2/3 |
| 8 - Timer Removal | COMPLETE | 2/2 |
| 9 - Responsive | o Pending | 0/? |
| 10 - Calendar | o Pending | 0/? |

## Execution Waves

```
WAVE 1 (Sequential - Must complete first) DONE
+-- Phase 1: Item-Level Assignment COMPLETE (4/4)
+-- Phase 2: Item-Level Pricing COMPLETE (3/3)

WAVE 2 (Parallel - Run in separate terminals)
|-- Phase 3: Merge Steps COMPLETE (2/2)
|-- Phase 4: Reduce Space COMPLETE (1/1)
|-- Phase 5: List View COMPLETE (1/1)
|-- Phase 6: Manage Task COMPLETE (2/2)
|-- Phase 7: Exports * (2/3)
|-- Phase 8: Timer Removal COMPLETE (2/2)
|-- Phase 9: Responsive o
+-- Phase 10: Calendar o
```

## Accumulated Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| UUID FK for assignments | 01-01 | Use assigned_seamstress_id (UUID) instead of VARCHAR name for referential integrity |
| Keep order.assigned_to | 01-01 | Backward compatibility - don't remove old column |
| Case-insensitive migration | 01-01 | TRIM() + LOWER() for matching name strings to staff |
| Active staff validation | 01-02 | API rejects assignment to inactive staff (400 error) |
| useStaff hook reused | 01-02 | Existing hook meets requirements - no new implementation |
| Allow unassigned items | 01-04 | Users can proceed without assigning all items - assignments can be made later |
| First assignee for calendar | 01-04 | Calendar event uses first assigned seamstress rather than creating multiple events |
| Deprecate order.assigned_to | 01-04 | Mark as deprecated, use garment_service.assigned_seamstress_id instead |
| Read-only garment types in merged step | 03-01 | Keep CRUD out of merged component to reduce complexity |
| Inline assignment pattern | 03-01 | Assignment dropdown appears immediately when service added |
| Two-phase garment creation | 03-01 | User configures garment fully before clicking "Add to Order" |
| Keep old component files | 03-02 | Retained garments-step.tsx and services-step-new.tsx for rollback safety |
| Preserve non-timer staff components | 08-01 | Keep staff-indicator, staff-pin-modal, staff-pin-input, staff-session-provider |
| Preserve other cron jobs | 08-01 | Keep auto-archive and reminders crons when removing stale-timers |
| Feature removal pattern | 08-01 | Delete files first, fix imports in subsequent plan |
| Read-only time in garment-task-summary | 08-02 | Timer button removed, editable time input remains in order-detail-modal |
| Remove timer running checks | 08-02 | Tasks always editable/deletable without timer state consideration |
| Native title tooltips | 05-01 | Used HTML title attribute for long name truncation tooltips |
| 4-column table layout | 05-01 | Service | Prix | Temps | Action for list view |
| SSR-safe hook pattern | 05-01 | Load from localStorage in useEffect to avoid hydration mismatch |
| Work pre-completed in Phase 6 | 07-03 | Team management API, page, and Marie migration done in Phase 6 commit |
| Upsert pattern for Marie | 07-03 | Migration uses ON CONFLICT DO UPDATE for idempotency |
| Case-insensitive duplicate check | 07-03 | Team API uses ilike for name comparison |

## Next Action

Continue with 07-02 (Export UI integration) to complete Phase 7.

## Session Continuity

- **Last session:** 2026-01-21T04:15:26Z
- **Stopped at:** Completed 07-03-PLAN.md (Team management) - verified pre-existing work
- **Resume:** Execute 07-02 to complete Phase 7 exports

## Session Notes

- 2026-01-19: Completed 01-01 (database schema for item-level assignment)
  - Created migrations 0031 and 0032
  - Added assigned_seamstress_id UUID column with FK
  - Updated RPC with assignment data and filter

- 2026-01-19: Completed 01-02 (TypeScript types and API route)
  - Added assigned_seamstress_id to garment_service types
  - Added staff table types to database.ts
  - Created PATCH /api/garment-service/[id]/assign endpoint
  - useStaff hook already existed (Task 3 skipped)

- 2026-01-19: Completed 01-03 (Board filtering and data hooks)
  - Updated useBoardData to fetch from API route with assignment data
  - Added assignedSeamstressId filter for UUID-based filtering
  - Workload page now groups items by assigned seamstress (not orders)
  - Added quick-assign feature in workload unassigned section

- 2026-01-20: Completed Phase 2 (Item-Level Pricing)
  - 02-01: Database schema (final_price_cents, price_change_log table)
  - 02-02: Pricing logic (3-tier hierarchy) + API endpoint (PATCH /api/garment-service/[id]/price)
  - 02-03: UI for item-level price editing in order-detail-modal

- 2026-01-19: Completed 01-04 (Intake flow and order cards)
  - Refactored AssignmentStep for per-item assignment
  - Added "Assign All" quick action
  - Intake API saves assigned_seamstress_id per garment_service
  - Order cards display item-level assignees with counts

- 2026-01-20: Phase 1 verified complete (5/5 success criteria verified)
  - VERIFICATION.md created with automated checks
  - ARCH-01 through ARCH-04 marked Complete

- 2026-01-20: Phase 2 production verified
  - Fixed bug: order details API was returning fake IDs (`gs-0`) instead of real `garment_service.id`
  - User tested on hottecouture-v2.vercel.app - price editing now works
  - Wave 1 complete, ready for Wave 2

- 2026-01-20: Completed 03-01 (GarmentServicesStep component)
  - Created merged component (876 lines) combining garment/service/assignment
  - Garment type dropdown with category groupings
  - Service selection with category tabs and search
  - Inline staff assignment dropdown per service
  - Photo capture and notes fields
  - "Add to Order" pattern for committing configured garments

- 2026-01-20: Completed 03-02 (Intake wizard integration)
  - Integrated GarmentServicesStep into intake/page.tsx
  - Reduced intake flow from 6 to 5 steps
  - Human verified: all functionality works (garment dropdown, service tabs, quantity, assignment, add to order, proceed to pricing)
  - Phase 3 COMPLETE

- 2026-01-20: Completed 07-01 (CSV export infrastructure)
  - Created csv-utils library: escapeCsvCell, generateCsv, triggerDownload, formatDuration, formatCents, sanitizeFilename
  - Created /api/admin/export/seamstress (EXP-01, EXP-02) - 8 column CSV
  - Created /api/admin/export/orders (EXP-03) - all orders CSV
  - Created /api/admin/export/capacity (EXP-04) - weekly staff workload CSV
  - All APIs return { success, csvContent, filename } format

- 2026-01-20: Completed 08-01 (Timer file deletion)
  - Deleted timer components: timer-button.tsx, active-task-indicator.tsx, one-task-warning-modal.tsx
  - Deleted 6 timer API routes: start, stop, pause, resume, status, update
  - Deleted stale-timers cron job (preserved auto-archive and reminders)
  - Deleted timer utilities: timer-utils.ts, useActiveTask.ts
  - Deleted timer tests: timer-utils.test.ts
  - Total: 13 files deleted, 2050 lines removed

- 2026-01-20: Completed 08-02 (Timer import cleanup) - PHASE 8 COMPLETE
  - Removed ActiveTaskIndicator from layout.tsx and staff/index.ts exports
  - Removed TimerButton from garment-task-summary.tsx, task-management-modal.tsx, order-card.tsx
  - Simplified garment-task-summary to read-only time display (Planifie vs Reel)
  - Updated error messages in stage route to reference order details instead of timer
  - Removed timer-running checks from tasks API route
  - Verified editable Work Hours input in order-detail-modal (TMR-03 satisfied)
  - TMR-01: No stopwatch visible, TMR-02: No Start/Stop buttons, TMR-03: Manual time entry works

- 2026-01-21: Completed 05-01 (List view toggle) - PHASE 5 COMPLETE
  - Created useViewPreference hook for localStorage persistence
  - Added Grid/List toggle UI to service selection section
  - Implemented 4-column compact table: Service | Prix | Temps | Action
  - Long service names truncate with native tooltip on hover
  - Human verified: persistence works, all columns present

- 2026-01-21: Completed 07-03 (Team management) - 2/3 Phase 7
  - Verified team API exists (GET/POST/PATCH) from Phase 6 commit d7276c9
  - Verified team page at /admin/team from Phase 6 commit
  - Verified Marie migration (0036_add_marie_seamstress.sql) from Phase 6 commit
  - All work pre-completed in Phase 6, this plan was verification only
  - EXP-05 (team management form) and EXP-06 (add Marie) satisfied

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix build errors | 2026-01-21 | d4b6eaa | [001-fix-build-errors](./quick/001-fix-build-errors/) |

---
*State updated: 2026-01-21T04:15:26Z*
