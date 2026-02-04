'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { LoadingLogo } from '@/components/ui/loading-logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle
} from 'lucide-react'
import {
  RevenueMetrics,
  OrderMetrics,
  CustomerMetrics,
  ServiceAnalytics,
  getRevenueMetrics,
  getOrderMetrics,
  getCustomerMetrics,
  getServiceAnalytics,
  getDailyMetrics
} from '@/lib/api/analytics'
import { format } from 'date-fns'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsPage() {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null)
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics | null>(null)
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null)
  const [serviceAnalytics, setServiceAnalytics] = useState<ServiceAnalytics | null>(null)
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [revenue, orders, customers, services, daily] = await Promise.all([
          getRevenueMetrics(),
          getOrderMetrics(),
          getCustomerMetrics(),
          getServiceAnalytics(),
          getDailyMetrics(30)
        ])

        setRevenueMetrics(revenue)
        setOrderMetrics(orders)
        setCustomerMetrics(customers)
        setServiceAnalytics(services)
        setDailyMetrics(daily)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
          <LoadingLogo size="lg" text="Loading analytics..." />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-foreground mb-8">Analytics Dashboard</h1>

          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${revenueMetrics?.today.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${revenueMetrics?.thisWeek.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${revenueMetrics?.thisMonth.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  {revenueMetrics?.growthRate && revenueMetrics.growthRate >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{revenueMetrics.growthRate.toFixed(1)}% from last month
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {revenueMetrics?.growthRate?.toFixed(1)}% from last month
                    </>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Year to Date</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${revenueMetrics?.yearToDate.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderMetrics?.total || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {orderMetrics?.pending || 0} pending, {orderMetrics?.working || 0} working
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Turnaround</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orderMetrics?.averageTurnaroundTime || 0} days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orderMetrics?.onTimeCompletionRate || 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerMetrics?.totalCustomers || 0}</div>
                <div className="text-xs text-muted-foreground">
                  +{customerMetrics?.newCustomersThisMonth || 0} new this month
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value as string), 'MMM d, yyyy')}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Volume Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Order Volume (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value as string), 'MMM d, yyyy')}
                    />
                    <Bar dataKey="orderCount" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Service Distribution and Top Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceAnalytics?.services.slice(0, 6) || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${percent.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(serviceAnalytics?.services.slice(0, 6) || []).map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerMetrics?.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.orderCount} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${customer.totalSpent.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}