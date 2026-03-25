'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/lib/types/database';
import { formatCurrency } from '@/lib/pricing/calcTotal';
import { nanoid } from 'nanoid';
import { Search, Trash2, Plus, ChevronRight, Pencil } from 'lucide-react';
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
  unit?: string | null;      // from service.unit — used for fabric items
  // Which garment index this was added to
  garmentIndex: number;
  // Index within that garment's services array
  serviceIndex: number;
}

interface AccessoryCategory {
  key: string;
  label: string;
  services: Service[];
}

// ============================================================================
// Category grouping function
// ============================================================================

function categorizeAccessories(services: Service[]): AccessoryCategory[] {
  const categories: Record<string, Service[]> = {};
  const ORDER = [
    'zips', 'tissus', 'elastiques', 'cordes', 'velcros',
    'rideaux', 'fils', 'aiguilles', 'divers'
  ];
  const LABELS: Record<string, string> = {
    zips: 'Fermetures eclair / Zips',
    tissus: 'Tissus',
    elastiques: 'Elastiques',
    cordes: 'Cordes / Courroies',
    velcros: 'Velcros',
    rideaux: 'Rideaux',
    fils: 'Fils',
    aiguilles: 'Aiguilles',
    divers: 'Divers',
  };

  // Initialize all categories
  for (const key of ORDER) {
    categories[key] = [];
  }

  for (const svc of services) {
    const name = svc.name.toLowerCase();
    if (/fermeture|zip|zipper|glissi[eè]re/i.test(name)) {
      categories.zips!.push(svc);
    } else if (/tissu|fabric|toile|feutre|doublure/i.test(name)) {
      categories.tissus!.push(svc);
    } else if (/[eé]lastique|elastic/i.test(name)) {
      categories.elastiques!.push(svc);
    } else if (/corde|courroie|sangle|ruban|biais/i.test(name)) {
      categories.cordes!.push(svc);
    } else if (/velcro/i.test(name)) {
      categories.velcros!.push(svc);
    } else if (/rideau|curtain/i.test(name)) {
      categories.rideaux!.push(svc);
    } else if (/\bfil\b|fils|thread|bobine/i.test(name)) {
      categories.fils!.push(svc);
    } else if (/aiguille|needle|epingle/i.test(name)) {
      categories.aiguilles!.push(svc);
    } else {
      categories.divers!.push(svc);
    }
  }

  // Return only non-empty categories in ORDER
  return ORDER
    .filter(key => (categories[key]?.length ?? 0) > 0)
    .map(key => ({
      key,
      label: LABELS[key] ?? key,
      services: categories[key]!,
    }));
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
  const t = useTranslations('intake.accessories');
  const tc = useTranslations('common');
  const tm = useTranslations('intake.manage');
  const te = useTranslations('intake.errors');
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  // Track qty per service before adding
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  // Track per-unit price edits per service before adding
  const [pendingPrice, setPendingPrice] = useState<Record<string, number>>({});
  // Accordion expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // Manage mode state
  const [manageMode, setManageMode] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServicePrice, setEditServicePrice] = useState('');
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

  const groupedCategories = useMemo(
    () => categorizeAccessories(filteredServices),
    [filteredServices]
  );

  // Collect all accessory services currently in formData for display
  const addedAccessories: AddedAccessory[] = useMemo(() => {
    const result: AddedAccessory[] = [];
    const serviceMap = new Map(services.map(s => [s.id, s]));
    data.forEach((garment, garmentIndex) => {
      garment.services.forEach((svc, serviceIndex) => {
        if (svc.isAccessory === true) {
          const catalogService = serviceMap.get(svc.serviceId);
          result.push({
            serviceId: svc.serviceId,
            serviceName: svc.serviceName || svc.customServiceName || t('fallbackName'),
            qty: svc.qty,
            customPriceCents: svc.customPriceCents || 0,
            unit: catalogService?.unit ?? null,
            garmentIndex,
            serviceIndex,
          });
        }
      });
    });
    return result;
  }, [data, services, t]);

  // ===========================================================================
  // Search auto-expand effect
  // ===========================================================================

  useEffect(() => {
    if (searchTerm.trim()) {
      // Expand all sections that have matching results
      const matchingKeys = new Set(groupedCategories.map(c => c.key));
      setExpandedSections(matchingKeys);
    } else {
      // Clear search = collapse all
      setExpandedSections(new Set());
    }
  }, [searchTerm, groupedCategories]);

  // ===========================================================================
  // Accordion handlers
  // ===========================================================================

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ===========================================================================
  // Manage mode handlers
  // ===========================================================================

  const handleStartEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setEditServiceName(service.name);
    setEditServicePrice((service.base_price_cents / 100).toFixed(2));
  };

  const handleSaveEditService = async () => {
    if (!editingServiceId || !editServiceName.trim() || !editServicePrice.trim()) return;
    const price = parseFloat(editServicePrice);
    if (isNaN(price) || price <= 0) return;

    try {
      const response = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingServiceId,
          name: editServiceName.trim(),
          price: price,
        }),
      });
      if (response.ok) {
        // Re-fetch services to reflect changes
        const { data: fetchedServices } = await supabase
          .from('service')
          .select('*')
          .eq('is_active', true)
          .in('category', ['accessories', 'accessory'])
          .order('display_order')
          .order('name');
        setServices(fetchedServices || []);
        toast.success(t('serviceUpdated'));
      } else {
        const result = await response.json();
        toast.error(result.error || te('updateFailed'));
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error(te('updateFailed'));
    }
    setEditingServiceId(null);
    setEditServiceName('');
    setEditServicePrice('');
  };

  const handleCancelEditService = () => {
    setEditingServiceId(null);
    setEditServiceName('');
    setEditServicePrice('');
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/admin/services?id=${serviceId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok) {
        const { data: fetchedServices } = await supabase
          .from('service')
          .select('*')
          .eq('is_active', true)
          .in('category', ['accessories', 'accessory'])
          .order('display_order')
          .order('name');
        setServices(fetchedServices || []);
        toast.success(t('serviceDeleted'));
      } else {
        toast.error(result.error || result.message || te('deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(te('deleteFailed'));
    }
  };

  // ===========================================================================
  // Handlers
  // ===========================================================================

  const getQtyForService = (serviceId: string) => pendingQty[serviceId] ?? 1;

  const handleQtyChange = (serviceId: string, qty: number) => {
    setPendingQty(prev => ({ ...prev, [serviceId]: Math.max(0.25, qty) }));  // min 0.25 for fractional units
  };

  const handlePriceChange = (serviceId: string, priceCents: number) => {
    setPendingPrice(prev => ({ ...prev, [serviceId]: Math.max(0, priceCents) }));
  };

  const handleAddAccessory = (service: Service) => {
    const qty = getQtyForService(service.id);

    const accessoryService: GarmentService = {
      serviceId: service.id,
      serviceName: service.name,
      qty,
      customPriceCents: pendingPrice[service.id] ?? service.base_price_cents,
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
    toast.success(t('addedToast', { name: service.name }));

    // Reset qty and price for this service
    setPendingQty(prev => ({ ...prev, [service.id]: 1 }));
    setPendingPrice(prev => ({ ...prev, [service.id]: service.base_price_cents }));
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
            {tc('back')}
          </Button>
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <Button disabled className="opacity-50">{tc('next')}</Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">{tc('loading')}</p>
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
          {tc('back')}
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('selectedCount', { count: addedAccessories.length })}
          </p>
        </div>

        {/* Always enabled — accessories are optional */}
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white"
        >
          {tc('next')}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-24 md:pb-4">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Empty state hint */}
          {addedAccessories.length === 0 && (
            <div className="text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              {t('emptyState')}
            </div>
          )}

          {/* Section 1: Accessory Service Selection */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {t('productsHeading')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setManageMode(!manageMode);
                    if (manageMode) handleCancelEditService();
                  }}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 text-xs ${
                    manageMode
                      ? 'text-primary-600 bg-primary-50 font-medium'
                      : 'text-muted-foreground hover:text-primary-600 hover:bg-muted/50'
                  }`}
                  title={manageMode ? tm('done') : tm('manage')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{manageMode ? tm('done') : tm('manage')}</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Service List — Accordion */}
              {groupedCategories.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {t('notFound')}
                </p>
              ) : (
                <div className="space-y-1">
                  {groupedCategories.map(category => {
                    const isExpanded = expandedSections.has(category.key);
                    return (
                      <div key={category.key} className="border border-border rounded-lg overflow-hidden">
                        {/* Section Header (always visible) */}
                        <button
                          type="button"
                          onClick={() => toggleSection(category.key)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted transition-colors min-h-[44px] touch-manipulation"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`w-4 h-4 text-muted-foreground transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                            <span className="text-sm font-medium">{category.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                            {category.services.length}
                          </span>
                        </button>

                        {/* Section Content (collapsible) */}
                        {isExpanded && (
                          <div className="divide-y divide-border">
                            {category.services.map(service => (
                              <div key={service.id}>
                                {editingServiceId === service.id ? (
                                  <div className="p-3 space-y-2 bg-white border-2 border-primary-500 rounded-lg">
                                    <input
                                      type="text"
                                      value={editServiceName}
                                      onChange={e => setEditServiceName(e.target.value)}
                                      className="w-full px-2 py-1.5 border border-border rounded text-sm"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEditService();
                                        if (e.key === 'Escape') handleCancelEditService();
                                      }}
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editServicePrice}
                                        onChange={e => setEditServicePrice(e.target.value)}
                                        className="w-24 px-2 py-1.5 border border-border rounded text-sm"
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveEditService();
                                          if (e.key === 'Escape') handleCancelEditService();
                                        }}
                                      />
                                      <div className="flex gap-1 ml-auto">
                                        <button
                                          type="button"
                                          onClick={handleSaveEditService}
                                          className="px-2 py-1 bg-primary-500 text-white rounded text-xs min-h-[36px] touch-manipulation"
                                        >
                                          OK
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelEditService}
                                          className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs min-h-[36px] touch-manipulation"
                                        >
                                          X
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50">
                                    {/* Service Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{service.name}</p>
                                      <p className="text-xs text-primary-600 font-medium">
                                        {formatCurrency(pendingPrice[service.id] ?? service.base_price_cents)}
                                        {service.unit ? ` / ${service.unit}` : ` ${t('perUnit')}`}
                                      </p>
                                    </div>

                                    {/* Quantity Input (decimal) — quantity before price per invoice convention */}
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                                        {service.unit ?? t('qty')}:
                                      </label>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0.25"
                                        step="0.25"
                                        value={getQtyForService(service.id)}
                                        onChange={e => handleQtyChange(service.id, parseFloat(e.target.value) || 1)}
                                        className="w-20 text-center border border-border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500"
                                      />
                                    </div>

                                    {/* Price Input (per unit - editable before adding) */}
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                                        {t('pricePerUnit', { unit: service.unit ?? t('unit') })}
                                      </label>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={((pendingPrice[service.id] ?? service.base_price_cents) / 100).toFixed(2)}
                                        onChange={e => handlePriceChange(service.id, Math.round(parseFloat(e.target.value || '0') * 100))}
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
                                      {tc('add')}
                                    </button>

                                    {/* Manage mode edit/delete buttons */}
                                    {manageMode && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditService(service)}
                                          className="p-1.5 text-muted-foreground hover:text-primary-600 rounded touch-manipulation"
                                          title={tc('edit')}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteService(service.id)}
                                          className="p-1.5 text-muted-foreground hover:text-red-600 rounded touch-manipulation"
                                          title={tc('delete')}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                    {t('selectedHeading', { count: addedAccessories.length })}
                  </h3>
                  <span className="text-sm font-medium">
                    {t('total')}{' '}
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
                          {acc.qty} {acc.unit ?? t('unit')} &times;{' '}
                          {formatCurrency(acc.customPriceCents)}/{acc.unit ?? t('unit')} ={' '}
                          {formatCurrency(acc.customPriceCents * acc.qty)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessory(acc.garmentIndex, acc.serviceIndex)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg touch-manipulation"
                        title={tc('delete')}
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
