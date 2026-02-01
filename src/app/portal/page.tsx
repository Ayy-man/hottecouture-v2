'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import TrackingTimeline, { TimelineItem } from '@/components/ui/tracking-timeline';
import {
  Search,
  Phone,
  Hash,
  Package,
  Calendar,
  RefreshCw,
  ClipboardList,
  Scissors,
  CheckCircle,
  Gift,
  Home,
  ArrowLeft
} from 'lucide-react';
import { MuralBackground } from '@/components/ui/mural-background';
import Link from 'next/link';

interface OrderResult {
  order_number: number;
  status: string;
  due_date?: string;
  garment_count: number;
  created_at: string;
}

const ORDER_STAGES = ['pending', 'working', 'done', 'ready', 'delivered'];

const STAGE_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
  pending: { 
    title: 'Commande reçue', 
    icon: <ClipboardList className="h-4 w-4" /> 
  },
  working: { 
    title: 'En cours de travail', 
    icon: <Scissors className="h-4 w-4" /> 
  },
  done: { 
    title: 'Travail terminé', 
    icon: <CheckCircle className="h-4 w-4" /> 
  },
  ready: { 
    title: 'Prêt à récupérer', 
    icon: <Gift className="h-4 w-4" /> 
  },
  delivered: { 
    title: 'Livré', 
    icon: <Home className="h-4 w-4" /> 
  },
};

function buildTimelineItems(order: OrderResult): TimelineItem[] {
  const currentStageIndex = ORDER_STAGES.indexOf(order.status);
  
  return ORDER_STAGES.map((stage, index) => {
    const config = STAGE_CONFIG[stage] ?? { title: stage, icon: null };
    let status: TimelineItem['status'] = 'pending';
    let date = '';
    
    if (index < currentStageIndex) {
      status = 'completed';
      date = '✓';
    } else if (index === currentStageIndex) {
      status = 'in-progress';
      date = 'Maintenant';
    } else {
      status = 'pending';
      if (stage === 'ready' && order.due_date) {
        date = new Date(order.due_date).toLocaleDateString('fr-CA', {
          day: 'numeric',
          month: 'short',
        });
      } else {
        date = 'À venir';
      }
    }

    const iconColor = status === 'completed' 
      ? 'text-white' 
      : status === 'in-progress' 
        ? 'text-primary' 
        : 'text-muted-foreground/50';

    return {
      id: stage,
      title: config.title,
      date,
      status,
      icon: <span className={iconColor}>{config.icon}</span>,
    };
  });
}

export default function CustomerPortalPage() {
  const [searchType, setSearchType] = useState<'phone' | 'order'>('phone');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSelectedOrder(null);

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
        } else if (data.orders?.length === 1) {
          setSelectedOrder(data.orders[0]);
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
    setSelectedOrder(null);
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
      <div className='min-h-screen'>
        <div className='container mx-auto px-4 py-8 max-w-lg'>
          <div className='text-center mb-8'>
            <div className='flex items-center justify-center mb-4'>
              <Link href='/' className='mr-4'>
                <Button
                  variant='outline'
                  size='sm'
                  className='border-border hover:bg-muted'
                >
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Accueil
                </Button>
              </Link>
              <h1 className='text-3xl font-bold text-foreground'>Hotte Couture</h1>
            </div>
            <p className='text-muted-foreground'>Vérifiez le statut de votre commande</p>
          </div>

          <Card className='shadow-lg border-0 bg-white/90 backdrop-blur-sm'>
          <CardContent className='p-6'>
            {!selectedOrder ? (
              <>
                <div className='flex bg-muted p-1 rounded-lg border border-border mb-4'>
                  <button
                    type='button'
                    onClick={() => setSearchType('phone')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      searchType === 'phone'
                        ? 'bg-white shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Phone className='w-4 h-4' />
                    Par téléphone
                  </button>
                  <button
                    type='button'
                    onClick={() => setSearchType('order')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      searchType === 'order'
                        ? 'bg-white shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Hash className='w-4 h-4' />
                    Par # commande
                  </button>
                </div>

                <form onSubmit={handleSearch} className='space-y-4'>
                  {searchType === 'phone' ? (
                    <div>
                      <label className='block text-sm font-medium text-foreground mb-1'>
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
                      <label className='block text-sm font-medium text-foreground mb-1'>
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
                    className='w-full py-6 text-lg bg-foreground hover:bg-foreground/90'
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

                {hasSearched && orders.length > 1 && (
                  <div className='mt-6 space-y-3'>
                    <h2 className='font-semibold text-foreground'>
                      {orders.length} commandes trouvées
                    </h2>
                    {orders.map(order => (
                      <button
                        key={order.order_number}
                        onClick={() => setSelectedOrder(order)}
                        className='w-full p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors text-left'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='font-bold text-foreground'>#{order.order_number}</span>
                          <span className='text-sm text-muted-foreground'>
                            {order.garment_count} article{order.garment_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h2 className='text-2xl font-bold text-foreground'>
                      Commande #{selectedOrder.order_number}
                    </h2>
                    <div className='flex items-center gap-3 mt-1 text-sm text-muted-foreground'>
                      <span className='flex items-center gap-1'>
                        <Package className='w-4 h-4' />
                        {selectedOrder.garment_count} article{selectedOrder.garment_count > 1 ? 's' : ''}
                      </span>
                      {selectedOrder.due_date && (
                        <span className='flex items-center gap-1'>
                          <Calendar className='w-4 h-4' />
                          {formatDate(selectedOrder.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className='bg-muted/50 rounded-xl p-4'>
                  <h3 className='font-semibold text-foreground mb-4'>Suivi de commande</h3>
                  <TrackingTimeline items={buildTimelineItems(selectedOrder)} />
                </div>

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

          <div className='text-center mt-6 text-muted-foreground text-sm'>
            <p>Des questions? Appelez-nous au <a href='tel:+15145551234' className='underline'>514-555-1234</a></p>
          </div>
        </div>
      </div>
    </MuralBackground>
  );
}
