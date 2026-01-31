'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Phone,
  User,
  Calendar,
  Package,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import {
  RushIndicator,
  RushOrderCard,
} from '@/components/rush-orders/rush-indicator';
import { MuralBackground } from '@/components/ui/mural-background';

interface Order {
  id: string;
  order_number: string;
  status: string;
  type: string;
  rush: boolean;
  total_cents: number;
  created_at: string;
  due_date?: string;
  work_completed_at?: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  garments: Array<{
    type: string;
    color?: string;
    brand?: string;
    label_code?: string;
    services: Array<{
      service: {
        name: string;
      };
      quantity: number;
      custom_price_cents?: number;
    }>;
  }>;
}

export default function OrderStatusPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [revealedContact, setRevealedContact] = useState(false);

  // Privacy masking functions (standardized format)
  const maskPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '***';
    return '***-***-' + digits.slice(-4);
  };

  const maskEmail = (email: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return '***';
    return parts[0].charAt(0) + '***@' + parts[1];
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim() && !lastName.trim()) {
      setError('Please enter a phone number or last name');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/orders/search?phone=${encodeURIComponent(phoneNumber.trim())}&lastName=${encodeURIComponent(lastName.trim())}`
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);

        if (data.orders.length === 0) {
          setError('No orders found with that phone number and last name');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search orders');
      }
    } catch (err) {
      console.error('Error searching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to search orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = () => {
    setPhoneNumber('');
    setLastName('');
    setOrders([]);
    setError(null);
    setHasSearched(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-muted text-foreground';
      case 'working':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-muted text-foreground';
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
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MuralBackground useMuralBackground={true} opacity={0.12}>
      <div className='container mx-auto px-4 py-4 h-full flex flex-col overflow-hidden min-h-0'>
        {/* Header - Fixed */}
        <div className='text-center mb-6 flex-shrink-0'>
          <div className='flex items-center justify-center mb-4'>
            <Link href='/' className='mr-4'>
              <Button
                variant='outline'
                size='sm'
                className='btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-border'
              >
                <ArrowLeft className='w-4 h-4 mr-2' />
                Back to Home
              </Button>
            </Link>
            <h1 className='text-3xl sm:text-4xl font-bold bg-gradient-to-r from-accent-taupe to-accent-contrast bg-clip-text text-transparent'>
              Order Status
            </h1>
          </div>
          <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
            Check the status of your order by entering your phone number and
            last name
          </p>
        </div>

        {/* Scrollable Content Area */}
        <div className='flex-1 min-h-0 overflow-y-auto'>
          {/* Search Form */}
          <Card className='mb-8 shadow-lg bg-white/80 backdrop-blur-sm border-0'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-xl font-bold text-foreground'>
                <Search className='w-5 h-5 text-blue-600' />
                Search Order
              </CardTitle>
              <p className='text-muted-foreground'>
                Enter your phone number and last name to find your order
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='phone'
                      className='block text-sm font-medium text-foreground mb-2'
                    >
                      Phone Number *
                    </label>
                    <div className='relative'>
                      <Phone className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4' />
                      <Input
                        id='phone'
                        type='tel'
                        placeholder='e.g., 2043334440'
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className='pl-10'
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='lastName'
                      className='block text-sm font-medium text-foreground mb-2'
                    >
                      Last Name *
                    </label>
                    <div className='relative'>
                      <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4' />
                      <Input
                        id='lastName'
                        type='text'
                        placeholder='e.g., Singh'
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className='pl-10'
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className='flex gap-3'>
                  <Button
                    type='submit'
                    disabled={loading}
                    className='flex-1 sm:flex-none btn-press bg-gradient-to-r from-accent-taupe to-accent-contrast hover:from-accent-taupe hover:to-accent-contrast text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {loading ? (
                      <>
                        <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className='w-4 h-4 mr-2' />
                        Search Order
                      </>
                    )}
                  </Button>

                  {hasSearched && (
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleNewSearch}
                      className='btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-border'
                    >
                      New Search
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className='mb-6 border-red-200 bg-gradient-to-r from-red-50 to-red-100 shadow-lg'>
              <CardContent className='p-4'>
                <div className='flex items-center text-red-800 font-medium'>
                  <div className='w-5 h-5 mr-2'>⚠️</div>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Results */}
          {hasSearched && !loading && (
            <div className='space-y-6 pb-32'>
              {orders.length > 0 && (
                <div className='text-center mb-6'>
                  <h2 className='text-2xl font-semibold bg-gradient-to-r from-accent-taupe to-accent-contrast bg-clip-text text-transparent mb-2'>
                    Found {orders.length} order{orders.length !== 1 ? 's' : ''}
                  </h2>
                  <p className='text-muted-foreground font-medium'>
                    pour {orders[0]?.client_name} • {revealedContact ? orders[0]?.client_phone : maskPhone(orders[0]?.client_phone || '')}
                  </p>
                </div>
              )}

              {orders.map(order => (
                <RushOrderCard
                  key={order.id}
                  isRush={order.rush}
                  orderType={order.type}
                  className='shadow-lg hover:shadow-xl transition-shadow duration-200'
                >
                  <CardContent className='p-6'>
                    {/* Order Header */}
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6'>
                      <div className='flex items-center gap-3 mb-2 sm:mb-0'>
                        <h3 className='text-2xl font-bold text-foreground'>
                          #{order.order_number}
                        </h3>
                        <RushIndicator
                          isRush={order.rush}
                          orderType={order.type as 'custom' | 'alteration'}
                          size='sm'
                        />
                        <Badge
                          className={`${getStatusColor(order.status)} text-sm font-medium`}
                        >
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>

                      <div className='text-right'>
                        <div className='text-2xl font-bold text-foreground'>
                          {formatCurrency(order.total_cents)}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          Created: {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6'>
                      <div>
                        <h4 className='font-semibold text-foreground mb-2'>
                          Customer Information
                        </h4>
                        <div className='space-y-1 text-sm text-muted-foreground'>
                          <div className='flex items-center gap-2'>
                            <User className='w-4 h-4' />
                            <span>{order.client_name}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Phone className='w-4 h-4' />
                            <span className='font-mono'>
                              {revealedContact ? order.client_phone : maskPhone(order.client_phone)}
                            </span>
                          </div>
                          {order.client_email && (
                            <div className='flex items-center gap-2'>
                              <span className='w-4 h-4'>📧</span>
                              <span className='font-mono'>
                                {revealedContact ? order.client_email : maskEmail(order.client_email)}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => setRevealedContact(!revealedContact)}
                            className='flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors mt-1'
                          >
                            {revealedContact ? '🙈 Masquer' : '👁️ Afficher'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className='font-semibold text-foreground mb-2'>
                          Order Information
                        </h4>
                        <div className='space-y-1 text-sm text-muted-foreground'>
                          <div className='flex items-center gap-2'>
                            <Calendar className='w-4 h-4' />
                            <span>
                              Due:{' '}
                              {order.due_date
                                ? formatDate(order.due_date)
                                : 'Not set'}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Package className='w-4 h-4' />
                            <span>
                              {order.garments.length} garment
                              {order.garments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {order.work_completed_at && (
                            <div className='flex items-center gap-2'>
                              <span className='w-4 h-4'>✅</span>
                              <span>
                                Completed: {formatDate(order.work_completed_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Garments */}
                    <div className='space-y-4'>
                      <h4 className='font-semibold text-foreground'>
                        Garments & Services
                      </h4>
                      {order.garments.map((garment, index) => (
                        <div key={index} className='bg-muted/50 rounded-lg p-4'>
                          <div className='flex items-center justify-between mb-3'>
                            <h5 className='font-medium text-foreground'>
                              {garment.type}
                              {garment.color && ` - ${garment.color}`}
                              {garment.brand && ` (${garment.brand})`}
                            </h5>
                            {garment.label_code && (
                              <Badge variant='outline' className='text-xs'>
                                Label: {garment.label_code}
                              </Badge>
                            )}
                          </div>

                          <div className='space-y-2'>
                            {garment.services.map((service, serviceIndex) => (
                              <div
                                key={serviceIndex}
                                className='flex justify-between items-center text-sm'
                              >
                                <span className='text-muted-foreground'>
                                  {service.service.name} x{service.quantity}
                                </span>
                                <span className='font-medium text-foreground'>
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
                    <div className='mt-6 pt-4 border-t border-border'>
                      <div className='flex flex-col sm:flex-row gap-3'>
                        <Button
                          asChild
                          className='flex-1 btn-press bg-gradient-to-r from-accent-taupe to-accent-contrast hover:from-accent-taupe hover:to-accent-contrast text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300'
                        >
                          <a href={`/labels/${order.id}`} target='_blank'>
                            Print Labels
                          </a>
                        </Button>
                        <Button
                          variant='outline'
                          onClick={handleNewSearch}
                          className='flex-1 btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-border'
                        >
                          New Search
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </RushOrderCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </MuralBackground>
  );
}
