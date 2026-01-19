-- Migration: Add item-level assignment to garment_service
-- Purpose: Enable different seamstresses to work on different items within the same order
-- by moving assignment from order-level to garment_service-level.

-- Step 1: Add assigned_seamstress_id column (UUID FK to staff table)
ALTER TABLE garment_service
ADD COLUMN IF NOT EXISTS assigned_seamstress_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Step 2: Create index for filtering by seamstress (performance)
CREATE INDEX IF NOT EXISTS idx_garment_service_assigned_seamstress
ON garment_service(assigned_seamstress_id);

-- Step 3: Add column comment for documentation
COMMENT ON COLUMN garment_service.assigned_seamstress_id IS 'UUID of assigned seamstress (references staff.id). This is the primary assignment field - order.assigned_to is deprecated.';

-- Step 4: Migrate existing order-level assignments to item-level
-- Strategy: Join garment_service -> garment -> order, match order.assigned_to to staff.name
-- Use case-insensitive matching with TRIM() to handle whitespace differences
-- Use LEFT JOIN so records with no matching staff get NULL (not errors)

UPDATE garment_service gs
SET assigned_seamstress_id = matched_staff.id
FROM (
  SELECT
    gs_inner.id as garment_service_id,
    s.id as staff_id
  FROM garment_service gs_inner
  JOIN garment g ON g.id = gs_inner.garment_id
  JOIN "order" o ON o.id = g.order_id
  LEFT JOIN staff s ON LOWER(TRIM(s.name)) = LOWER(TRIM(o.assigned_to))
  WHERE o.assigned_to IS NOT NULL
    AND gs_inner.assigned_seamstress_id IS NULL
) matched_staff(garment_service_id, id)
WHERE gs.id = matched_staff.garment_service_id
  AND matched_staff.id IS NOT NULL;

-- Also migrate from garment_service.assignee (VARCHAR) if it has data
UPDATE garment_service gs
SET assigned_seamstress_id = (
  SELECT s.id
  FROM staff s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(gs.assignee))
  LIMIT 1
)
WHERE gs.assignee IS NOT NULL
  AND gs.assigned_seamstress_id IS NULL;

-- Also migrate from garment.assignee for any still missing
UPDATE garment_service gs
SET assigned_seamstress_id = (
  SELECT s.id
  FROM staff s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM((
    SELECT g.assignee FROM garment g WHERE g.id = gs.garment_id
  )))
  LIMIT 1
)
WHERE gs.assigned_seamstress_id IS NULL
  AND EXISTS (
    SELECT 1 FROM garment g WHERE g.id = gs.garment_id AND g.assignee IS NOT NULL
  );

-- Note: We do NOT remove the old order.assigned_to column (backward compatibility)
-- It will be deprecated in a future migration after UI is updated.
