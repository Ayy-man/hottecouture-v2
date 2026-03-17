'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IntakeResponse } from '@/lib/dto';
import { formatCurrency } from '@/lib/pricing/client';
import { HLogo } from '@/components/ui/h-logo';

interface OrderSummaryProps {
  order: IntakeResponse | null;
  onPrintLabels: () => void;
  onNewOrder: () => void;
}

export function OrderSummary({
  order,
  onPrintLabels,
  onNewOrder,
}: OrderSummaryProps) {
  // const t = useTranslations('intake.submit')

  if (!order) {
    return (
      <div className='text-center py-8'>
        <div className='text-lg text-muted-foreground'>Aucune donnée de commande disponible</div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header */}
      <div className='flex items-center justify-center px-1 py-3 border-b border-border bg-white flex-shrink-0'>
        <div className='text-center'>
          <div className='flex items-center justify-center mb-2'>
            <HLogo size='sm' variant='round' />
          </div>
          <h2 className='text-lg font-semibold text-foreground'>
            Confirmation de commande
          </h2>
          <p className='text-sm text-muted-foreground'>
            Votre commande a été créée avec succès
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 pb-24 md:pb-4 space-y-4'>
          {/* Success Message */}
          <Card className='bg-green-50 border-green-200'>
            <CardContent className='pt-4'>
              <div className='text-center'>
                <div className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <svg
                    className='w-6 h-6 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-green-800 mb-2'>
                  Commande créée avec succès !
                </h2>
                <p className='text-sm text-green-600'>
                  La commande #{order.orderNumber} a été créée avec succès
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>Détails de la commande</CardTitle>
              <CardDescription className='text-sm'>
                Commande #{order.orderNumber} - {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <h3 className='font-medium text-sm mb-2'>
                    Informations de la commande
                  </h3>
                  <div className='space-y-1'>
                    <div className='flex justify-between'>
                      <span className='text-xs text-muted-foreground'>
                        Numéro de commande :
                      </span>
                      <span className='text-xs font-medium'>
                        #{order.orderNumber}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-xs text-muted-foreground'>Identifiant :</span>
                      <span className='font-mono text-xs'>{order.orderId}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-xs text-muted-foreground'>Statut :</span>
                      <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs'>
                        En attente
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='font-medium text-sm mb-2'>Résumé des prix</h3>
                  <div className='space-y-1'>
                    <div className='flex justify-between'>
                      <span className='text-xs text-muted-foreground'>Sous-total :</span>
                      <span className='text-xs font-medium'>
                        {formatCurrency(order.totals.subtotal_cents)}
                      </span>
                    </div>
                    {order.totals.rush_fee_cents > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-xs text-muted-foreground'>Frais express :</span>
                        <span className='text-xs font-medium'>
                          {formatCurrency(order.totals.rush_fee_cents)}
                        </span>
                      </div>
                    )}
                    {order.totals.tps_cents !== undefined &&
                    order.totals.tvq_cents !== undefined ? (
                      <>
                        <div className='flex justify-between'>
                          <span className='text-xs text-muted-foreground'>
                            TPS (taxe fédérale)
                          </span>
                          <span className='text-xs font-medium'>
                            {formatCurrency(order.totals.tps_cents)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-xs text-muted-foreground'>
                            TVQ (taxe provinciale)
                          </span>
                          <span className='text-xs font-medium'>
                            {formatCurrency(order.totals.tvq_cents)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className='flex justify-between'>
                        <span className='text-xs text-muted-foreground'>Taxe :</span>
                        <span className='text-xs font-medium'>
                          {formatCurrency(order.totals.tax_cents)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between text-sm font-bold border-t pt-1'>
                      <span>Total :</span>
                      <span className='text-primary'>
                        {formatCurrency(order.totals.total_cents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {order.qrcode && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg'>Code QR de la commande</CardTitle>
                <CardDescription className='text-sm'>
                  Utilisez ce code QR pour suivre la commande
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='text-center'>
                  <img
                    src={order.qrcode}
                    alt='Code QR de la commande'
                    className='w-24 h-24 mx-auto border border-border rounded'
                  />
                  <p className='text-xs text-muted-foreground mt-2'>
                    Commande #{order.orderNumber}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className='flex space-x-3'>
            <Button
              onClick={onPrintLabels}
              className='flex-1 py-2 text-sm btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation'
            >
              Imprimer les étiquettes
            </Button>
            <Button
              onClick={onNewOrder}
              variant='outline'
              className='flex-1 py-2 text-sm btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-border touch-manipulation'
            >
              Nouvelle commande
            </Button>
          </div>

          {/* Next Steps */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>Prochaines étapes</CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='space-y-2'>
                <div className='flex items-start space-x-2'>
                  <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                    1
                  </div>
                  <div>
                    <h4 className='font-medium text-sm'>Imprimer les étiquettes</h4>
                    <p className='text-xs text-muted-foreground'>
                      Imprimez les étiquettes pour chaque vêtement afin de les suivre tout au long du processus
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-2'>
                  <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                    2
                  </div>
                  <div>
                    <h4 className='font-medium text-sm'>Commencer le travail</h4>
                    <p className='text-xs text-muted-foreground'>
                      Commencez à travailler sur les vêtements selon les services sélectionnés
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-2'>
                  <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                    3
                  </div>
                  <div>
                    <h4 className='font-medium text-sm'>Mettre à jour le statut</h4>
                    <p className='text-xs text-muted-foreground'>
                      Mettez à jour le statut de la commande au fur et à mesure de l&apos;avancement
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
