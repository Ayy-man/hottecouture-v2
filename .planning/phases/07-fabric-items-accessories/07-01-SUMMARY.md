---
phase: 07-fabric-items-accessories
plan: 01
subsystem: ui
tags: [react, supabase, postgres, intake, accessories, fabric, unit-pricing]

# Dependency graph
requires:
  - phase: 06-order-form-restructure
    provides: "AccessoriesStep component, isAccessory flag, decimal quantity support (NUMERIC 10,2), accessories category in service table"
provides:
  - "Migration 0044 seeding FABRIC_YARD and FABRIC_SQFT service records with category=accessories"
  - "Per-unit price input on every AccessoriesStep service row"
  - "Unit-aware labels reading service.unit (yard, sq ft, or fallback to unite)"
  - "Summary line formula: qty unit x price/unit = total"
  - "pendingPrice state and handlePriceChange handler for pre-add price editing"
affects: [pricing-step, intake-api, accessories-step]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pendingPrice pattern: per-service price state tracked in Record<serviceId, priceCents> before committing to form data"
    - "serviceMap lookup in useMemo to resolve unit from fetched services for summary display"
    - "ON CONFLICT (code) DO NOTHING idempotent seed pattern (established in 0036, 0039)"

key-files:
  created:
    - "supabase/migrations/0044_seed_fabric_services.sql"
  modified:
    - "src/components/intake/accessories-step.tsx"

key-decisions:
  - "base_price_cents=0 for fabric services forces user to enter price at order time — catalog stores no default price"
  - "category='accessories' (not 'fabrics') matches AccessoriesStep filter .in('category', ['accessories', 'accessory'])"
  - "unit labels fall back to 'unite' for non-fabric accessories to preserve existing behavior"
  - "pendingPrice resets to service.base_price_cents (0 for fabric) after add, not to 0, so input shows clean state"

patterns-established:
  - "Unit-aware price display: service.unit ? / service.unit : / unite"
  - "Pre-add editable price: pendingPrice[service.id] ?? service.base_price_cents pattern"

requirements-completed: [MKT-117]

# Metrics
duration: 15min
completed: 2026-03-18
---

# Phase 7 Plan 01: Fabric Items in Accessories Summary

**SQL migration seeds FABRIC_YARD and FABRIC_SQFT with unit=yard/sq ft, and AccessoriesStep gains per-unit price input with unit-aware labels and formula summary**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T00:00:00Z
- **Completed:** 2026-03-18T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migration 0044 inserts Tissu au verge (FABRIC_YARD, yard) and Tissu au pied carre (FABRIC_SQFT, sq ft) into the service table with category=accessories and base_price_cents=0
- AccessoriesStep now shows an editable Prix/unit input for every service row, allowing price entry before adding (critical for fabric with base_price_cents=0)
- Quantity label changes from generic "Qte" to the unit name (e.g. "yard:" or "sq ft:") when service.unit is set
- Summary section displays "qty unit x price/unit = total" formula for fabric items, "qty unite x price/unite = total" for generic accessories

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed fabric service records via migration** - `e7e4c49` (feat)
2. **Task 2: Add unit labels and per-unit price input to AccessoriesStep** - `617a296` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `supabase/migrations/0044_seed_fabric_services.sql` - Idempotent INSERT of FABRIC_YARD and FABRIC_SQFT service rows with category=accessories, unit=yard/sq ft, base_price_cents=0
- `src/components/intake/accessories-step.tsx` - Added pendingPrice state, handlePriceChange, price input UI, unit-aware labels, unit field on AddedAccessory interface, serviceMap lookup in useMemo, formula summary line

## Decisions Made
- Used `base_price_cents = 0` for both fabric services because MKT-117 requires price to be entered at order time — no default catalog price exists
- Used `category = 'accessories'` (not `fabrics`) because AccessoriesStep filters `.in('category', ['accessories', 'accessory'])` — the fabrics category is not queried by this component
- Fallback to `'unite'` for services without a unit ensures backward-compatible display for all existing accessories (zippers, buttons, etc.)
- `pendingPrice` resets to `service.base_price_cents` (i.e., 0 for fabric) after each add, leaving the input at $0.00 ready for the next entry

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fabric items will appear in the Accessories step immediately after `supabase db push` (or Supabase migration run) applies migration 0044
- The unit-aware UI is fully functional — no further intake changes needed for MKT-117
- The `isAccessory` flag and `hasAlterationServices` guard (Phase 06-03) already ensure fabric items are excluded from the production calendar
- Phase 8 (Notification Workflow, MKT-118) can proceed independently

---
*Phase: 07-fabric-items-accessories*
*Completed: 2026-03-18*
