export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_transfer' | 'cash' | 'check' | 'other'
  name: string
  description: string
  isEnabled: boolean
  processingFee: number // Percentage
  minAmount: number // In cents
  maxAmount?: number // In cents
}

export interface PaymentProvider {
  id: string
  name: string
  type: 'stripe' | 'chase' | 'quickbooks' | 'manual'
  isEnabled: boolean
  config: {
    apiKey?: string
    webhookSecret?: string
    merchantId?: string
    environment: 'sandbox' | 'production'
  }
  supportedMethods: string[]
}

export interface PaymentIntent {
  id: string
  orderId: string
  amount: number // In cents
  currency: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'
  paymentMethod: string
  provider: string
  clientSecret?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface PaymentTransaction {
  id: string
  paymentIntentId: string
  amount: number // In cents
  type: 'charge' | 'refund' | 'partial_refund'
  status: 'pending' | 'succeeded' | 'failed'
  providerTransactionId?: string
  fees: {
    processing: number
    platform: number
    total: number
  }
  createdAt: Date
}

export interface PaymentWebhook {
  id: string
  provider: string
  eventType: string
  data: any
  processed: boolean
  createdAt: Date
}

export interface PaymentSummary {
  totalAmount: number
  subtotal: number
  tax: number
  rushFee: number
  processingFee: number
  depositAmount: number
  remainingAmount: number
  currency: string
}

export interface PaymentConfig {
  providers: PaymentProvider[]
  methods: PaymentMethod[]
  defaultCurrency: string
  taxRate: number // Percentage
  platformFeeRate: number // Percentage
  depositPercentage: number // Percentage of total for deposits
  refundPolicy: {
    allowed: boolean
    timeLimit: number // Days
    feePercentage: number // Percentage of refund amount
  }
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card_visa',
    type: 'card',
    name: 'Visa',
    description: 'Credit/Debit Card',
    isEnabled: true,
    processingFee: 2.9,
    minAmount: 50, // $0.50
    maxAmount: 1000000 // $10,000
  },
  {
    id: 'card_mastercard',
    type: 'card',
    name: 'Mastercard',
    description: 'Credit/Debit Card',
    isEnabled: true,
    processingFee: 2.9,
    minAmount: 50,
    maxAmount: 1000000
  },
  {
    id: 'card_amex',
    type: 'card',
    name: 'American Express',
    description: 'Credit Card',
    isEnabled: true,
    processingFee: 3.5,
    minAmount: 50,
    maxAmount: 1000000
  },
  {
    id: 'bank_transfer',
    type: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank transfer',
    isEnabled: true,
    processingFee: 0,
    minAmount: 100, // $1.00
  },
  {
    id: 'cash',
    type: 'cash',
    name: 'Cash',
    description: 'Cash payment',
    isEnabled: true,
    processingFee: 0,
    minAmount: 1, // $0.01
  },
  {
    id: 'check',
    type: 'check',
    name: 'Check',
    description: 'Check payment',
    isEnabled: true,
    processingFee: 0,
    minAmount: 100, // $1.00
  }
]

export const DEFAULT_PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    type: 'stripe',
    isEnabled: false, // Will be enabled when configured
    config: {
      environment: 'sandbox'
    },
    supportedMethods: ['card_visa', 'card_mastercard', 'card_amex', 'bank_transfer']
  },
  {
    id: 'chase',
    name: 'Chase Payment Solutions',
    type: 'chase',
    isEnabled: false,
    config: {
      environment: 'sandbox'
    },
    supportedMethods: ['card_visa', 'card_mastercard', 'card_amex']
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Payments',
    type: 'quickbooks',
    isEnabled: false,
    config: {
      environment: 'sandbox'
    },
    supportedMethods: ['card_visa', 'card_mastercard', 'card_amex', 'bank_transfer']
  },
  {
    id: 'manual',
    name: 'Manual Processing',
    type: 'manual',
    isEnabled: true,
    config: {
      environment: 'production'
    },
    supportedMethods: ['cash', 'check', 'bank_transfer']
  }
]

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  providers: DEFAULT_PAYMENT_PROVIDERS,
  methods: DEFAULT_PAYMENT_METHODS,
  defaultCurrency: 'CAD',
  taxRate: 12, // 12% (GST + PST)
  platformFeeRate: 0, // No platform fee for now
  depositPercentage: 50, // 50% deposit
  refundPolicy: {
    allowed: true,
    timeLimit: 30, // 30 days
    feePercentage: 5 // 5% refund fee
  }
}

export function calculatePaymentFees(
  amount: number,
  paymentMethod: PaymentMethod,
  taxRate: number = DEFAULT_PAYMENT_CONFIG.taxRate
): {
  subtotal: number
  tax: number
  processingFee: number
  total: number
} {
  const subtotal = amount
  const tax = Math.round(subtotal * (taxRate / 100))
  const processingFee = Math.round(subtotal * (paymentMethod.processingFee / 100))
  const total = subtotal + tax + processingFee

  return {
    subtotal,
    tax,
    processingFee,
    total
  }
}

export function calculateDepositAmount(
  totalAmount: number,
  depositPercentage: number = DEFAULT_PAYMENT_CONFIG.depositPercentage
): number {
  return Math.round(totalAmount * (depositPercentage / 100))
}

export function formatPaymentAmount(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency
  }).format(amount / 100)
}

export function validatePaymentAmount(
  amount: number,
  paymentMethod: PaymentMethod
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (amount < paymentMethod.minAmount) {
    errors.push(`Minimum amount is ${formatPaymentAmount(paymentMethod.minAmount)}`)
  }

  if (paymentMethod.maxAmount && amount > paymentMethod.maxAmount) {
    errors.push(`Maximum amount is ${formatPaymentAmount(paymentMethod.maxAmount)}`)
  }

  if (amount <= 0) {
    errors.push('Amount must be greater than zero')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function getPaymentMethodById(
  methodId: string,
  methods: PaymentMethod[] = DEFAULT_PAYMENT_METHODS
): PaymentMethod | undefined {
  return methods.find(method => method.id === methodId)
}

export function getEnabledPaymentMethods(
  methods: PaymentMethod[] = DEFAULT_PAYMENT_METHODS
): PaymentMethod[] {
  return methods.filter(method => method.isEnabled)
}

export function getPaymentProviderById(
  providerId: string,
  providers: PaymentProvider[] = DEFAULT_PAYMENT_PROVIDERS
): PaymentProvider | undefined {
  return providers.find(provider => provider.id === providerId)
}

export function getEnabledPaymentProviders(
  providers: PaymentProvider[] = DEFAULT_PAYMENT_PROVIDERS
): PaymentProvider[] {
  return providers.filter(provider => provider.isEnabled)
}
