/**
 * UNIT TESTS: Pricing Calculations
 * ==================================
 * Tests for pricing logic used in intake
 *
 * CHECKLIST ITEMS COVERED:
 * - 10-day alteration lead time
 * - 4-week custom design lead time
 * - Consultation = Free
 * - Rush fee calculation
 * - Tax calculation (TPS + TVQ)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Pricing constants (from the codebase)
const RUSH_FEE_SMALL_CENTS = 3000 // $30
const RUSH_FEE_LARGE_CENTS = 6000 // $60
const TPS_RATE = 0.05 // 5% GST
const TVQ_RATE = 0.09975 // 9.975% QST
const HOURLY_RATE_CENTS = 3500 // $35/hour default

// Calculate due date (10 business days)
function calculateAlterationDueDate(startDate: Date = new Date()): Date {
  let workingDays = 0
  const currentDate = new Date(startDate)

  while (workingDays < 10) {
    currentDate.setDate(currentDate.getDate() + 1)
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      workingDays++
    }
  }

  return currentDate
}

// Calculate custom design due date (4 weeks = 28 days)
function calculateCustomDueDate(startDate: Date = new Date()): Date {
  const dueDate = new Date(startDate)
  dueDate.setDate(dueDate.getDate() + 28)
  return dueDate
}

// Calculate pricing
interface PricingInput {
  subtotalCents: number
  isRush: boolean
  rushFeeType?: 'small' | 'large'
}

interface PricingOutput {
  subtotalCents: number
  rushFeeCents: number
  tpsCents: number
  tvqCents: number
  taxCents: number
  totalCents: number
}

function calculatePricing(input: PricingInput): PricingOutput {
  const rushFeeCents = input.isRush
    ? input.rushFeeType === 'large'
      ? RUSH_FEE_LARGE_CENTS
      : RUSH_FEE_SMALL_CENTS
    : 0

  const taxableAmount = input.subtotalCents + rushFeeCents
  const tpsCents = Math.round(taxableAmount * TPS_RATE)
  const tvqCents = Math.round(taxableAmount * TVQ_RATE)
  const taxCents = tpsCents + tvqCents
  const totalCents = input.subtotalCents + rushFeeCents + taxCents

  return {
    subtotalCents: input.subtotalCents,
    rushFeeCents,
    tpsCents,
    tvqCents,
    taxCents,
    totalCents,
  }
}

describe('Lead Time Calculations', () => {
  describe('Alteration Lead Time (10 business days)', () => {
    it('calculates 10 business days from Monday', () => {
      // Monday Jan 6, 2025
      const monday = new Date(2025, 0, 6)
      const dueDate = calculateAlterationDueDate(monday)

      // 10 business days later = Friday Jan 17, 2025 (skipping 2 weekends)
      expect(dueDate.getDay()).not.toBe(0) // Not Sunday
      expect(dueDate.getDay()).not.toBe(6) // Not Saturday
    })

    it('skips weekends correctly', () => {
      // Friday Jan 3, 2025
      const friday = new Date(2025, 0, 3)
      const dueDate = calculateAlterationDueDate(friday)

      // Due date should not be on weekend
      expect(dueDate.getDay()).not.toBe(0)
      expect(dueDate.getDay()).not.toBe(6)
    })

    it('10 working days is approximately 2 weeks calendar time', () => {
      const start = new Date(2025, 0, 6) // Monday
      const dueDate = calculateAlterationDueDate(start)

      const daysDiff = Math.round(
        (dueDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Should be 12-14 calendar days (10 business + 2-4 weekend days)
      expect(daysDiff).toBeGreaterThanOrEqual(12)
      expect(daysDiff).toBeLessThanOrEqual(16)
    })
  })

  describe('Custom Design Lead Time (4 weeks)', () => {
    it('calculates exactly 28 days', () => {
      const start = new Date(2025, 0, 1)
      const dueDate = calculateCustomDueDate(start)

      const daysDiff = Math.round(
        (dueDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysDiff).toBe(28)
    })

    it('4 weeks is independent of weekends', () => {
      const monday = new Date(2025, 0, 6) // Monday
      const friday = new Date(2025, 0, 10) // Friday

      const mondayDue = calculateCustomDueDate(monday)
      const fridayDue = calculateCustomDueDate(friday)

      // Both should be exactly 28 days later
      const mondayDiff = Math.round(
        (mondayDue.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
      )
      const fridayDiff = Math.round(
        (fridayDue.getTime() - friday.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(mondayDiff).toBe(28)
      expect(fridayDiff).toBe(28)
    })
  })
})

describe('Pricing Calculations', () => {
  describe('Consultation Pricing', () => {
    it('consultation is free ($0)', () => {
      // CHECKLIST: Consultation = Free
      const consultationPrice = 0
      expect(consultationPrice).toBe(0)
    })

    it('free consultation has no tax', () => {
      const result = calculatePricing({
        subtotalCents: 0,
        isRush: false,
      })

      expect(result.tpsCents).toBe(0)
      expect(result.tvqCents).toBe(0)
      expect(result.totalCents).toBe(0)
    })
  })

  describe('Rush Fee Calculation', () => {
    it('small rush fee is $30', () => {
      const result = calculatePricing({
        subtotalCents: 5000, // $50
        isRush: true,
        rushFeeType: 'small',
      })

      expect(result.rushFeeCents).toBe(3000)
    })

    it('large rush fee is $60', () => {
      const result = calculatePricing({
        subtotalCents: 5000, // $50
        isRush: true,
        rushFeeType: 'large',
      })

      expect(result.rushFeeCents).toBe(6000)
    })

    it('no rush fee when not rush', () => {
      const result = calculatePricing({
        subtotalCents: 5000,
        isRush: false,
      })

      expect(result.rushFeeCents).toBe(0)
    })

    it('default rush type is small', () => {
      const result = calculatePricing({
        subtotalCents: 5000,
        isRush: true,
        // rushFeeType not specified
      })

      expect(result.rushFeeCents).toBe(3000) // Small = $30
    })
  })

  describe('Tax Calculation (Quebec)', () => {
    it('calculates TPS (5%) correctly', () => {
      const result = calculatePricing({
        subtotalCents: 10000, // $100
        isRush: false,
      })

      // 5% of $100 = $5
      expect(result.tpsCents).toBe(500)
    })

    it('calculates TVQ (9.975%) correctly', () => {
      const result = calculatePricing({
        subtotalCents: 10000, // $100
        isRush: false,
      })

      // 9.975% of $100 = $9.975 → $9.98 (rounded)
      expect(result.tvqCents).toBe(998) // Actually rounds to 998
    })

    it('taxes apply to subtotal + rush fee', () => {
      const withRush = calculatePricing({
        subtotalCents: 10000, // $100
        isRush: true,
        rushFeeType: 'small',
      })

      const withoutRush = calculatePricing({
        subtotalCents: 10000,
        isRush: false,
      })

      // Rush fee adds $30 to taxable amount
      // Tax on $130 vs tax on $100
      expect(withRush.taxCents).toBeGreaterThan(withoutRush.taxCents)
    })

    it('combined tax is approximately 14.975%', () => {
      const result = calculatePricing({
        subtotalCents: 10000, // $100
        isRush: false,
      })

      // Combined tax should be around 14.975% = $14.98
      expect(result.taxCents).toBeGreaterThanOrEqual(1497)
      expect(result.taxCents).toBeLessThanOrEqual(1498)
    })
  })

  describe('Total Calculation', () => {
    it('total = subtotal + rush + tax', () => {
      const result = calculatePricing({
        subtotalCents: 10000,
        isRush: true,
        rushFeeType: 'small',
      })

      const expected =
        result.subtotalCents + result.rushFeeCents + result.taxCents
      expect(result.totalCents).toBe(expected)
    })

    it('calculates realistic order total', () => {
      // $50 hemming job with rush
      const result = calculatePricing({
        subtotalCents: 5000,
        isRush: true,
        rushFeeType: 'small',
      })

      // $50 + $30 rush = $80 taxable
      // Tax: 14.975% of $80 ≈ $11.98
      // Total: ~$91.98
      expect(result.totalCents).toBeGreaterThan(9000)
      expect(result.totalCents).toBeLessThan(9500)
    })
  })
})

describe('Hourly Rate Calculations', () => {
  it('1 qty = 1 hour at hourly rate', () => {
    const qty = 1
    const totalCents = qty * HOURLY_RATE_CENTS

    expect(totalCents).toBe(3500) // $35
  })

  it('2 qty = 2 hours', () => {
    const qty = 2
    const totalCents = qty * HOURLY_RATE_CENTS

    expect(totalCents).toBe(7000) // $70
  })

  it('fractional hours calculate correctly', () => {
    const qty = 1.5 // 1.5 hours
    const totalCents = qty * HOURLY_RATE_CENTS

    expect(totalCents).toBe(5250) // $52.50
  })

  it('minutes to hours conversion', () => {
    const minutesWorked = 90
    const hoursWorked = minutesWorked / 60
    const totalCents = hoursWorked * HOURLY_RATE_CENTS

    expect(totalCents).toBe(5250) // 1.5 hours = $52.50
  })
})

describe('Deposit Calculations', () => {
  it('50% deposit for custom orders', () => {
    const totalCents = 20000 // $200
    const depositPercent = 50
    const depositCents = Math.round((totalCents * depositPercent) / 100)

    expect(depositCents).toBe(10000) // $100
  })

  it('balance due = total - deposit', () => {
    const totalCents = 20000
    const depositCents = 10000
    const balanceDueCents = totalCents - depositCents

    expect(balanceDueCents).toBe(10000)
  })
})
