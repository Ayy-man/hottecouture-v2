---
phase: 06-order-form-restructure-4-sections
plan: "03"
subsystem: intake-api
tags: [accessories, alteration, validation, calendar, assignment]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [accessory-order-submission, calendar-gate, assignment-filter]
  affects: [src/app/api/intake/route.ts, src/components/intake/assignment-step.tsx, src/app/(protected)/intake/page.tsx]
tech_stack:
  added: []
  patterns: [isAccessory continue guard, hasAlterationServices flag, memo filter]
key_files:
  created: []
  modified:
    - src/app/api/intake/route.ts
    - src/components/intake/assignment-step.tsx
    - src/app/(protected)/intake/page.tsx
decisions:
  - "[Phase 06-03]: isAccessory continue guard skips estimatedMinutes check — accessories have no production time"
  - "[Phase 06-03]: hasAlterationServices flag gates calendar event — accessories-only orders don't create production calendar events"
  - "[Phase 06-03]: Assignment filter in useMemo (not in AssignmentStep) — keeps component pure, filtering logic stays in page.tsx"
  - "[Phase 06-03]: Error message changed from 'service' to 'retouche' — clarifies time requirement applies to alteration work only"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-18"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 6 Plan 3: Intake API Hardening for Alteration/Accessory Split Summary

**One-liner:** isAccessory bypass in estimatedMinutes validation + hasAlterationServices calendar gate + accessory filter in assignment step useMemo.

## What Was Built

Hardened the intake API and assignment step to correctly handle the alteration/accessory split introduced in plans 06-01 and 06-02. Three targeted changes across two files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Intake API — bypass estimatedMinutes + gate calendar | 69c0d87 | src/app/api/intake/route.ts |
| 2 | AssignmentStep + page.tsx — filter accessories | 78d2db4 | src/components/intake/assignment-step.tsx, src/app/(protected)/intake/page.tsx |

## Changes Made

### src/app/api/intake/route.ts (Task 1)

**Change 1 — isAccessory bypass in estimatedMinutes validation (line ~64-77):**
- Added `if (service.isAccessory) continue;` guard before the time check
- Updated comment to clarify "alteration service" requirement
- Changed error message from "service" to "retouche" to clarify scope

**Change 2 — hasAlterationServices calendar gate (line ~661-680):**
- Added `let hasAlterationServices = false;` computation block before calendar section
- Iterates all services, sets flag true when `!service.isAccessory` is found
- Changed `if (calendarAssignee && dueDate)` to `if (calendarAssignee && dueDate && hasAlterationServices)`

### src/components/intake/assignment-step.tsx (Task 2, Change 1)

- Added `isAccessory?: boolean;` to exported `AssignmentItem` interface
- Comment: "true for accessory products, undefined/false for alterations"

### src/app/(protected)/intake/page.tsx (Task 2, Change 2)

- Added `if (service.isAccessory) return;` at the top of the service forEach in `assignmentItems` useMemo
- Accessories are now excluded from the assignment list before being passed to AssignmentStep

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| isAccessory continue guard (not wrapper if) | Flat, readable guard pattern; consistent with other guard clauses in the route |
| Filter in useMemo not in AssignmentStep render | AssignmentStep renders whatever it receives — filtering belongs in the data preparation layer |
| Error message "retouche" not "service" | Clarifies to the user that only alteration work requires a time estimate |
| hasAlterationServices computed near calendar block | Locality — the flag is only used in one place, keeping it near its use site is cleaner |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All acceptance criteria confirmed:
- `route.ts` contains `if (service.isAccessory) continue;` in validation loop
- `route.ts` contains `let hasAlterationServices = false;`
- `route.ts` calendar condition: `calendarAssignee && dueDate && hasAlterationServices`
- `route.ts` error message contains "retouche"
- `assignment-step.tsx` AssignmentItem interface contains `isAccessory?: boolean`
- `page.tsx` assignmentItems useMemo contains `if (service.isAccessory) return;`
- `npx tsc --noEmit` — TypeScript compiles clean (no output = no errors)

## Self-Check: PASSED

Files exist:
- FOUND: src/app/api/intake/route.ts
- FOUND: src/components/intake/assignment-step.tsx
- FOUND: src/app/(protected)/intake/page.tsx

Commits exist:
- 69c0d87: feat(06-03): bypass estimatedMinutes for accessories + gate calendar on alteration services
- 78d2db4: feat(06-03): filter accessory services from assignment step
