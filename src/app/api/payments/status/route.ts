import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/payments/payment-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const paymentIntentId = searchParams.get('paymentIntentId')

    if (!orderId && !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId or paymentIntentId' },
        { status: 400 }
      )
    }

    if (paymentIntentId) {
      const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId)
      if (!paymentIntent) {
        return NextResponse.json(
          { error: 'Payment intent not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, paymentIntent })
    }

    if (orderId) {
      const paymentIntents = await paymentService.getPaymentIntentsByOrder(orderId)
      const summary = await paymentService.getPaymentSummary(orderId)
      
      return NextResponse.json({
        success: true,
        paymentIntents,
        summary
      })
    }

    // This should never be reached due to the check above, but TypeScript needs it
    return NextResponse.json(
      { error: 'Missing required parameter: orderId or paymentIntentId' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error getting payment status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payment status' },
      { status: 500 }
    )
  }
}
