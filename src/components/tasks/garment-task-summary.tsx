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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="text-sm font-semibold text-foreground">Temps estimé</span>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Planifié</span>
            <p className="text-sm font-medium text-foreground">{formatMinutes(plannedMinutes)}</p>
          </div>
          {actualMinutes > 0 && (
            <>
              <div className="w-px h-8 bg-border" />
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Réel</span>
                <p className="text-sm font-medium text-foreground">{formatMinutes(actualMinutes)}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Écart</span>
                <p className={`text-sm font-medium ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {variance > 0 ? '+' : ''}{formatMinutes(Math.abs(variance))}
                </p>
              </div>
            </>
          )}
          {actualMinutes === 0 && (
            <>
              <div className="w-px h-8 bg-border" />
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Réel</span>
                <p className="text-sm text-muted-foreground/70">--</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Services list */}
      {services.length > 0 ? (
        <div className="space-y-1.5">
          {services.map((s, idx) => {
            const serviceName = s.service?.name || s.custom_service_name || 'Service';
            // Priority: garment_service.estimated_minutes > service.estimated_minutes
            const serviceMinutes = s.estimated_minutes || s.service?.estimated_minutes || 15;
            return (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {serviceName} {s.quantity > 1 ? `(×${s.quantity})` : ''}
                </span>
                <span className="text-foreground font-medium">{serviceMinutes * (s.quantity || 1)} min</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground/70 italic">
          Aucun service associé
        </div>
      )}
    </div>
  );
}
