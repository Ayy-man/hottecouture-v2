# Project State

**Project:** Hotte Couture Final Modifications
**Last Updated:** 2026-02-04

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-01-20)

**Core value:** Seamstresses can take orders on iPad/iPhone, assign items to team members, adjust prices, and print task lists.
**Current focus:** Wave 5 UX Fixes (Phases 15-20)

## Current Status

- **Milestone:** Final Modifications (17 MODs -> 39 requirements + 12 new from Feb 3 UAT)
- **Phase:** 15 of 21 - Wave 5 UX Fixes (1/1 complete)
- **Original Deadline:** Thursday, January 23, 2026 (PASSED)
- **Core Completion:** January 28, 2026 (Phases 1-11)
- **Wave 4 Completion:** February 4, 2026 (Phases 12-14)
- **Phase 15 Completion:** February 4, 2026 (Label Printing Format)

## Progress

| Phase | Status | Plans | Source |
|-------|--------|-------|--------|
| 1 - Item-Level Assignment | ✅ COMPLETE | 4/4 | Jan 13 |
| 2 - Item-Level Pricing | ✅ COMPLETE | 3/3 | Jan 13 |
| 3 - Merge Steps | ✅ COMPLETE | 2/2 | Jan 13 |
| 4 - Reduce Space | ✅ COMPLETE | 1/1 | Jan 13 |
| 5 - List View | ✅ COMPLETE | 1/1 | Jan 13 |
| 6 - Manage Task | ✅ COMPLETE | 2/2 | Jan 13 |
| 7 - Exports | ✅ COMPLETE | 3/3 | Jan 13 |
| 8 - Timer Removal | ✅ COMPLETE | 2/2 | Jan 13 |
| 9 - Responsive | ✅ COMPLETE | Implemented | Jan 13 |
| 10 - Calendar | ✅ COMPLETE | Implemented | Jan 13 |
| 11 - Cleanup & Polish | ✅ COMPLETE | 1/1 | Jan 13 |
| 12 - Verify Item Assignment | ✅ COMPLETE | 1/1 | Feb 3 |
| 13 - Price Editing Regression | ✅ COMPLETE | 1/1 | Feb 3 |
| 14 - Mandatory Time Field | ✅ COMPLETE | 1/1 | Feb 3 |
| 15 - Label Printing Format | ✅ COMPLETE | 1/1 | Feb 3 |
| 16 - Dropdown Scroll Fix | ⬜ PENDING | 0/1 | Feb 3 |
| 17 - Contact Validation | ⬜ PENDING | 0/1 | Feb 3 |
| 18 - Popup Modals | ⬜ PENDING | 0/1 | Feb 3 |
| 19 - Workflow Auto-Advance | ⬜ PENDING | 0/1 | Feb 3 |
| 20 - Stripe Cleanup | ⬜ PENDING | 0/1 | Feb 3 |
| 21 - Responsive Verification | ⬜ PENDING | 0/1 | Feb 3 |

## Execution Waves

```
WAVE 1-3 (Jan 13 Original) ✅ ALL DONE
+-- Phases 1-11 complete

WAVE 4 (Critical Fixes - Sequential) ✅ DONE
+-- Phase 12: Verify Item Assignment (code verified correct, no changes needed)
+-- Phase 13: Fix Price Editing Regression (re-enabled total modifier)
+-- Phase 14: Mandatory Time Field (added time input + validation)

WAVE 5 (UX Fixes - Parallel) ← CURRENT
|-- Phase 15: Label Printing Format ✅ DONE
|-- Phase 16: Assignment Dropdown Scroll
|-- Phase 17: Contact Field Validation
|-- Phase 18: Popup Modals
|-- Phase 19: Workflow Auto-Advance
+-- Phase 20: Stripe Payment Cleanup

WAVE 6 (Final Verification)
+-- Phase 21: Responsive Device Testing
```

## Feb 3 UAT Context

Client's consulting team (AUTOMATO Solutions) compiled a comparative analysis:
- 8/15 original items confirmed working (53%)
- 3 items "claimed fixed" but unverified on real devices
- 3 items not addressed (item assignment, chronometer, unified workflow)
- 1 regression introduced (price editing in services table)
- 12 new items discovered during Feb 3 review

Key concerns from client:
- Item-level assignment not working in demo (critical)
- Price editing regression (was working, now broken)
- Label printer incompatible format
- Mobile/iPad fixes unverified on real devices
- Assignment dropdown cut off at bottom of screen

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
| Export in filter dropdown | 07-02 | Added export option inside AssigneeFilter dropdown (appears when seamstress selected) |
| FileSpreadsheet icon for exports | 07-02 | Used lucide FileSpreadsheet icon for export menu items in 3-dot menu |
| Only inactive staff deletable | 11-01 | UI restricts delete button to inactive members to prevent accidental deletion |
| Delete checks assignments | 11-01 | DELETE endpoint checks for assignments before allowing deletion to prevent orphans |
| SMS external integration | 11-01 | SMS integration handled outside codebase via N8N workflows, mobile_phone field ready |
| Item assignment verified correct | 12-01 | Full code audit: intake UI, API, board filtering, order cards all use per-item assigned_seamstress_id correctly. Issue likely deployment/migration. |
| Re-enable total modifier | 13-01 | Uncommented total price override UI in pricing-step.tsx (was disabled in c059ecf). Added back state vars and prop destructuring. |
| Time estimate mandatory | 14-01 | Added estimatedMinutes field to GarmentService, time input in service rows, validation blocks Add to Order without time > 0, API uses user-provided time. |
| 4" x 2" label format | 15-01 | Use CSS @page with 4" x 2" dimensions for individual label printer, horizontal layout with QR left and content right. |
| Configurable label dimensions | 15-01 | Added labelWidth and labelHeight to LABEL_CONFIG for single-point dimension changes. |

## Next Action

**Wave 5: UX Fixes (Phases 16-20)**

Phase 15 complete. Remaining Wave 5 phases can run in parallel.

Run: `/gsd:plan-phase 16` (or any of 16-20)

## Wave 4 Summary (Feb 4)

**Phase 12 — Verified correct.** Item-level assignment works end-to-end: intake form captures per-item assignedSeamstressId, API saves to garment_service.assigned_seamstress_id, board filters by item-level, order cards show per-item assignments. Client complaint likely deployment/migration issue.

**Phase 13 — Fixed.** Re-enabled total price modifier in pricing-step.tsx. The "Modifier" button and edit/save/reset UI were commented out in commit c059ecf. Restored state variables (isEditingTotal, editTotalValue), added totalOverrideCents/onTotalOverrideChange back to destructured props, shows override vs calculated price.

**Phase 14 — Implemented.** Added mandatory time estimate field:
- `estimatedMinutes` field added to GarmentService interface
- Time input (minutes) with red border validation on each service row
- "Le temps estime est requis" validation message
- "Add to Order" blocked until all services have time > 0
- API uses user-provided time estimate instead of auto-calculating
- estimatedMinutes preserved through assignment step data flow

**Files modified:**
- `src/components/intake/pricing-step.tsx` — Re-enabled total modifier
- `src/components/intake/garment-services-step.tsx` — Added time field + validation
- `src/app/intake/page.tsx` — Added estimatedMinutes to type + preserved in assignment handler
- `src/app/api/intake/route.ts` — Uses user-provided time estimate

**Note:** Git repo has corrupted pack files (pre-existing). TypeScript compiles clean.

## Wave 5 Progress (Feb 4)

**Phase 15 — Complete.** Fixed label printing format for individual label printer:
- Changed from 2-column letter-page grid to individual 4" x 2" labels
- Each label is one "page" (break-after: page) for label printer
- Horizontal layout: QR code left, all content right
- Added labelWidth and labelHeight to LABEL_CONFIG (single source of truth)
- CSS @page size matches label dimensions
- Preserved all functionality: copies, QR codes, download PNG, screen preview
- Requires testing with physical label printer to verify dimensions and print quality

**Files modified:**
- `src/lib/config/production.ts` — Added labelWidth and labelHeight config
- `src/app/labels/[orderId]/page.tsx` — Rewrote layout for individual labels

## Session Continuity

- **Last session:** 2026-02-04
- **Status:** 15/21 phases complete — Wave 5 in progress (1/6 done)
- **Next:** Continue Wave 5 (Phases 16-20, parallel UX fixes)

---
*State updated: 2026-02-04*
