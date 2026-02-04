import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/payments/payment-service'
import { logEvent } from '@/lib/api/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, paymentMethodId, providerId, metadata } = await request.json()

    if (!orderId || !amount || !paymentMethodId || !providerId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, paymentMethodId, providerId' },
        { status: 400 }
      )
    }

    const paymentIntent = await paymentService.createPaymentIntent(
      orderId,
      amount,
      paymentMethodId,
      providerId,
      metadata || {}
    )

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    await logEvent('payment', 'system', 'create_intent_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
