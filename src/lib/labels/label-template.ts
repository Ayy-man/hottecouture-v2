import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export interface LabelData {
  orderNumber: number
  clientName: string
  clientInitials: string
  garments: Array<{
    id: string
    labelCode: string
    type: string
    qrCode: string
  }>
  rush: boolean
  createdAt: string
  language: 'fr' | 'en'
}

export interface LabelSheetOptions {
  paperSize: 'A4' | 'Letter'
  labelsPerRow: number
  labelsPerColumn: number
  labelWidth: number
  labelHeight: number
  margin: number
}

// Localized strings
const getLocalizedStrings = (language: 'fr' | 'en') => {
  const strings = {
    fr: {
      orderNumber: 'Commande #',
      garmentCode: 'Code',
      rush: 'URGENT',
    },
    en: {
      orderNumber: 'Order #',
      garmentCode: 'Code',
      rush: 'RUSH',
    },
  }
  return strings[language]
}

/**
 * Generate HTML template for label sheet
 */
export function generateLabelSheetHTML(
  data: LabelData,
  options: LabelSheetOptions = {
    paperSize: 'A4',
    labelsPerRow: 3,
    labelsPerColumn: 8,
    labelWidth: 70,
    labelHeight: 35,
    margin: 5,
  }
): string {
  const { orderNumber, clientInitials, garments, rush, createdAt } = data
  const { paperSize, labelsPerRow, labelsPerColumn, labelWidth, labelHeight, margin } = options

  // Calculate total labels needed
  const totalLabels = garments.length
  const labelsPerPage = labelsPerRow * labelsPerColumn
  const totalPages = Math.ceil(totalLabels / labelsPerPage)

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order ${orderNumber} - Labels</title>
    <style>
        ${getLabelSheetCSS(paperSize, labelsPerRow, labelsPerColumn, labelWidth, labelHeight, margin)}
    </style>
</head>
<body>
    <div class="label-sheet">
`

  // Generate labels for each page
  for (let page = 0; page < totalPages; page++) {
    html += `        <div class="page">\n`
    
    for (let row = 0; row < labelsPerColumn; row++) {
      html += `            <div class="label-row">\n`
      
      for (let col = 0; col < labelsPerRow; col++) {
        const labelIndex = page * labelsPerPage + row * labelsPerRow + col
        
        if (labelIndex < totalLabels) {
          const garment = garments[labelIndex]
          if (garment) {
            html += generateSingleLabelHTML(garment, orderNumber, clientInitials, rush, createdAt, data.language)
          }
        } else {
          html += `                <div class="label empty"></div>\n`
        }
      }
      
      html += `            </div>\n`
    }
    
    html += `        </div>\n`
  }

  html += `
    </div>
</body>
</html>`

  return html
}

/**
 * Generate HTML for a single label
 */
function generateSingleLabelHTML(
  garment: LabelData['garments'][0],
  orderNumber: number,
  clientInitials: string,
  rush: boolean,
  createdAt: string,
  language: 'fr' | 'en'
): string {
  const strings = getLocalizedStrings(language)
  const locale = language === 'fr' ? fr : enUS
  const createdDate = format(new Date(createdAt), 'MMM dd, yyyy', { locale })
  
  return `
                <div class="label">
                    ${rush ? `<div class="rush-stripe">${strings.rush}</div>` : ''}
                    <div class="label-content">
                        <div class="label-header">
                            <div class="client-initials">${clientInitials}</div>
                            <div class="order-number">${strings.orderNumber}${orderNumber}</div>
                        </div>
                        <div class="garment-info">
                            <div class="garment-type">${garment.type}</div>
                            <div class="garment-code">${strings.garmentCode}: ${garment.labelCode}</div>
                        </div>
                        <div class="qr-code">
                            <img src="${garment.qrCode}" alt="QR Code" />
                        </div>
                        <div class="date">${createdDate}</div>
                    </div>
                </div>
`
}

/**
 * Generate CSS for label sheet
 */
function getLabelSheetCSS(
  paperSize: string,
  labelsPerRow: number,
  labelsPerColumn: number,
  labelWidth: number,
  labelHeight: number,
  margin: number
): string {
  // Suppress unused variable warnings - these are used in template literals
  void labelsPerRow
  void labelsPerColumn
  
  const pageWidth = paperSize === 'A4' ? '210mm' : '8.5in'
  const pageHeight = paperSize === 'A4' ? '297mm' : '11in'

  return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: white;
        }

        .label-sheet {
            width: 100%;
        }

        .page {
            width: ${pageWidth};
            height: ${pageHeight};
            margin: 0 auto;
            padding: 10mm;
            display: flex;
            flex-direction: column;
            page-break-after: always;
        }

        .label-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: ${margin}mm;
            flex: 1;
        }

        .label {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            border: 1px solid #ccc;
            position: relative;
            display: flex;
            flex-direction: column;
            background: white;
            overflow: hidden;
        }

        .label.empty {
            border: none;
            background: transparent;
        }

        .rush-stripe {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3mm;
            background: #ff0000;
            z-index: 10;
        }

        .label-content {
            padding: 2mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1mm;
        }

        .client-initials {
            font-size: 8pt;
            font-weight: bold;
            color: #333;
        }

        .order-number {
            font-size: 7pt;
            font-weight: bold;
            color: #666;
        }

        .garment-info {
            margin-bottom: 1mm;
        }

        .garment-type {
            font-size: 6pt;
            color: #333;
            margin-bottom: 0.5mm;
        }

        .garment-code {
            font-size: 5pt;
            color: #666;
            font-family: monospace;
        }

        .qr-code {
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
        }

        .qr-code img {
            width: 15mm;
            height: 15mm;
            max-width: 100%;
            max-height: 100%;
        }

        .date {
            font-size: 4pt;
            color: #999;
            text-align: center;
            margin-top: 1mm;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }

            .page {
                margin: 0;
                padding: 10mm;
            }

            .label {
                border: 1px solid #000;
            }

            .label.empty {
                border: none;
            }
        }

        @page {
            size: ${paperSize};
            margin: 0;
        }
    `
}

/**
 * Generate SVG template for label sheet (alternative to HTML)
 */
export function generateLabelSheetSVG(
  data: LabelData,
  options: LabelSheetOptions = {
    paperSize: 'A4',
    labelsPerRow: 3,
    labelsPerColumn: 8,
    labelWidth: 70,
    labelHeight: 35,
    margin: 5,
  }
): string {
  const { orderNumber, clientInitials, garments, rush, createdAt } = data
  const { paperSize, labelsPerRow, labelsPerColumn, labelWidth, labelHeight, margin } = options
  
  // Suppress unused variable warnings - these are used in template literals
  void labelsPerColumn

  const pageWidth = paperSize === 'A4' ? 210 : 8.5 * 25.4 // Convert inches to mm
  const pageHeight = paperSize === 'A4' ? 297 : 11 * 25.4

  let svg = `
<svg width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <style>
            .label-text { font-family: Arial, sans-serif; }
            .label-small { font-size: 6pt; }
            .label-medium { font-size: 8pt; }
            .label-large { font-size: 10pt; }
            .label-bold { font-weight: bold; }
        </style>
    </defs>
`

  // Generate labels
  garments.forEach((garment, index) => {
    const row = Math.floor(index / labelsPerRow)
    const col = index % labelsPerRow
    
    const x = 10 + col * (labelWidth + margin)
    const y = 10 + row * (labelHeight + margin)

    svg += generateSingleLabelSVG(
      garment,
      orderNumber,
      clientInitials,
      rush,
      createdAt,
      x,
      y,
      labelWidth,
      labelHeight
    )
  })

  svg += `</svg>`

  return svg
}

/**
 * Generate SVG for a single label
 */
function generateSingleLabelSVG(
  garment: LabelData['garments'][0],
  orderNumber: number,
  clientInitials: string,
  rush: boolean,
  createdAt: string,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const createdDate = format(new Date(createdAt), 'MMM dd, yyyy')
  
  return `
    <g transform="translate(${x}, ${y})">
        <rect width="${width}" height="${height}" fill="white" stroke="#ccc" stroke-width="0.5"/>
        ${rush ? `<rect width="${width}" height="3" fill="#ff0000"/>` : ''}
        <text x="2" y="8" class="label-text label-medium label-bold">${clientInitials}</text>
        <text x="${width - 2}" y="8" class="label-text label-small label-bold" text-anchor="end">#${orderNumber}</text>
        <text x="2" y="15" class="label-text label-small">${garment.type}</text>
        <text x="2" y="20" class="label-text label-small">${garment.labelCode}</text>
        <image x="${width/2 - 7.5}" y="${height/2 - 7.5}" width="15" height="15" href="${garment.qrCode}"/>
        <text x="${width/2}" y="${height - 2}" class="label-text label-small" text-anchor="middle">${createdDate}</text>
    </g>
`
}
