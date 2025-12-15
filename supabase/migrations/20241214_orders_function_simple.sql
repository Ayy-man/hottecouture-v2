-- SIMPLE VERSION - Direct query without RETURNS TABLE ambiguity
-- This should finally work!

DROP FUNCTION IF EXISTS get_orders_with_details;

CREATE OR REPLACE FUNCTION get_orders_with_details(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_client_id UUID DEFAULT NULL
)
RETURNS SETOF json AS $$
DECLARE
  result json;
BEGIN
  RETURN QUERY EXECUTE '
    SELECT json_agg(
      json_build_object(
        ''id'', o.id,
        ''order_number'', o.order_number,
        ''client_id'', o.client_id,
        ''status'', o.status,
        ''rush'', o.rush,
        ''due_date'', o.due_date,
        ''notes'', o.notes,
        ''created_at'', o.created_at,
        ''updated_at'', o.updated_at,
        ''is_archived'', o.is_archived,
        ''estimated_completion_date'', o.estimated_completion_date,
        ''actual_completion_date'', o.actual_completion_date,
        ''total_cents'', o.total_cents,
        ''is_active'', o.is_active,
        ''client_first_name'', COALESCE(c.first_name, ''''),
        ''client_last_name'', COALESCE(c.last_name, ''''),
        ''client_phone'', COALESCE(c.phone, ''''),
        ''client_email'', COALESCE(c.email, ''''),
        ''garments'', COALESCE(garments_json, ''[]''::json),
        ''total_garments'', garment_count,
        ''total_services'', service_count
      )
    )
    FROM (
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
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              ''garment_id'', g.id,
              ''type'', g.type,
              ''label_code'', g.label_code,
              ''position_notes'', g.position_notes,
              ''services'', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      ''garment_service_id'', gs.id,
                      ''service_id'', gs.service_id,
                      ''quantity'', gs.quantity,
                      ''custom_price_cents'', gs.custom_price_cents,
                      ''notes'', gs.notes,
                      ''service'', json_build_object(
                        ''service_id'', s.id,
                        ''name'', s.name,
                        ''category'', s.category,
                        ''base_price_cents'', s.base_price_cents
                      )
                    )
                  )
                  FROM garment_service gs
                  WHERE gs.garment_id = g.id
                ),
                ''[]''::json
              )
            )
          ), ''[]''::json)
          FROM garment g
          WHERE g.order_id = o.id
        ) as garments_json,
        (SELECT COUNT(*) FROM garment WHERE order_id = o.id) as garment_count,
        (SELECT COUNT(*) FROM garment_service WHERE garment_id IN (
          SELECT id FROM garment WHERE order_id = o.id
        )) as service_count
      FROM "order" o
      LEFT JOIN client c ON c.id = o.client_id
      WHERE o.is_archived = FALSE
        AND ($1::UUID IS NULL OR o.client_id = $1::UUID)
      ORDER BY o.created_at DESC
      LIMIT $2
      OFFSET $3
    ) o
  ';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Or even simpler - just use a plain SQL function (not PL/pgSQL)
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
    COALESCE(c.first_name, '') AS client_first_name,
    COALESCE(c.last_name, '') AS client_last_name,
    COALESCE(c.phone, '') AS client_phone,
    COALESCE(c.email, '') AS client_email,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', g.id,
            'type', g.type,
            'label_code', g.label_code,
            'position_notes', g.position_notes,
            'services', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', gs.id,
                    'service_id', gs.service_id,
                    'quantity', gs.quantity,
                    'custom_price_cents', gs.custom_price_cents,
                    'notes', gs.notes,
                    'service', json_build_object(
                      'id', s.id,
                      'name', s.name,
                      'category', s.category,
                      'price', s.base_price_cents
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
  GROUP BY
    o.id, o.order_number, o.client_id, o.status, o.rush, o.due_date,
    o.notes, o.created_at, o.updated_at, o.is_archived,
    o.estimated_completion_date, o.actual_completion_date,
    o.total_cents, o.is_active,
    c.first_name, c.last_name, c.phone, c.email
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_with_details TO service_role;

-- Test it
SELECT * FROM get_orders_with_details(1, 0, NULL);