-- Create RPC function to get orders with all related data in a single query
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
  due_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  estimated_completion_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  price_cents BIGINT,
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
    o.price_cents,
    o.is_active,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.phone as client_phone,
    c.email as client_email,
    COALESCE(
      json_agg(
        json_build_object(
          'id', g.id,
          'type', g.type,
          'color', g.color,
          'brand', g.brand,
          'notes', g.notes,
          'label_code', g.label_code,
          'photo_path', g.photo_path,
          'services', (
            SELECT json_agg(
              json_build_object(
                'id', gs.id,
                'quantity', gs.quantity,
                'custom_price_cents', gs.custom_price_cents,
                'notes', gs.notes,
                'service_id', gs.service_id,
                'service', json_build_object(
                  'id', s.id,
                  'name', s.name,
                  'description', s.description,
                  'base_price_cents', s.base_price_cents,
                  'estimated_minutes', s.estimated_minutes
                )
              )
            )
            FROM garment_service gs
            LEFT JOIN service s ON gs.service_id = s.id
            WHERE gs.garment_id = g.id
          )
        )
      ) FILTER (WHERE g.id IS NOT NULL),
      '[]'::json
    ) as garments,
    (SELECT COUNT(*) FROM garment WHERE order_id = o.id) as total_garments,
    (SELECT COUNT(*) FROM garment_service WHERE garment_id IN (SELECT id FROM garment WHERE order_id = o.id)) as total_services
  FROM "order" o
  LEFT JOIN client c ON o.client_id = c.id
  LEFT JOIN garment g ON o.id = g.order_id
  WHERE o.is_archived = false
    AND (p_client_id IS NULL OR o.client_id = p_client_id)
  GROUP BY
    o.id, c.id
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_details TO service_role;