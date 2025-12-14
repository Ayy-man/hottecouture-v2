-- Test if the fix worked - run this after applying the fix
SELECT * FROM get_orders_with_details(1, 0, NULL);