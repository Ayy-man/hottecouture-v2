# Phase 1: Item-Level Assignment - Research

**Researched:** 2026-01-20
**Domain:** Data model architecture change (Supabase/PostgreSQL), Next.js/React frontend
**Confidence:** HIGH

## Summary

This phase changes the assignment model from order-level (`order.assigned_to`) to item-level (`garment_service.assigned_seamstress_id`). The research reveals that the codebase already has partial infrastructure for this:

1. **`garment.assignee` VARCHAR(100)** already exists (migration 0025_garment_is_task.sql) - but uses string names not UUID references
2. **`garment_service.assignee` VARCHAR(100)** also exists (migration 0025_garment_service_is_task.sql) - same issue
3. **`order.assigned_to` VARCHAR(100)** is the current order-level assignment (migration 0014)

The key decision is: assign at garment level or garment_service level? The requirements specify `garment_service` as the assignment unit, which makes sense since different services on the same garment could be done by different seamstresses.

**Primary recommendation:** Add `assigned_seamstress_id UUID REFERENCES staff(id)` to `garment_service` table, migrate existing `order.assigned_to` values down to child records, and update all queries to filter by this new field.

## Standard Stack

The project already uses these technologies - no new libraries needed.

### Core (Already in Use)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Supabase | Current | Database & Auth | PostgreSQL backend |
| Next.js | 14+ | Full-stack framework | App Router |
| TypeScript | 5.x | Type safety | Strict mode |

### Supporting (Already in Use)
| Library | Purpose | When Used |
|---------|---------|-----------|
| @supabase/ssr | Server-side Supabase client | API routes |
| date-fns | Date manipulation | Workload page |

### No New Dependencies Needed
This is a data model change that uses existing infrastructure.

## Architecture Patterns

### Current Data Model (Order-Level Assignment)

```
order
├── assigned_to: VARCHAR(100) [seamstress name string]
└── garments
    └── garment_service
        └── assignee: VARCHAR(100) [partially populated, not FK]
```

**Problems:**
1. `assigned_to` is a string name, not a FK to staff table
2. Cannot assign different items to different seamstresses
3. Queries filter by `order.assigned_to`, not item-level

### Target Data Model (Item-Level Assignment)

```
order
├── assigned_to: VARCHAR(100) [DEPRECATED - keep for backward compat]
└── garments
    └── garment_service
        └── assigned_seamstress_id: UUID REFERENCES staff(id)
```

**Benefits:**
1. Proper FK relationship to staff table
2. Each service can have its own assignee
3. Referential integrity enforced by database
4. Staff renames don't break assignments

### Migration Strategy

The migration must be **backward compatible** - existing queries should still work while new queries can use item-level assignment.

```sql
-- Step 1: Add new column with proper FK
ALTER TABLE garment_service
ADD COLUMN assigned_seamstress_id UUID REFERENCES staff(id);

-- Step 2: Migrate existing data
-- For each order with assigned_to, set all its garment_services
UPDATE garment_service gs
SET assigned_seamstress_id = (
  SELECT s.id FROM staff s
  WHERE s.name = (
    SELECT o.assigned_to
    FROM "order" o
    JOIN garment g ON g.order_id = o.id
    WHERE g.id = gs.garment_id
  )
  LIMIT 1
)
WHERE gs.assigned_seamstress_id IS NULL;

-- Step 3: Create index for filtering
CREATE INDEX idx_garment_service_assigned
ON garment_service(assigned_seamstress_id);
```

### Query Pattern Changes

**Current Pattern (Order-Level):**
```typescript
// In useBoardFilters.ts
const assignees = order.tasks.map(t => t.assignee).filter(Boolean);
if (!assignees.includes(filters.assignee)) return false;
```

**New Pattern (Item-Level):**
```typescript
// Filter garment_services by assigned_seamstress_id
const myItems = garmentServices.filter(gs =>
  gs.assigned_seamstress_id === currentStaffId
);
```

### RPC Function Updates

The `get_orders_with_details` RPC function needs to include `assigned_seamstress_id` in the garment_service JSON output. Current function (0030_add_type_to_orders_rpc.sql) already builds nested JSON but doesn't include the new field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Staff name resolution | String lookups | UUID FK to staff table | Referential integrity, name changes don't break |
| Filtering by assignee | Multiple JS filters | SQL WHERE clause | Performance, correctness |
| Migration rollback | Manual SQL | Supabase migration system | Atomic, reversible |

**Key insight:** The existing `assignee VARCHAR(100)` fields are a code smell - they reference staff by name string rather than UUID. This causes problems when staff names change or are duplicated.

## Common Pitfalls

### Pitfall 1: Breaking Existing Order Assignment
**What goes wrong:** Removing `order.assigned_to` breaks calendar webhooks, workload page, and intake flow.
**Why it happens:** Developers assume they can just delete the old field.
**How to avoid:** Keep `order.assigned_to` for backward compatibility during transition. Add deprecation notice. Update gradually.
**Warning signs:** Calendar events stop being created, workload shows "Unassigned" for all orders.

### Pitfall 2: Orphaned Assignments During Migration
**What goes wrong:** Staff member name in `order.assigned_to` doesn't match any `staff.name`.
**Why it happens:** Case sensitivity, trailing whitespace, deleted staff members.
**How to avoid:** Use TRIM() and case-insensitive matching. Log mismatches for manual review.
**Warning signs:** Migration reports 0 rows updated but data exists.

### Pitfall 3: N+1 Queries in Board View
**What goes wrong:** Board page makes separate query for each item's assignee.
**Why it happens:** Lazy loading staff names after fetching items.
**How to avoid:** JOIN staff table in the main query, or use RPC function that returns complete data.
**Warning signs:** Slow page loads, many network requests in DevTools.

### Pitfall 4: UI Shows Staff IDs Instead of Names
**What goes wrong:** Dropdown shows UUIDs like "a1b2c3d4..." instead of "Marie".
**Why it happens:** Forgot to JOIN staff table or include name in response.
**How to avoid:** Always include both `assigned_seamstress_id` AND resolved staff name in API responses.
**Warning signs:** Dropdowns showing gibberish, filters not working.

### Pitfall 5: TypeScript Types Out of Sync
**What goes wrong:** Runtime errors because TypeScript types don't match actual DB schema.
**Why it happens:** Forgot to update `src/lib/types/database.ts` after migration.
**How to avoid:** Update types BEFORE writing component code. Consider using Supabase CLI to generate types.
**Warning signs:** TypeScript compiles but runtime errors on `undefined` properties.

## Code Examples

### Migration SQL
```sql
-- Source: Project-specific (based on existing migrations)
-- File: supabase/migrations/0031_add_item_level_assignment.sql

-- 1. Add FK column to garment_service
ALTER TABLE garment_service
ADD COLUMN IF NOT EXISTS assigned_seamstress_id UUID REFERENCES staff(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_garment_service_assigned_seamstress
ON garment_service(assigned_seamstress_id);

-- 3. Migrate existing order-level assignments to item-level
-- This preserves existing data while enabling item-level granularity
UPDATE garment_service gs
SET assigned_seamstress_id = subquery.staff_id
FROM (
  SELECT gs2.id as garment_service_id, s.id as staff_id
  FROM garment_service gs2
  JOIN garment g ON g.id = gs2.garment_id
  JOIN "order" o ON o.id = g.order_id
  JOIN staff s ON LOWER(TRIM(s.name)) = LOWER(TRIM(o.assigned_to))
  WHERE o.assigned_to IS NOT NULL
    AND gs2.assigned_seamstress_id IS NULL
) subquery
WHERE gs.id = subquery.garment_service_id;

-- 4. Add comment for documentation
COMMENT ON COLUMN garment_service.assigned_seamstress_id IS
  'FK to staff table - which seamstress is assigned to this specific item';
```

### Updated RPC Function
```sql
-- File: supabase/migrations/0032_update_orders_rpc_for_assignment.sql
-- Add assigned_seamstress_id and staff name to garment_service JSON

CREATE OR REPLACE FUNCTION get_orders_with_details(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_client_id UUID DEFAULT NULL,
  p_assigned_seamstress_id UUID DEFAULT NULL  -- NEW: filter by assignee
)
-- ... (returns same table structure plus new filter capability)
```

### TypeScript Type Updates
```typescript
// File: src/lib/types/database.ts
// Add to garment_service Row type:
garment_service: {
  Row: {
    // ... existing fields ...
    assigned_seamstress_id: string | null;  // NEW
  };
  // ... Insert and Update types ...
};
```

### React Component Pattern
```typescript
// File: src/components/intake/item-assignment-dropdown.tsx
interface ItemAssignmentDropdownProps {
  garmentServiceId: string;
  currentAssignee: string | null;
  onAssign: (seamstressId: string | null) => void;
}

export function ItemAssignmentDropdown({
  garmentServiceId,
  currentAssignee,
  onAssign
}: ItemAssignmentDropdownProps) {
  const { staff, loading } = useStaff();

  return (
    <select
      value={currentAssignee || ''}
      onChange={(e) => onAssign(e.target.value || null)}
    >
      <option value="">Unassigned</option>
      {staff.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Order-level assignment | Item-level assignment | This phase | Seamstresses see only their items |
| String name references | UUID FK to staff | This phase | Referential integrity |
| Filter in JS | Filter in SQL | This phase | Better performance |

**Deprecated after this phase:**
- `order.assigned_to` - Keep for backward compat, but new code should use item-level
- `garment.assignee` VARCHAR - Superseded by garment_service.assigned_seamstress_id
- `garment_service.assignee` VARCHAR - Superseded by assigned_seamstress_id

## Open Questions

### 1. Should we assign at garment or garment_service level?
- **What we know:** Requirements say "garment_service" (ARCH-02), and it's more granular
- **What's unclear:** Are there use cases where same garment has services split between seamstresses?
- **Recommendation:** Use garment_service level per requirements. Can add convenience UI to "assign all services" at garment level.

### 2. What happens to unassigned items?
- **What we know:** Current workload page shows "Unassigned" category
- **What's unclear:** Should unassigned items appear in everyone's view, or only admins?
- **Recommendation:** Keep current behavior - show in "Unassigned" category for visibility

### 3. Keep old VARCHAR assignee fields?
- **What we know:** They exist on both garment and garment_service tables
- **What's unclear:** Are they actively used anywhere?
- **Recommendation:** Don't delete yet. Add deprecation comment. Remove in future phase after confirming no usage.

## Files to Modify

### Database (Supabase)
1. **New migration:** `supabase/migrations/0031_add_item_level_assignment.sql`
   - Add `assigned_seamstress_id` column
   - Migrate existing data
   - Create index

2. **Update RPC:** `supabase/migrations/0032_update_orders_rpc.sql`
   - Include new field in JSON output
   - Add optional filter parameter

### TypeScript Types
3. **Update types:** `src/lib/types/database.ts`
   - Add `assigned_seamstress_id` to garment_service types

### API Routes
4. **Update orders API:** `src/app/api/orders/route.ts`
   - Include new field in response

5. **Update intake API:** `src/app/api/intake/route.ts`
   - Save item-level assignment (optional - can default to null)

6. **New/Update item assignment API:** `src/app/api/garment-service/[id]/assign/route.ts`
   - PATCH endpoint to assign seamstress to specific item

### UI Components
7. **Board filtering:** `src/lib/board/useBoardFilters.ts`
   - Filter by garment_service.assigned_seamstress_id

8. **Board data:** `src/lib/board/useBoardData.ts`
   - Include assignment info in data fetch

9. **Workload page:** `src/app/board/workload/page.tsx`
   - Group by item-level assignment

10. **Assignment step:** `src/components/intake/assignment-step.tsx`
    - Update to use item-level assignment (or keep order-level as default)

## Sources

### Primary (HIGH confidence)
- Migration files in `supabase/migrations/` - Direct examination of schema
- `src/lib/types/database.ts` - Current TypeScript types
- `src/app/api/intake/route.ts` - Current order creation flow
- `src/app/board/workload/page.tsx` - Current workload display logic

### Secondary (MEDIUM confidence)
- Supabase documentation for PostgreSQL migration patterns
- Project's existing migration patterns (0001-0030)

### Tertiary (LOW confidence)
- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct code examination
- Architecture: HIGH - Migration files and RPC functions examined
- Pitfalls: HIGH - Based on actual code patterns found

**Research date:** 2026-01-20
**Valid until:** N/A - This is codebase-specific research, valid until schema changes
