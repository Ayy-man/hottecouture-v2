'use client';

import { Badge } from '@/components/ui/badge';

interface ServiceProp {
  id?: string;
  quantity: number;
  notes?: string;
  custom_service_name?: string;
  custom_price_cents?: number;
  estimated_minutes?: number; // From garment_service table
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
  actualMinutes?: number; // Actual recorded time from garment.actual_minutes
}

export function GarmentTaskSummary({
  services = [],
  actualMinutes = 0
}: GarmentTaskSummaryProps) {
  // Calculate planned minutes from passed services
  // Priority: garment_service.estimated_minutes > service.estimated_minutes
  const plannedMinutes = services.reduce((sum, s) => {
    const mins = s.estimated_minutes || s.service?.estimated_minutes || 15; // Default 15 min
    return sum + (mins * (s.quantity || 1));
  }, 0);

  const variance = actualMinutes - plannedMinutes;

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      {/* Header with time summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Time Summary</span>
          {actualMinutes > 0 && (
            <Badge className="bg-green-100 text-green-800 text-xs">
              Recorded
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          <span>Planifie: {formatMinutes(plannedMinutes)}</span>
          <span className="mx-2">|</span>
          <span>Reel: {actualMinutes > 0 ? formatMinutes(actualMinutes) : '--'}</span>
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
        <div className="text-xs text-muted-foreground space-y-1">
          {services.map((s, idx) => {
            const serviceName = s.service?.name || s.custom_service_name || 'Service';
            // Priority: garment_service.estimated_minutes > service.estimated_minutes
            const serviceMinutes = s.estimated_minutes || s.service?.estimated_minutes || 15;
            return (
              <div key={idx} className="flex justify-between">
                <span>- {serviceName} {s.quantity > 1 ? `(x${s.quantity})` : ''}</span>
                <span className="text-muted-foreground/70">{serviceMinutes * (s.quantity || 1)} min</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/70 italic">
          Aucun service associe
        </div>
      )}
    </div>
  );
}
