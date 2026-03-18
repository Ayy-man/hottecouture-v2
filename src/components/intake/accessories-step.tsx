'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/lib/types/database';
import { formatCurrency } from '@/lib/pricing/calcTotal';
import { nanoid } from 'nanoid';
import { Search, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import type { Garment, GarmentService } from './alteration-step';

// ============================================================================
// Types
// ============================================================================

interface AccessoriesStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

// Track an accessory item that has been added (for display in summary)
interface AddedAccessory {
  serviceId: string;
  serviceName: string;
  qty: number;
  customPriceCents: number;
  // Which garment index this was added to
  garmentIndex: number;
  // Index within that garment's services array
  serviceIndex: number;
}

// ============================================================================
// Component
// ============================================================================

export function AccessoriesStep({
  data,
  onUpdate,
  onNext,
  onPrev,
}: AccessoriesStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  // Track qty per service before adding
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const toast = useToast();

  const supabase = createClient();

  // ===========================================================================
  // Data Fetching — accessories category only
  // ===========================================================================

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data: fetchedServices, error } = await supabase
          .from('service')
          .select('*')
          .eq('is_active', true)
          .in('category', ['accessories', 'accessory'])
          .order('display_order')
          .order('name');

        if (error) {
          console.error('Error fetching accessory services:', error);
        } else {
          setServices(fetchedServices || []);
        }
      } catch (error) {
        console.error('Error fetching accessory services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const search = searchTerm.toLowerCase().trim();
    return services.filter(s => s.name.toLowerCase().includes(search));
  }, [services, searchTerm]);

  // Collect all accessory services currently in formData for display
  const addedAccessories: AddedAccessory[] = useMemo(() => {
    const result: AddedAccessory[] = [];
    data.forEach((garment, garmentIndex) => {
      garment.services.forEach((svc, serviceIndex) => {
        if (svc.isAccessory === true) {
          result.push({
            serviceId: svc.serviceId,
            serviceName: svc.serviceName || svc.customServiceName || 'Accessoire',
            qty: svc.qty,
            customPriceCents: svc.customPriceCents || 0,
            garmentIndex,
            serviceIndex,
          });
        }
      });
    });
    return result;
  }, [data]);

  // ===========================================================================
  // Handlers
  // ===========================================================================

  const getQtyForService = (serviceId: string) => pendingQty[serviceId] ?? 0.25;

  const handleQtyChange = (serviceId: string, qty: number) => {
    setPendingQty(prev => ({ ...prev, [serviceId]: Math.max(0.25, qty) }));
  };

  const handleAddAccessory = (service: Service) => {
    const qty = getQtyForService(service.id);

    const accessoryService: GarmentService = {
      serviceId: service.id,
      serviceName: service.name,
      qty,
      customPriceCents: service.base_price_cents,
      assignedSeamstressId: null,
      estimatedMinutes: 0,
      isAccessory: true,
    };

    let updatedGarments: Garment[];

    if (data.length === 0) {
      // No garments from alteration step — auto-create a placeholder garment
      const placeholderGarment: Garment = {
        type: 'Accessoires',
        garment_type_id: null,
        labelCode: nanoid(8).toUpperCase(),
        services: [accessoryService],
      };
      updatedGarments = [placeholderGarment];
    } else {
      // Add to the last garment in the list
      updatedGarments = [...data];
      const lastIndex = updatedGarments.length - 1;
      const lastGarment = updatedGarments[lastIndex];
      if (lastGarment) {
        // Check if this service already exists in that garment, increment qty
        const existingIdx = lastGarment.services.findIndex(
          s => s.serviceId === service.id && s.isAccessory === true
        );

        if (existingIdx >= 0) {
          const updatedServices = [...lastGarment.services];
          const existing = updatedServices[existingIdx];
          if (existing) {
            existing.qty = existing.qty + qty;
          }
          updatedGarments[lastIndex] = { ...lastGarment, services: updatedServices };
        } else {
          updatedGarments[lastIndex] = {
            ...lastGarment,
            services: [...lastGarment.services, accessoryService],
          };
        }
      }
    }

    onUpdate(updatedGarments);
    toast.success(`${service.name} ajoute aux accessoires`);

    // Reset qty for this service
    setPendingQty(prev => ({ ...prev, [service.id]: 0.25 }));
  };

  const handleRemoveAccessory = (garmentIndex: number, serviceIndex: number) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    const updatedServices = garment.services.filter((_, i) => i !== serviceIndex);

    // If this was a placeholder garment (type = 'Accessoires') with no more services, remove the garment entirely
    if (garment.type === 'Accessoires' && updatedServices.length === 0) {
      updatedGarments.splice(garmentIndex, 1);
    } else {
      updatedGarments[garmentIndex] = { ...garment, services: updatedServices };
    }

    onUpdate(updatedGarments);
  };

  // ===========================================================================
  // Render: Loading State
  // ===========================================================================

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0">
          <Button variant="ghost" onClick={onPrev} className="text-primary-600">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Button>
          <h2 className="text-lg font-semibold text-foreground">Accessoires</h2>
          <Button disabled className="opacity-50">Suivant</Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Render: Main Component
  // ===========================================================================

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0 sticky top-0 z-10">
        <Button
          variant="ghost"
          onClick={onPrev}
          className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Accessoires</h2>
          <p className="text-xs text-muted-foreground">
            {addedAccessories.length} accessoire{addedAccessories.length !== 1 ? 's' : ''} selectionne{addedAccessories.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Always enabled — accessories are optional */}
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white"
        >
          Suivant
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-24 md:pb-4">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Empty state hint */}
          {addedAccessories.length === 0 && (
            <div className="text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              Aucun accessoire selectionne. Vous pouvez passer a la tarification.
            </div>
          )}

          {/* Section 1: Accessory Service Selection */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Produits et accessoires
              </h3>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un accessoire..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Service List */}
              {filteredServices.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Aucun accessoire trouve
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredServices.map(service => (
                    <div
                      key={service.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      {/* Service Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{service.name}</p>
                        <p className="text-xs text-primary-600 font-medium">
                          {formatCurrency(service.base_price_cents)} / unite
                        </p>
                      </div>

                      {/* Quantity Input (decimal) */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qte:</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.25"
                          step="0.25"
                          value={getQtyForService(service.id)}
                          onChange={e => handleQtyChange(service.id, parseFloat(e.target.value) || 0.25)}
                          className="w-20 text-center border border-border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => handleAddAccessory(service)}
                        className="flex items-center gap-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm min-h-[44px] touch-manipulation transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Added Accessories Summary */}
          {addedAccessories.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Accessoires selectionnes ({addedAccessories.length})
                  </h3>
                  <span className="text-sm font-medium">
                    Total:{' '}
                    {formatCurrency(
                      addedAccessories.reduce(
                        (sum, a) => sum + a.customPriceCents * a.qty,
                        0
                      )
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  {addedAccessories.map((acc, idx) => (
                    <div
                      key={`${acc.garmentIndex}-${acc.serviceIndex}-${idx}`}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{acc.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          Qte: {acc.qty} &times; {formatCurrency(acc.customPriceCents)} ={' '}
                          {formatCurrency(acc.customPriceCents * acc.qty)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessory(acc.garmentIndex, acc.serviceIndex)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg touch-manipulation"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
