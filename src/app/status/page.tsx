'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
      setError('Veuillez entrer un numéro de téléphone ou un nom de famille.');
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
          setError('Aucune commande trouvée avec ces informations.');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la recherche');
      }
    } catch (err) {
      console.error('Error searching orders:', err);
      setError(err instanceof Error ? err.message : 'Échec de la recherche');
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
        return 'bg-primary-100 text-primary-800';
      case 'working':
        return 'bg-secondary-100 text-secondary-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-primary-200 text-primary-900';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'working':
        return 'En cours';
      case 'done':
        return 'Terminé';
      case 'ready':
        return 'Prêt';
      case 'delivered':
        return 'Livré';
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
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MuralBackground useMuralBackground={true} opacity={0.12}>
      <div className='container mx-auto px-4 py-4 h-full flex flex-col overflow-hidden min-h-0'>
        {/* Header */}
        <div className='text-center mb-6 flex-shrink-0 animate-fade-in-up'>
          <div className='flex items-center justify-center mb-4'>
            <Link href='/'>
              <Button
                variant='outline'
                size='sm'
                className='border-primary-200 hover:bg-primary-50 text-primary-700 rounded-xl'
              >
                <ArrowLeft className='w-4 h-4 mr-2' />
                Accueil
              </Button>
            </Link>
          </div>
          <h1 className='text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-800 to-primary-500 bg-clip-text text-transparent'>
            Statut de commande
          </h1>
          <p className='text-muted-foreground mt-1 max-w-2xl mx-auto'>
            Recherchez votre commande par téléphone ou nom de famille
          </p>
        </div>

        {/* Scrollable Content Area */}
        <div className='flex-1 min-h-0 overflow-y-auto'>
          {/* Search Form Card */}
          <Card className='mb-8 shadow-xl bg-white/95 backdrop-blur-md border-0 rounded-3xl animate-fade-in-up-delay-1'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-2 mb-1'>
                <div className='w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center'>
                  <Search className='w-4 h-4 text-white' />
                </div>
                <h2 className='text-lg font-bold text-foreground'>Rechercher une commande</h2>
              </div>
              <p className='text-sm text-muted-foreground mb-4 ml-10'>
                Entrez votre téléphone ou nom de famille
              </p>

              <form onSubmit={handleSearch} className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='phone'
                      className='block text-sm font-medium text-foreground mb-1.5'
                    >
                      Numéro de téléphone
                    </label>
                    <div className='relative'>
                      <Phone className='absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 w-4 h-4' />
                      <Input
                        id='phone'
                        type='tel'
                        placeholder='ex: 514-555-1234'
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className='pl-10 rounded-xl border-primary-200 focus:border-primary-400 focus:ring-primary-400'
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='lastName'
                      className='block text-sm font-medium text-foreground mb-1.5'
                    >
                      Nom de famille
                    </label>
                    <div className='relative'>
                      <User className='absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 w-4 h-4' />
                      <Input
                        id='lastName'
                        type='text'
                        placeholder='ex: Tremblay'
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className='pl-10 rounded-xl border-primary-200 focus:border-primary-400 focus:ring-primary-400'
                      />
                    </div>
                  </div>
                </div>

                <div className='flex gap-3'>
                  <Button
                    type='submit'
                    disabled={loading}
                    className='flex-1 sm:flex-none bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {loading ? (
                      <>
                        <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                        Recherche...
                      </>
                    ) : (
                      <>
                        <Search className='w-4 h-4 mr-2' />
                        Rechercher
                      </>
                    )}
                  </Button>

                  {hasSearched && (
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleNewSearch}
                      className='border-primary-200 hover:bg-primary-50 text-primary-700 rounded-xl'
                    >
                      Nouvelle recherche
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className='mb-6 border-red-200 bg-red-50/90 backdrop-blur-sm shadow-lg rounded-2xl'>
              <CardContent className='p-4'>
                <div className='flex items-center text-red-700 font-medium text-sm'>
                  <span className='mr-2'>&#9888;</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Results */}
          {hasSearched && !loading && (
            <div className='space-y-6 pb-32'>
              {orders.length > 0 && (
                <div className='text-center mb-6 animate-fade-in-up-delay-2'>
                  <h2 className='text-2xl font-bold bg-gradient-to-r from-primary-800 to-primary-500 bg-clip-text text-transparent mb-1'>
                    {orders.length} commande{orders.length !== 1 ? 's' : ''} trouvée{orders.length !== 1 ? 's' : ''}
                  </h2>
                  <p className='text-muted-foreground font-medium'>
                    pour {orders[0]?.client_name} &bull; {revealedContact ? orders[0]?.client_phone : maskPhone(orders[0]?.client_phone || '')}
                  </p>
                </div>
              )}

              {orders.map(order => (
                <RushOrderCard
                  key={order.id}
                  isRush={order.rush}
                  orderType={order.type}
                  className='shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl'
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
                          className={`${getStatusColor(order.status)} text-sm font-medium rounded-lg`}
                        >
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>

                      <div className='text-right'>
                        <div className='text-2xl font-bold text-foreground'>
                          {formatCurrency(order.total_cents)}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          Créé le {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6'>
                      <div className='bg-primary-50/50 rounded-xl p-4 border border-primary-100'>
                        <h4 className='font-semibold text-foreground mb-2'>
                          Informations du client
                        </h4>
                        <div className='space-y-1.5 text-sm text-muted-foreground'>
                          <div className='flex items-center gap-2'>
                            <User className='w-4 h-4 text-primary-400' />
                            <span>{order.client_name}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Phone className='w-4 h-4 text-primary-400' />
                            <span className='font-mono'>
                              {revealedContact ? order.client_phone : maskPhone(order.client_phone)}
                            </span>
                          </div>
                          {order.client_email && (
                            <div className='flex items-center gap-2'>
                              <span className='w-4 h-4 text-primary-400 text-center'>@</span>
                              <span className='font-mono'>
                                {revealedContact ? order.client_email : maskEmail(order.client_email)}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => setRevealedContact(!revealedContact)}
                            className='flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors mt-1'
                          >
                            {revealedContact ? 'Masquer' : 'Afficher'}
                          </button>
                        </div>
                      </div>

                      <div className='bg-primary-50/50 rounded-xl p-4 border border-primary-100'>
                        <h4 className='font-semibold text-foreground mb-2'>
                          Détails de la commande
                        </h4>
                        <div className='space-y-1.5 text-sm text-muted-foreground'>
                          <div className='flex items-center gap-2'>
                            <Calendar className='w-4 h-4 text-primary-400' />
                            <span>
                              Échéance :{' '}
                              {order.due_date
                                ? formatDate(order.due_date)
                                : 'Non définie'}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Package className='w-4 h-4 text-primary-400' />
                            <span>
                              {order.garments.length} vêtement
                              {order.garments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {order.work_completed_at && (
                            <div className='flex items-center gap-2'>
                              <span className='w-4 h-4 text-primary-400 text-center'>&#10003;</span>
                              <span>
                                Terminé le {formatDate(order.work_completed_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Garments */}
                    <div className='space-y-4'>
                      <h4 className='font-semibold text-foreground'>
                        Vêtements et services
                      </h4>
                      {order.garments.map((garment, index) => (
                        <div key={index} className='bg-primary-50/40 rounded-xl p-4 border border-primary-100'>
                          <div className='flex items-center justify-between mb-3'>
                            <h5 className='font-medium text-foreground'>
                              {garment.type}
                              {garment.color && ` - ${garment.color}`}
                              {garment.brand && ` (${garment.brand})`}
                            </h5>
                            {garment.label_code && (
                              <Badge variant='outline' className='text-xs rounded-lg border-primary-200'>
                                Étiquette : {garment.label_code}
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
                    <div className='mt-6 pt-4 border-t border-primary-100'>
                      <div className='flex flex-col sm:flex-row gap-3'>
                        <Button
                          asChild
                          className='flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'
                        >
                          <a href={`/labels/${order.id}`} target='_blank'>
                            Imprimer étiquettes
                          </a>
                        </Button>
                        <Button
                          variant='outline'
                          onClick={handleNewSearch}
                          className='flex-1 border-primary-200 hover:bg-primary-50 text-primary-700 rounded-xl'
                        >
                          Nouvelle recherche
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
