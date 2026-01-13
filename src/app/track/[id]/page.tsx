'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MuralBackground } from '@/components/ui/mural-background';
import { Package, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  order_number: number;
  status: string;
  type: string;
  rush: boolean;
  created_at: string;
  due_date?: string;
  work_completed_at?: string;
  client_name: string;
  garments: Array<{
    type: string;
    color?: string;
    services: Array<{
      service: { name: string };
      quantity: number;
    }>;
  }>;
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className='w-4 h-4' /> },
  deposit_paid: { label: 'Dépôt reçu', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className='w-4 h-4' /> },
  in_progress: { label: 'En cours', color: 'bg-purple-100 text-purple-800', icon: <Package className='w-4 h-4' /> },
  ready: { label: 'Prêt à ramasser', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className='w-4 h-4' /> },
  delivered: { label: 'Livré', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle2 className='w-4 h-4' /> },
};

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/order/${orderId}/details`);
        if (!response.ok) {
          throw new Error('Commande non trouvée');
        }
        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    return statusLabels[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: <Package className='w-4 h-4' /> };
  };

  return (
    <MuralBackground>
      <div className='min-h-screen py-8 px-4'>
        <div className='max-w-2xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-8'>
            <Link href='/' className='inline-block mb-4'>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-accent-taupe to-accent-contrast bg-clip-text text-transparent'>
                Hotte Couture
              </h1>
            </Link>
            <p className='text-muted-foreground'>Suivi de votre commande</p>
          </div>

          {/* Content */}
          {loading && (
            <Card className='bg-white/90 backdrop-blur'>
              <CardContent className='p-8 text-center'>
                <div className='animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto'></div>
                <p className='mt-4 text-muted-foreground'>Chargement...</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className='bg-white/90 backdrop-blur'>
              <CardContent className='p-8 text-center'>
                <p className='text-red-600 font-medium'>{error}</p>
                <p className='mt-2 text-muted-foreground text-sm'>
                  Veuillez vérifier le lien ou contactez-nous pour obtenir de l&apos;aide.
                </p>
              </CardContent>
            </Card>
          )}

          {order && (
            <Card className='bg-white/90 backdrop-blur shadow-lg'>
              <CardContent className='p-6'>
                {/* Order Number & Status */}
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4'>
                  <div>
                    <h2 className='text-2xl font-bold text-foreground'>
                      Commande #{order.order_number}
                    </h2>
                    <p className='text-muted-foreground text-sm'>
                      {order.type === 'alteration' ? 'Altération' : 'Sur mesure'}
                      {order.rush && ' • Express'}
                    </p>
                  </div>
                  <Badge className={`${getStatusInfo(order.status).color} flex items-center gap-2 px-4 py-2`}>
                    {getStatusInfo(order.status).icon}
                    {getStatusInfo(order.status).label}
                  </Badge>
                </div>

                {/* Progress Timeline */}
                <div className='mb-6 p-4 bg-muted/50 rounded-lg'>
                  <div className='flex justify-between items-center'>
                    {['pending', 'in_progress', 'ready', 'delivered'].map((step, index) => {
                      const isActive = order.status === step;
                      const isPast = ['pending', 'deposit_paid', 'in_progress', 'ready', 'delivered'].indexOf(order.status) >=
                        ['pending', 'in_progress', 'ready', 'delivered'].indexOf(step);
                      return (
                        <div key={step} className='flex flex-col items-center flex-1'>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${isPast ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                            {index + 1}
                          </div>
                          <span className={`text-xs mt-1 text-center
                            ${isActive ? 'font-semibold text-primary-600' : 'text-muted-foreground'}`}>
                            {getStatusInfo(step).label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div className='grid grid-cols-2 gap-4 mb-6'>
                  <div className='flex items-center gap-2 text-sm'>
                    <Calendar className='w-4 h-4 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>Créée le</p>
                      <p className='font-medium'>{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  {order.due_date && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Clock className='w-4 h-4 text-muted-foreground' />
                      <div>
                        <p className='text-muted-foreground'>Prévue pour</p>
                        <p className='font-medium'>{formatDate(order.due_date)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Garments */}
                <div>
                  <h3 className='font-semibold text-foreground mb-3'>Vos articles</h3>
                  <div className='space-y-3'>
                    {order.garments.map((garment, index) => (
                      <div key={index} className='p-3 bg-muted/30 rounded-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                          <Package className='w-4 h-4 text-primary-500' />
                          <span className='font-medium'>{garment.type}</span>
                          {garment.color && (
                            <span className='text-sm text-muted-foreground'>• {garment.color}</span>
                          )}
                        </div>
                        <div className='ml-6 space-y-1'>
                          {garment.services.map((service, sIndex) => (
                            <div key={sIndex} className='text-sm text-muted-foreground'>
                              • {service.service.name}
                              {service.quantity > 1 && ` (×${service.quantity})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className='mt-6 pt-6 border-t border-border text-center'>
                  <p className='text-sm text-muted-foreground'>
                    Des questions? Contactez-nous au{' '}
                    <a href='tel:+15148551234' className='text-primary-600 font-medium hover:underline'>
                      (514) 855-1234
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MuralBackground>
  );
}
