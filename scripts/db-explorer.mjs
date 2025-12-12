/**
 * Database Explorer Script
 *
 * Connects to Supabase and displays table counts and sample data.
 *
 * Usage:
 *   node scripts/db-explorer.mjs
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('   Please ensure .env.local contains:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreTables() {
  console.log('='.repeat(60));
  console.log('HOTTE COUTURE - PRODUCTION DATABASE EXPLORATION');
  console.log('='.repeat(60));
  console.log('');

  // Count records in each table
  const tables = [
    'client',
    'order',
    'garment',
    'service',
    'garment_service',
    'task',
    'category',
    'garment_types',
    'event_log',
    'document',
    'price_list'
  ];

  console.log('📊 TABLE RECORD COUNTS:');
  console.log('-'.repeat(40));

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`  ${table}: ${count} records`);
      }
    } catch (e) {
      console.log(`  ${table}: ERROR - ${e.message}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📋 SAMPLE DATA:');
  console.log('='.repeat(60));

  // Get sample clients
  console.log('\n👥 CLIENTS (first 5):');
  console.log('-'.repeat(40));
  const { data: clients, error: clientError } = await supabase
    .from('client')
    .select('id, first_name, last_name, phone, email, language, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (clientError) {
    console.log('  Error:', clientError.message);
  } else if (clients?.length === 0) {
    console.log('  No clients found');
  } else {
    clients?.forEach(c => {
      console.log(`  • ${c.first_name} ${c.last_name} - ${c.phone || 'No phone'} (${c.language})`);
    });
  }

  // Get sample orders with status breakdown
  console.log('\n📦 ORDERS BY STATUS:');
  console.log('-'.repeat(40));
  const { data: orders, error: orderError } = await supabase
    .from('order')
    .select('id, order_number, status, type, rush, total_cents, created_at');

  if (orderError) {
    console.log('  Error:', orderError.message);
  } else if (orders?.length === 0) {
    console.log('  No orders found');
  } else {
    const statusCounts = {};
    const typeCounts = {};
    let totalRevenue = 0;
    let rushCount = 0;

    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      typeCounts[o.type] = (typeCounts[o.type] || 0) + 1;
      totalRevenue += o.total_cents || 0;
      if (o.rush) rushCount++;
    });

    console.log('  By Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });

    console.log('  By Type:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    console.log(`  Rush Orders: ${rushCount}`);
    console.log(`  Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
  }

  // Get services
  console.log('\n🛠️ SERVICES (sample):');
  console.log('-'.repeat(40));
  const { data: services, error: serviceError } = await supabase
    .from('service')
    .select('id, code, name, base_price_cents, category, is_custom')
    .limit(10);

  if (serviceError) {
    console.log('  Error:', serviceError.message);
  } else if (services?.length === 0) {
    console.log('  No services found');
  } else {
    services?.forEach(s => {
      console.log(`  • [${s.code}] ${s.name} - $${(s.base_price_cents / 100).toFixed(2)} ${s.is_custom ? '(custom)' : ''}`);
    });
  }

  // Get categories
  console.log('\n📁 CATEGORIES:');
  console.log('-'.repeat(40));
  const { data: categories, error: catError } = await supabase
    .from('category')
    .select('id, name, sort_order');

  if (catError) {
    console.log('  Error:', catError.message);
  } else if (categories?.length === 0) {
    console.log('  No categories found');
  } else {
    categories?.forEach(c => {
      console.log(`  • ${c.name} (order: ${c.sort_order})`);
    });
  }

  // Get garment types
  console.log('\n👕 GARMENT TYPES (sample):');
  console.log('-'.repeat(40));
  const { data: garmentTypes, error: gtError } = await supabase
    .from('garment_types')
    .select('id, name, is_active')
    .limit(15);

  if (gtError) {
    console.log('  Error:', gtError.message);
  } else if (garmentTypes?.length === 0) {
    console.log('  No garment types found');
  } else {
    garmentTypes?.forEach(gt => {
      console.log(`  • ${gt.name} ${gt.is_active ? '✓' : '(inactive)'}`);
    });
  }

  // Get recent activity from event_log
  console.log('\n📜 RECENT ACTIVITY (last 5 events):');
  console.log('-'.repeat(40));
  const { data: events, error: eventError } = await supabase
    .from('event_log')
    .select('id, created_at, actor, entity, action')
    .order('created_at', { ascending: false })
    .limit(5);

  if (eventError) {
    console.log('  Error:', eventError.message);
  } else if (events?.length === 0) {
    console.log('  No events found');
  } else {
    events?.forEach(e => {
      const date = new Date(e.created_at).toLocaleString();
      console.log(`  • [${date}] ${e.entity}.${e.action} by ${e.actor || 'system'}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('END OF EXPLORATION');
  console.log('='.repeat(60));
}

exploreTables().catch(console.error);
