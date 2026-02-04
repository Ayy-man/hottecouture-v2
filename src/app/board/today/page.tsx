'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Printer, Clock, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStaff } from '@/lib/hooks/useStaff';

// Staff is now fetched dynamically via useStaff hook

interface TaskOrder {
  id: string;
  order_number: number;
  status: string;
  due_date: string;
  assigned_to: string | null;
  sort_order: number;
  client_name: string;
  garments: Array<{
    type: string;
    services: Array<{
      estimated_minutes?: number; // From garment_service table
      service?: {
        name: string;
        estimated_minutes?: number;
      };
    }>;
  }>;
}

function SortableTask({ task, index }: { task: TaskOrder; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalMinutes = task.garments.reduce((sum, g) => {
    // Priority: garment_service.estimated_minutes > service.estimated_minutes
    return sum + g.services.reduce((sSum, s) => sSum + (s.estimated_minutes || s.service?.estimated_minutes || 30), 0);
  }, 0);

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return 'Demain';
    return format(d, 'd MMM', { locale: fr });
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-item bg-white border rounded-lg p-4 mb-3 ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground/70 hover:text-muted-foreground no-print"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">
              {index + 1}. #{task.order_number} - {task.client_name}
            </span>
            <span className={`text-sm px-2 py-0.5 rounded ${
              isToday(new Date(task.due_date)) 
                ? 'bg-red-100 text-red-700' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {formatDueDate(task.due_date)}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {task.garments.map((g, i) => (
              <div key={i} className="ml-4">
                └─ {g.type}: {g.services.map(s => s.service?.name || 'Service').join(', ')}
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Est: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</span>
            {task.assigned_to && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                {task.assigned_to}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TodayTasksPage() {
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { staff } = useStaff();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        
        const threeDaysFromNow = addDays(new Date(), 3);
        const filtered = (data.orders || [])
          .filter((o: TaskOrder) => 
            ['pending', 'working'].includes(o.status) &&
            o.due_date &&
            new Date(o.due_date) <= threeDaysFromNow
          )
          .sort((a: TaskOrder, b: TaskOrder) => 
            (a.sort_order || 0) - (b.sort_order || 0) ||
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        
        setOrders(filtered);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.assigned_to === filter);
  }, [orders, filter]);

  const totalMinutes = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      return sum + order.garments.reduce((gSum, g) => {
        // Priority: garment_service.estimated_minutes > service.estimated_minutes
        return gSum + g.services.reduce((sSum, s) => sSum + (s.estimated_minutes || s.service?.estimated_minutes || 30), 0);
      }, 0);
    }, 0);
  }, [filteredOrders]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredOrders.findIndex(t => t.id === active.id);
    const newIndex = filteredOrders.findIndex(t => t.id === over.id);
    
    const reordered = arrayMove(filteredOrders, oldIndex, newIndex);
    
    // Update local state immediately
    setOrders(prev => {
      const newOrders: TaskOrder[] = prev.map(order => {
        const newIndex = reordered.findIndex(t => t.id === order.id);
        if (newIndex !== -1) {
          return { ...order, sort_order: newIndex };
        }
        return order;
      });
      return newOrders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    // Update in database
    try {
      await Promise.all(
        reordered.map((task, index) =>
          fetch(`/api/orders/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: index }),
          })
        )
      );
    } catch (err) {
      console.error('Error updating sort order:', err);
    }
  }, [filteredOrders]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
          <LoadingLogo size="lg" text="Chargement..." />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
        <header className="bg-white/80 backdrop-blur-sm border-b px-4 py-3 no-print flex-shrink-0">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <Link href="/board">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">📋 Travail du jour</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE d MMMM", { locale: fr })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2"
              >
                <option value="all">Tous</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/print/tasks', '_blank')}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer la liste
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
          <div className="print-header hidden print:block mb-4">
            <h1 className="text-2xl font-bold">Travail du jour</h1>
            <p>{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
            {filter !== 'all' && <p>Assigné à: {filter}</p>}
          </div>

          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune tâche pour les 3 prochains jours
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredOrders.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredOrders.map((order, index) => (
                  <SortableTask key={order.id} task={order} index={index} />
                ))}
              </SortableContext>
            </DndContext>
          )}

          <div className="mt-6 p-4 bg-white rounded-lg border text-center">
            <div className="text-sm text-muted-foreground">Temps total estimé</div>
            <div className="text-2xl font-bold text-foreground">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {filteredOrders.length} commande{filteredOrders.length !== 1 ? 's' : ''}
            </div>
          </div>
          </div>
        </main>

        <style jsx global>{`
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-header { display: block !important; }
            .task-item {
              break-inside: avoid;
              border: 1px solid #ccc !important;
              margin-bottom: 8px;
            }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}
