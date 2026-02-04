'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Calendar, DollarSign, Package } from 'lucide-react';
import Link from 'next/link';
import {
  RushIndicator,
  RushOrderCard,
} from '@/components/rush-orders/rush-indicator';

interface OrderHistory {
  id: string;
  order_number: string;
  status: string;
  type: string;
  rush: boolean;
  total_cents: number;
  created_at: string;
  due_date?: string;
  completed_at?: string;
  garments: Array<{
    type: string;
    color?: string;
    brand?: string;
    services: Array<{
      service: {
        name: string;
      };
      quantity: number;
      custom_price_cents?: number;
    }>;
  }>;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
}

function OrderHistoryContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load client and order history
  useEffect(() => {
    if (clientId) {
      loadClientHistory(clientId);
    } else {
      setLoading(false);
    }
  }, [clientId]);

  const loadClientHistory = async (id: string) => {
    try {
      setLoading(true);

      // Load client details
      const clientResponse = await fetch(`/api/clients/${id}`);
      if (clientResponse.ok) {
        const clientData = await clientResponse.json();
        setClient(clientData);
      }

      // Load client's order history
      const ordersResponse = await fetch(`/api/orders/history?clientId=${id}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      } else {
        throw new Error('Failed to load order history');
      }
    } catch (err) {
      console.error('Error loading client history:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load order history'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'working':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'working':
        return 'Working';
      case 'done':
        return 'Done';
      case 'ready':
        return 'Ready';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      searchTerm === '' ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.garments.some(
        g =>
          g.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className='p-8'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-lg text-muted-foreground'>Loading order history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8'>
        <div className='text-center'>
          <div className='text-red-500 text-lg mb-4'>
            Error loading order history
          </div>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Link href='/board'>
            <Button>Back to Board</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className='p-8'>
        <div className='text-center'>
          <div className='text-muted-foreground text-lg mb-4'>Client not found</div>
          <Link href='/board'>
            <Button>Back to Board</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50'>
      <div className='flex-1 overflow-y-auto'>
        <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-6'>
          <div className='flex items-center gap-4 mb-4'>
            <Link href='/board'>
              <Button variant='outline' size='sm'>
                <ArrowLeft className='w-4 h-4 mr-2' />
                Back to Board
              </Button>
            </Link>
            <div>
              <h1 className='text-3xl sm:text-4xl font-bold text-foreground'>
                Order History
              </h1>
              <p className='text-muted-foreground'>
                {client.first_name} {client.last_name}
              </p>
              {client.phone && (
                <p className='text-sm text-muted-foreground'>{client.phone}</p>
              )}
              {client.email && (
                <p className='text-sm text-muted-foreground'>{client.email}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center'>
                  <Package className='w-8 h-8 text-blue-500 mr-3' />
                  <div>
                    <p className='text-sm text-muted-foreground'>Total Orders</p>
                    <p className='text-2xl font-bold'>{orders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center'>
                  <DollarSign className='w-8 h-8 text-green-500 mr-3' />
                  <div>
                    <p className='text-sm text-muted-foreground'>Total Value</p>
                    <p className='text-2xl font-bold'>
                      {formatCurrency(
                        orders.reduce(
                          (sum, order) => sum + order.total_cents,
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center'>
                  <Calendar className='w-8 h-8 text-purple-500 mr-3' />
                  <div>
                    <p className='text-sm text-muted-foreground'>First Order</p>
                    <p className='text-lg font-semibold'>
                      {orders.length > 0
                        ? formatDate(
                            (orders[orders.length - 1] as any).created_at
                          )
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className='mb-6 flex flex-col sm:flex-row gap-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4' />
            <Input
              placeholder='Search orders by number, garment type, color, or brand...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='all'>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='working'>Working</option>
            <option value='done'>Done</option>
            <option value='ready'>Ready</option>
            <option value='delivered'>Delivered</option>
          </select>
        </div>

        {/* Orders List */}
        <div className='space-y-4'>
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className='p-8 text-center'>
                <Package className='w-12 h-12 text-muted-foreground/70 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-foreground mb-2'>
                  No orders found
                </h3>
                <p className='text-muted-foreground'>
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'This client has no order history yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map(order => (
              <RushOrderCard
                key={order.id}
                isRush={order.rush}
                orderType={order.type}
                className='hover:shadow-lg transition-shadow duration-200'
              >
                <CardContent className='p-6'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4'>
                    <div className='flex items-center gap-3 mb-2 sm:mb-0'>
                      <h3 className='text-lg font-semibold'>
                        #{order.order_number}
                      </h3>
                      <RushIndicator
                        isRush={order.rush}
                        orderType={order.type as 'custom' | 'alteration'}
                        size='sm'
                      />
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>

                    <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                      <span>Created: {formatDate(order.created_at)}</span>
                      {order.due_date && (
                        <span>Due: {formatDate(order.due_date)}</span>
                      )}
                      <span className='font-semibold text-lg'>
                        {formatCurrency(order.total_cents)}
                      </span>
                    </div>
                  </div>

                  {/* Garments */}
                  <div className='space-y-2'>
                    {order.garments.map((garment, index) => (
                      <div key={index} className='bg-muted/50 rounded-lg p-3'>
                        <div className='flex items-center justify-between mb-2'>
                          <h4 className='font-medium text-foreground'>
                            {garment.type}
                            {garment.color && ` - ${garment.color}`}
                            {garment.brand && ` (${garment.brand})`}
                          </h4>
                        </div>

                        <div className='space-y-1'>
                          {garment.services.map((service, serviceIndex) => (
                            <div
                              key={serviceIndex}
                              className='flex justify-between text-sm'
                            >
                              <span className='text-muted-foreground'>
                                {service.service.name} x{service.quantity}
                              </span>
                              <span className='font-medium'>
                                {formatCurrency(
                                  service.custom_price_cents || 0
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className='mt-4 pt-4 border-t border-border'>
                    <div className='flex gap-2'>
                      <Link href={`/board?orderId=${order.id}`}>
                        <Button variant='outline' size='sm'>
                          View Details
                        </Button>
                      </Link>
                      {order.status === 'delivered' && order.completed_at && (
                        <span className='text-sm text-muted-foreground self-center'>
                          Completed: {formatDate(order.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </RushOrderCard>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className='p-8'>
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
              <p className='text-lg text-muted-foreground'>Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <OrderHistoryContent />
    </Suspense>
  );
}
