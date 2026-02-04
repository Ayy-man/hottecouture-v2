import { NextRequest, NextResponse } from 'next/server'
import { importPricingData, importPricingFromCSV, generateSamplePricingData } from '@/lib/pricing/import-pricing'

export async function POST(request: NextRequest) {
  try {
    const { type, data, replaceExisting = false } = await request.json()

    let result

    switch (type) {
      case 'sample':
        // Import sample pricing data
        const sampleData = generateSamplePricingData()
        result = await importPricingData(sampleData, replaceExisting)
        break

      case 'csv':
        // Import from CSV data
        if (!data) {
          return NextResponse.json(
            { error: 'CSV data is required' },
            { status: 400 }
          )
        }
        result = await importPricingFromCSV(data, replaceExisting)
        break

      case 'json':
        // Import from JSON data
        if (!data || !Array.isArray(data)) {
          return NextResponse.json(
            { error: 'Valid pricing data array is required' },
            { status: 400 }
          )
        }
        result = await importPricingData(data, replaceExisting)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid import type. Use "sample", "csv", or "json"' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error importing pricing data:', error)
    return NextResponse.json(
      { error: 'Failed to import pricing data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Pricing import endpoint',
    supportedTypes: ['sample', 'csv', 'json'],
    sampleData: generateSamplePricingData()
  })
}
