import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const COLUMNS = [
  {
    id: 'pending',
    title: 'Pending',
    description: 'New orders awaiting assignment',
  },
  {
    id: 'working',
    title: 'Working',
    description: 'Orders currently in progress',
  },
  { id: 'done', title: 'Done', description: 'Completed work awaiting review' },
  { id: 'ready', title: 'Ready', description: 'Ready for pickup or delivery' },
  {
    id: 'delivered',
    title: 'Delivered',
    description: 'Completed and delivered',
  },
];

export default async function StaticBoardPage() {
  console.log('🎯 Static board page rendering...');

  let orders: any[] = [];
  let error: string | null = null;

  try {
    console.log('🔍 Fetching orders from Supabase...');

    const supabase = await createClient();

    // Fetch orders with related data
    const { data: ordersData, error: ordersError } = await supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        type,
        status,
        due_date,
        rush,
        rack_position,
        created_at,
        client_id
      `
      )
      .order('created_at', { ascending: false });

    console.log('📊 Orders query result:', { ordersData, ordersError });

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Fetch clients and garments separately
    const clientIds =
      ordersData?.map((o: any) => o.client_id).filter(Boolean) || [];
    const orderIds = ordersData?.map((o: any) => o.id) || [];

    // Fetch clients
    const { data: clientsData } = await supabase
      .from('client')
      .select('id, first_name, last_name')
      .in('id', clientIds);

    // Fetch garments
    const { data: garmentsData } = await supabase
      .from('garment')
      .select('id, order_id, type')
      .in('order_id', orderIds);

    // Create lookup maps
    const clientsMap: Record<string, any> = {};
    const garmentsMap: Record<string, any[]> = {};

    // Populate clients map
    if (clientsData) {
      (clientsData as any[]).forEach((c: any) => {
        clientsMap[c.id] = c;
      });
    }

    if (garmentsData) {
      (garmentsData as any[]).forEach((g: any) => {
        if (!garmentsMap[g.order_id]) {
          garmentsMap[g.order_id] = [];
        }
        garmentsMap[g.order_id]!.push(g);
      });
    }

    // Transform the data
    orders =
      ordersData?.map((order: any) => {
        const client = clientsMap[order.client_id] || null;
        const garments = garmentsMap[order.id] || [];

        return {
          id: order.id,
          order_number: order.order_number,
          type: order.type,
          status: order.status,
          due_date: order.due_date,
          rush: order.rush,
          rack_position: order.rack_position,
          created_at: order.created_at,
          client: {
            first_name: client?.first_name || '',
            last_name: client?.last_name || '',
          },
          garments: garments,
          services_count: garments.length,
        };
      }) || [];

    console.log('✅ Transformed orders:', orders.length);
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    error = err instanceof Error ? err.message : 'Failed to fetch orders';
  }

  if (error) {
    return (
      <div className='p-8'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-red-800 mb-2'>
            Error Loading Board
          </h2>
          <p className='text-red-600 mb-4'>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          Kanban Board (Static)
        </h1>
        <p className='text-gray-600'>
          Order Management Dashboard - Server-Side Rendered
        </p>
      </div>

      {/* Board */}
      <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
        {COLUMNS.map(column => (
          <div
            key={column.id}
            className='bg-gray-50 border-2 border-gray-200 rounded-lg p-4'
          >
            <div className='mb-4'>
              <h3 className='text-lg font-semibold text-gray-700'>
                {column.title}
              </h3>
              <p className='text-sm text-gray-600'>{column.description}</p>
            </div>

            <div className='space-y-3'>
              {orders
                .filter(order => {
                  // Simple status mapping for demo
                  switch (column.id) {
                    case 'pending':
                      return order.status === 'pending';
                    case 'working':
                      return (
                        order.status === 'working' ||
                        order.status === 'in_progress'
                      );
                    case 'done':
                      return order.status === 'completed';
                    case 'ready':
                      return order.status === 'ready';
                    case 'delivered':
                      return order.status === 'delivered';
                    default:
                      return false;
                  }
                })
                .map(order => (
                  <div
                    key={order.id}
                    className='bg-white p-3 rounded-lg shadow-sm border'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h4 className='font-semibold text-sm'>
                        #{order.order_number}
                      </h4>
                      {order.rush && (
                        <span className='px-2 py-1 text-xs font-bold text-white bg-red-500 rounded'>
                          Rush
                        </span>
                      )}
                    </div>
                    <p className='text-sm text-gray-600'>
                      {order.client.first_name} {order.client.last_name}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {order.garments.map((g: any) => g.type).join(', ')}
                    </p>
                    {order.due_date && (
                      <p className='text-xs text-gray-500 mt-1'>
                        Due: {new Date(order.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
            </div>

            {orders.filter(order => {
              switch (column.id) {
                case 'pending':
                  return order.status === 'pending';
                case 'working':
                  return (
                    order.status === 'working' || order.status === 'in_progress'
                  );
                case 'done':
                  return order.status === 'completed';
                case 'ready':
                  return order.status === 'ready';
                case 'delivered':
                  return order.status === 'delivered';
                default:
                  return false;
              }
            }).length === 0 && (
              <div className='text-center text-gray-500 py-8'>
                <p className='text-sm'>No orders in this stage</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className='mt-8 flex justify-between items-center'>
        <div className='text-sm text-gray-600'>
          Total orders: {orders.length}
        </div>
        <div className='space-x-4'>
          <Link
            href='/intake'
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Create New Order
          </Link>
        </div>
      </div>
    </div>
  );
}
