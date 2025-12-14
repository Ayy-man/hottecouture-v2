# 🔥 PRODUCTION FIX FOR 500 ERROR 🔥

## The Problem
Board page shows "❌ Error fetching orders" because the database function is trying to access a column that doesn't exist (`price_cents` instead of `total_cents`).

## Quick Fix (5 minutes)

### Option 1: Run the All-in-One File
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Open and run: `PRODUCTION_FIX.sql`

### Option 2: Run Individual Files
1. Run `sql/01-fix-orders-function.sql`
2. Run `sql/02-add-missing-columns.sql`
3. Run `sql/03-test-function.sql` to verify

## After Running the Fix
- Wait 30 seconds for Vercel to refresh
- Refresh your board page
- The error should be gone!

## What the Fix Does
- Updates the database function to use `total_cents` (the correct column name)
- Adds missing columns that might be needed
- Fixes the 500 error that's breaking the board page

## Verification
If you want to verify the fix worked in the SQL Editor:
```sql
-- This should return order data without errors
SELECT * FROM get_orders_with_details(1, 0, NULL);
```