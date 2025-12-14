-- SQL to check which version of the function exists and what columns it uses

-- Check function definition
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_orders_with_details';

-- Test the function with a small result set
-- This will fail if the column doesn't exist, showing us the error
SELECT * FROM get_orders_with_details(1, 0, NULL);

-- Check what columns actually exist in the order table
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'order'
  AND column_name LIKE '%cents%';

-- Check if there's a price_cents column
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'order'
  AND column_name = 'price_cents'
) as has_price_cents;

-- Check if there's a total_cents column
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'order'
  AND column_name = 'total_cents'
) as has_total_cents;