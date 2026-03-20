'use client';

import { format, parseISO, isAfter, isToday } from 'date-fns';
import { useTranslations } from 'next-intl';
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
  delivered: 'bg-muted text-foreground border-border',
};

export function OrderListView({
  orders,
  onOrderUpdate,
  updatingOrders,
}: OrderListViewProps) {
  const tl = useTranslations('board.list');
  const tc = useTranslations('board.columns');
  const tCard = useTranslations('board.card');
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

  if (orders.length === 0) {
    return (
      <div className='bg-card rounded-lg shadow p-8 text-center text-muted-foreground'>
        {tl('noOrdersFound')}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className='md:hidden space-y-3'>
        {orders.map(order => (
          <div
            key={order.id}
            className={`bg-card rounded-lg shadow p-4 ${updatingOrders.has(order.id) ? 'opacity-50' : ''}`}
          >
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>#{order.order_number}</span>
                {order.rush && (
                  <Badge variant='destructive' className='text-xs'>
                    {tCard('rush')}
                  </Badge>
                )}
              </div>
              <span className='font-medium'>
                ${((order.total_cents || 0) / 100).toFixed(2)}
              </span>
            </div>

            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{tl('client')}</span>
                <span>{order.client_name || tl('unknown')}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{tl('type')}</span>
                <span className='capitalize'>{order.type}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{tl('items')}</span>
                <span>
                  {order.garments?.length || 0} {(order.garments?.length || 0) !== 1 ? tl('garmentPlural') : tl('garmentSingular')}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>{tl('dueDate')}</span>
                <span className={getDueDateStyle(order.due_date)}>
                  {formatDate(order.due_date)}
                </span>
              </div>
              {order.rack_position && ['ready', 'delivered'].includes(order.status) && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tl('rackPosition')}</span>
                  <span className='inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded'>
                    📍 {order.rack_position}
                  </span>
                </div>
              )}
            </div>

            <div className='mt-3 pt-3 border-t'>
              <select
                value={order.status}
                onChange={e => onOrderUpdate(order.id, e.target.value)}
                disabled={updatingOrders.has(order.id)}
                className={`w-full px-3 py-2 rounded text-sm border ${STATUS_COLORS[order.status] || ''} cursor-pointer touch-target`}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {tc(opt.value as any)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className='hidden md:block bg-card rounded-lg shadow overflow-hidden'>
        <table className='min-w-full divide-y divide-border'>
          <thead className='bg-muted/50'>
            <tr>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                #
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('client')}
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('type')}
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('items')}
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('dueDate')}
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('status')}
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('rackPosition')}
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {tl('total')}
              </th>
            </tr>
          </thead>
          <tbody className='bg-card divide-y divide-border'>
            {orders.map(order => (
              <tr
                key={order.id}
                className={`hover:bg-muted/50 ${updatingOrders.has(order.id) ? 'opacity-50' : ''}`}
              >
                <td className='px-4 py-3 whitespace-nowrap'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>#{order.order_number}</span>
                    {order.rush && (
                      <Badge variant='destructive' className='text-xs'>
                        {tCard('rush')}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {order.client_name || tl('unknown')}
                </td>
                <td className='px-4 py-3 whitespace-nowrap capitalize'>
                  {order.type}
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {order.garments?.length || 0} {(order.garments?.length || 0) !== 1 ? tl('garmentPlural') : tl('garmentSingular')}
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
                        {tc(opt.value as any)}
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
                    <span className='text-muted-foreground/70'>—</span>
                  )}
                </td>
                <td className='px-4 py-3 whitespace-nowrap font-medium'>
                  ${((order.total_cents || 0) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
