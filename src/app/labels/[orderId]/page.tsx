'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { generateQRCode, generateGarmentStatusQRValue } from '@/lib/utils/qr';

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
        {/* Print Button - iPad friendly */}
        <div className='no-print mb-6 flex justify-center'>
          <button
            onClick={() => window.print()}
            className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-semibold shadow-lg active:scale-95 transition-transform flex items-center gap-3'
          >
            <span className='text-2xl'>🖨️</span>
            Print Labels
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
        <div className='grid grid-cols-2 gap-6 print:grid-cols-2 print:gap-8'>
          {garmentsWithQR.map(garment => (
            <div
              key={garment.id}
              className='border-2 border-gray-300 rounded-lg p-4 print:border-black print:break-inside-avoid print:min-h-[45vh]'
            >
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
                  <span>Status:</span>
                  <span className='font-medium capitalize'>
                    {orderData.status || 'Pending'}
                  </span>
                </div>
                <div className='flex justify-between text-xs mt-1'>
                  <span>Due:</span>
                  <span className='font-medium'>
                    {orderData.dueDate
                      ? new Date(orderData.dueDate).toLocaleDateString()
                      : 'TBD'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Print Instructions */}
        <div className='mt-8 text-center text-sm text-gray-500 no-print'>
          <p>Use sticker paper for best results</p>
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
