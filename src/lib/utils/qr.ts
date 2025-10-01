import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
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
      width: 200,
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
