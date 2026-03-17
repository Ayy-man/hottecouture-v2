# Phase 1: Item-Level Assignment - Research

**Researched:** 2026-01-20
**Domain:** Database schema migration, assignment model refactoring
**Confidence:** HIGH

## Summary

This research analyzes the current Hotte Couture codebase to understand how to change the assignment model from order-level to item-level. The current system has a complex, partially-implemented assignment structure with assignments occurring at multiple levels (order, garment, task, garment_service). The goal is to consolidate assignment at the `garment_service` level (the item/service combination) so different seamstresses can work on different items within the same order.

**Current State:**
1. **Order-level assignment:** `order.assigned_to` (VARCHAR(100) - stores name string, not UUID)
2. **Garment-level assignment:** `garment.assignee` (VARCHAR(100) - from migration 0025)
3. **Task-level assignment:** `task.assignee` (VARCHAR(100))
4. **garment_service-level assignment:** `garment_service.assignee` (VARCHAR(100) - from migration 0025)
5. **Staff table:** `staff(id UUID, name VARCHAR(100), is_active BOOLEAN)`

**Primary recommendation:** Add `assigned_seamstress_id` (UUID FK to staff) to `garment_service` table, migrate existing assignments, update RPC function and queries to filter by item-level assignment.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | Current | PostgreSQL database with RPC functions | Already in use, supports migrations |
| Next.js API Routes | 14+ | Server-side data operations | Already in use for all data mutations |
| Zod | 3.x | Schema validation | Already in use in `src/lib/dto.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Current | Date formatting | Already in use for date displays |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| UUID FK | VARCHAR name | UUID provides referential integrity, easier joins, handles name changes |
| New column | Rename existing `assignee` | Adding new column is safer for migration |

**Installation:**
No new packages needed - all required tools already in stack.

## Architecture Patterns

### Current Database Structure

```
order (order-level assignment - CURRENT)
|-- assigned_to: VARCHAR(100) -- seamstress name
|
|-- garment (garment-level - partial)
|   |-- assignee: VARCHAR(100) -- from migration 0025
|   |-- stage: VARCHAR(20)
|   |-- is_active: BOOLEAN
|   |
|   +-- garment_service (item-level - TARGET)
|       |-- assignee: VARCHAR(100) -- from migration 0025
|       |-- stage: VARCHAR(20)
|       +-- [NEW] assigned_seamstress_id: UUID FK to staff
|
+-- tasks (legacy, largely deprecated)
    +-- assignee: VARCHAR(100)
```

### Target Database Structure

```
order
|-- assigned_to: VARCHAR(100) -- DEPRECATED, keep for backwards compat
|
|-- garment
|   |-- assignee: VARCHAR(100) -- DEPRECATED
|   |
|   +-- garment_service (PRIMARY ASSIGNMENT)
|       |-- assigned_seamstress_id: UUID FK to staff -- NEW
|       |-- stage: VARCHAR(20)
|       +-- assignee: VARCHAR(100) -- DEPRECATED, keep for migration
|
+-- staff
    |-- id: UUID
    |-- name: VARCHAR(100)
    +-- is_active: BOOLEAN
```

### Pattern 1: Foreign Key Assignment with Staff Table

**What:** Use UUID foreign key to `staff` table instead of storing name strings
**When to use:** All new assignment operations
**Example:**
```sql
-- Migration: Add assigned_seamstress_id to garment_service
ALTER TABLE garment_service
ADD COLUMN assigned_seamstress_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Index for filtering by seamstress
CREATE INDEX idx_garment_service_assigned_seamstress
ON garment_service(assigned_seamstress_id);
```

### Pattern 2: RPC Function Updates

**What:** Update `get_orders_with_details` to include item-level assignment
**When to use:** API route fetches orders list
**Example:**
```sql
-- In the garment services JSON aggregation, include assignment
JSON_BUILD_OBJECT(
  'garment_service_id', gs.id,
  'service_id', gs.service_id,
  'assigned_seamstress_id', gs.assigned_seamstress_id,
  'assigned_seamstress_name', (
    SELECT s.name FROM staff s WHERE s.id = gs.assigned_seamstress_id
  ),
  -- ... other fields
)
```

### Pattern 3: Seamstress Filter Query

**What:** Filter orders/items by assigned seamstress
**When to use:** Board view showing only items for a specific seamstress
**Example:**
```typescript
// Client-side: filter items by seamstress
const myItems = orders.flatMap(order =>
  order.garments.flatMap(garment =>
    garment.services.filter(service =>
      service.assigned_seamstress_id === currentStaffId
    )
  )
);

// Server-side: RPC parameter for filtering
const { data } = await supabase.rpc('get_orders_with_details', {
  p_limit: limit,
  p_offset: offset,
  p_seamstress_id: staffId  // NEW parameter
});
```

### Anti-Patterns to Avoid
- **Storing names instead of IDs:** Current `assignee VARCHAR(100)` pattern - if a seamstress changes their name, all historical assignments break
- **Multiple assignment fields:** Don't maintain both order-level and item-level assignments as sources of truth - item-level should be authoritative
- **Filtering at application layer only:** For performance, filtering should happen in SQL/RPC, not just in JavaScript

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Seamstress dropdown | Custom staff list | `useStaff()` hook | Already fetches active staff from DB |
| Database client | Raw fetch calls | `createServiceRoleClient()` | Handles auth, env vars |
| Assignment validation | Manual checks | Zod schema in dto.ts | Consistent validation pattern |
| Staff ID lookup | Inline query | JOIN in RPC function | Single query, better performance |

**Key insight:** The codebase already has a `staff` table with UUIDs and a `useStaff()` hook. Using `staff.id` as FK provides better data integrity than storing name strings.

## Common Pitfalls

### Pitfall 1: Breaking Existing Queries
**What goes wrong:** Changing `get_orders_with_details` RPC breaks API consumers
**Why it happens:** RPC is used by `/api/orders/route.ts` which is used by multiple pages
**How to avoid:** Add new fields as OPTIONAL, don't remove existing fields until fully migrated
**Warning signs:** Board page stops loading, "undefined" values in UI

### Pitfall 2: Migration Data Loss
**What goes wrong:** Existing assignments lost during migration
**Why it happens:** Not copying `order.assigned_to` to child items
**How to avoid:**
1. First migration ADDS column
2. Second migration COPIES existing data
3. Third migration (later) deprecates old column
**Warning signs:** Orders show "Unassigned" after migration when they were assigned before

### Pitfall 3: UI Not Reflecting Item-Level
**What goes wrong:** UI still shows order-level assignment dropdown
**Why it happens:** `AssignmentStep` component assigns to `order.assigned_to`
**How to avoid:**
1. Update intake flow to assign to each garment_service
2. Update board filters to look at item assignment
**Warning signs:** Orders still get single seamstress even with multiple items

### Pitfall 4: Real-time Sync Breaking
**What goes wrong:** Board doesn't update when assignments change
**Why it happens:** Supabase real-time subscription is on `order` table, not `garment_service`
**How to avoid:** Either add subscription to `garment_service` or trigger order update when services change
**Warning signs:** Other users don't see assignment changes until refresh

### Pitfall 5: Timer Permission Checks Breaking
**What goes wrong:** Seamstresses can't start timers on their own tasks
**Why it happens:** Timer routes check `garment.assignee` not `garment_service.assigned_seamstress_id`
**How to avoid:** Update permission checks in `/api/timer/start`, `/api/timer/stop`, `/api/timer/pause`, `/api/timer/resume`
**Warning signs:** "Permission denied" errors when starting timers

## Code Examples

### Migration: Add Column

```sql
-- File: supabase/migrations/0031_add_item_level_assignment.sql

-- Add assigned_seamstress_id to garment_service
ALTER TABLE garment_service
ADD COLUMN IF NOT EXISTS assigned_seamstress_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_garment_service_assigned_seamstress
ON garment_service(assigned_seamstress_id);

-- Comment for documentation
COMMENT ON COLUMN garment_service.assigned_seamstress_id IS 'UUID of assigned seamstress (staff.id)';
```

### Migration: Backfill Data

```sql
-- File: supabase/migrations/0032_backfill_item_assignment.sql

-- Backfill from garment_service.assignee (name) to assigned_seamstress_id (UUID)
UPDATE garment_service gs
SET assigned_seamstress_id = (
  SELECT s.id
  FROM staff s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(gs.assignee))
  LIMIT 1
)
WHERE gs.assignee IS NOT NULL
  AND gs.assigned_seamstress_id IS NULL;

-- Backfill from garment.assignee for any missing
UPDATE garment_service gs
SET assigned_seamstress_id = (
  SELECT s.id
  FROM staff s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM((SELECT g.assignee FROM garment g WHERE g.id = gs.garment_id)))
  LIMIT 1
)
WHERE gs.assigned_seamstress_id IS NULL
  AND EXISTS (
    SELECT 1 FROM garment g WHERE g.id = gs.garment_id AND g.assignee IS NOT NULL
  );

-- Backfill from order.assigned_to for any still missing
UPDATE garment_service gs
SET assigned_seamstress_id = (
  SELECT s.id
  FROM staff s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM((
    SELECT o.assigned_to
    FROM "order" o
    JOIN garment g ON g.order_id = o.id
    WHERE g.id = gs.garment_id
  )))
  LIMIT 1
)
WHERE gs.assigned_seamstress_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM garment g
    JOIN "order" o ON o.id = g.order_id
    WHERE g.id = gs.garment_id AND o.assigned_to IS NOT NULL
  );
```

### Update RPC Function

```sql
-- File: supabase/migrations/0033_update_orders_rpc_item_assignment.sql

DROP FUNCTION IF EXISTS get_orders_with_details;

CREATE OR REPLACE FUNCTION get_orders_with_details(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_client_id UUID DEFAULT NULL,
  p_seamstress_id UUID DEFAULT NULL  -- NEW: filter by seamstress
)
RETURNS TABLE (
  id UUID,
  order_number BIGINT,
  client_id UUID,
  type TEXT,
  status TEXT,
  rush BOOLEAN,
  due_date DATE,
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  total_cents INTEGER,
  is_active BOOLEAN,
  assigned_to TEXT,
  client_first_name TEXT,
  client_last_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  garments JSONB,
  total_garments BIGINT,
  total_services BIGINT
) AS $$
  SELECT
    o.id,
    o.order_number,
    o.client_id,
    o.type::TEXT,
    o.status::TEXT,
    o.rush,
    o.due_date,
    o.notes,
    o.created_at,
    o.updated_at,
    o.is_archived,
    o.estimated_completion_date,
    o.actual_completion_date,
    o.total_cents,
    o.is_active,
    o.assigned_to::TEXT,
    COALESCE(c.first_name, '')::TEXT,
    COALESCE(c.last_name, '')::TEXT,
    COALESCE(c.phone, '')::TEXT,
    COALESCE(c.email, '')::TEXT,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'garment_id', g.id,
            'type', g.type,
            'label_code', g.label_code,
            'position_notes', g.position_notes,
            'assignee', g.assignee,
            'estimated_minutes', g.estimated_minutes,
            'services', COALESCE(
              (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'garment_service_id', gs.id,
                    'service_id', gs.service_id,
                    'quantity', gs.quantity,
                    'custom_price_cents', gs.custom_price_cents,
                    'notes', gs.notes,
                    'assigned_seamstress_id', gs.assigned_seamstress_id,
                    'assigned_seamstress_name', (
                      SELECT st.name FROM staff st WHERE st.id = gs.assigned_seamstress_id
                    ),
                    'service', (
                      SELECT JSON_BUILD_OBJECT(
                        'service_id', s.id,
                        'name', s.name,
                        'category', s.category,
                        'base_price_cents', s.base_price_cents,
                        'estimated_minutes', s.estimated_minutes
                      )
                      FROM service s
                      WHERE s.id = gs.service_id
                    )
                  )
                )
                FROM garment_service gs
                WHERE gs.garment_id = g.id
                  AND (p_seamstress_id IS NULL OR gs.assigned_seamstress_id = p_seamstress_id)
              ),
              '[]'::JSON
            )
          )
        )
        FROM garment g
        WHERE g.order_id = o.id
          AND (p_seamstress_id IS NULL OR EXISTS (
            SELECT 1 FROM garment_service gs2
            WHERE gs2.garment_id = g.id
              AND gs2.assigned_seamstress_id = p_seamstress_id
          ))
      ),
      '[]'::JSON
    )::JSONB,
    (SELECT COUNT(*) FROM garment gx WHERE gx.order_id = o.id),
    (SELECT COUNT(*) FROM garment_service gsx WHERE gsx.garment_id IN (SELECT gy.id FROM garment gy WHERE gy.order_id = o.id))
  FROM "order" o
  LEFT JOIN client c ON c.id = o.client_id
  WHERE o.is_archived = FALSE
    AND (p_client_id IS NULL OR o.client_id = p_client_id)
    AND (p_seamstress_id IS NULL OR EXISTS (
      SELECT 1 FROM garment g2
      JOIN garment_service gs3 ON gs3.garment_id = g2.id
      WHERE g2.order_id = o.id
        AND gs3.assigned_seamstress_id = p_seamstress_id
    ))
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_details TO service_role;
```

### TypeScript Type Updates

```typescript
// File: src/lib/types/database.ts - Add to garment_service type

garment_service: {
  Row: {
    id: string;
    garment_id: string;
    service_id: string | null;
    custom_service_name: string | null;
    quantity: number;
    custom_price_cents: number | null;
    notes: string | null;
    stage: string | null;
    is_active: boolean | null;
    started_at: string | null;
    stopped_at: string | null;
    assignee: string | null;
    assigned_seamstress_id: string | null;  // NEW: UUID of staff
  };
  Insert: {
    // ... existing fields ...
    assigned_seamstress_id?: string | null;
  };
  Update: {
    // ... existing fields ...
    assigned_seamstress_id?: string | null;
  };
};
```

### API Route Update Example

```typescript
// File: src/app/api/garment-service/[id]/assign/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const assignSchema = z.object({
  assigned_seamstress_id: z.string().uuid().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id } = await params;
    const body = await request.json();

    const { assigned_seamstress_id } = assignSchema.parse(body);

    const { data, error } = await supabase
      .from('garment_service')
      .update({ assigned_seamstress_id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign item' },
      { status: 500 }
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Order-level assignment | Item-level assignment | This phase | Different seamstresses per item |
| Name strings (`VARCHAR`) | UUID foreign keys | This phase | Data integrity, handles name changes |
| Filter in JavaScript | Filter in RPC SQL | This phase | Better performance |

**Deprecated/outdated:**
- `order.assigned_to`: Will be deprecated after migration (keep for backwards compat)
- `garment.assignee`: Redundant with garment_service assignment
- `garment_service.assignee` (VARCHAR): Replaced by `assigned_seamstress_id` (UUID)

## Key Files to Modify

Based on codebase analysis, these files need updates:

### Database (Migrations)
1. New migration: Add `assigned_seamstress_id` column
2. New migration: Backfill existing data
3. Update migration: Modify `get_orders_with_details` RPC

### TypeScript Types
1. `src/lib/types/database.ts`: Add `assigned_seamstress_id` to `garment_service`

### API Routes
1. `src/app/api/orders/route.ts`: Pass seamstress filter to RPC
2. `src/app/api/intake/route.ts`: Assign seamstress to garment_services on creation
3. `src/app/api/order/[id]/route.ts`: Handle item-level assignment updates
4. `src/app/api/timer/start/route.ts`: Check item assignment, not garment
5. `src/app/api/timer/stop/route.ts`: Check item assignment
6. `src/app/api/timer/pause/route.ts`: Check item assignment
7. `src/app/api/timer/resume/route.ts`: Check item assignment
8. `src/app/api/tasks/order/[orderId]/route.ts`: Return item-level assignments

### Components
1. `src/components/intake/assignment-step.tsx`: Allow per-item assignment
2. `src/components/tasks/task-management-modal.tsx`: Edit item assignment
3. `src/components/board/order-card.tsx`: Show item-level assignees

### Hooks/Data
1. `src/lib/board/useBoardFilters.ts`: Filter by item assignment
2. `src/lib/board/useBoardData.ts`: Fetch item-level assignment data
3. `src/lib/board/types.ts`: Update types for item assignment

### Pages
1. `src/app/board/workload/page.tsx`: Group by item assignment, not order
2. `src/app/board/today/page.tsx`: Filter tasks by item assignment

## Open Questions

Things that couldn't be fully resolved:

1. **Real-time Updates**
   - What we know: Current real-time subscription is on `order` table
   - What's unclear: Will adding subscription to `garment_service` cause performance issues?
   - Recommendation: Start without additional subscription, add if needed

2. **Backwards Compatibility Timeline**
   - What we know: Old `assignee` fields will have data
   - What's unclear: When can deprecated fields be removed?
   - Recommendation: Keep deprecated fields indefinitely, just ignore them in code

3. **Unassigned Items Display**
   - What we know: UI needs to show "Unassigned" category
   - What's unclear: At what level? Per order or per item?
   - Recommendation: Show at item level, which is Phase 10 (Calendar) scope

## Sources

### Primary (HIGH confidence)
- `/Users/aymanbaig/Desktop/hottecouture-main/supabase/migrations/0001_init.sql` - Initial schema
- `/Users/aymanbaig/Desktop/hottecouture-main/supabase/migrations/0014_add_order_assigned_to.sql` - Order-level assignment
- `/Users/aymanbaig/Desktop/hottecouture-main/supabase/migrations/0025_garment_service_is_task.sql` - Current garment_service.assignee
- `/Users/aymanbaig/Desktop/hottecouture-main/supabase/migrations/0030_add_type_to_orders_rpc.sql` - Current RPC function
- `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/types/database.ts` - TypeScript types
- `/Users/aymanbaig/Desktop/hottecouture-main/src/app/api/orders/route.ts` - Orders API
- `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/hooks/useStaff.ts` - Staff hook

### Secondary (MEDIUM confidence)
- `/Users/aymanbaig/Desktop/hottecouture-main/src/app/board/workload/page.tsx` - Current assignment display logic
- `/Users/aymanbaig/Desktop/hottecouture-main/src/components/intake/assignment-step.tsx` - Current assignment UI

### Tertiary (LOW confidence)
- None - all findings verified with codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing codebase patterns
- Architecture: HIGH - Direct analysis of migrations and code
- Pitfalls: HIGH - Identified through code dependency analysis

**Research date:** 2026-01-20
**Valid until:** Indefinite (codebase-specific research)
