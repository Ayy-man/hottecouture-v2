---
phase: 06-order-form-restructure-4-sections
plan: 02
subsystem: ui
tags: [react, nextjs, supabase, intake-form, step-components, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: isAccessory field in IntakeFormData, qty NUMERIC schema, service recategorization migration
provides:
  - AlterationStep component — garment config + alteration-only services with time estimates
  - AccessoriesStep component — accessory products with decimal qty and isAccessory flag
  - 6-step intake flow: Client, Type, Retouches, Accessoires, Tarification, Attribution
affects: [06-03, assignment-step, intake-api, pricing-step]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Separate step components per service category (alteration vs accessories)
    - isAccessory flag distinguishes labour services from product services
    - Decimal qty input: type=number, inputMode=decimal, step=0.25 for accessories
    - Auto-create placeholder garment when no alteration garments exist (AccessoriesStep)
    - Import types (Garment, GarmentService) from AlterationStep into AccessoriesStep

key-files:
  created:
    - src/components/intake/alteration-step.tsx
    - src/components/intake/accessories-step.tsx
  modified:
    - src/app/(protected)/intake/page.tsx

key-decisions:
  - "AlterationStep exports Garment, GarmentService, GarmentType interfaces as source of truth — AccessoriesStep imports from alteration-step to avoid type duplication"
  - "AccessoriesStep appends to LAST garment (not first) — preserves garment grouping when user adds accessories after alterations"
  - "Placeholder garment type='Accessoires' with garment_type_id=null auto-created when no alteration garments — allows accessories-only orders"
  - "Duplicate service detection in AccessoriesStep increments qty rather than adding a second row — better UX for repeated additions"
  - "AlterationStep shows 'Passer aux accessoires' on Next button when no garments added — communicates optionality without blocking"
  - "estimatedMinutes: 0 hardcoded for all accessory services — accessories do not require time estimates"

patterns-established:
  - "Category-split step pattern: one component per service category, each fetches only its category from Supabase"
  - "Shared type exports: AlterationStep is the type source, downstream components import from it"

requirements-completed: [MKT-116]

# Metrics
duration: 25min
completed: 2026-03-18
---

# Phase 06 Plan 02: AlterationStep + AccessoriesStep Summary

**Monolithic garment-services-step.tsx split into AlterationStep (garment config + alteration services with mandatory time estimates) and AccessoriesStep (product services with decimal qty and isAccessory flag), plus intake page updated to 6-step flow**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-18T07:00:00Z
- **Completed:** 2026-03-18T07:25:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- AlterationStep (1549 lines): Full garment configuration UI + alteration-only service selection, EmojiPicker for custom type creation, mandatory estimatedMinutes validation, seamstress assignment per service, manage mode for edit/delete garment types
- AccessoriesStep (395 lines): Simple product picker with decimal quantity (step=0.25), isAccessory: true on all services, smart garment targeting (last existing or auto-create placeholder), duplicate qty accumulation, remove button
- Intake page 6-step flow: replaced single 'garment-services' case with 'alteration' + 'accessories' cases, GarmentServicesStep import removed, steps array updated with 6 visible indicators

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AlterationStep component** - `9a8a35e` (feat)
2. **Task 2: Create AccessoriesStep + update intake page step flow** - `8d84ba9` (feat)

## Files Created/Modified

- `src/components/intake/alteration-step.tsx` - Garment configuration + alteration services only, exports Garment/GarmentService/GarmentType types
- `src/components/intake/accessories-step.tsx` - Product services with decimal qty, imports types from alteration-step
- `src/app/(protected)/intake/page.tsx` - 6-step flow with AlterationStep + AccessoriesStep, old garment-services step removed

## Decisions Made

- AlterationStep is the type source (exports `Garment`, `GarmentService`, `GarmentType`); AccessoriesStep imports from it — single source of truth avoids type drift
- AccessoriesStep appends to the LAST garment in `data` rather than first — preserves natural grouping when alterations come before accessories
- Auto-placeholder garment `type='Accessoires'` with `garment_type_id: null` created when `data` is empty — enables accessories-only orders without requiring alteration garment
- Duplicate accessory service detection: if same `serviceId` + `isAccessory: true` already on last garment, qty is incremented instead of adding a new row
- `estimatedMinutes: 0` hardcoded for all accessory services — skips time validation in AssignmentStep (handled in Plan 06-03)

## Deviations from Plan

None - both component files and the intake page update were already partially in place from plan 06-01 execution. The files existed as untracked/unstaged work. This plan formalized and committed them exactly as specified.

## Issues Encountered

Both component files and the intake page changes already existed as untracked files and unstaged modifications when execution began — plan 06-01 had created them as part of its work but did not commit them. No issues arose from this; execution proceeded by verifying all acceptance criteria, then committing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AlterationStep and AccessoriesStep are complete and wired into the intake page
- Plan 06-03 (Intake API + AssignmentStep accessory handling) can now proceed: it needs to filter accessories from AssignmentStep and handle `isAccessory: true` services in the intake API
- TypeScript compiles clean

---
*Phase: 06-order-form-restructure-4-sections*
*Completed: 2026-03-18*
