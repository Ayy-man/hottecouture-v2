export interface ClientProfile {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address?: {
    street: string
    city: string
    province: string
    postal_code: string
    country: string
  }
  preferences: {
    language: 'en' | 'fr'
    preferred_contact: 'email' | 'sms' | 'phone'
    newsletter_consent: boolean
    marketing_consent: boolean
    communication_frequency: 'low' | 'medium' | 'high'
  }
  measurements: {
    bust?: number
    waist?: number
    hip?: number
    height?: number
    weight?: number
    shoe_size?: number
    notes?: string
  }
  style_preferences: {
    favorite_colors: string[]
    avoid_colors: string[]
    preferred_styles: string[]
    size_preferences: {
      fit: 'loose' | 'regular' | 'tight'
      length_preference: 'short' | 'regular' | 'long'
    }
    special_requirements: string[]
  }
  created_at: Date
  updated_at: Date
}

export interface ClientOrderHistory {
  id: string
  client_id: string
  order_id: string
  order_number: string
  order_type: 'alteration' | 'custom'
  status: 'pending' | 'working' | 'done' | 'ready' | 'delivered' | 'archived'
  total_amount: number
  rush: boolean
  created_at: Date
  completed_at?: Date
  garments: Array<{
    type: string
    color?: string
    brand?: string
    services: Array<{
      name: string
      price: number
      quantity: number
    }>
  }>
  feedback?: {
    rating: number
    comments: string
    would_recommend: boolean
  }
}

export interface ClientInteraction {
  id: string
  client_id: string
  type: 'phone_call' | 'email' | 'in_person' | 'note' | 'appointment'
  subject: string
  description: string
  outcome?: string
  follow_up_required: boolean
  follow_up_date?: Date
  created_by: string
  created_at: Date
}

export interface ClientAppointment {
  id: string
  client_id: string
  type: 'consultation' | 'fitting' | 'pickup' | 'delivery'
  scheduled_at: Date
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  location: 'store' | 'client_home' | 'other'
  created_by: string
  created_at: Date
}

export interface ClientStats {
  total_orders: number
  total_spent: number
  average_order_value: number
  last_order_date?: Date
  favorite_services: Array<{
    service_name: string
    count: number
    total_spent: number
  }>
  order_frequency: 'new' | 'occasional' | 'regular' | 'frequent'
  satisfaction_rating?: number
  loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export interface ClientSearchFilters {
  name?: string
  email?: string
  phone?: string
  order_type?: 'alteration' | 'custom'
  loyalty_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  last_order_before?: Date
  last_order_after?: Date
  total_spent_min?: number
  total_spent_max?: number
  has_appointments?: boolean
  has_feedback?: boolean
}

export interface ClientListResult {
  clients: ClientProfile[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export function calculateLoyaltyTier(stats: ClientStats): ClientStats['loyalty_tier'] {
  if (stats.total_spent >= 5000) return 'platinum'
  if (stats.total_spent >= 2000) return 'gold'
  if (stats.total_spent >= 500) return 'silver'
  return 'bronze'
}

export function calculateOrderFrequency(
  totalOrders: number,
  firstOrderDate: Date,
  lastOrderDate: Date
): ClientStats['order_frequency'] {
  if (totalOrders === 0) return 'new'
  
  const daysSinceFirst = Math.floor((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24))
  const ordersPerMonth = (totalOrders / daysSinceFirst) * 30
  
  if (ordersPerMonth >= 2) return 'frequent'
  if (ordersPerMonth >= 0.5) return 'regular'
  return 'occasional'
}

export function getLoyaltyTierBenefits(tier: ClientStats['loyalty_tier']) {
  const benefits = {
    bronze: {
      name: 'Bronze',
      color: 'bg-amber-100 text-amber-800',
      benefits: ['Basic support', 'Standard turnaround times'],
      discount: 0
    },
    silver: {
      name: 'Silver',
      color: 'bg-gray-100 text-gray-800',
      benefits: ['Priority support', '10% faster turnaround', 'Free minor alterations'],
      discount: 5
    },
    gold: {
      name: 'Gold',
      color: 'bg-yellow-100 text-yellow-800',
      benefits: ['VIP support', '20% faster turnaround', 'Free minor alterations', 'Exclusive previews'],
      discount: 10
    },
    platinum: {
      name: 'Platinum',
      color: 'bg-purple-100 text-purple-800',
      benefits: ['Concierge service', '30% faster turnaround', 'Free alterations', 'Exclusive previews', 'Home visits'],
      discount: 15
    }
  }
  
  return benefits[tier]
}

export function formatClientName(client: Pick<ClientProfile, 'first_name' | 'last_name'>): string {
  return `${client.first_name} ${client.last_name}`.trim()
}

export function getClientInitials(client: Pick<ClientProfile, 'first_name' | 'last_name'>): string {
  return `${client.first_name.charAt(0)}${client.last_name.charAt(0)}`.toUpperCase()
}

export function validateClientProfile(profile: Partial<ClientProfile>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!profile.first_name?.trim()) {
    errors.push('First name is required')
  }
  
  if (!profile.last_name?.trim()) {
    errors.push('Last name is required')
  }
  
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.push('Invalid email format')
  }
  
  if (profile.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profile.phone.replace(/\D/g, ''))) {
    errors.push('Invalid phone number format')
  }
  
  if (profile.preferences?.language && !['en', 'fr'].includes(profile.preferences.language)) {
    errors.push('Language must be either "en" or "fr"')
  }
  
  if (profile.preferences?.preferred_contact && !['email', 'sms', 'phone'].includes(profile.preferences.preferred_contact)) {
    errors.push('Preferred contact must be "email", "sms", or "phone"')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function generateClientSummary(client: ClientProfile, stats: ClientStats): string {
  const name = formatClientName(client)
  const tier = getLoyaltyTierBenefits(stats.loyalty_tier)
  const orders = stats.total_orders
  const spent = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(stats.total_spent / 100)
  
  return `${name} - ${tier.name} Member (${orders} orders, ${spent} total)`
}
