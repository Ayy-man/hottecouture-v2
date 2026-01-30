'use client';

import { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO, isBefore } from 'date-fns';
import { useStaff } from '@/lib/hooks/useStaff';
import { useStaffSession } from '@/components/staff';
import { useToast } from '@/components/ui/toast';

interface ServiceItem {
  garment_service_id: string;
  assigned_seamstress_id: string | null;
  assigned_seamstress_name: string | null;
  service_name: string;
  estimated_minutes?: number;
}

interface GarmentItem {
  type?: string;
  services?: ServiceItem[];
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  due_date: string | null;
  client_name?: string;
  garments?: GarmentItem[];
}

interface TaskItem {
  garmentServiceId: string;
  orderId: string;
  orderNumber: number;
  clientName: string;
  garmentType: string;
  serviceName: string;
  estimatedMinutes: number;
  dueDate: string | null;
  seamstressId: string | null;
  seamstressName: string;
  status: string;
}

export default function CalendarPage() {
  const toast = useToast();
  const { loading: staffLoading } = useStaff();
  const { currentStaff } = useStaffSession();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [assigningItem, setAssigningItem] = useState<string | null>(null);

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

  // Extract all task items from orders
  const allTasks = useMemo((): TaskItem[] => {
    const tasks: TaskItem[] = [];

    for (const order of orders) {
      if (['delivered', 'archived'].includes(order.status)) continue;

      for (const garment of order.garments || []) {
        for (const service of garment.services || []) {
          tasks.push({
            garmentServiceId: service.garment_service_id,
            orderId: order.id,
            orderNumber: order.order_number,
            clientName: order.client_name || 'Unknown',
            garmentType: garment.type || 'Unknown',
            serviceName: service.service_name || 'Service',
            estimatedMinutes: service.estimated_minutes || 30,
            dueDate: order.due_date,
            seamstressId: service.assigned_seamstress_id,
            seamstressName: service.assigned_seamstress_name || 'Unassigned',
            status: order.status,
          });
        }
      }
    }

    return tasks;
  }, [orders]);

  // Unassigned tasks sorted by due date
  const unassignedTasks = useMemo(() => {
    return allTasks
      .filter(t => !t.seamstressId)
      .sort((a, b) => {
        // Items with due dates come first, sorted by date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [allTasks]);

  // Tasks for current week
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const weekTasks = useMemo(() => {
    return allTasks
      .filter(t => {
        if (!t.dueDate) return false;
        const dueDate = parseISO(t.dueDate);
        return isWithinInterval(dueDate, { start: currentWeekStart, end: weekEnd });
      })
      .sort((a, b) => {
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
      });
  }, [allTasks, currentWeekStart, weekEnd]);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const today = new Date();
    return allTasks
      .filter(t => t.dueDate && isBefore(parseISO(t.dueDate), today) && !['done', 'ready', 'delivered'].includes(t.status))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [allTasks]);

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
        body: JSON.stringify({ assigned_seamstress_id: currentStaff.staffId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign task');
      }

      // Update local state
      setOrders(prev => prev.map(order => {
        if (!order.garments) return order;
        return {
          ...order,
          garments: order.garments.map(garment => ({
            ...garment,
            services: (garment.services ?? []).map(service =>
              service.garment_service_id === garmentServiceId
                ? { ...service, assigned_seamstress_id: currentStaff.staffId, assigned_seamstress_name: currentStaff.staffName }
                : service
            ),
          })),
        };
      }));

      toast.success('Task assigned to you');
    } catch (err) {
      console.error('Error assigning task:', err);
      toast.error('Failed to assign task');
    } finally {
      setAssigningItem(null);
    }
  };

  if (loading || staffLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-full bg-background">
          <LoadingLogo size="lg" text="Loading calendar..." />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-full bg-background">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Task Calendar
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center">
                {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Unassigned Section */}
          {unassignedTasks.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Unassigned Tasks ({unassignedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unassignedTasks.map(task => (
                    <div
                      key={task.garmentServiceId}
                      className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-amber-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">#{task.orderNumber}</span>
                          <span className="text-sm text-muted-foreground truncate">{task.serviceName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{task.clientName}</span>
                          {task.dueDate && (
                            <>
                              <span>•</span>
                              <span className={isBefore(parseISO(task.dueDate), new Date()) ? 'text-red-600 font-medium' : ''}>
                                Due: {format(parseISO(task.dueDate), 'MMM d')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {currentStaff && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 h-8 text-xs touch-target-sm"
                          onClick={() => handleAssignToMe(task.garmentServiceId)}
                          disabled={assigningItem === task.garmentServiceId}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          {assigningItem === task.garmentServiceId ? '...' : 'Assign to Me'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Overdue ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {overdueTasks.slice(0, 10).map(task => (
                    <div
                      key={task.garmentServiceId}
                      className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-red-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">#{task.orderNumber}</span>
                          <span className="text-sm text-muted-foreground truncate">{task.serviceName}</span>
                          <Badge variant="outline" className="text-xs">{task.seamstressName}</Badge>
                        </div>
                        <div className="text-xs text-red-600">
                          Due: {format(parseISO(task.dueDate!), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* This Week Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                This Week ({weekTasks.length} tasks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weekTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No tasks due this week
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {weekTasks.map(task => (
                    <div
                      key={task.garmentServiceId}
                      className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">#{task.orderNumber}</span>
                          <span className="text-sm text-muted-foreground truncate">{task.serviceName}</span>
                          {task.seamstressId ? (
                            <Badge variant="secondary" className="text-xs">{task.seamstressName}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Unassigned</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{task.clientName}</span>
                          <span>•</span>
                          <span>{task.garmentType}</span>
                          {task.dueDate && (
                            <>
                              <span>•</span>
                              <span>Due: {format(parseISO(task.dueDate), 'EEE, MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {task.estimatedMinutes}m
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
