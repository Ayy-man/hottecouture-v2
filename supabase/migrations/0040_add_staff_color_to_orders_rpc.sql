-- Migration: Add assigned_seamstress_color to get_orders_with_details RPC
-- Purpose: Include staff color in garment_service JSON so board cards can display it

-- Ensure required columns exist on staff table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'color') THEN
    ALTER TABLE staff ADD COLUMN color VARCHAR(50) DEFAULT '#6366f1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'email') THEN
    ALTER TABLE staff ADD COLUMN email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'phone') THEN
    ALTER TABLE staff ADD COLUMN phone VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'weekly_capacity_hours') THEN
    ALTER TABLE staff ADD COLUMN weekly_capacity_hours INTEGER DEFAULT 40;
  END IF;
END $$;

DROP FUNCTION IF EXISTS get_orders_with_details;

CREATE OR REPLACE FUNCTION get_orders_with_details(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_client_id UUID DEFAULT NULL,
  p_assigned_seamstress_id UUID DEFAULT NULL
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
                    'assigned_seamstress_color', (
                      SELECT st.color FROM staff st WHERE st.id = gs.assigned_seamstress_id
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
              ),
              '[]'::JSON
            )
          )
        )
        FROM garment g
        WHERE g.order_id = o.id
      ),
      '[]'::JSON
    )::JSONB,
    (SELECT COUNT(*) FROM garment gx WHERE gx.order_id = o.id),
    (SELECT COUNT(*) FROM garment_service gsx WHERE gsx.garment_id IN (SELECT gy.id FROM garment gy WHERE gy.order_id = o.id))
  FROM "order" o
  LEFT JOIN client c ON c.id = o.client_id
  WHERE o.is_archived = FALSE
    AND (p_client_id IS NULL OR o.client_id = p_client_id)
    AND (p_assigned_seamstress_id IS NULL OR EXISTS (
      SELECT 1 FROM garment g2
      JOIN garment_service gs3 ON gs3.garment_id = g2.id
      WHERE g2.order_id = o.id
        AND gs3.assigned_seamstress_id = p_assigned_seamstress_id
    ))
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_details TO service_role;
