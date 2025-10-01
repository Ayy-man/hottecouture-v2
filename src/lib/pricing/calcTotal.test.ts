import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateItemPrice,
  calculateRushFee,
  calculateTax,
  calculateOrderPricing,
  calculateBatchPricing,
  validatePricingConfig,
  formatCurrency,
  calculatePercentage,
  getPricingSummary,
  recalculateOrderPricing,
  getPricingConfig,
} from './calcTotal'
import { PricingItem, PricingConfig, OrderPricing } from './types'

// Mock environment variables
const mockEnv = {
  RUSH_FEE_SMALL_CENTS: '3000',
  RUSH_FEE_LARGE_CENTS: '6000',
  GST_PST_RATE_BPS: '1200',
}

describe('Pricing Calculations', () => {
  beforeEach(() => {
    vi.stubEnv(mockEnv)
  })

  describe('calculateItemPrice', () => {
    it('should calculate price with base price', () => {
      const item: PricingItem = {
        garment_id: 'garment-1',
        service_id: 'service-1',
        quantity: 2,
        custom_price_cents: null,
        base_price_cents: 2500,
      }

      const result = calculateItemPrice(item)

      expect(result.unit_price_cents).toBe(2500)
      expect(result.total_price_cents).toBe(5000)
      expect(result.is_custom).toBe(false)
    })

    it('should calculate price with custom price', () => {
      const item: PricingItem = {
        garment_id: 'garment-1',
        service_id: 'service-1',
        quantity: 3,
        custom_price_cents: 3000,
        base_price_cents: 2500,
      }

      const result = calculateItemPrice(item)

      expect(result.unit_price_cents).toBe(3000)
      expect(result.total_price_cents).toBe(9000)
      expect(result.is_custom).toBe(true)
    })

    it('should handle zero quantity', () => {
      const item: PricingItem = {
        garment_id: 'garment-1',
        service_id: 'service-1',
        quantity: 0,
        custom_price_cents: null,
        base_price_cents: 2500,
      }

      const result = calculateItemPrice(item)

      expect(result.unit_price_cents).toBe(2500)
      expect(result.total_price_cents).toBe(0)
      expect(result.is_custom).toBe(false)
    })
  })

  describe('calculateRushFee', () => {
    const config: PricingConfig = {
      rush_fee_small_cents: 3000,
      rush_fee_large_cents: 6000,
      gst_pst_rate_bps: 1200,
    }

    it('should apply small rush fee for low value orders', () => {
      const result = calculateRushFee(5000, config)

      expect(result.rush_fee_cents).toBe(3000)
      expect(result.tier).toBe('small')
    })

    it('should apply large rush fee for high value orders', () => {
      const result = calculateRushFee(15000, config)

      expect(result.rush_fee_cents).toBe(6000)
      expect(result.tier).toBe('large')
    })

    it('should use custom threshold', () => {
      const result = calculateRushFee(10000, config, 8000)

      expect(result.rush_fee_cents).toBe(6000)
      expect(result.tier).toBe('large')
    })

    it('should handle zero subtotal', () => {
      const result = calculateRushFee(0, config)

      expect(result.rush_fee_cents).toBe(3000)
      expect(result.tier).toBe('small')
    })
  })

  describe('calculateTax', () => {
    it('should calculate tax correctly', () => {
      const result = calculateTax(10000, 3000, 1200) // 12% tax rate

      expect(result).toBe(1560) // (10000 + 3000) * 0.12 = 1560
    })

    it('should handle zero rush fee', () => {
      const result = calculateTax(10000, 0, 1200)

      expect(result).toBe(1200) // 10000 * 0.12 = 1200
    })

    it('should handle zero tax rate', () => {
      const result = calculateTax(10000, 3000, 0)

      expect(result).toBe(0)
    })

    it('should round to nearest cent', () => {
      const result = calculateTax(1000, 0, 1250) // 12.5% tax rate

      expect(result).toBe(125) // 1000 * 0.125 = 125
    })
  })

  describe('calculateOrderPricing', () => {
    const config: PricingConfig = {
      rush_fee_small_cents: 3000,
      rush_fee_large_cents: 6000,
      gst_pst_rate_bps: 1200,
    }

    const items: PricingItem[] = [
      {
        garment_id: 'garment-1',
        service_id: 'service-1',
        quantity: 2,
        custom_price_cents: null,
        base_price_cents: 2500,
      },
      {
        garment_id: 'garment-1',
        service_id: 'service-2',
        quantity: 1,
        custom_price_cents: 4000,
        base_price_cents: 3000,
      },
    ]

    it('should calculate pricing for non-rush order', () => {
      const orderPricing: OrderPricing = {
        order_id: 'order-1',
        is_rush: false,
        items,
        config,
      }

      const result = calculateOrderPricing(orderPricing)

      expect(result.subtotal_cents).toBe(9000) // (2 * 2500) + (1 * 4000) = 9000
      expect(result.rush_fee_cents).toBe(0)
      expect(result.tax_cents).toBe(1080) // 9000 * 0.12 = 1080
      expect(result.total_cents).toBe(10080) // 9000 + 0 + 1080 = 10080
      expect(result.breakdown.rush_applied).toBe(false)
      expect(result.breakdown.items).toHaveLength(2)
    })

    it('should calculate pricing for rush order', () => {
      const orderPricing: OrderPricing = {
        order_id: 'order-1',
        is_rush: true,
        items,
        config,
      }

      const result = calculateOrderPricing(orderPricing)

      expect(result.subtotal_cents).toBe(9000)
      expect(result.rush_fee_cents).toBe(3000) // Small rush fee
      expect(result.tax_cents).toBe(1440) // (9000 + 3000) * 0.12 = 1440
      expect(result.total_cents).toBe(13440) // 9000 + 3000 + 1440 = 13440
      expect(result.breakdown.rush_applied).toBe(true)
    })

    it('should handle empty items', () => {
      const orderPricing: OrderPricing = {
        order_id: 'order-1',
        is_rush: false,
        items: [],
        config,
      }

      const result = calculateOrderPricing(orderPricing)

      expect(result.subtotal_cents).toBe(0)
      expect(result.rush_fee_cents).toBe(0)
      expect(result.tax_cents).toBe(0)
      expect(result.total_cents).toBe(0)
    })
  })

  describe('calculateBatchPricing', () => {
    const config: PricingConfig = {
      rush_fee_small_cents: 3000,
      rush_fee_large_cents: 6000,
      gst_pst_rate_bps: 1200,
    }

    it('should calculate pricing for multiple orders', () => {
      const orders: OrderPricing[] = [
        {
          order_id: 'order-1',
          is_rush: false,
          items: [{
            garment_id: 'garment-1',
            service_id: 'service-1',
            quantity: 1,
            custom_price_cents: null,
            base_price_cents: 1000,
          }],
          config,
        },
        {
          order_id: 'order-2',
          is_rush: true,
          items: [{
            garment_id: 'garment-2',
            service_id: 'service-2',
            quantity: 1,
            custom_price_cents: null,
            base_price_cents: 2000,
          }],
          config,
        },
      ]

      const results = calculateBatchPricing(orders)

      expect(results.size).toBe(2)
      expect(results.get('order-1')?.total_cents).toBe(1120) // 1000 + 0 + 120
      expect(results.get('order-2')?.total_cents).toBe(3440) // 2000 + 3000 + 440
    })
  })

  describe('validatePricingConfig', () => {
    it('should validate correct configuration', () => {
      const config: PricingConfig = {
        rush_fee_small_cents: 3000,
        rush_fee_large_cents: 6000,
        gst_pst_rate_bps: 1200,
      }

      const result = validatePricingConfig(config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect negative rush fees', () => {
      const config: PricingConfig = {
        rush_fee_small_cents: -1000,
        rush_fee_large_cents: 6000,
        gst_pst_rate_bps: 1200,
      }

      const result = validatePricingConfig(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Rush fee small must be non-negative')
    })

    it('should detect large rush fee smaller than small', () => {
      const config: PricingConfig = {
        rush_fee_small_cents: 6000,
        rush_fee_large_cents: 3000,
        gst_pst_rate_bps: 1200,
      }

      const result = validatePricingConfig(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Rush fee large must be greater than or equal to rush fee small')
    })

    it('should detect invalid tax rate', () => {
      const config: PricingConfig = {
        rush_fee_small_cents: 3000,
        rush_fee_large_cents: 6000,
        gst_pst_rate_bps: 15000, // 150% - invalid
      }

      const result = validatePricingConfig(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('GST/PST rate must be between 0 and 10000 basis points (0-100%)')
    })
  })

  describe('formatCurrency', () => {
    it('should format Canadian dollars correctly', () => {
      expect(formatCurrency(1234)).toBe('$12.34')
      expect(formatCurrency(100000)).toBe('$1,000.00')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234)).toBe('-$12.34')
    })
  })

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25)
      expect(calculatePercentage(1, 3)).toBe(33.33)
      expect(calculatePercentage(0, 100)).toBe(0)
    })

    it('should handle zero total', () => {
      expect(calculatePercentage(25, 0)).toBe(0)
    })
  })

  describe('getPricingSummary', () => {
    it('should format pricing summary correctly', () => {
      const calculation = {
        subtotal_cents: 10000,
        rush_fee_cents: 3000,
        tax_cents: 1560,
        total_cents: 14560,
        breakdown: {
          items: [],
          rush_applied: true,
          tax_rate_bps: 1200,
        },
      }

      const summary = getPricingSummary(calculation)

      expect(summary.subtotal).toBe('$100.00')
      expect(summary.rush_fee).toBe('$30.00')
      expect(summary.tax).toBe('$15.60')
      expect(summary.total).toBe('$145.60')
      expect(summary.breakdown.subtotal_percentage).toBe(68.68)
      expect(summary.breakdown.rush_fee_percentage).toBe(20.60)
      expect(summary.breakdown.tax_percentage).toBe(10.71)
    })
  })

  describe('recalculateOrderPricing', () => {
    it('should recalculate order pricing with custom config', () => {
      const items: PricingItem[] = [{
        garment_id: 'garment-1',
        service_id: 'service-1',
        quantity: 1,
        custom_price_cents: null,
        base_price_cents: 1000,
      }]

      const customConfig = {
        rush_fee_small_cents: 5000,
        gst_pst_rate_bps: 1500,
      }

      const result = recalculateOrderPricing('order-1', items, true, customConfig)

      expect(result.subtotal_cents).toBe(1000)
      expect(result.tax_cents).toBe(900) // (1000 + 5000) * 0.15 = 900
      expect(result.total_cents).toBe(6900) // 1000 + 5000 + 900 = 6900
    })
  })

  describe('getPricingConfig', () => {
    it('should get configuration from environment variables', () => {
      const config = getPricingConfig()

      expect(config.rush_fee_small_cents).toBe(3000)
      expect(config.rush_fee_large_cents).toBe(6000)
      expect(config.gst_pst_rate_bps).toBe(1200)
    })

    it('should use default values when environment variables are missing', () => {
      vi.stubEnv({})

      const config = getPricingConfig()

      expect(config.rush_fee_small_cents).toBe(3000)
      expect(config.rush_fee_large_cents).toBe(6000)
      expect(config.gst_pst_rate_bps).toBe(1200)
    })
  })
})
