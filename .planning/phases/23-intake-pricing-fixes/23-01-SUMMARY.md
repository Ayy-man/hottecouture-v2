---
phase: 23-intake-pricing-fixes
plan: 01
subsystem: ui
tags: [intake, pricing, french, i18n, garment-types, rush-orders]

# Dependency graph
requires:
  - phase: 22-audit-gap-closure
    provides: Custom garment type creation in dropdown
provides:
  - French category labels for garment dropdown (Sur mesure, Retouches)
  - French rush timeline labels with proper pluralization
  - Fixed "0 days faster" edge case handling
affects: [24-board-kanban-ui, intake-flow, pricing-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - API response includes display label mapping consumed by UI components
    - Conditional rendering based on calculated values (daysDifference)

key-files:
  created: []
  modified:
    - src/app/api/garment-types/route.ts
    - src/components/intake/garment-services-step.tsx
    - src/components/rush-orders/rush-indicator.tsx

key-decisions:
  - "Use French business terminology for category labels: 'Sur mesure' instead of 'Home Textiles'"
  - "Add 'Retouches' category for alteration-type garments"
  - "Show 'Service express' label when rush timeline has 0 days difference"
  - "Store categories mapping from API in component state for label display"

patterns-established:
  - "API provides display label mappings that UI consumes via state"
  - "French pluralization pattern: X jour(s) using conditional 's'"

# Metrics
duration: 1 min
completed: 2026-02-11
---

# Phase 23 Plan 01: Intake Pricing Fixes Summary

**Fixed French category labels in garment dropdown and rush timeline text with proper edge case handling**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-11T18:19:22Z
- **Completed:** 2026-02-11T18:21:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Garment type dropdown now shows correct French category headers ("Sur mesure" for custom, "Retouches" for alterations)
- All category labels translated to French business terminology
- Rush timeline displays French text with proper pluralization ("X jour(s)")
- Fixed "0 days faster than standard" bug - now shows "Service express" when no time saved
- Rush timeline comparison only shows when actual time difference exists

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix garment category labels to French business terminology** - `695491f` (feat)
   - Updated categories mapping in API route with French labels
   - Added categoryLabels state to garment-services-step
   - Dropdown uses API categories for display with fallback

2. **Task 2: Fix rush timeline labels to show meaningful French text** - `db03996` (fix)
   - Changed all English text to French ("Délai:", "jour(s)", "plus rapide")
   - Fixed edge case: 0 days difference shows "Service express"
   - Only display comparison line when difference >= 1 day

## Files Created/Modified

- `src/app/api/garment-types/route.ts` - Updated categories mapping to French labels, added "Retouches" category
- `src/components/intake/garment-services-step.tsx` - Added categoryLabels state, consumes categories from API for dropdown display
- `src/components/rush-orders/rush-indicator.tsx` - RushOrderTimeline component updated with French text and edge case handling

## Decisions Made

**French business terminology:** Client requested "Sur mesure" (custom design) instead of "Home Textiles" and "Retouches" instead of generic alteration category. All labels now in French matching primary UI language.

**Service express fallback:** When rush processing doesn't actually save time (0 days difference), displaying "0 days faster" was confusing. Now shows "Service express" badge to indicate premium service tier without implying time savings.

**API-driven label mapping:** Categories mapping moved from hardcoded fallback in component to API response consumed via state. This centralizes label definitions and makes future i18n easier.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation clean, all changes applied successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for next plan in Phase 23 (inline pricing editor, custom services, tax recalc, date picker improvements).

---
*Phase: 23-intake-pricing-fixes*
*Completed: 2026-02-11*

## Self-Check: PASSED

All files exist:
- ✓ src/app/api/garment-types/route.ts (modified)
- ✓ src/components/intake/garment-services-step.tsx (modified)
- ✓ src/components/rush-orders/rush-indicator.tsx (modified)

All commits exist:
- ✓ 695491f - Task 1 commit
- ✓ db03996 - Task 2 commit
