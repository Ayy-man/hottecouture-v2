'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PRINT_TASKS_CONFIG } from '@/lib/config/production';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface TaskOrder {
  id: string;
  order_number: number;
  status: string;
  due_date: string | null;
  priority: string;
  assigned_to: string | null;
  client_name: string;
  garments: Array<{
    type: string;
    notes: string | null;
    services: Array<{
      service?: {
        name: string;
      };
    }>;
  }>;
}

export default function PrintTasksPage() {
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        const filtered = (data.orders || []).filter((o: TaskOrder) =>
          PRINT_TASKS_CONFIG.includedStatuses.includes(o.status as 'pending' | 'working')
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

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (dateA !== dateB) {
        return PRINT_TASKS_CONFIG.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      const priorityA = PRINT_TASKS_CONFIG.priorityOrder[a.priority as keyof typeof PRINT_TASKS_CONFIG.priorityOrder] ?? 2;
      const priorityB = PRINT_TASKS_CONFIG.priorityOrder[b.priority as keyof typeof PRINT_TASKS_CONFIG.priorityOrder] ?? 2;
      return priorityA - priorityB;
    });
  }, [orders]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return format(new Date(dateString), 'd MMM yyyy', { locale: fr });
  };

  const truncateNotes = (notes: string | null) => {
    if (!notes) return '';
    if (notes.length <= PRINT_TASKS_CONFIG.maxNotesLength) return notes;
    return notes.substring(0, PRINT_TASKS_CONFIG.maxNotesLength) + '...';
  };

  const getServices = (order: TaskOrder) => {
    const services = order.garments.flatMap(g =>
      g.services.map(s => s.service?.name || g.type)
    );
    return [...new Set(services)].join(', ');
  };

  const getNotes = (order: TaskOrder) => {
    const notes = order.garments
      .filter(g => g.notes)
      .map(g => g.notes)
      .join(' | ');
    return truncateNotes(notes);
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'rush') return '🔴 RUSH';
    if (priority === 'custom') return '🟡 Custom';
    return '';
  };

  const todayDate = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-muted-foreground'>Chargement...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white'>
      <div className='no-print p-4 bg-muted/50 border-b flex items-center justify-between'>
        <h1 className='text-lg font-semibold'>Aperçu avant impression</h1>
        <Button onClick={() => window.print()} className='bg-blue-600 hover:bg-blue-700'>
          <Printer className='w-4 h-4 mr-2' />
          Imprimer
        </Button>
      </div>

      <div className='p-8 print:p-4'>
        <div className='text-center mb-6'>
          <h1 className='text-2xl font-bold text-foreground'>
            {PRINT_TASKS_CONFIG.title} {todayDate}
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {sortedOrders.length} tâche{sortedOrders.length !== 1 ? 's' : ''} à compléter
          </p>
        </div>

        {sortedOrders.length === 0 ? (
          <p className='text-center text-muted-foreground py-12'>
            Aucune tâche en attente ou en cours.
          </p>
        ) : (
          <table className='w-full border-collapse'>
            <thead>
              <tr className='border-b-2 border-foreground'>
                <th className='w-8 py-2 text-left'>☐</th>
                <th className='py-2 text-left text-sm font-semibold'>#</th>
                <th className='py-2 text-left text-sm font-semibold'>Client</th>
                <th className='py-2 text-left text-sm font-semibold'>Services</th>
                <th className='py-2 text-left text-sm font-semibold'>Échéance</th>
                <th className='py-2 text-left text-sm font-semibold'>Priorité</th>
                <th className='py-2 text-left text-sm font-semibold'>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order, index) => (
                <tr
                  key={order.id}
                  className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/50 print:bg-gray-100' : ''}`}
                >
                  <td className='py-3 align-top'>
                    <div className='w-5 h-5 border-2 border-border rounded'></div>
                  </td>
                  <td className='py-3 align-top font-medium'>{order.order_number}</td>
                  <td className='py-3 align-top'>{order.client_name || '—'}</td>
                  <td className='py-3 align-top text-sm'>{getServices(order)}</td>
                  <td className='py-3 align-top text-sm'>{formatDate(order.due_date)}</td>
                  <td className='py-3 align-top text-sm font-medium'>
                    {getPriorityBadge(order.priority)}
                  </td>
                  <td className='py-3 align-top text-xs text-muted-foreground max-w-[200px]'>
                    {getNotes(order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className='mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground print:mt-4'>
          Imprimé le {format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100%;
            font-size: 11px;
          }
          th, td {
            padding: 6px 4px;
          }
        }
      `}</style>
    </div>
  );
}
