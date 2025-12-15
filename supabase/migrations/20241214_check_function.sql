-- SQL to check the current function state
-- This is for debugging, not a migration

SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_orders_with_details';

-- Test the function
SELECT * FROM get_orders_with_details(1, 0, NULL);