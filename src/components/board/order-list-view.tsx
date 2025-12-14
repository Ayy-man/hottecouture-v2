'use client';

import { format, parseISO, isAfter, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface OrderListViewProps {
  orders: any[];
  onOrderUpdate: (orderId: string, newStatus: string) => void;
  updatingOrders: Set<string>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'working', label: 'Working' },
  { value: 'done', label: 'Done' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  working: 'bg-blue-100 text-blue-800 border-blue-300',
  done: 'bg-purple-100 text-purple-800 border-purple-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  delivered: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function OrderListView({
  orders,
  onOrderUpdate,
  updatingOrders,
}: OrderListViewProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  const getDueDateStyle = (dueDate: string | null) => {
    if (!dueDate) return '';
    const isOverdue = isAfter(new Date(), parseISO(dueDate));
    const isDueToday_ = isToday(parseISO(dueDate));
    if (isOverdue) return 'text-red-600 font-medium';
    if (isDueToday_) return 'text-orange-600 font-medium';
    return '';
  };

  return (
    <div className='bg-white rounded-lg shadow overflow-hidden'>
      <table className='min-w-full divide-y divide-gray-200'>
        <thead className='bg-gray-50'>
          <tr>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              #
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Client
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Type
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Items
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Due Date
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Status
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Position rack
            </th>
            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Total
            </th>
          </tr>
        </thead>
        <tbody className='bg-white divide-y divide-gray-200'>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={8} className='text-center py-8 text-gray-500'>
                No orders found
              </td>
            </tr>
          ) : (
            orders.map(order => (
              <tr
                key={order.id}
                className={`hover:bg-gray-50 ${updatingOrders.has(order.id) ? 'opacity-50' : ''}`}
              >
                <td className='px-4 py-3 whitespace-nowrap'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>#{order.order_number}</span>
                    {order.rush && (
                      <Badge variant='destructive' className='text-xs'>
                        Rush
                      </Badge>
                    )}
                  </div>
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {order.client_name || 'Unknown'}
                </td>
                <td className='px-4 py-3 whitespace-nowrap capitalize'>
                  {order.type}
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {order.garments?.length || 0} garment
                  {(order.garments?.length || 0) !== 1 ? 's' : ''}
                </td>
                <td
                  className={`px-4 py-3 whitespace-nowrap ${getDueDateStyle(order.due_date)}`}
                >
                  {formatDate(order.due_date)}
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  <select
                    value={order.status}
                    onChange={e => onOrderUpdate(order.id, e.target.value)}
                    disabled={updatingOrders.has(order.id)}
                    className={`px-2 py-1 rounded text-sm border ${STATUS_COLORS[order.status] || ''} cursor-pointer`}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {order.rack_position && ['ready', 'delivered'].includes(order.status) ? (
                    <span className='inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded'>
                      📍 {order.rack_position}
                    </span>
                  ) : (
                    <span className='text-gray-400'>—</span>
                  )}
                </td>
                <td className='px-4 py-3 whitespace-nowrap font-medium'>
                  ${((order.total_cents || 0) / 100).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
