-- Fix: Update get_orders_with_details function to use correct column names

-- First, let's add the missing columns to the order table if they don't exist
DO $$
BEGIN
    -- Add estimated_completion_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order' AND column_name = 'estimated_completion_date'
    ) THEN
        ALTER TABLE "order" ADD COLUMN estimated_completion_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add actual_completion_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order' AND column_name = 'actual_completion_date'
    ) THEN
        ALTER TABLE "order" ADD COLUMN actual_completion_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add is_active if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE "order" ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS get_orders_with_details;

CREATE OR REPLACE FUNCTION get_orders_with_details(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  -- Order fields
  id UUID,
  order_number BIGINT,
  client_id UUID,
  status TEXT,
  rush BOOLEAN,
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  total_cents BIGINT,
  is_active BOOLEAN,
  -- Client fields
  client_first_name TEXT,
  client_last_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  -- Garments array
  garments JSONB,
  -- Computed fields
  total_garments INTEGER,
  total_services INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.client_id,
    o.status,
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
    c.first_name AS client_first_name,
    c.last_name AS client_last_name,
    c.phone AS client_phone,
    c.email AS client_email,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', g.id,
          'type', g.type,
          'label_code', g.label_code,
          'position_notes', g.position_notes,
          'services', COALESCE(
            (
              SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', gs.id,
                  'service_id', gs.service_id,
                  'custom_service_name', gs.custom_service_name,
                  'quantity', gs.quantity,
                  'service', (
                    SELECT JSON_BUILD_OBJECT(
                      'id', s.id,
                      'name', s.name,
                      'category_id', s.category_id,
                      'price', s.price
                    )
                    FROM service s
                    WHERE s.id = gs.service_id
                  )
                )
              )
              FROM garment_service gs
              WHERE gs.garment_id = g.id
            ),
            '[]'::json
          )
        )
      ),
      '[]'::json
    ) AS garments,
    COALESCE(
      (SELECT COUNT(*) FROM garment WHERE order_id = o.id),
      0
    ) AS total_garments,
    COALESCE(
      (SELECT COUNT(*) FROM garment_service WHERE garment_id IN (SELECT id FROM garment WHERE order_id = o.id)),
      0
    ) AS total_services
  FROM "order" o
  INNER JOIN client c ON c.id = o.client_id
  LEFT JOIN garment g ON g.order_id = o.id
  WHERE o.is_archived = FALSE
    AND (p_client_id IS NULL OR o.client_id = p_client_id)
  GROUP BY
    o.id, o.order_number, o.client_id, o.status, o.rush, o.due_date,
    o.notes, o.created_at, o.updated_at, o.is_archived,
    o.estimated_completion_date, o.actual_completion_date,
    o.total_cents, o.is_active,
    c.first_name, c.last_name, c.phone, c.email
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_details TO service_role;