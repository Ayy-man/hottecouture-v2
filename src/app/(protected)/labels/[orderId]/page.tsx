'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { generateQRCode } from '@/lib/utils/qr';
import { Download, Printer, Share2 } from 'lucide-react';
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

// 300 DPI at 4"x2" = 1200x600 pixels
const LABEL_DPI = 300;
const LABEL_WIDTH_PX = 4 * LABEL_DPI; // 1200
const LABEL_HEIGHT_PX = 2 * LABEL_DPI; // 600

/**
 * Render a single label to a canvas and return as a blob.
 */
async function renderLabelToCanvas(
  orderData: OrderData,
  garment: GarmentWithQR,
  copyNumber: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH_PX;
  canvas.height = LABEL_HEIGHT_PX;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LABEL_WIDTH_PX, LABEL_HEIGHT_PX);

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, LABEL_WIDTH_PX - 4, LABEL_HEIGHT_PX - 4);

  // Copy indicator (top right)
  if (LABEL_CONFIG.showCopyIndicator && LABEL_CONFIG.copyCount > 1) {
    ctx.font = '28px Arial';
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'right';
    ctx.fillText(
      LABEL_CONFIG.copyIndicatorFormat(copyNumber, LABEL_CONFIG.copyCount),
      LABEL_WIDTH_PX - 24,
      40,
    );
  }

  // QR code on the left
  const qrImg = new Image();
  qrImg.src = garment.qrCode;
  await new Promise((resolve) => {
    qrImg.onload = resolve;
  });
  const qrSize = 360;
  const qrX = 40;
  const qrY = (LABEL_HEIGHT_PX - qrSize) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Text content on the right
  const textX = qrX + qrSize + 60;
  const centerY = LABEL_HEIGHT_PX / 2;

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';

  // Line 1: Order # and garment type
  ctx.font = 'bold 72px Arial';
  ctx.fillText(`#${orderData.orderNumber}`, textX, centerY - 120);
  ctx.font = '48px Arial';
  ctx.fillStyle = '#555555';
  ctx.fillText(garment.type, textX + 260, centerY - 120);

  // Line 2: Client name
  ctx.font = '44px Arial';
  ctx.fillStyle = '#000000';
  ctx.fillText(
    `${orderData.client.first_name} ${orderData.client.last_name}`,
    textX,
    centerY - 40,
  );

  // Line 2b: Label code
  ctx.font = '36px Arial';
  ctx.fillStyle = '#888888';
  ctx.fillText(garment.label_code, textX, centerY + 20);

  // Line 3: RUSH + Status + Due date
  let lineX = textX;
  if (orderData.rush) {
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('RUSH', lineX, centerY + 90);
    lineX += 140;
  }
  ctx.fillStyle = '#000000';
  ctx.font = '34px Arial';
  ctx.fillText(orderData.status || 'pending', lineX, centerY + 90);
  ctx.fillText(
    orderData.dueDate
      ? new Date(orderData.dueDate).toLocaleDateString('fr-CA')
      : '',
    lineX + 260,
    centerY + 90,
  );

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      'image/png',
    );
  });
}

export default function LabelsPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [garmentsWithQR, setGarmentsWithQR] = useState<GarmentWithQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // tracks which action is in progress
  const [canShare, setCanShare] = useState(false);
  const labelsRef = useRef<HTMLDivElement>(null);

  // Detect Web Share API support (files)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare);
  }, []);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        let response = await fetch(`/api/labels/${orderId}`, {
          method: 'POST',
        });
        if (!response.ok) {
          response = await fetch(`/api/labels/${orderId}`);
          if (!response.ok) {
            throw new Error('Impossible de charger les données');
          }
        }
        const data = await response.json();
        const order = data.order || data;

        if (!order.garments || !Array.isArray(order.garments)) {
          setError('Aucun vêtement trouvé pour cette commande');
          return;
        }

        setOrderData(order);

        const garmentsWithQRCodes = await Promise.all(
          order.garments.map(async (garment: { id: string; type: string; label_code: string }) => {
            const qrData = `${window.location.origin}/board?order=${order.orderNumber}`;
            const qrCode = await generateQRCode(qrData);
            return { ...garment, qrCode };
          }),
        );

        setGarmentsWithQR(garmentsWithQRCodes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  /**
   * Generate all label images as an array of { filename, blob, canvas }.
   */
  const generateAllLabelImages = useCallback(async () => {
    if (!orderData) return [];
    const results: Array<{ filename: string; blob: Blob; canvas: HTMLCanvasElement }> = [];

    for (const garment of garmentsWithQR) {
      for (let copy = 1; copy <= LABEL_CONFIG.copyCount; copy++) {
        const canvas = await renderLabelToCanvas(orderData, garment, copy);
        const blob = await canvasToBlob(canvas);
        const filename = `etiquette-${orderData.orderNumber}-${garment.label_code}-${copy}.png`;
        results.push({ filename, blob, canvas });
      }
    }
    return results;
  }, [orderData, garmentsWithQR]);

  /**
   * Share labels via iOS/Android share sheet (sends to printer app).
   */
  const shareLabels = async () => {
    if (!orderData) return;
    setBusy('share');
    try {
      const labels = await generateAllLabelImages();
      const files = labels.map(
        (l) => new File([l.blob], l.filename, { type: 'image/png' }),
      );

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title: `Étiquettes — Commande #${orderData.orderNumber}`,
          files,
        });
      } else {
        // Fallback: download individually
        for (const label of labels) {
          const link = document.createElement('a');
          link.download = label.filename;
          link.href = label.canvas.toDataURL('image/png');
          link.click();
        }
      }
    } catch (err) {
      // User cancelled share — not an error
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
    } finally {
      setBusy(null);
    }
  };

  /**
   * Download all labels as individual PNG files.
   */
  const downloadLabels = async () => {
    if (!orderData) return;
    setBusy('download');
    try {
      const labels = await generateAllLabelImages();
      for (const label of labels) {
        const link = document.createElement('a');
        link.download = label.filename;
        link.href = label.canvas.toDataURL('image/png');
        link.click();
        // Small delay between downloads to prevent browser blocking
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setBusy(null);
    }
  };

  /**
   * Share a single label image.
   */
  const shareSingleLabel = async (garment: GarmentWithQR, copyNumber: number) => {
    if (!orderData) return;
    setBusy(`share-${garment.id}-${copyNumber}`);
    try {
      const canvas = await renderLabelToCanvas(orderData, garment, copyNumber);
      const blob = await canvasToBlob(canvas);
      const filename = `etiquette-${orderData.orderNumber}-${garment.label_code}-${copyNumber}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
    } finally {
      setBusy(null);
    }
  };

  /**
   * Print labels in a clean popup window — avoids Next.js scripts leaking into print output.
   */
  const printLabels = useCallback(() => {
    if (!labelsRef.current || !orderData) return;

    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;

    const labelsHtml = labelsRef.current.innerHTML;

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Étiquettes — Commande #${orderData.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; font-family: Arial, sans-serif; }
  @page { size: ${LABEL_CONFIG.labelWidth} ${LABEL_CONFIG.labelHeight}; margin: 0; }
  .print-label {
    width: ${LABEL_CONFIG.labelWidth};
    height: ${LABEL_CONFIG.labelHeight};
    border: 2px solid black;
    padding: 8px;
    page-break-after: always;
    box-sizing: border-box;
    position: relative;
  }
  .print-label:last-child { page-break-after: auto; }
  .no-print { display: none !important; }
  .space-y-4 > * + * { margin-top: 0; }
  .flex { display: flex; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-3 { gap: 12px; }
  .gap-2 { gap: 8px; }
  .h-full { height: 100%; }
  .w-24 { width: 96px; }
  .h-24 { height: 96px; }
  .flex-shrink-0 { flex-shrink: 0; }
  .flex-1 { flex: 1; }
  .space-y-1 > * + * { margin-top: 4px; }
  .text-xs { font-size: 12px; }
  .text-base { font-size: 16px; }
  .font-bold { font-weight: bold; }
  .font-medium { font-weight: 500; }
  .text-red-600 { color: #dc2626; }
  .text-muted-foreground\\/70 { color: rgba(100,100,100,0.7); }
  .text-muted-foreground { color: #666; }
  .absolute { position: absolute; }
  .top-1 { top: 4px; }
  .right-2 { right: 8px; }
  .rounded { border-radius: 4px; }
  .rounded-lg { border-radius: 8px; }
  .border-2 { border: 2px solid #333; }
  .object-contain { object-fit: contain; }
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  img { display: block; width: 100%; height: 100%; object-fit: contain; }
</style></head><body>${labelsHtml}</body></html>`);

    printWindow.document.close();
    // Wait for images (QR codes) to load before printing
    const images = printWindow.document.querySelectorAll('img');
    let loaded = 0;
    const total = images.length;

    function tryPrint() {
      loaded++;
      if (loaded >= total) {
        setTimeout(() => {
          printWindow!.print();
          printWindow!.close();
        }, 300);
      }
    }

    if (total === 0) {
      setTimeout(() => { printWindow!.print(); printWindow!.close(); }, 300);
    } else {
      images.forEach((img) => {
        if (img.complete) { tryPrint(); }
        else { img.onload = tryPrint; img.onerror = tryPrint; }
      });
    }
  }, [orderData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-lg">Chargement des étiquettes...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
          <p className="text-muted-foreground">{error || 'Commande introuvable'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Action Buttons */}
          <div className="no-print mb-6 flex flex-wrap justify-center gap-3">
            {/* Primary: Share (best for Bluetooth label printers on iPad) */}
            {canShare && (
              <button
                onClick={shareLabels}
                disabled={!!busy}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {busy === 'share' ? 'Partage...' : 'Partager'}
              </button>
            )}
            {/* Download individual PNGs */}
            <button
              onClick={downloadLabels}
              disabled={!!busy}
              className="bg-foreground hover:bg-foreground/90 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {busy === 'download' ? 'Téléchargement...' : 'Télécharger PNG'}
            </button>
            {/* Browser print (opens clean window — no Next.js script junk) */}
            <button
              onClick={printLabels}
              disabled={!!busy}
              className="bg-white hover:bg-gray-50 text-foreground border-2 border-border px-6 py-3 rounded-xl text-lg font-semibold shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              Imprimer
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8 no-print">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Commande #{orderData.orderNumber} — Étiquettes
            </h1>
            <p className="text-muted-foreground">
              Client: {orderData.client.first_name} {orderData.client.last_name}
            </p>
            {orderData.rush && (
              <div className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mt-2">
                COMMANDE URGENTE
              </div>
            )}
          </div>

          {/* Bluetooth printer help */}
          <div className="no-print mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Imprimante Bluetooth?</p>
            <p>
              Utilisez le bouton <strong>Partager</strong> pour envoyer les étiquettes vers
              l&apos;application de votre imprimante (Brother iPrint, DYMO Connect, etc.).
              Le bouton Imprimer fonctionne uniquement avec les imprimantes AirPrint (Wi-Fi).
            </p>
          </div>

          {/* Labels - One per page for label printer */}
          <div ref={labelsRef} id="print-labels" className="space-y-4 print:space-y-0">
            {garmentsWithQR.flatMap((garment, garmentIndex) =>
              Array.from({ length: LABEL_CONFIG.copyCount }, (_, copyIndex) => {
                const copyNumber = copyIndex + 1;
                return (
                  <div
                    key={`${garment.id}-copy-${copyNumber}`}
                    className="print-label border-2 border-border rounded-lg p-3 print:border-black relative group"
                    style={{
                      width: LABEL_CONFIG.labelWidth,
                      height: LABEL_CONFIG.labelHeight,
                    }}
                  >
                    {/* Per-label share button (top right, visible on hover/touch) */}
                    {canShare && (
                      <button
                        onClick={() => shareSingleLabel(garment, copyNumber)}
                        disabled={!!busy}
                        className="no-print absolute -top-2 -right-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-30"
                        title="Partager cette étiquette"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Copy indicator (top right) */}
                    {LABEL_CONFIG.showCopyIndicator && LABEL_CONFIG.copyCount > 1 && (
                      <div className="absolute top-1 right-2 text-xs text-muted-foreground/70">
                        {LABEL_CONFIG.copyIndicatorFormat(copyNumber, LABEL_CONFIG.copyCount)}
                      </div>
                    )}

                    {/* Horizontal layout: QR on left, content on right */}
                    <div className="flex items-center h-full gap-3">
                      {/* QR Code */}
                      <div className="w-24 h-24 flex-shrink-0 border-2 border-border rounded print:border-black">
                        <img
                          src={garment.qrCode}
                          alt={`QR Code pour ${garment.label_code}`}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1 text-xs">
                        {/* Line 1: Order # and garment type */}
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-base">
                            #{orderData.orderNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {garment.type}
                          </div>
                        </div>

                        {/* Line 2: Client name and label code */}
                        <div className="flex justify-between items-center">
                          <div className="text-xs font-medium">
                            {orderData.client.first_name} {orderData.client.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {garment.label_code}
                          </div>
                        </div>

                        {/* Line 3: RUSH, Status, Due date */}
                        <div className="flex items-center gap-2 text-xs">
                          {orderData.rush && (
                            <span className="font-bold text-red-600">RUSH</span>
                          )}
                          <span>{orderData.status || 'pending'}</span>
                          <span>&bull;</span>
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
              }),
            )}
          </div>

          {/* Print Instructions */}
          <div className="mt-8 text-center text-sm text-muted-foreground no-print">
            <p>
              Format des étiquettes: {LABEL_CONFIG.labelWidth} x {LABEL_CONFIG.labelHeight}
            </p>
            <p className="text-xs mt-1">
              {LABEL_CONFIG.copyCount} copie{LABEL_CONFIG.copyCount > 1 ? 's' : ''} par
              vêtement
            </p>
          </div>
        </div>

        {/* No print styles needed — printLabels() opens a clean window */}
      </div>
    </div>
  );
}
