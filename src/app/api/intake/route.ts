import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  withErrorHandling, 
  getCorrelationId, 
  logEvent, 
  validateRequest,
  requireAuth 
} from '@/lib/api/error-handler'
import { intakeRequestSchema, IntakeRequest, IntakeResponse } from '@/lib/dto'
import { calculateOrderPricing, getPricingConfig } from '@/lib/pricing'
import { generateQRCode } from '@/lib/utils/qr'
import { nanoid } from 'nanoid'

async function handleIntake(request: NextRequest): Promise<IntakeResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = createClient()
  
  // Validate authentication
  requireAuth(request)
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(intakeRequestSchema, body, correlationId) as IntakeRequest
  
  const { client, order, garments } = validatedData

  // Start transaction-like operations
  try {
    // 1. Upsert client
    const { data: existingClient } = await supabase
      .from('client')
      .select('id')
      .eq('email', client.email)
      .single()

    let clientId: string
    if (existingClient) {
      // Update existing client
      const { error: updateError } = await supabase
        .from('client')
        .update(client)
        .eq('id', existingClient.id)
      
      if (updateError) throw new Error(`Failed to update client: ${updateError.message}`)
      clientId = existingClient.id
      
      await logEvent('client', clientId, 'updated', { correlationId })
    } else {
      // Create new client
      const { data: newClient, error: createError } = await supabase
        .from('client')
        .insert(client)
        .select('id')
        .single()
      
      if (createError) throw new Error(`Failed to create client: ${createError.message}`)
      clientId = newClient.id
      
      await logEvent('client', clientId, 'created', { correlationId })
    }

    // 2. Create order
    const orderData = {
      ...order,
      client_id: clientId,
    }
    
    const { data: newOrder, error: orderError } = await supabase
      .from('order')
      .insert(orderData)
      .select('id, order_number')
      .single()
    
    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`)
    
    const orderId = newOrder.id
    const orderNumber = newOrder.order_number
    
    await logEvent('order', orderId, 'created', { 
      correlationId,
      orderNumber,
      type: order.type,
      rush: order.rush 
    })

    // 3. Create garments and services
    const garmentIds: string[] = []
    const pricingItems: any[] = []
    
    for (const garmentData of garments) {
      const { services, photoTempPath, positionNotes, ...garmentFields } = garmentData
      
      // Create garment
      const { data: newGarment, error: garmentError } = await supabase
        .from('garment')
        .insert({
          ...garmentFields,
          order_id: orderId,
          photo_path: photoTempPath,
          position_notes: positionNotes,
        })
        .select('id')
        .single()
      
      if (garmentError) throw new Error(`Failed to create garment: ${garmentError.message}`)
      
      const garmentId = newGarment.id
      garmentIds.push(garmentId)
      
      await logEvent('garment', garmentId, 'created', { 
        correlationId,
        orderId,
        type: garmentData.type 
      })

      // Create garment services
      for (const service of services) {
        // Get service base price
        const { data: serviceData } = await supabase
          .from('service')
          .select('base_price_cents')
          .eq('id', service.serviceId)
          .single()
        
        if (!serviceData) {
          throw new Error(`Service not found: ${service.serviceId}`)
        }

        // Create garment service relationship
        const { error: garmentServiceError } = await supabase
          .from('garment_service')
          .insert({
            garment_id: garmentId,
            service_id: service.serviceId,
            quantity: service.qty,
            custom_price_cents: service.customPriceCents,
          })
        
        if (garmentServiceError) {
          throw new Error(`Failed to create garment service: ${garmentServiceError.message}`)
        }

        // Add to pricing calculation
        pricingItems.push({
          garment_id: garmentId,
          service_id: service.serviceId,
          quantity: service.qty,
          custom_price_cents: service.customPriceCents,
          base_price_cents: serviceData.base_price_cents,
        })

        // Create task for this service
        const { error: taskError } = await supabase
          .from('task')
          .insert({
            garment_id: garmentId,
            operation: `Process ${serviceData.base_price_cents ? 'service' : 'custom work'}`,
            stage: 'pending',
          })
        
        if (taskError) {
          throw new Error(`Failed to create task: ${taskError.message}`)
        }
      }
    }

    // 4. Calculate pricing
    const config = getPricingConfig()
    const calculation = calculateOrderPricing({
      order_id: orderId,
      is_rush: order.rush,
      items: pricingItems,
      config,
    })

    // 5. Update order with pricing
    const { error: pricingError } = await supabase
      .from('order')
      .update({
        subtotal_cents: calculation.subtotal_cents,
        tax_cents: calculation.tax_cents,
        total_cents: calculation.total_cents,
        rush_fee_cents: calculation.rush_fee_cents,
      })
      .eq('id', orderId)
    
    if (pricingError) {
      throw new Error(`Failed to update order pricing: ${pricingError.message}`)
    }

    // 6. Generate QR code
    const qrValue = `ORD-${orderNumber}`
    const qrcode = await generateQRCode(qrValue)

    // 7. Update order with QR code
    const { error: qrError } = await supabase
      .from('order')
      .update({ qrcode })
      .eq('id', orderId)
    
    if (qrError) {
      console.warn('Failed to update QR code:', qrError.message)
    }

    // 8. Enqueue label job (stub for now)
    await logEvent('order', orderId, 'label_job_queued', { 
      correlationId,
      garmentCount: garments.length 
    })

    // 9. Return response
    const response: IntakeResponse = {
      orderId,
      orderNumber,
      totals: {
        subtotal_cents: calculation.subtotal_cents,
        tax_cents: calculation.tax_cents,
        total_cents: calculation.total_cents,
        rush_fee_cents: calculation.rush_fee_cents,
      },
      qrcode,
    }

    await logEvent('order', orderId, 'intake_completed', { 
      correlationId,
      orderNumber,
      totalCents: calculation.total_cents 
    })

    return response

  } catch (error) {
    await logEvent('order', 'unknown', 'intake_failed', { 
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    throw error
  }
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handleIntake(request), request)
}
