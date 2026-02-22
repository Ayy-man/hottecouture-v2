'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { generateQRCode } from '@/lib/utils/qr';
import { Download, Printer } from 'lucide-react';
import { LABEL_CONFIG } from '@/lib/config/production';

interface OrderData {
  id: string;
  orderNumber: number;
  rush: boolean;
  createdAt: string;
  status: string;
  dueDate?: string | null;
  client: {
    first_name: string;
    last_name: string;
  };
  garments: Array<{
    id: string;
    type: string;
    label_code: string;
  }>;
}

interface GarmentWithQR {
  id: string;
  type: string;
  label_code: string;
  qrCode: string;
}

export default function LabelsPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [garmentsWithQR, setGarmentsWithQR] = useState<GarmentWithQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const labelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        // Try POST first (for HTML generation), fallback to GET
        let response = await fetch(`/api/labels/${orderId}`, {
          method: 'POST',
        });
        if (!response.ok) {
          // Fallback to GET method
          response = await fetch(`/api/labels/${orderId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch order data');
          }
        }
        const data = await response.json();
        console.log('🔍 Labels page: Received data:', data);

        const order = data.order || data;
        console.log('🔍 Labels page: Processed order:', order);

        if (data.html) {
          // Handle HTML response (new approach)
          setOrderData(order);
        } else {
          // Handle regular order data
          setOrderData(order);
        }

        // Generate QR codes for each garment
        if (!order.garments || !Array.isArray(order.garments)) {
          console.error('❌ No garments found in order data:', order);
          setError('No garments found for this order');
          return;
        }

        const garmentsWithQRCodes = await Promise.all(
          order.garments.map(async (garment: any) => {
            // NEW: Generate a URL deep link to the order on the board
            const qrData = `${window.location.origin}/board?order=${order.orderNumber}`;

            const qrCode = await generateQRCode(qrData);

            return {
              ...garment,
              qrCode,
            };
          })
        );

        setGarmentsWithQR(garmentsWithQRCodes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const downloadAsImage = async () => {
    if (!labelsRef.current || !orderData) return;
    setDownloading(true);

    try {
      const scale = 4;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Single column layout with horizontal labels
      const labelWidth = 400;
      const labelHeight = 200; // Changed from 300 to match 4:2 aspect ratio
      const totalLabels = garmentsWithQR.length * LABEL_CONFIG.copyCount;
      const padding = 20;

      canvas.width = (labelWidth + padding * 2) * scale;
      canvas.height = (totalLabels * labelHeight + padding * (totalLabels + 1) + 80) * scale;

      ctx.scale(scale, scale);

      const allLabels: Array<{ garment: GarmentWithQR; copyNumber: number }> = [];
      for (const garment of garmentsWithQR) {
        for (let copy = 1; copy <= LABEL_CONFIG.copyCount; copy++) {
          allLabels.push({ garment, copyNumber: copy });
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Commande #${orderData.orderNumber} - ${orderData.client.first_name} ${orderData.client.last_name}`, (labelWidth + padding * 2) / 2, 40);

      // Render labels in vertical stack with horizontal layout
      for (let i = 0; i < allLabels.length; i++) {
        const { garment, copyNumber } = allLabels[i]!;
        const x = padding;
        const y = 60 + padding + i * (labelHeight + padding);

        // Label border
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, labelWidth, labelHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 1, labelWidth - 2, labelHeight - 2);

        // Copy indicator (top right)
        if (LABEL_CONFIG.showCopyIndicator && LABEL_CONFIG.copyCount > 1) {
          ctx.font = '10px Arial';
          ctx.fillStyle = '#999999';
          ctx.textAlign = 'right';
          ctx.fillText(LABEL_CONFIG.copyIndicatorFormat(copyNumber, LABEL_CONFIG.copyCount), x + labelWidth - 8, y + 14);
        }

        // QR code on the left
        const qrImg = new Image();
        qrImg.src = garment.qrCode;
        await new Promise(resolve => { qrImg.onload = resolve; });
        const qrSize = 120;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(qrImg, x + 10, y + (labelHeight - qrSize) / 2, qrSize, qrSize);

        // Text content on the right (horizontal layout)
        const textX = x + qrSize + 25;
        const centerY = y + labelHeight / 2;

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';

        // Line 1: Order # and garment type
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`#${orderData.orderNumber}`, textX, centerY - 50);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#555555';
        ctx.fillText(garment.type, textX + 100, centerY - 50);

        // Line 2: Client name and label code
        ctx.font = '16px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`${orderData.client.first_name} ${orderData.client.last_name}`, textX, centerY - 20);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#888888';
        ctx.fillText(garment.label_code, textX + 180, centerY - 20);

        // Line 3: RUSH, Status, Due date
        ctx.font = '14px Arial';
        if (orderData.rush) {
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('RUSH', textX, centerY + 10);
        }
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        const rushOffset = orderData.rush ? 50 : 0;
        ctx.fillText(`Statut: ${orderData.status || 'Pending'}`, textX + rushOffset, centerY + 10);
        ctx.fillText(
          `Échéance: ${orderData.dueDate ? new Date(orderData.dueDate).toLocaleDateString('fr-CA') : 'TBD'}`,
          textX + rushOffset + 130, centerY + 10
        );
      }

      const link = document.createElement('a');
      link.download = `labels-order-${orderData.orderNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-foreground mx-auto'></div>
          <p className='mt-4 text-lg'>Loading labels...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Error</h1>
          <p className='text-muted-foreground'>{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden bg-white'>
      <div className='flex-1 overflow-y-auto'>
        <div className='max-w-4xl mx-auto p-4 md:p-8'>
        {/* Action Buttons */}
        <div className='no-print mb-6 flex justify-center gap-4'>
          <button
            onClick={downloadAsImage}
            disabled={downloading}
            className='bg-foreground hover:bg-foreground/90 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50'
          >
            <Download className='w-5 h-5' />
            {downloading ? 'Téléchargement...' : 'Télécharger PNG'}
          </button>
          <button
            onClick={() => window.print()}
            className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-lg active:scale-95 transition-all flex items-center gap-2'
          >
            <Printer className='w-5 h-5' />
            Imprimer
          </button>
        </div>

        {/* Header */}
        <div className='text-center mb-8 no-print'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            Order #{orderData.orderNumber} - Labels
          </h1>
          <p className='text-muted-foreground'>
            Client: {orderData.client.first_name} {orderData.client.last_name}
          </p>
          {orderData.rush && (
            <div className='inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mt-2'>
              RUSH ORDER
            </div>
          )}
        </div>

        {/* Labels - One per page for label printer */}
        <div ref={labelsRef} className='space-y-4'>
          {garmentsWithQR.flatMap((garment, garmentIndex) =>
            Array.from({ length: LABEL_CONFIG.copyCount }, (_, copyIndex) => {
              const isLastLabel = garmentIndex === garmentsWithQR.length - 1 && copyIndex === LABEL_CONFIG.copyCount - 1;
              return (
                <div
                  key={`${garment.id}-copy-${copyIndex + 1}`}
                  className='border-2 border-border rounded-lg p-3 print:border-black relative'
                  style={{
                    breakAfter: isLastLabel ? 'auto' : 'page',
                    width: LABEL_CONFIG.labelWidth,
                    height: LABEL_CONFIG.labelHeight,
                  }}
                >
                  {/* Copy indicator (top right) */}
                  {LABEL_CONFIG.showCopyIndicator && LABEL_CONFIG.copyCount > 1 && (
                    <div className='absolute top-1 right-2 text-xs text-muted-foreground/70'>
                      {LABEL_CONFIG.copyIndicatorFormat(copyIndex + 1, LABEL_CONFIG.copyCount)}
                    </div>
                  )}

                  {/* Horizontal layout: QR on left, content on right */}
                  <div className='flex items-center h-full gap-3'>
                    {/* QR Code */}
                    <div className='w-24 h-24 flex-shrink-0 border-2 border-border rounded print:border-black'>
                      <img
                        src={garment.qrCode}
                        alt={`QR Code for ${garment.label_code}`}
                        className='w-full h-full object-contain'
                      />
                    </div>

                    {/* Content */}
                    <div className='flex-1 space-y-1 text-xs'>
                      {/* Line 1: Order # and garment type */}
                      <div className='flex justify-between items-center'>
                        <div className='font-bold text-base'>
                          #{orderData.orderNumber}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {garment.type}
                        </div>
                      </div>

                      {/* Line 2: Client name and label code */}
                      <div className='flex justify-between items-center'>
                        <div className='text-xs font-medium'>
                          {orderData.client.first_name} {orderData.client.last_name}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {garment.label_code}
                        </div>
                      </div>

                      {/* Line 3: RUSH, Status, Due date */}
                      <div className='flex items-center gap-2 text-xs'>
                        {orderData.rush && (
                          <span className='font-bold text-red-600'>RUSH</span>
                        )}
                        <span>
                          {orderData.status || 'Pending'}
                        </span>
                        <span>•</span>
                        <span>
                          {orderData.dueDate
                            ? new Date(orderData.dueDate).toLocaleDateString('fr-CA')
                            : 'TBD'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Print Instructions */}
        <div className='mt-8 text-center text-sm text-muted-foreground no-print'>
          <p>Configure votre imprimante pour des étiquettes {LABEL_CONFIG.labelWidth} x {LABEL_CONFIG.labelHeight}</p>
          <p className='text-xs mt-1'>{LABEL_CONFIG.copyCount} copie{LABEL_CONFIG.copyCount > 1 ? 's' : ''} par vêtement</p>
        </div>
      </div>

      {/* Print Styles - Individual labels */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${LABEL_CONFIG.labelWidth} ${LABEL_CONFIG.labelHeight};
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden,
          .no-print {
            display: none !important;
          }
          .print\\:border-black {
            border-color: black !important;
          }
        }
      `}</style>
      </div>
    </div>
  );
}
