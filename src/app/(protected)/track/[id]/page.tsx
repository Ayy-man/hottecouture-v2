'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MuralBackground } from '@/components/ui/mural-background';
import { Package, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

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

/** Map API status keys to translation keys in track.stages */
const STATUS_TO_TRANSLATION_KEY: Record<string, string> = {
  pending: 'pending',
  deposit_paid: 'depositReceived',
  in_progress: 'working',
  ready: 'ready',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  deposit_paid: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className='w-4 h-4' />,
  deposit_paid: <CheckCircle2 className='w-4 h-4' />,
  in_progress: <Package className='w-4 h-4' />,
  ready: <CheckCircle2 className='w-4 h-4' />,
  delivered: <CheckCircle2 className='w-4 h-4' />,
  cancelled: <Clock className='w-4 h-4' />,
};

export default function TrackOrderPage() {
  const t = useTranslations('track');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || '514-667-0082';

  const getStatusLabel = (status: string): string => {
    const key = STATUS_TO_TRANSLATION_KEY[status];
    if (key) {
      return t(`stages.${key}` as Parameters<typeof t>[0]);
    }
    return status;
  };

  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    return STATUS_ICONS[status] || <Package className='w-4 h-4' />;
  };

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/order/${orderId}/details`);
        if (!response.ok) {
          throw new Error(t('notFound'));
        }
        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const localeName = locale === 'fr' ? 'fr-CA' : 'en-CA';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(localeName, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MuralBackground>
      <div className='h-full flex flex-col overflow-hidden'>
        <div className='flex-1 overflow-y-auto'>
          <div className='max-w-2xl mx-auto py-8 px-4'>
          {/* Header */}
          <div className='text-center mb-8'>
            <Link href='/' className='inline-block mb-4'>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-900 bg-clip-text text-transparent'>
                Hotte Couture
              </h1>
            </Link>
            <p className='text-muted-foreground'>{t('subtitle')}</p>
          </div>

          {/* Content */}
          {loading && (
            <Card className='bg-white/90 backdrop-blur'>
              <CardContent className='p-8 text-center'>
                <div className='animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto'></div>
                <p className='mt-4 text-muted-foreground'>{tCommon('loading')}</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className='bg-white/90 backdrop-blur'>
              <CardContent className='p-8 text-center'>
                <p className='text-red-600 font-medium'>{error}</p>
                <p className='mt-2 text-muted-foreground text-sm'>
                  {t('checkLink')}
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
                      {t('orderNumber')}{order.order_number}
                    </h2>
                    <p className='text-muted-foreground text-sm'>
                      {order.type === 'alteration' ? t('alteration') : t('custom')}
                      {order.rush && ` \u2022 ${t('express')}`}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} flex items-center gap-2 px-4 py-2`}>
                    {getStatusIcon(order.status)}
                    {getStatusLabel(order.status)}
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
                          <span className={`text-[10px] sm:text-xs mt-1 text-center
                            ${isActive ? 'font-semibold text-primary-600' : 'text-muted-foreground'}`}>
                            {getStatusLabel(step)}
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
                      <p className='text-muted-foreground'>{t('createdOn')}</p>
                      <p className='font-medium'>{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  {order.due_date && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Clock className='w-4 h-4 text-muted-foreground' />
                      <div>
                        <p className='text-muted-foreground'>{t('expectedFor')}</p>
                        <p className='font-medium'>{formatDate(order.due_date)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Garments */}
                <div>
                  <h3 className='font-semibold text-foreground mb-3'>{t('yourItems')}</h3>
                  <div className='space-y-3'>
                    {order.garments.map((garment, index) => (
                      <div key={index} className='p-3 bg-muted/30 rounded-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                          <Package className='w-4 h-4 text-primary-500' />
                          <span className='font-medium'>{garment.type}</span>
                          {garment.color && (
                            <span className='text-sm text-muted-foreground'>&bull; {garment.color}</span>
                          )}
                        </div>
                        <div className='ml-6 space-y-1'>
                          {garment.services.map((service, sIndex) => (
                            <div key={sIndex} className='text-sm text-muted-foreground'>
                              &bull; {service.service.name}
                              {service.quantity > 1 && ` (\u00d7${service.quantity})`}
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
                    {t('contactUs')}{' '}
                    <a href={`tel:${SHOP_PHONE.replace(/-/g, '')}`} className='text-primary-600 font-medium hover:underline'>
                      {SHOP_PHONE}
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
    </MuralBackground>
  );
}
