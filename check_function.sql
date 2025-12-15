-- Run this to check what's wrong with the function
-- This will tell us exactly what's happening

-- First, check if function exists and its definition
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_orders_with_details';

-- If the function exists, try to test it
-- If it fails with "column price_cents does not exist", we know the old function is still there