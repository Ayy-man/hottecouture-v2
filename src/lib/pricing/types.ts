export interface PricingItem {
  garment_id: string
  service_id: string
  quantity: number
  custom_price_cents: number | null
  base_price_cents: number
}

export interface PricingCalculation {
  subtotal_cents: number
  rush_fee_cents: number
  tax_cents: number
  total_cents: number
  breakdown: {
    items: Array<{
      garment_id: string
      service_id: string
      quantity: number
      unit_price_cents: number
      total_price_cents: number
      is_custom: boolean
    }>
    rush_applied: boolean
    tax_rate_bps: number
  }
}

export interface PricingConfig {
  rush_fee_small_cents: number
  rush_fee_large_cents: number
  gst_pst_rate_bps: number
}

export interface OrderPricing {
  order_id: string
  is_rush: boolean
  items: PricingItem[]
  config: PricingConfig
}

export type RushFeeTier = 'small' | 'large'

export interface RushFeeConfig {
  small_cents: number
  large_cents: number
  threshold_cents?: number // Optional threshold for large vs small rush fee
}
