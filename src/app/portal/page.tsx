'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Phone, Hash, Package, Calendar, RefreshCw } from 'lucide-react';

interface OrderResult {
  order_number: number;
  status: string;
  due_date?: string;
  garment_count: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; message: string }> = {
  pending: {
    label: 'En attente',
    color: 'bg-gray-100 text-gray-800',
    message: 'Votre commande est en file d\'attente.',
  },
  working: {
    label: 'En cours',
    color: 'bg-blue-100 text-blue-800',
    message: 'Notre couturière travaille sur votre commande.',
  },
  done: {
    label: 'Terminé',
    color: 'bg-green-100 text-green-800',
    message: 'Le travail est terminé. Nous préparons votre commande.',
  },
  ready: {
    label: 'Prêt à récupérer',
    color: 'bg-yellow-100 text-yellow-800 font-semibold',
    message: '✨ Votre commande est prête! Passez nous voir pour la récupérer.',
  },
  delivered: {
    label: 'Livré',
    color: 'bg-purple-100 text-purple-800',
    message: 'Merci pour votre confiance!',
  },
};

export default function CustomerPortalPage() {
  const [searchType, setSearchType] = useState<'phone' | 'order'>('phone');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchType === 'phone' && phone.trim()) {
        params.set('phone', phone.trim());
      } else if (searchType === 'order' && orderNumber.trim()) {
        params.set('orderNumber', orderNumber.trim());
      } else {
        setError('Veuillez entrer un numéro de téléphone ou de commande.');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/portal/lookup?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
        if (data.orders?.length === 0) {
          setError('Aucune commande trouvée.');
        }
      } else {
        setError(data.error || 'Une erreur est survenue.');
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhone('');
    setOrderNumber('');
    setOrders([]);
    setError(null);
    setHasSearched(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-stone-100 to-stone-200'>
      <div className='container mx-auto px-4 py-8 max-w-lg'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-stone-800 mb-2'>Hotte Couture</h1>
          <p className='text-stone-600'>Vérifiez le statut de votre commande</p>
        </div>

        <Card className='shadow-xl border-0'>
          <CardContent className='p-6'>
            <div className='flex gap-2 mb-4'>
              <button
                type='button'
                onClick={() => setSearchType('phone')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  searchType === 'phone'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Phone className='w-4 h-4 inline mr-2' />
                Par téléphone
              </button>
              <button
                type='button'
                onClick={() => setSearchType('order')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  searchType === 'order'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Hash className='w-4 h-4 inline mr-2' />
                Par # commande
              </button>
            </div>

            <form onSubmit={handleSearch} className='space-y-4'>
              {searchType === 'phone' ? (
                <div>
                  <label className='block text-sm font-medium text-stone-700 mb-1'>
                    Numéro de téléphone
                  </label>
                  <Input
                    type='tel'
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder='ex: 514-555-1234'
                    className='text-lg py-6'
                  />
                </div>
              ) : (
                <div>
                  <label className='block text-sm font-medium text-stone-700 mb-1'>
                    Numéro de commande
                  </label>
                  <Input
                    type='text'
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value)}
                    placeholder='ex: 1234'
                    className='text-lg py-6'
                  />
                </div>
              )}

              <Button
                type='submit'
                disabled={loading}
                className='w-full py-6 text-lg bg-stone-800 hover:bg-stone-900'
              >
                {loading ? (
                  <RefreshCw className='w-5 h-5 animate-spin mr-2' />
                ) : (
                  <Search className='w-5 h-5 mr-2' />
                )}
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </form>

            {error && (
              <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>
                {error}
              </div>
            )}

            {hasSearched && orders.length > 0 && (
              <div className='mt-6 space-y-4'>
                <h2 className='font-semibold text-stone-800'>
                  {orders.length} commande{orders.length > 1 ? 's' : ''} trouvée{orders.length > 1 ? 's' : ''}
                </h2>

                {orders.map(order => {
                  const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
                  if (!statusInfo) return null;
                  return (
                    <div
                      key={order.order_number}
                      className='p-4 bg-stone-50 rounded-xl border border-stone-200'
                    >
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-lg font-bold text-stone-800'>
                          #{order.order_number}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <p className='text-stone-600 mb-3'>{statusInfo.message}</p>

                      <div className='flex items-center gap-4 text-sm text-stone-500'>
                        <div className='flex items-center gap-1'>
                          <Package className='w-4 h-4' />
                          <span>{order.garment_count} article{order.garment_count > 1 ? 's' : ''}</span>
                        </div>
                        {order.due_date && (
                          <div className='flex items-center gap-1'>
                            <Calendar className='w-4 h-4' />
                            <span>Prévu: {formatDate(order.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button
                  type='button'
                  variant='outline'
                  onClick={handleReset}
                  className='w-full'
                >
                  Nouvelle recherche
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className='text-center mt-6 text-stone-500 text-sm'>
          <p>Des questions? Appelez-nous au <a href='tel:+15145551234' className='underline'>514-555-1234</a></p>
        </div>
      </div>
    </div>
  );
}
