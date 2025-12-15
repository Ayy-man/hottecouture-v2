-- WORKING VERSION - Use explicit aliases to avoid all ambiguity
-- This should fix the id reference error once and for all

DROP FUNCTION IF EXISTS get_orders_with_details;

CREATE OR REPLACE FUNCTION get_orders_with_details(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
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
  total_cents INTEGER,
  is_active BOOLEAN,
  client_first_name TEXT,
  client_last_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  garments JSONB,
  total_garments INTEGER,
  total_services INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS id,
    o.order_number AS order_number,
    o.client_id AS client_id,
    o.status AS status,
    o.rush AS rush,
    o.due_date AS due_date,
    o.notes AS notes,
    o.created_at AS created_at,
    o.updated_at AS updated_at,
    o.is_archived AS is_archived,
    o.estimated_completion_date AS estimated_completion_date,
    o.actual_completion_date AS actual_completion_date,
    o.total_cents AS total_cents,
    o.is_active AS is_active,
    COALESCE(c.first_name, '') AS client_first_name,
    COALESCE(c.last_name, '') AS client_last_name,
    COALESCE(c.phone, '') AS client_phone,
    COALESCE(c.email, '') AS client_email,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'garment_id', g.id,
            'type', g.type,
            'label_code', g.label_code,
            'position_notes', g.position_notes,
            'services', COALESCE(
              (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'garment_service_id', gs.id,
                    'service_id', gs.service_id,
                    'quantity', gs.quantity,
                    'custom_price_cents', gs.custom_price_cents,
                    'notes', gs.notes,
                    'service', (
                      SELECT JSON_BUILD_OBJECT(
                        'service_id', s.id,
                        'name', s.name,
                        'category', s.category,
                        'base_price_cents', s.base_price_cents
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
        )
        FROM garment g
        WHERE g.order_id = o.id
      ),
      '[]'::json
    ) AS garments,
    (SELECT COUNT(*) FROM garment WHERE order_id = o.id) AS total_garments,
    (SELECT COUNT(*) FROM garment_service WHERE garment_id IN (SELECT id FROM garment WHERE order_id = o.id)) AS total_services
  FROM "order" o
  LEFT JOIN client c ON c.id = o.client_id
  WHERE o.is_archived = FALSE
    AND (p_client_id IS NULL OR o.client_id = p_client_id)
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_details TO service_role;

-- Test the function
SELECT * FROM get_orders_with_details(1, 0, NULL);