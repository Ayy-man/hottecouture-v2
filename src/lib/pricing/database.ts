import { createClient } from '@/lib/supabase/server'
import { PricingItem, PricingConfig } from './types'
import { calculateOrderPricing, getPricingConfig } from './calcTotal'

/**
 * Update order pricing in the database
 */
export async function updateOrderPricing(
  orderId: string,
  items: PricingItem[],
  isRush: boolean,
  config?: Partial<PricingConfig>
) {
  const supabase = createClient()
  const fullConfig = { ...getPricingConfig(), ...config }
  
  const orderPricing = {
    order_id: orderId,
    is_rush: isRush,
    items,
    config: fullConfig,
  }

  const calculation = calculateOrderPricing(orderPricing)

  const { error } = await supabase
    .from('order')
    .update({
      subtotal_cents: calculation.subtotal_cents,
      tax_cents: calculation.tax_cents,
      total_cents: calculation.total_cents,
      rush_fee_cents: calculation.rush_fee_cents,
    })
    .eq('id', orderId)

  if (error) {
    throw new Error(`Failed to update order pricing: ${error.message}`)
  }

  return calculation
}

/**
 * Recalculate and update pricing for all orders
 */
export async function recalculateAllOrderPricing() {
  const supabase = createClient()
  
  // Get all orders with their garments and services
  const { data: orders, error: ordersError } = await supabase
    .from('order')
    .select(`
      id,
      rush,
      garments (
        id,
        garment_service (
          garment_id,
          service_id,
          quantity,
          custom_price_cents,
          service:service_id (
            base_price_cents
          )
        )
      )
    `)

  if (ordersError) {
    throw new Error(`Failed to fetch orders: ${ordersError.message}`)
  }

  const results = []
  const config = getPricingConfig()

  for (const order of orders || []) {
    try {
      // Flatten garment services into pricing items
      const items: PricingItem[] = []
      
      for (const garment of order.garments || []) {
        for (const garmentService of garment.garment_service || []) {
          items.push({
            garment_id: garmentService.garment_id,
            service_id: garmentService.service_id,
            quantity: garmentService.quantity,
            custom_price_cents: garmentService.custom_price_cents,
            base_price_cents: garmentService.service?.base_price_cents || 0,
          })
        }
      }

      const calculation = await updateOrderPricing(
        order.id,
        items,
        order.rush,
        config
      )

      results.push({
        order_id: order.id,
        success: true,
        calculation,
      })
    } catch (error) {
      results.push({
        order_id: order.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Get pricing breakdown for an order
 */
export async function getOrderPricingBreakdown(orderId: string) {
  const supabase = createClient()
  
  const { data: order, error } = await supabase
    .from('order')
    .select(`
      id,
      rush,
      subtotal_cents,
      tax_cents,
      total_cents,
      rush_fee_cents,
      garments (
        id,
        type,
        color,
        brand,
        garment_service (
          garment_id,
          service_id,
          quantity,
          custom_price_cents,
          notes,
          service:service_id (
            code,
            name,
            base_price_cents,
            category
          )
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch order: ${error.message}`)
  }

  if (!order) {
    throw new Error('Order not found')
  }

  return {
    order_id: order.id,
    is_rush: order.rush,
    subtotal_cents: order.subtotal_cents,
    tax_cents: order.tax_cents,
    total_cents: order.total_cents,
    rush_fee_cents: order.rush_fee_cents,
    garments: order.garments?.map(garment => ({
      id: garment.id,
      type: garment.type,
      color: garment.color,
      brand: garment.brand,
      services: garment.garment_service?.map(gs => ({
        service_id: gs.service_id,
        quantity: gs.quantity,
        custom_price_cents: gs.custom_price_cents,
        notes: gs.notes,
        service: gs.service,
        unit_price_cents: gs.custom_price_cents ?? gs.service?.base_price_cents ?? 0,
        total_price_cents: (gs.custom_price_cents ?? gs.service?.base_price_cents ?? 0) * gs.quantity,
        is_custom: gs.custom_price_cents !== null,
      })) || [],
    })) || [],
  }
}

/**
 * Validate order pricing before saving
 */
export async function validateOrderPricing(
  orderId: string,
  items: PricingItem[],
  isRush: boolean
) {
  const supabase = createClient()
  
  // Check if order exists
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select('id, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
  }

  // Validate all services exist
  const serviceIds = [...new Set(items.map(item => item.service_id))]
  const { data: services, error: servicesError } = await supabase
    .from('service')
    .select('id, code, name, base_price_cents')
    .in('id', serviceIds)

  if (servicesError) {
    throw new Error(`Failed to validate services: ${servicesError.message}`)
  }

  const foundServiceIds = new Set(services?.map(s => s.id) || [])
  const missingServices = serviceIds.filter(id => !foundServiceIds.has(id))

  if (missingServices.length > 0) {
    throw new Error(`Services not found: ${missingServices.join(', ')}`)
  }

  // Validate all garments exist and belong to the order
  const garmentIds = [...new Set(items.map(item => item.garment_id))]
  const { data: garments, error: garmentsError } = await supabase
    .from('garment')
    .select('id, order_id')
    .in('id', garmentIds)
    .eq('order_id', orderId)

  if (garmentsError) {
    throw new Error(`Failed to validate garments: ${garmentsError.message}`)
  }

  const foundGarmentIds = new Set(garments?.map(g => g.id) || [])
  const missingGarments = garmentIds.filter(id => !foundGarmentIds.has(id))

  if (missingGarments.length > 0) {
    throw new Error(`Garments not found or don't belong to order: ${missingGarments.join(', ')}`)
  }

  return {
    order,
    services: services || [],
    garments: garments || [],
  }
}
