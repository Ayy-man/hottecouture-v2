'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Archive, ArrowLeft, RotateCcw, Search } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';

interface ArchivedOrder {
  id: string;
  order_number: number;
  type: string;
  priority: string;
  status: string;
  due_date: string;
  rush: boolean;
  total_cents: number;
  rack_position: string;
  created_at: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  garments: Array<{
    id: string;
    type: string;
    description: string;
  }>;
}

export default function ArchivedOrdersPage() {
  const [orders, setOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  const fetchArchivedOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders/archived');
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
      } else {
        throw new Error(data.error || 'Failed to fetch archived orders');
      }
    } catch (err) {
      console.error('Error fetching archived orders:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch archived orders'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedOrders();
  }, []);

  const handleUnarchive = async (orderIds: string[]) => {
    setIsUnarchiving(true);
    try {
      const response = await fetch('/api/orders/unarchive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Unarchive successful:', result);
        // Remove unarchived orders from the list
        setOrders(prev => prev.filter(order => !orderIds.includes(order.id)));
        setSelectedOrders([]);
      } else {
        console.error('❌ Unarchive failed:', result);
        alert(`Unarchive failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Unarchive error:', error);
      alert('Failed to unarchive orders. Please try again.');
    } finally {
      setIsUnarchiving(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id));
    }
  };

  const filteredOrders = orders.filter(
    order =>
      order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toString().includes(searchTerm) ||
      order.garments.some(garment =>
        garment.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50'>
          <div className='container mx-auto px-4 py-8'>
            <div className='flex items-center justify-center min-h-[400px]'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
                <p className='text-lg text-gray-600'>
                  Loading archived orders...
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50'>
          <div className='container mx-auto px-4 py-8'>
            <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
              <h2 className='text-xl font-semibold text-red-800 mb-2'>
                Error Loading Archived Orders
              </h2>
              <p className='text-red-600 mb-4'>{error}</p>
              <Button onClick={fetchArchivedOrders} variant='outline'>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50'>
        <div className='container mx-auto px-4 py-8'>
          {/* Header */}
          <div className='mb-6 text-center'>
            <h1 className='text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2'>
              Archived Orders
            </h1>
            <p className='text-sm sm:text-base text-gray-600 max-w-2xl mx-auto'>
              View and manage archived orders - {orders.length} total archived
            </p>
          </div>

          {/* Controls */}
          <div className='mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <input
                  type='text'
                  placeholder='Search orders...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>

              {filteredOrders.length > 0 && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleSelectAll}
                  className='btn-press'
                >
                  {selectedOrders.length === filteredOrders.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              )}
            </div>

            <div className='flex gap-2'>
              {selectedOrders.length > 0 && (
                <Button
                  onClick={() => handleUnarchive(selectedOrders)}
                  disabled={isUnarchiving}
                  className='btn-press bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300'
                >
                  {isUnarchiving ? (
                    <div className='w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full' />
                  ) : (
                    <RotateCcw className='w-4 h-4 mr-2' />
                  )}
                  Unarchive Selected ({selectedOrders.length})
                </Button>
              )}

              <Button
                asChild
                variant='outline'
                className='btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300'
              >
                <Link href='/board'>
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Back to Board
                </Link>
              </Button>
            </div>
          </div>

          {/* Orders Grid */}
          {filteredOrders.length === 0 ? (
            <div className='text-center py-12'>
              <Archive className='w-16 h-16 text-gray-400 mx-auto mb-4' />
              <h3 className='text-xl font-semibold text-gray-600 mb-2'>
                {searchTerm
                  ? 'No orders match your search'
                  : 'No archived orders'}
              </h3>
              <p className='text-gray-500'>
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Orders will appear here after being archived'}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {filteredOrders.map(order => (
                <Card
                  key={order.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedOrders.includes(order.id)
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleSelectOrder(order.id)}
                >
                  <CardContent className='p-4'>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex items-center gap-2'>
                        <input
                          type='checkbox'
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                          onClick={e => e.stopPropagation()}
                        />
                        <h4 className='font-semibold text-lg'>
                          #{order.order_number}
                        </h4>
                        {order.rush && (
                          <Badge variant='destructive' className='text-xs'>
                            Rush
                          </Badge>
                        )}
                      </div>
                      <Badge variant='outline' className='text-xs'>
                        {order.type}
                      </Badge>
                    </div>

                    <div className='space-y-2 mb-4'>
                      <p className='text-sm font-medium text-gray-900'>
                        {order.client_name}
                      </p>

                      <p className='text-sm text-gray-600'>
                        {order.garments.map(g => g.type).join(', ') ||
                          'No garments'}
                      </p>

                      <p className='text-sm text-gray-500'>
                        Total: {formatCurrency(order.total_cents)}
                      </p>

                      {order.rack_position && (
                        <p className='text-sm text-blue-600 font-medium'>
                          Rack: {order.rack_position}
                        </p>
                      )}
                    </div>

                    <div className='border-t pt-2 text-xs text-gray-500'>
                      <p>Created: {formatDate(order.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
