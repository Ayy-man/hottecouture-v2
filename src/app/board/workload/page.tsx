'use client';

import { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import {
  Gantt,
  GanttFeature,
  GanttMarker,
} from '@/components/ui/gantt';
import { GaugeCircle } from '@/components/ui/gauge-1';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { useStaff } from '@/lib/hooks/useStaff';


const HOURS_PER_DAY = 8;

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  working: '#3b82f6',
  done: '#10b981',
  ready: '#8b5cf6',
  delivered: '#6b7280',
};

interface Order {
  id: string;
  order_number: number;
  status: string;
  type: string;
  due_date: string | null;
  assigned_to: string | null;
  client_name?: string;
  total_estimated_minutes?: number;
  garments?: Array<{
    services?: Array<{
      service?: {
        estimated_minutes?: number;
      };
    }>;
  }>;
}

interface SeamstressWorkload {
  name: string;
  totalHours: number;
  orders: Order[];
  dailyHours: Record<string, number>;
}

function calculateEstimatedHours(order: Order): number {
  if (order.total_estimated_minutes) {
    return order.total_estimated_minutes / 60;
  }

  let totalMinutes = 0;
  if (order.garments) {
    for (const garment of order.garments) {
      for (const service of garment.services || []) {
        totalMinutes += service.service?.estimated_minutes || 30;
      }
    }
  }

  return totalMinutes > 0 ? totalMinutes / 60 : 2;
}

export default function WorkloadPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const { staff: staffMembers } = useStaff();
  const SEAMSTRESSES = [...staffMembers.map(s => s.name), 'Unassigned'];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/orders?ts=${Date.now()}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setOrders(result.orders || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleUpdateFeature = async (feature: GanttFeature) => {
    const orderId = feature.id;
    const newDueDate = feature.endAt;

    setUpdatingOrder(orderId);

    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: newDueDate.toISOString() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update due date');
      }

      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, due_date: newDueDate.toISOString() }
          : o
      ));
    } catch (err) {
      console.error('Error updating order due date:', err);
      alert('Erreur lors de la mise à jour de la date');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const activeOrders = useMemo(() => {
    return orders.filter(o =>
      !['delivered', 'archived'].includes(o.status) &&
      o.due_date
    );
  }, [orders]);

  const workloadBySeamstress = useMemo((): Record<string, SeamstressWorkload> => {
    const workloads: Record<string, SeamstressWorkload> = {};

    for (const name of SEAMSTRESSES) {
      workloads[name] = {
        name,
        totalHours: 0,
        orders: [],
        dailyHours: {},
      };
    }

    for (const order of activeOrders) {
      const assignee = order.assigned_to || 'Unassigned';
      const seamstress = SEAMSTRESSES.includes(assignee) ? assignee : 'Unassigned';
      const hours = calculateEstimatedHours(order);

      const workload = workloads[seamstress];
      if (workload) {
        workload.orders.push(order);
        workload.totalHours += hours;

        if (order.due_date) {
          const dateKey = format(new Date(order.due_date), 'yyyy-MM-dd');
          workload.dailyHours[dateKey] = (workload.dailyHours[dateKey] || 0) + hours;
        }
      }
    }

    return workloads;
  }, [activeOrders, SEAMSTRESSES]);

  const ganttFeatures = useMemo((): GanttFeature[] => {
    const features: GanttFeature[] = [];

    for (const order of activeOrders) {
      const hours = calculateEstimatedHours(order);
      const daysNeeded = Math.ceil(hours / HOURS_PER_DAY);

      let startDate = new Date();
      const endDate = order.due_date
        ? new Date(order.due_date)
        : addDays(new Date(), daysNeeded);

      if (order.due_date) {
        startDate = addDays(new Date(order.due_date), -daysNeeded);
        if (startDate < new Date()) {
          startDate = new Date();
        }
      }

      const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending ?? '#f59e0b';

      features.push({
        id: order.id,
        name: `#${order.order_number} ${order.client_name || 'Order'}`,
        startAt: startOfDay(startDate),
        endAt: endOfDay(endDate),
        status: {
          color: statusColor,
          name: order.status,
        },
        owner: {
          id: order.assigned_to || 'unassigned',
          name: order.assigned_to || 'Unassigned',
        },
      });
    }

    return features;
  }, [activeOrders]);

  const todayMarker: GanttMarker = {
    id: 'today',
    date: new Date(),
    label: 'Today',
    className: 'bg-red-500',
  };

  const ganttRange = useMemo(() => {
    const today = new Date();
    return {
      from: addDays(today, -7),
      to: addDays(today, 30),
    };
  }, []);

  const overloadedDays = useMemo(() => {
    const issues: Array<{ seamstress: string; date: string; hours: number }> = [];

    for (const [name, workload] of Object.entries(workloadBySeamstress)) {
      for (const [date, hours] of Object.entries(workload.dailyHours)) {
        if (hours > HOURS_PER_DAY) {
          issues.push({ seamstress: name, date, hours });
        }
      }
    }

    return issues;
  }, [workloadBySeamstress]);

  const totalCapacityUsed = useMemo(() => {
    const totalAssignedHours = Object.values(workloadBySeamstress)
      .filter(w => w.name !== 'Unassigned')
      .reduce((sum, w) => sum + w.totalHours, 0);

    const workingDays = 5;
    const seamstressCount = SEAMSTRESSES.length - 1;
    const weeklyCapacity = workingDays * HOURS_PER_DAY * seamstressCount;

    return Math.min(100, (totalAssignedHours / weeklyCapacity) * 100);
  }, [workloadBySeamstress, SEAMSTRESSES]);

  const unassignedWorkload = workloadBySeamstress['Unassigned'];

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
          <LoadingLogo size="lg" text="Loading workload..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/board">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Board
                </Button>
              </Link>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Workload Scheduler
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {HOURS_PER_DAY}h/day capacity
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Weekly Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <GaugeCircle
                  value={totalCapacityUsed}
                  size="lg"
                  primaryColor={totalCapacityUsed > 80 ? 'stroke-red-500' : 'stroke-green-500'}
                />
              </CardContent>
            </Card>

            {SEAMSTRESSES.filter(s => s !== 'Unassigned').map((name) => {
              const workload = workloadBySeamstress[name];
              if (!workload) return null;

              const weeklyCapacity = 5 * HOURS_PER_DAY;
              const utilization = Math.min(100, (workload.totalHours / weeklyCapacity) * 100);

              return (
                <Card key={name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <GaugeCircle
                        value={utilization}
                        size="md"
                        primaryColor={utilization > 100 ? 'stroke-red-500' : 'stroke-green-500'}
                      />
                      <div className="text-right">
                        <div className="text-2xl font-bold">{workload.orders.length}</div>
                        <div className="text-xs text-muted-foreground">orders</div>
                        <div className="text-sm">{workload.totalHours.toFixed(1)}h</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {unassignedWorkload && unassignedWorkload.orders.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Unassigned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">
                    {unassignedWorkload.orders.length}
                  </div>
                  <div className="text-xs text-amber-600">orders need assignment</div>
                </CardContent>
              </Card>
            )}
          </div>

          {overloadedDays.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Capacity Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {overloadedDays.slice(0, 5).map((issue, idx) => (
                    <div key={idx} className="text-sm text-red-600">
                      {issue.seamstress}: {format(new Date(issue.date), 'MMM d')} - {issue.hours.toFixed(1)}h scheduled ({(issue.hours - HOURS_PER_DAY).toFixed(1)}h over)
                    </div>
                  ))}
                  {overloadedDays.length > 5 && (
                    <div className="text-sm text-red-500">
                      +{overloadedDays.length - 5} more warnings
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Order Timeline</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] overflow-auto">
              {ganttFeatures.length > 0 ? (
                <Gantt
                  features={ganttFeatures}
                  markers={[todayMarker]}
                  range={ganttRange}
                  zoom={100}
                  showSidebar={true}
                  onSelectFeature={(id) => {
                    console.log('Selected order:', id);
                  }}
                  onUpdateFeature={handleUpdateFeature}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No active orders with due dates to display
                </div>
              )}
            </CardContent>
          </Card>

          {updatingOrder && (
            <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Mise à jour...
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
