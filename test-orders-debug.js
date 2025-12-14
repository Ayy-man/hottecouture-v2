// Test script to verify database function and debug orders API
import { createServiceRoleClient } from './src/lib/supabase/server.js';

async function testOrdersFunction() {
  console.log('🔍 Testing database function...\n');

  const supabase = await createServiceRoleClient();

  if (!supabase) {
    console.error('❌ Failed to create Supabase client');
    return;
  }

  try {
    // Test 1: Check if function exists and what columns it returns
    console.log('1. Testing function existence...');
    const { data: funcInfo, error: funcError } = await supabase
      .rpc('get_orders_with_details', {
        p_limit: 1,
        p_offset: 0,
        p_client_id: null
      });

    if (funcError) {
      console.error('❌ Function error:', funcError);

      // Check if it's a column error
      if (funcError.message.includes('column') && funcError.message.includes('does not exist')) {
        console.log('\n🎯 Column does not exist error detected');
        console.log('This means the old function with "price_cents" is still active');
      }
    } else {
      console.log('✅ Function executed successfully');
      if (funcInfo && funcInfo.length > 0) {
        const order = funcInfo[0];
        console.log('Columns returned:', Object.keys(order));

        // Check for both price_cents and total_cents
        if ('price_cents' in order) {
          console.log('❌ OLD function detected: uses price_cents');
        }
        if ('total_cents' in order) {
          console.log('✅ NEW function detected: uses total_cents');
        }
      }
    }

    // Test 2: Check order table schema
    console.log('\n2. Checking order table columns...');
    const { data: columns, error: colError } = await supabase
      .from('order')
      .select('id, total_cents, price_cents')
      .limit(1);

    if (colError) {
      console.error('❌ Column check error:', colError);
      if (colError.message.includes('column "price_cents" does not exist')) {
        console.log('✅ Confirmed: Table uses total_cents (not price_cents)');
      }
    } else {
      console.log('Columns in order table:', Object.keys(columns[0] || {}));
    }

    // Test 3: Check migrations
    console.log('\n3. Recent migrations that might affect this:');
    console.log('- 20240101_get_orders_with_details.sql: Uses price_cents');
    console.log('- 20241214_fix_orders_rpc.sql: Uses total_cents (CORRECT)');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testOrdersFunction().then(() => {
  console.log('\n🏁 Test complete');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});