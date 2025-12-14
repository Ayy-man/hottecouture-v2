'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { generateQRCode, generateGarmentStatusQRValue } from '@/lib/utils/qr';
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
            const qrData = generateGarmentStatusQRValue({
              garmentId: garment.id,
              labelCode: garment.label_code,
              type: garment.type,
              orderNumber: order.orderNumber,
              status: order.status || 'pending',
            });

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

      const labelWidth = 400;
      const labelHeight = 300;
      const cols = 2;
      const totalLabels = garmentsWithQR.length * LABEL_CONFIG.copyCount;
      const rows = Math.ceil(totalLabels / cols);
      const padding = 20;

      canvas.width = (cols * labelWidth + padding * 3) * scale;
      canvas.height = (rows * labelHeight + padding * (rows + 1) + 80) * scale;

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
      ctx.fillText(`Commande #${orderData.orderNumber} - ${orderData.client.first_name} ${orderData.client.last_name}`, (cols * labelWidth + padding * 3) / 2, 40);

      for (let i = 0; i < allLabels.length; i++) {
        const { garment, copyNumber } = allLabels[i]!;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * (labelWidth + padding);
        const y = 60 + padding + row * (labelHeight + padding);

        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, labelWidth, labelHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 1, labelWidth - 2, labelHeight - 2);

        if (LABEL_CONFIG.showCopyIndicator && LABEL_CONFIG.copyCount > 1) {
          ctx.font = '10px Arial';
          ctx.fillStyle = '#999999';
          ctx.textAlign = 'right';
          ctx.fillText(LABEL_CONFIG.copyIndicatorFormat(copyNumber, LABEL_CONFIG.copyCount), x + labelWidth - 8, y + 14);
        }

        const qrImg = new Image();
        qrImg.src = garment.qrCode;
        await new Promise(resolve => { qrImg.onload = resolve; });
        const qrSize = 120;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(qrImg, x + (labelWidth - qrSize) / 2, y + 10, qrSize, qrSize);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`#${orderData.orderNumber}`, x + labelWidth / 2, y + 150);

        ctx.font = '18px Arial';
        ctx.fillStyle = '#555555';
        ctx.fillText(garment.type, x + labelWidth / 2, y + 175);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#888888';
        ctx.fillText(garment.label_code, x + labelWidth / 2, y + 195);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`${orderData.client.first_name} ${orderData.client.last_name}`, x + labelWidth / 2, y + 218);

        if (orderData.rush) {
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = '#dc2626';
          ctx.fillText('RUSH', x + labelWidth / 2, y + 238);
        }

        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 250);
        ctx.lineTo(x + labelWidth - 20, y + 250);
        ctx.stroke();

        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.fillText('Statut:', x + 25, y + 270);
        ctx.textAlign = 'right';
        ctx.fillText(orderData.status || 'Pending', x + labelWidth - 25, y + 270);

        ctx.textAlign = 'left';
        ctx.fillText('Échéance:', x + 25, y + 288);
        ctx.textAlign = 'right';
        ctx.fillText(
          orderData.dueDate ? new Date(orderData.dueDate).toLocaleDateString('fr-CA') : 'TBD',
          x + labelWidth - 25, y + 288
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
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto'></div>
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
          <p className='text-gray-600'>{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white p-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Action Buttons */}
        <div className='no-print mb-6 flex justify-center gap-4'>
          <button
            onClick={downloadAsImage}
            disabled={downloading}
            className='bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50'
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
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Order #{orderData.orderNumber} - Labels
          </h1>
          <p className='text-gray-600'>
            Client: {orderData.client.first_name} {orderData.client.last_name}
          </p>
          {orderData.rush && (
            <div className='inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mt-2'>
              RUSH ORDER
            </div>
          )}
        </div>

        {/* Labels Grid - 2 per page for printing */}
        <div ref={labelsRef} className='grid grid-cols-2 gap-6 print:grid-cols-2 print:gap-8'>
          {garmentsWithQR.flatMap(garment =>
            Array.from({ length: LABEL_CONFIG.copyCount }, (_, copyIndex) => (
              <div
                key={`${garment.id}-copy-${copyIndex + 1}`}
                className='border-2 border-gray-300 rounded-lg p-4 print:border-black print:break-inside-avoid print:min-h-[45vh] relative'
              >
                {/* Copy indicator */}
                {LABEL_CONFIG.showCopyIndicator && LABEL_CONFIG.copyCount > 1 && (
                  <div className='absolute top-2 right-2 text-xs text-gray-400'>
                    {LABEL_CONFIG.copyIndicatorFormat(copyIndex + 1, LABEL_CONFIG.copyCount)}
                  </div>
                )}

                {/* QR Code with Status */}
                <div className='w-24 h-24 mx-auto mb-3 border-2 border-gray-300 rounded print:border-black'>
                  <img
                    src={garment.qrCode}
                    alt={`QR Code for ${garment.label_code}`}
                    className='w-full h-full object-contain'
                  />
                </div>

                {/* Order Info */}
                <div className='text-center space-y-1'>
                  <div className='font-bold text-lg'>
                    #{orderData.orderNumber}
                  </div>
                  <div className='text-sm text-gray-600'>{garment.type}</div>
                  <div className='text-xs text-gray-500'>
                    {garment.label_code}
                  </div>
                  <div className='text-xs'>
                    {orderData.client.first_name} {orderData.client.last_name}
                  </div>
                  {orderData.rush && (
                    <div className='text-xs font-bold text-red-600'>RUSH</div>
                  )}
                </div>

                {/* Status Bar */}
                <div className='mt-3 pt-2 border-t border-gray-200 print:border-black'>
                  <div className='flex justify-between text-xs'>
                    <span>Statut:</span>
                    <span className='font-medium capitalize'>
                      {orderData.status || 'Pending'}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs mt-1'>
                    <span>Échéance:</span>
                    <span className='font-medium'>
                      {orderData.dueDate
                        ? new Date(orderData.dueDate).toLocaleDateString('fr-CA')
                        : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Print Instructions */}
        <div className='mt-8 text-center text-sm text-gray-500 no-print'>
          <p>Utilisez du papier autocollant pour de meilleurs résultats</p>
          <p className='text-xs mt-1'>{LABEL_CONFIG.copyCount} copie{LABEL_CONFIG.copyCount > 1 ? 's' : ''} par étiquette</p>
        </div>
      </div>

      {/* Print Styles - 2 labels per page */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden,
          .no-print {
            display: none !important;
          }
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .print\\:gap-8 {
            gap: 2rem !important;
          }
          .print\\:border-black {
            border-color: black !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
          }
          .print\\:min-h-\\[45vh\\] {
            min-height: 45vh !important;
          }
        }
      `}</style>
    </div>
  );
}
