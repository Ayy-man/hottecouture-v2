-- Add display_order column for admin reorder functionality (BUG-5)
ALTER TABLE garment_type
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Seed initial display_order values from current sort order
-- (matches public GET /api/garment-types: category ASC, is_common DESC, name ASC)
WITH ordered AS (
  SELECT id,
    ROW_NUMBER() OVER (ORDER BY category ASC, is_common DESC, name ASC) - 1 AS row_num
  FROM garment_type
)
UPDATE garment_type
SET display_order = ordered.row_num
FROM ordered
WHERE garment_type.id = ordered.id;

-- Index for efficient ORDER BY display_order queries
CREATE INDEX IF NOT EXISTS idx_garment_type_display_order ON garment_type(display_order);
