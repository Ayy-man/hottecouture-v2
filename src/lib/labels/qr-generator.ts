import QRCode from 'qrcode'
import { nanoid } from 'nanoid'

export interface QRCodeData {
  orderNumber: number
  garmentId?: string
  garmentLabelCode?: string
}

export interface QRCodeOptions {
  size?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Generate QR code data string for orders and garments
 */
export function generateQRData(data: QRCodeData): string {
  if (data.garmentId && data.garmentLabelCode) {
    return `GARM-${data.garmentLabelCode}`
  }
  return `ORD-${data.orderNumber}`
}

/**
 * Generate QR code PNG as base64 string
 */
export async function generateQRCodePNG(
  data: QRCodeData,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrData = generateQRData(data)
  
  const defaultOptions: QRCodeOptions = {
    size: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  }

  const mergedOptions = { ...defaultOptions, ...options }

  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
      errorCorrectionLevel: 'M',
    })

    return qrCodeDataURL
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate QR code SVG as string
 */
export async function generateQRCodeSVG(
  data: QRCodeData,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrData = generateQRData(data)
  
  const defaultOptions: QRCodeOptions = {
    size: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  }

  const mergedOptions = { ...defaultOptions, ...options }

  try {
    const qrCodeSVG = await QRCode.toString(qrData, {
      type: 'svg',
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
      errorCorrectionLevel: 'M',
    })

    return qrCodeSVG
  } catch (error) {
    throw new Error(`Failed to generate QR code SVG: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate multiple QR codes for an order and its garments
 */
export async function generateOrderQRCodes(
  orderNumber: number,
  garments: Array<{ id: string; labelCode: string }>,
  options: QRCodeOptions = {}
): Promise<{
  orderQR: string
  garmentQRs: Array<{ garmentId: string; qrCode: string }>
}> {
  try {
    // Generate order QR code
    const orderQR = await generateQRCodePNG(
      { orderNumber },
      options
    )

    // Generate garment QR codes
    const garmentQRs = await Promise.all(
      garments.map(async (garment) => {
        const qrCode = await generateQRCodePNG(
          {
            orderNumber,
            garmentId: garment.id,
            garmentLabelCode: garment.labelCode,
          },
          options
        )

        return {
          garmentId: garment.id,
          qrCode,
        }
      })
    )

    return {
      orderQR,
      garmentQRs,
    }
  } catch (error) {
    throw new Error(`Failed to generate order QR codes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a short ID for garment labels
 */
export function generateGarmentLabelCode(): string {
  return nanoid(8).toUpperCase()
}

/**
 * Validate QR code data
 */
export function validateQRData(qrData: string): boolean {
  // Check if it's a valid order or garment QR code format
  return /^(ORD-\d+|GARM-[A-Z0-9]+)$/.test(qrData)
}

/**
 * Parse QR code data to extract information
 */
export function parseQRData(qrData: string): QRCodeData | null {
  if (!validateQRData(qrData)) {
    return null
  }

  if (qrData.startsWith('ORD-')) {
    const orderNumber = parseInt(qrData.replace('ORD-', ''), 10)
    if (isNaN(orderNumber)) {
      return null
    }
    return { orderNumber }
  }

  if (qrData.startsWith('GARM-')) {
    const garmentLabelCode = qrData.replace('GARM-', '')
    return {
      orderNumber: 0, // Will need to be looked up
      garmentLabelCode,
    }
  }

  return null
}
