import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  withErrorHandling, 
  getCorrelationId, 
  logEvent, 
  validateRequest,
  requireAuth,
  NotFoundError
} from '@/lib/api/error-handler'
import { labelRequestSchema, LabelRequest, LabelResponse } from '@/lib/dto'
import { generateQRCode, generateOrderQRValue, generateGarmentQRValue } from '@/lib/utils/qr'
import { storageService } from '@/lib/storage'
import { nanoid } from 'nanoid'

async function handleLabelGeneration(
  request: NextRequest,
  { params }: { params: { orderId: string } }
): Promise<LabelResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = createClient()
  
  // Validate authentication
  requireAuth(request)
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(labelRequestSchema, body, correlationId) as LabelRequest
  
  const orderId = params.orderId

  // Get order and garments data
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select(`
      id,
      order_number,
      client:client_id (
        first_name,
        last_name
      ),
      garments (
        id,
        type,
        color,
        brand,
        label_code
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new NotFoundError('Order', correlationId)
  }

  // Generate QR codes
  const orderQRValue = generateOrderQRValue(order.order_number)
  const orderQRCode = await generateQRCode(orderQRValue)
  
  const garmentQRCodes: Array<{ type: 'order' | 'garment', value: string, position: string }> = [
    {
      type: 'order',
      value: orderQRValue,
      position: 'top-left'
    }
  ]

  // Generate garment QR codes
  for (const garment of order.garments || []) {
    const garmentQRValue = generateGarmentQRValue(garment.id)
    garmentQRCodes.push({
      type: 'garment',
      value: garmentQRValue,
      position: `garment-${garment.id}`
    })
  }

  // Create label sheet HTML (simplified version)
  const labelHTML = generateLabelHTML(order, garmentQRCodes)

  // Convert HTML to PDF (in real implementation, use puppeteer or similar)
  const pdfBuffer = await generatePDFFromHTML(labelHTML)

  // Save PDF to storage
  const fileName = `labels/order-${order.order_number}-${nanoid(8)}.pdf`
  const file = new File([pdfBuffer], fileName, { type: 'application/pdf' })
  
  const uploadResult = await storageService.uploadFile({
    bucket: 'labels',
    path: fileName,
    file,
    options: {
      upsert: false,
    }
  })

  // Get signed URL for the PDF
  const labelUrl = await storageService.getSignedUrl({
    bucket: 'labels',
    path: uploadResult.path,
    expiresIn: 3600 // 1 hour
  })

  // Log the event
  await logEvent('order', orderId, 'labels_generated', {
    correlationId,
    orderNumber: order.order_number,
    garmentCount: order.garments?.length || 0,
    fileName: uploadResult.path,
  })

  const response: LabelResponse = {
    orderId,
    labelUrl,
    qrCodes: garmentQRCodes,
  }

  return response
}

function generateLabelHTML(
  order: any,
  qrCodes: Array<{ type: 'order' | 'garment', value: string, position: string }>
): string {
  const clientName = `${order.client.first_name} ${order.client.last_name}`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Labels - ${order.order_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .label { 
          width: 4in; 
          height: 2in; 
          border: 1px solid #000; 
          margin: 10px; 
          padding: 10px; 
          display: inline-block; 
          page-break-inside: avoid;
        }
        .header { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        .order-info { font-size: 12px; margin-bottom: 5px; }
        .qr-code { width: 60px; height: 60px; float: right; }
        .garment-list { font-size: 10px; margin-top: 10px; }
        .garment-item { margin-bottom: 3px; }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="header">HOTTE COUTURE</div>
        <div class="order-info">Order #: ${order.order_number}</div>
        <div class="order-info">Client: ${clientName}</div>
        <div class="qr-code">
          <img src="${qrCodes[0].value}" alt="Order QR Code" />
        </div>
        <div class="garment-list">
          ${order.garments?.map((garment: any) => `
            <div class="garment-item">
              ${garment.type} ${garment.color ? `- ${garment.color}` : ''} ${garment.brand ? `(${garment.brand})` : ''}
            </div>
          `).join('') || ''}
        </div>
      </div>
    </body>
    </html>
  `
}

async function generatePDFFromHTML(html: string): Promise<Buffer> {
  // In a real implementation, you would use puppeteer or similar
  // For now, return a mock PDF buffer
  const mockPDF = Buffer.from('Mock PDF content - replace with actual PDF generation')
  return mockPDF
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withErrorHandling(() => handleLabelGeneration(request, { params }), request)
}
