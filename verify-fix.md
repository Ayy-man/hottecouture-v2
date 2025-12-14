# Verification Steps After Running SQL Fix

## 1. Test the RPC Function in Supabase SQL Editor
```sql
SELECT * FROM get_orders_with_details(1, 0, NULL);
```

**Expected Result**: Should return order data without any column errors.

## 2. Check the Function Definition
```sql
SELECT pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_orders_with_details';
```

**Expected Result**: Should show `total_cents` not `price_cents`.

## 3. Test the API Endpoint
After a few seconds, visit:
https://your-domain.vercel.app/api/orders?limit=1

**Expected Result**: Should return JSON with orders, not a 500 error.

## 4. Test the Board Page
Visit your board page in the browser.

**Expected Result**: Should load orders successfully without errors.

## If Still Broken
- Check browser console for specific errors
- Verify you ran the SQL on the correct project (production, not local)
- Refresh the page to clear any cached errors