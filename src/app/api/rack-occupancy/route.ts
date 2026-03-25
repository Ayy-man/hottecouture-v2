import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('order')
    .select('id, order_number, rack_position')
    .not('rack_position', 'is', null)
    .in('status', ['ready', 'delivered'])
    .eq('is_archived', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return as a map: { "A1": { orderId: "xxx", orderNumber: 123 }, "B3": ... }
  const occupancy: Record<string, { orderId: string; orderNumber: number }> = {};
  for (const row of data || []) {
    if (row.rack_position) {
      occupancy[row.rack_position] = {
        orderId: row.id,
        orderNumber: row.order_number,
      };
    }
  }

  return NextResponse.json({ occupancy });
}
