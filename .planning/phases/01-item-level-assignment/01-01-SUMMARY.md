---
phase: 01-item-level-assignment
plan: 01
subsystem: database
tags: [postgres, supabase, migration, rpc, uuid, foreign-key]

# Dependency graph
requires: []
provides:
  - garment_service.assigned_seamstress_id UUID column
  - Index for assignment filtering performance
  - RPC function with assignment data in JSON
  - Optional seamstress filter parameter for RPC
affects:
  - 01-item-level-assignment (remaining plans)
  - 02-item-level-pricing (may need assignment context)
  - 06-manage-task (task management with assignments)
  - 10-calendar (calendar views by seamstress)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UUID foreign key to staff table for assignments
    - Case-insensitive name matching with TRIM() for migrations
    - Optional filter parameters in RPC functions

key-files:
  created:
    - supabase/migrations/0031_add_item_level_assignment.sql
    - supabase/migrations/0032_update_orders_rpc_assignment.sql
  modified: []

key-decisions:
  - "Use UUID FK (assigned_seamstress_id) instead of VARCHAR name for referential integrity"
  - "Keep order.assigned_to column for backward compatibility"
  - "Migrate from all assignment levels: order, garment, garment_service.assignee"

patterns-established:
  - "Item-level assignment via garment_service.assigned_seamstress_id"
  - "RPC returns resolved staff name alongside UUID"

# Metrics
duration: 1min
completed: 2026-01-19
---

# Phase 1 Plan 1: Database Schema for Item-Level Assignment Summary

**UUID foreign key column on garment_service with migration from order-level assignments and updated RPC returning assignment data**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-19T20:08:21Z
- **Completed:** 2026-01-19T20:09:14Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Added `assigned_seamstress_id` UUID column to `garment_service` table with FK to `staff`
- Created performance index `idx_garment_service_assigned_seamstress`
- Migrated existing assignments from order-level, garment.assignee, and garment_service.assignee
- Updated `get_orders_with_details` RPC to include `assigned_seamstress_id` and `assigned_seamstress_name` in services JSON
- Added optional `p_assigned_seamstress_id` filter parameter to RPC

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration for assigned_seamstress_id column** - `0bfec7e` (feat)
2. **Task 2: Update RPC function to include assignment data** - `9dc6009` (feat)

## Files Created
- `supabase/migrations/0031_add_item_level_assignment.sql` - Adds UUID column, index, and migrates existing data
- `supabase/migrations/0032_update_orders_rpc_assignment.sql` - Updates RPC with assignment fields and filter

## Decisions Made
- Used UUID foreign key to `staff` table instead of VARCHAR name for data integrity and handling staff name changes
- Keep `order.assigned_to` for backward compatibility (do NOT remove)
- Migration handles all existing assignment sources (order, garment, garment_service.assignee) with case-insensitive matching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**Database migration must be run in Supabase SQL Editor:**

1. Run `0031_add_item_level_assignment.sql` first
2. Run `0032_update_orders_rpc_assignment.sql` second

Verify with:
```sql
-- Check column exists
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'garment_service' AND column_name = 'assigned_seamstress_id';

-- Check RPC returns assignment data
SELECT
  (garments::json->0->'services'->0->>'assigned_seamstress_id') as assignee_id
FROM get_orders_with_details(1, 0) LIMIT 1;
```

## Next Phase Readiness
- Database schema ready for TypeScript type updates (next plan)
- API routes can be updated to use new column
- UI components can start showing item-level assignments

---
*Phase: 01-item-level-assignment*
*Completed: 2026-01-19*
