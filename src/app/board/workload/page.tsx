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
import { ArrowLeft, Calendar, Clock, Users, AlertTriangle, UserPlus, Download } from 'lucide-react';
import Link from 'next/link';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { useStaff } from '@/lib/hooks/useStaff';
import { useStaffSession } from '@/components/staff';
import { useToast } from '@/components/ui/toast';
import { triggerDownload } from '@/lib/exports/csv-utils';
import { OrderDetailModal } from '@/components/board/order-detail-modal';


const HOURS_PER_DAY = 8;

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  working: '#3b82f6',
  done: '#10b981',
  ready: '#8b5cf6',
  delivered: '#6b7280',
};

interface ServiceItem {
  garment_service_id: string;
  service_id?: string;
  assigned_seamstress_id: string | null;
  assigned_seamstress_name: string | null;
  service_name: string;
  estimated_minutes?: number;
}

interface GarmentItem {
  garment_id?: string;
  type?: string;
  assignee?: string | null;
  estimated_minutes?: number;
  services?: ServiceItem[];
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  type: string;
  due_date: string | null;
  assigned_to: string | null;
  client_name?: string;
  total_estimated_minutes?: number;
  garments?: GarmentItem[];
}

// New interface for item-level workload tracking
interface WorkloadItem {
  garmentServiceId: string;
  orderId: string;
  orderNumber: number;
  clientName: string;
  garmentType: string;
  serviceName: string;
  estimatedMinutes: number;
  dueDate?: string;
  seamstressId: string | null;
  seamstressName: string;
}

interface SeamstressWorkload {
  seamstressId: string | null; // null = unassigned
  name: string;
  totalHours: number;
  items: WorkloadItem[];
  orders: Order[]; // Keep for backward compat with Gantt
  dailyHours: Record<string, number>;
}

function calculateEstimatedHours(order: Order): number {
  if (order.total_estimated_minutes) {
    return order.total_estimated_minutes / 60;
  }

  let totalMinutes = 0;
  if (order.garments) {
    for (const garment of order.garments) {
      // PRIORITY: Use garment.estimated_minutes if set (from Est. Time edit in modal)
      if (garment.estimated_minutes && garment.estimated_minutes > 0) {
        totalMinutes += garment.estimated_minutes;
      } else {
        // Fallback: Sum service estimated minutes
        for (const service of garment.services || []) {
          totalMinutes += service.estimated_minutes || 30;
        }
      }
    }
  }

  return totalMinutes > 0 ? totalMinutes / 60 : 2;
}

export default function WorkloadPage() {
  const toast = useToast();
  const { currentStaff } = useStaffSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [assigningItem, setAssigningItem] = useState<string | null>(null);
  const { staff: staffMembers, loading: staffLoading } = useStaff();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      toast.error('Erreur lors de la mise à jour de la date');
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

  // Build a map of staff ID to name for quick lookups
  const staffIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of staffMembers) {
      map[s.id] = s.name;
    }
    return map;
  }, [staffMembers]);

  // NEW: Group items (garment_services) by assigned seamstress - item-level workload
  const workloadBySeamstress = useMemo((): Record<string, SeamstressWorkload> => {
    const workloads: Record<string, SeamstressWorkload> = {};

    // Initialize workloads for each seamstress + Unassigned
    for (const staff of staffMembers) {
      workloads[staff.id] = {
        seamstressId: staff.id,
        name: staff.name,
        totalHours: 0,
        items: [],
        orders: [],
        dailyHours: {},
      };
    }
    // Add "Unassigned" bucket
    workloads['unassigned'] = {
      seamstressId: null,
      name: 'Unassigned',
      totalHours: 0,
      items: [],
      orders: [],
      dailyHours: {},
    };

    // Track which orders are assigned to which seamstresses (for Gantt)
    const seamstressOrders: Record<string, Set<string>> = {};

    for (const order of activeOrders) {
      const garments = order.garments || [];

      for (const garment of garments) {
        const services = garment.services || [];

        for (const service of services) {
          // Use assigned_seamstress_id (UUID) for grouping
          const seamstressId = service.assigned_seamstress_id;
          const seamstressName = service.assigned_seamstress_name || (seamstressId ? staffIdToName[seamstressId] : null) || 'Unassigned';
          const workloadKey = seamstressId || 'unassigned';

          // Ensure workload exists (for dynamically discovered staff)
          if (!workloads[workloadKey]) {
            workloads[workloadKey] = {
              seamstressId: seamstressId || null,
              name: seamstressName,
              totalHours: 0,
              items: [],
              orders: [],
              dailyHours: {},
            };
          }

          // Calculate estimated time for this service
          const estimatedMinutes = service.estimated_minutes || 30;
          const hours = estimatedMinutes / 60;

          // Create workload item
          const workloadItem: WorkloadItem = {
            garmentServiceId: service.garment_service_id,
            orderId: order.id,
            orderNumber: order.order_number,
            clientName: order.client_name || 'Unknown Client',
            garmentType: garment.type || 'Unknown',
            serviceName: service.service_name || 'Service',
            estimatedMinutes,
            ...(order.due_date && { dueDate: order.due_date }),
            seamstressId: seamstressId || null,
            seamstressName,
          };

          const workload = workloads[workloadKey];
          workload.items.push(workloadItem);
          workload.totalHours += hours;

          if (order.due_date) {
            const dateKey = format(new Date(order.due_date), 'yyyy-MM-dd');
            workload.dailyHours[dateKey] = (workload.dailyHours[dateKey] || 0) + hours;
          }

          // Track orders for Gantt (backwards compat)
          if (!seamstressOrders[workloadKey]) {
            seamstressOrders[workloadKey] = new Set();
          }
          seamstressOrders[workloadKey].add(order.id);
        }
      }
    }

    // Add orders to workloads for Gantt (de-duplicated)
    for (const [key, orderIds] of Object.entries(seamstressOrders)) {
      if (workloads[key]) {
        workloads[key].orders = activeOrders.filter(o => orderIds.has(o.id));
      }
    }

    return workloads;
  }, [activeOrders, staffMembers, staffIdToName]);

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

      // Check item-level (garment_service) assignees first, then garment-level, then order-level
      let ownerName = 'Unassigned';
      // First try item-level assignment
      for (const garment of order.garments || []) {
        for (const service of garment.services || []) {
          if (service.assigned_seamstress_name) {
            ownerName = service.assigned_seamstress_name;
            break;
          }
        }
        if (ownerName !== 'Unassigned') break;
      }
      // Fallback to old garment-level assignee or order-level
      if (ownerName === 'Unassigned') {
        const garmentAssignees = order.garments
          ?.map(g => g.assignee)
          .filter((a): a is string => !!a) || [];
        ownerName = garmentAssignees[0] || order.assigned_to || 'Unassigned';
      }

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
          id: ownerName.toLowerCase().replace(/\s+/g, '-'),
          name: ownerName,
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

    for (const [, workload] of Object.entries(workloadBySeamstress)) {
      for (const [date, hours] of Object.entries(workload.dailyHours)) {
        if (hours > HOURS_PER_DAY) {
          issues.push({ seamstress: workload.name, date, hours });
        }
      }
    }

    return issues;
  }, [workloadBySeamstress]);

  const totalCapacityUsed = useMemo(() => {
    const totalAssignedHours = Object.values(workloadBySeamstress)
      .filter(w => w.seamstressId !== null) // Exclude unassigned
      .reduce((sum, w) => sum + w.totalHours, 0);

    const workingDays = 5;
    const seamstressCount = Math.max(1, staffMembers.length);
    const weeklyCapacity = workingDays * HOURS_PER_DAY * seamstressCount;

    return Math.min(100, (totalAssignedHours / weeklyCapacity) * 100);
  }, [workloadBySeamstress, staffMembers]);

  const unassignedWorkload = workloadBySeamstress['unassigned'];

  // Sort unassigned items by due date (CAL-04)
  const sortedUnassignedItems = useMemo(() => {
    if (!unassignedWorkload?.items) return [];
    return [...unassignedWorkload.items].sort((a, b) => {
      // Items with due dates come first, sorted by date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [unassignedWorkload?.items]);

  // Handle "Assign to Me" (CAL-03)
  const handleAssignToMe = async (garmentServiceId: string) => {
    if (!currentStaff?.staffId) {
      toast.error('Please sign in as staff first');
      return;
    }

    setAssigningItem(garmentServiceId);

    try {
      const response = await fetch(`/api/garment-service/${garmentServiceId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seamstress_id: currentStaff.staffId }),
      });

      if (response.ok) {
        toast.success('Task assigned to you');
        // Refresh the page to show updated assignments
        window.location.reload();
      } else {
        throw new Error('Failed to assign');
      }
    } catch (err) {
      console.error('Error assigning item:', err);
      toast.error('Failed to assign task');
    } finally {
      setAssigningItem(null);
    }
  };

  // Export handler for seamstress tasks (MOD-009)
  const handleExportSeamstress = async (seamstressId: string, seamstressName: string) => {
    try {
      const response = await fetch(`/api/admin/export/seamstress?seamstressId=${seamstressId}`);
      const data = await response.json();
      if (data.csv) {
        triggerDownload(data.csv, data.filename || `${seamstressName}-tasks.csv`);
        toast.success(`Exported tasks for ${seamstressName}`);
      } else {
        toast.error(data.error || 'Export failed');
      }
    } catch (error) {
      toast.error('Export failed: Network error');
      console.error('Export error:', error);
    }
  };

  // Handle opening order detail modal
  const handleOpenOrderModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };

  if (loading || staffLoading) {
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
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
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

            {staffMembers.map((staff) => {
              const workload = workloadBySeamstress[staff.id];
              if (!workload) return null;

              const weeklyCapacity = 5 * HOURS_PER_DAY;
              const utilization = Math.min(100, (workload.totalHours / weeklyCapacity) * 100);
              const itemCount = workload.items.length;

              return (
                <Card key={staff.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{staff.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <GaugeCircle
                        value={utilization}
                        size="md"
                        primaryColor={utilization > 100 ? 'stroke-red-500' : 'stroke-green-500'}
                      />
                      <div className="text-right">
                        <div className="text-2xl font-bold">{itemCount}</div>
                        <div className="text-xs text-muted-foreground">items</div>
                        <div className="text-sm">{workload.totalHours.toFixed(1)}h</div>
                      </div>
                    </div>
                    {/* Export Link - MOD-009 */}
                    <button
                      onClick={() => handleExportSeamstress(staff.id, staff.name)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors border border-primary-200 hover:border-primary-300"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exporter Liste de Projet</span>
                    </button>
                  </CardContent>
                </Card>
              );
            })}

            {sortedUnassignedItems.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Unassigned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">
                    {sortedUnassignedItems.length}
                  </div>
                  <div className="text-xs text-amber-600 mb-3">items need assignment (sorted by due date)</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sortedUnassignedItems.slice(0, 8).map(item => (
                      <div key={item.garmentServiceId} className="flex items-center justify-between gap-2 text-xs bg-white p-1.5 rounded border border-amber-200">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block" title={`#${item.orderNumber} - ${item.serviceName}`}>
                            <button
                              onClick={() => handleOpenOrderModal(item.orderId)}
                              className="text-primary hover:underline"
                              title={`View order #${item.orderNumber}`}
                            >
                              #{item.orderNumber}
                            </button>
                            {' - '}{item.serviceName}
                          </span>
                          {item.dueDate && (
                            <span className="text-amber-600 text-[10px]">
                              Due: {format(new Date(item.dueDate), 'MMM d')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {currentStaff && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 sm:h-6 min-h-[44px] sm:min-h-0 px-1.5 text-xs sm:text-[10px] text-amber-700 hover:bg-amber-100"
                              onClick={() => handleAssignToMe(item.garmentServiceId)}
                              disabled={assigningItem === item.garmentServiceId}
                              title="Assign to me"
                              role="button"
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          )}
                          <select
                            className="text-xs border rounded px-1 py-0.5 bg-white max-w-[120px] sm:max-w-[160px]"
                            value=""
                            onChange={async (e) => {
                              if (e.target.value) {
                                try {
                                  const response = await fetch(`/api/garment-service/${item.garmentServiceId}/assign`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ seamstress_id: e.target.value }),
                                  });
                                  if (response.ok) {
                                    window.location.reload();
                                  }
                                } catch (err) {
                                  console.error('Error assigning item:', err);
                                }
                              }
                            }}
                            disabled={assigningItem === item.garmentServiceId}
                          >
                            <option value="">Assign...</option>
                            {staffMembers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {sortedUnassignedItems.length > 8 && (
                      <div className="text-xs text-amber-600 pt-1">
                        +{sortedUnassignedItems.length - 8} more items
                      </div>
                    )}
                  </div>
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
            <CardContent className="h-[250px] md:h-[400px] overflow-auto">
              {ganttFeatures.length > 0 ? (
                <Gantt
                  features={ganttFeatures}
                  markers={[todayMarker]}
                  range={ganttRange}
                  zoom={100}
                  showSidebar={true}
                  onSelectFeature={(id) => {
                    handleOpenOrderModal(id);
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

        {/* Order Detail Modal */}
        {selectedOrderId && (
          <OrderDetailModal
            order={orders.find(o => o.id === selectedOrderId) || { id: selectedOrderId }}
            isOpen={isModalOpen}
            onClose={handleCloseOrderModal}
          />
        )}
      </div>
    </AuthGuard>
  );
}
