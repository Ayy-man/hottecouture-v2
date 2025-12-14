import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 600,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })

    return qrCodeDataURL
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  try {
    const qrCodeBuffer = await QRCode.toBuffer(data, {
      width: 600,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })

    return qrCodeBuffer
  } catch (error) {
    console.error('Failed to generate QR code buffer:', error)
    throw new Error('Failed to generate QR code buffer')
  }
}

export function generateOrderQRValue(orderNumber: number): string {
  return `ORD-${orderNumber}`
}

export function generateGarmentQRValue(garmentId: string): string {
  return `GARM-${garmentId.substring(0, 8)}`
}

export function generateOrderStatusQRValue(orderData: {
  orderNumber: number
  status: string
  dueDate?: string | null
  rush: boolean
  clientName: string
}): string {
  const qrData = {
    type: 'order',
    orderNumber: orderData.orderNumber,
    status: orderData.status,
    dueDate: orderData.dueDate,
    rush: orderData.rush,
    client: orderData.clientName,
    timestamp: new Date().toISOString()
  }

  return JSON.stringify(qrData)
}

export function generateGarmentStatusQRValue(garmentData: {
  garmentId: string
  labelCode: string
  type: string
  orderNumber: number
  status: string
}): string {
  const qrData = {
    type: 'garment',
    garmentId: garmentData.garmentId,
    labelCode: garmentData.labelCode,
    garmentType: garmentData.type,
    orderNumber: garmentData.orderNumber,
    status: garmentData.status,
    timestamp: new Date().toISOString()
  }

  return JSON.stringify(qrData)
}
