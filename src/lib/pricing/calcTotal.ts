import { PricingItem, PricingCalculation, PricingConfig, OrderPricing, RushFeeTier } from './types'

/**
 * Get pricing configuration from environment variables
 */
export function getPricingConfig(): PricingConfig {
  return {
    rush_fee_small_cents: parseInt(process.env.RUSH_FEE_SMALL_CENTS || '3000', 10),
    rush_fee_large_cents: parseInt(process.env.RUSH_FEE_LARGE_CENTS || '6000', 10),
    gst_pst_rate_bps: parseInt(process.env.GST_PST_RATE_BPS || '1200', 10),
  }
}

/**
 * Calculate the price for a single garment service item
 */
export function calculateItemPrice(item: PricingItem): {
  unit_price_cents: number
  total_price_cents: number
  is_custom: boolean
} {
  const unit_price_cents = item.custom_price_cents ?? item.base_price_cents
  const total_price_cents = unit_price_cents * item.quantity
  const is_custom = item.custom_price_cents !== null

  return {
    unit_price_cents,
    total_price_cents,
    is_custom,
  }
}

/**
 * Calculate rush fee based on order value and configuration
 */
export function calculateRushFee(
  subtotal_cents: number,
  config: PricingConfig,
  threshold_cents?: number
): {
  rush_fee_cents: number
  tier: RushFeeTier
} {
  const threshold = threshold_cents ?? config.rush_fee_large_cents * 2 // Default threshold
  
  if (subtotal_cents >= threshold) {
    return {
      rush_fee_cents: config.rush_fee_large_cents,
      tier: 'large',
    }
  }
  
  return {
    rush_fee_cents: config.rush_fee_small_cents,
    tier: 'small',
  }
}

/**
 * Calculate tax based on subtotal and rush fee
 */
export function calculateTax(
  subtotal_cents: number,
  rush_fee_cents: number,
  tax_rate_bps: number
): number {
  const taxable_amount = subtotal_cents + rush_fee_cents
  return Math.round((taxable_amount * tax_rate_bps) / 10000) // Convert BPS to percentage
}

/**
 * Calculate total pricing for an order
 */
export function calculateOrderPricing(orderPricing: OrderPricing): PricingCalculation {
  const { items, is_rush, config } = orderPricing
  
  // Calculate item prices
  const itemBreakdown = items.map(item => {
    const itemPrice = calculateItemPrice(item)
    return {
      garment_id: item.garment_id,
      service_id: item.service_id,
      quantity: item.quantity,
      unit_price_cents: itemPrice.unit_price_cents,
      total_price_cents: itemPrice.total_price_cents,
      is_custom: itemPrice.is_custom,
    }
  })

  // Calculate subtotal
  const subtotal_cents = itemBreakdown.reduce(
    (sum, item) => sum + item.total_price_cents,
    0
  )

  // Calculate rush fee if applicable
  const rushFee = is_rush 
    ? calculateRushFee(subtotal_cents, config)
    : { rush_fee_cents: 0, tier: 'small' as RushFeeTier }

  // Calculate tax
  const tax_cents = calculateTax(subtotal_cents, rushFee.rush_fee_cents, config.gst_pst_rate_bps)

  // Calculate total
  const total_cents = subtotal_cents + rushFee.rush_fee_cents + tax_cents

  return {
    subtotal_cents,
    rush_fee_cents: rushFee.rush_fee_cents,
    tax_cents,
    total_cents,
    breakdown: {
      items: itemBreakdown,
      rush_applied: is_rush,
      tax_rate_bps: config.gst_pst_rate_bps,
    },
  }
}

/**
 * Calculate pricing for multiple orders (batch processing)
 */
export function calculateBatchPricing(orders: OrderPricing[]): Map<string, PricingCalculation> {
  const results = new Map<string, PricingCalculation>()
  
  for (const order of orders) {
    const pricing = calculateOrderPricing(order)
    results.set(order.order_id, pricing)
  }
  
  return results
}

/**
 * Validate pricing configuration
 */
export function validatePricingConfig(config: PricingConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.rush_fee_small_cents < 0) {
    errors.push('Rush fee small must be non-negative')
  }

  if (config.rush_fee_large_cents < 0) {
    errors.push('Rush fee large must be non-negative')
  }

  if (config.rush_fee_large_cents < config.rush_fee_small_cents) {
    errors.push('Rush fee large must be greater than or equal to rush fee small')
  }

  if (config.gst_pst_rate_bps < 0 || config.gst_pst_rate_bps > 10000) {
    errors.push('GST/PST rate must be between 0 and 10000 basis points (0-100%)')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number, currency: string = 'CAD'): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(dollars)
}

/**
 * Calculate percentage of total for breakdown display
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 10000) / 100 // Return percentage with 2 decimal places
}

/**
 * Get pricing summary for display
 */
export function getPricingSummary(calculation: PricingCalculation): {
  subtotal: string
  rush_fee: string
  tax: string
  total: string
  breakdown: {
    subtotal_percentage: number
    rush_fee_percentage: number
    tax_percentage: number
  }
} {
  const subtotal = formatCurrency(calculation.subtotal_cents)
  const rush_fee = formatCurrency(calculation.rush_fee_cents)
  const tax = formatCurrency(calculation.tax_cents)
  const total = formatCurrency(calculation.total_cents)

  const breakdown = {
    subtotal_percentage: calculatePercentage(calculation.subtotal_cents, calculation.total_cents),
    rush_fee_percentage: calculatePercentage(calculation.rush_fee_cents, calculation.total_cents),
    tax_percentage: calculatePercentage(calculation.tax_cents, calculation.total_cents),
  }

  return {
    subtotal,
    rush_fee,
    tax,
    total,
    breakdown,
  }
}

/**
 * Recalculate order pricing and return updated values for database
 */
export function recalculateOrderPricing(
  orderId: string,
  items: PricingItem[],
  isRush: boolean,
  config?: Partial<PricingConfig>
): {
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  calculation: PricingCalculation
} {
  const fullConfig = { ...getPricingConfig(), ...config }
  
  const orderPricing: OrderPricing = {
    order_id: orderId,
    is_rush: isRush,
    items,
    config: fullConfig,
  }

  const calculation = calculateOrderPricing(orderPricing)

  return {
    subtotal_cents: calculation.subtotal_cents,
    tax_cents: calculation.tax_cents,
    total_cents: calculation.total_cents,
    calculation,
  }
}
