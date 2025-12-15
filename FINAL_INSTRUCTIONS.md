# FINAL INSTRUCTIONS TO FIX THE 500 ERROR

## Step 1: Go to Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Click on your project
3. Click on "SQL Editor" in the sidebar

## Step 2: Run the Fix
1. Copy the entire contents of `RUN_THIS_IN_SUPABASE.sql`
2. Paste it into the SQL Editor
3. Click "Run"

## Step 3: Test That It Worked
In the same SQL Editor, run:
```sql
SELECT * FROM get_orders_with_details(1, 0, NULL);
```

If it returns order data without errors, the fix worked!

## Step 4: Check Your Website
Wait 30 seconds, then refresh your board page. The 500 error should be gone!

## What This Fixes
- The function was trying to access `price_cents` which doesn't exist
- The table actually uses `total_cents` column
- This SQL updates the function to use the correct column name

## Why It Didn't Fix Before
The SQL files were created but never actually run in the production database. You must manually run them in the Supabase dashboard.