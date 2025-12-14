import { createClient } from '@/lib/supabase/client'

export interface RevenueMetrics {
  today: number
  thisWeek: number
  thisMonth: number
  lastMonth: number
  yearToDate: number
  growthRate: number
}

export interface OrderMetrics {
  total: number
  pending: number
  working: number
  done: number
  ready: number
  delivered: number
  averageTurnaroundTime: number
  onTimeCompletionRate: number
}

export interface CustomerMetrics {
  totalCustomers: number
  newCustomersThisMonth: number
  returningCustomers: number
  topCustomers: Array<{
    id: string
    name: string
    orderCount: number
    totalSpent: number
  }>
}

export interface ServiceAnalytics {
  services: Array<{
    id: string
    name: string
    count: number
    revenue: number
    percentage: number
  }>
}

export interface DailyMetrics {
  date: string
  revenue: number
  orderCount: number
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - today.getDay())

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  const yearStart = new Date(today.getFullYear(), 0, 1)

  // Helper function to calculate revenue for a date range
  const getRevenueInRange = async (startDate: Date, endDate: Date = new Date()) => {
    const { data, error } = await supabase
      .from('order')
      .select('total')
      .gte('created_at', startDate.toISOString())
      .lt(endDate ? endDate.toISOString() : undefined)
      .eq('status', 'delivered')

    if (error) throw error
    return data?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0
  }

  const [todayRevenue, thisWeekRevenue, thisMonthRevenue, lastMonthRevenue, yearToDateRevenue] = await Promise.all([
    getRevenueInRange(today),
    getRevenueInRange(thisWeekStart),
    getRevenueInRange(thisMonthStart),
    getRevenueInRange(lastMonthStart, lastMonthEnd),
    getRevenueInRange(yearStart)
  ])

  const growthRate = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0

  return {
    today: todayRevenue,
    thisWeek: thisWeekRevenue,
    thisMonth: thisMonthRevenue,
    lastMonth: lastMonthRevenue,
    yearToDate: yearToDateRevenue,
    growthRate
  }
}

export async function getOrderMetrics(): Promise<OrderMetrics> {
  const supabase = createClient()

  const { data: orders, error } = await supabase
    .from('order')
    .select('status, created_at, delivered_at, due_date')

  if (error) throw error

  const statusCounts = orders?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Calculate average turnaround time
  const deliveredOrders = orders?.filter(o => o.status === 'delivered' && o.created_at && o.delivered_at) || []
  const turnaroundTimes = deliveredOrders.map(order => {
    const created = new Date(order.created_at!)
    const delivered = new Date(order.delivered_at!)
    return (delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // days
  })
  const averageTurnaroundTime = turnaroundTimes.length > 0
    ? turnaroundTimes.reduce((sum, time) => sum + time, 0) / turnaroundTimes.length
    : 0

  // Calculate on-time completion rate
  const onTimeOrders = deliveredOrders.filter(order => {
    if (!order.due_date || !order.delivered_at) return false
    return new Date(order.delivered_at!) <= new Date(order.due_date!)
  })
  const onTimeCompletionRate = deliveredOrders.length > 0
    ? (onTimeOrders.length / deliveredOrders.length) * 100
    : 0

  return {
    total: orders?.length || 0,
    pending: statusCounts.pending || 0,
    working: statusCounts.working || 0,
    done: statusCounts.done || 0,
    ready: statusCounts.ready || 0,
    delivered: statusCounts.delivered || 0,
    averageTurnaroundTime: Math.round(averageTurnaroundTime * 10) / 10,
    onTimeCompletionRate: Math.round(onTimeCompletionRate)
  }
}

export async function getCustomerMetrics(): Promise<CustomerMetrics> {
  const supabase = createClient()

  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  // Get all customers with their orders
  const { data: clients, error } = await supabase
    .from('client')
    .select(`
      id,
      first_name,
      last_name,
      order (
        id,
        total,
        created_at,
        status
      )
    `)

  if (error) throw error

  const totalCustomers = clients?.length || 0

  // Calculate new customers this month
  const newCustomersThisMonth = clients?.filter(client =>
    client.order?.some(order => new Date(order.created_at!) >= thisMonthStart)
  ).length || 0

  // Calculate returning customers (more than 1 order)
  const returningCustomers = clients?.filter(client =>
    (client.order?.length || 0) > 1
  ).length || 0

  // Calculate top customers by revenue
  const topCustomers = clients?.map(client => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
    orderCount: client.order?.length || 0,
    totalSpent: client.order?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  }))
  .sort((a, b) => b.totalSpent - a.totalSpent)
  .slice(0, 10) || []

  return {
    totalCustomers,
    newCustomersThisMonth,
    returningCustomers,
    topCustomers
  }
}

export async function getServiceAnalytics(): Promise<ServiceAnalytics> {
  const supabase = createClient()

  const { data: services, error } = await supabase
    .from('garment_service')
    .select(`
      service (
        id,
        name,
        price
      )
    `)

  if (error) throw error

  // Count services and calculate revenue
  const serviceMap = new Map<string, { count: number; revenue: number; name: string }>()

  services?.forEach(gs => {
    if (gs.service) {
      const existing = serviceMap.get(gs.service.id) || { count: 0, revenue: 0, name: gs.service.name }
      serviceMap.set(gs.service.id, {
        count: existing.count + 1,
        revenue: existing.revenue + (gs.service.price || 0),
        name: existing.name
      })
    }
  })

  const totalServices = Array.from(serviceMap.values()).reduce((sum, s) => sum + s.count, 0)

  const analytics = Array.from(serviceMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    count: data.count,
    revenue: data.revenue,
    percentage: totalServices > 0 ? (data.count / totalServices) * 100 : 0
  }))
  .sort((a, b) => b.count - a.count)

  return { services: analytics }
}

export async function getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
  const supabase = createClient()
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const { data, error } = await supabase
    .from('order')
    .select('created_at, total, status')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .eq('status', 'delivered')
    .order('created_at')

  if (error) throw error

  // Group by date
  const dailyMap = new Map<string, { revenue: number; orderCount: number }>()

  // Initialize all dates with 0 values
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    dailyMap.set(dateStr, { revenue: 0, orderCount: 0 })
  }

  // Populate with actual data
  data?.forEach(order => {
    const dateStr = new Date(order.created_at!).toISOString().split('T')[0]
    const existing = dailyMap.get(dateStr) || { revenue: 0, orderCount: 0 }
    dailyMap.set(dateStr, {
      revenue: existing.revenue + (order.total || 0),
      orderCount: existing.orderCount + 1
    })
  })

  // Convert to array
  return Array.from(dailyMap.entries()).map(([date, metrics]) => ({
    date,
    revenue: metrics.revenue,
    orderCount: metrics.orderCount
  }))
}