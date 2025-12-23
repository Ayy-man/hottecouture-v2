'use client';

import { useState, useEffect } from 'react';
import { TimerButton } from '@/components/timer/timer-button';
import { Badge } from '@/components/ui/badge';

interface ServiceProp {
  id?: string;
  quantity: number;
  notes?: string;
  custom_service_name?: string;
  custom_price_cents?: number;
  service?: {
    id?: string;
    name: string;
    estimated_minutes?: number;
  };
}

interface GarmentTaskSummaryProps {
  garmentId: string;
  orderId: string;
  orderStatus: string;
  services?: ServiceProp[];
}

interface TimerState {
  is_running: boolean;
  is_paused: boolean;
  is_completed: boolean;
  total_work_seconds: number;
}

export function GarmentTaskSummary({
  garmentId,
  orderId,
  orderStatus,
  services = []
}: GarmentTaskSummaryProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    is_running: false,
    is_paused: false,
    is_completed: false,
    total_work_seconds: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimerState();
  }, [garmentId, orderId]);

  const fetchTimerState = async () => {
    try {
      const params = new URLSearchParams({ orderId });
      if (garmentId) params.append('garmentId', garmentId);

      const response = await fetch(`/api/timer/status?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTimerState({
          is_running: data.is_running || false,
          is_paused: data.is_paused || false,
          is_completed: data.is_completed || false,
          total_work_seconds: data.total_work_seconds || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch timer state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate planned minutes from passed services
  const plannedMinutes = services.reduce((sum, s) => {
    const mins = s.service?.estimated_minutes || 15; // Default 15 min
    return sum + (mins * (s.quantity || 1));
  }, 0);

  const actualMinutes = Math.floor(timerState.total_work_seconds / 60);
  const variance = actualMinutes - plannedMinutes;

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getStage = () => {
    if (timerState.is_completed) return 'done';
    if (timerState.is_running) return 'working';
    if (timerState.is_paused || timerState.total_work_seconds > 0) return 'paused';
    return 'pending';
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'done': return 'Terminé';
      case 'working': return 'En cours';
      case 'paused': return 'En pause';
      case 'pending': return 'En attente';
      default: return stage;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'working':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="animate-pulse h-16 bg-gray-100 rounded"></div>;
  }

  const stage = getStage();
  const isDone = stage === 'done';
  const canTrackTime = orderStatus === 'working' || orderStatus === 'pending';

  return (
    <div className="bg-stone-50 rounded-lg p-4 space-y-3">
      {/* Header with time summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-700">⏱️ Chrono</span>
          <Badge className={`text-xs ${getStageColor(stage)}`}>
            {getStageLabel(stage)}
          </Badge>
          {timerState.is_running && (
            <Badge className="bg-blue-500 text-white animate-pulse text-xs">
              En cours...
            </Badge>
          )}
        </div>
        <div className="text-xs text-stone-500">
          <span>Planifié: {formatMinutes(plannedMinutes)}</span>
          <span className="mx-2">|</span>
          <span>Réel: {formatMinutes(actualMinutes)}</span>
          {actualMinutes > 0 && (
            <>
              <span className="mx-2">|</span>
              <span className={variance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                {variance > 0 ? '+' : ''}{formatMinutes(Math.abs(variance))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Services list */}
      {services.length > 0 ? (
        <div className="text-xs text-stone-600 space-y-1">
          {services.map((s, idx) => {
            const serviceName = s.service?.name || s.custom_service_name || 'Service';
            const serviceMinutes = s.service?.estimated_minutes || 15;
            return (
              <div key={idx} className="flex justify-between">
                <span>• {serviceName} {s.quantity > 1 ? `(×${s.quantity})` : ''}</span>
                <span className="text-stone-400">{serviceMinutes * (s.quantity || 1)} min</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-stone-400 italic">
          Aucun service associé
        </div>
      )}

      {/* Timer button - only show if order is in working/pending status */}
      {canTrackTime && !isDone && (
        <div className="pt-2 border-t border-stone-200">
          <TimerButton
            orderId={orderId}
            garmentId={garmentId}
            orderStatus={orderStatus}
            onTimeUpdate={() => fetchTimerState()}
          />
        </div>
      )}

      {/* Done state - show final time */}
      {isDone && (
        <div className="pt-2 border-t border-stone-200 text-center">
          <span className="text-sm text-green-700 font-medium">
            ✓ Terminé en {formatMinutes(actualMinutes)}
          </span>
        </div>
      )}
    </div>
  );
}
