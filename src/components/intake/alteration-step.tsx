'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/lib/types/database';
import { useStaff } from '@/lib/hooks/useStaff';
import { formatCurrency } from '@/lib/pricing/calcTotal';
import { nanoid } from 'nanoid';
import { Camera, X, Search, Plus, Minus, Trash2, LayoutGrid, List, Pencil } from 'lucide-react';
import { useViewPreference } from '@/lib/hooks/useViewPreference';
import { useToast } from '@/components/ui/toast';
import { EmojiPicker } from '@/components/ui/emoji-picker';

// ============================================================================
// Type Definitions (exported so AccessoriesStep and page.tsx can import them)
// ============================================================================

export interface GarmentType {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  is_common: boolean;
  is_active?: boolean;
  is_custom?: boolean;
}


export interface GarmentService {
  serviceId: string;
  serviceName?: string;
  qty: number;
  customPriceCents?: number;
  customServiceName?: string;
  assignedSeamstressId?: string | null;
  estimatedMinutes?: number;
  isAccessory?: boolean;
}

export interface Garment {
  type: string;
  garment_type_id?: string | null;
  color?: string;
  brand?: string;
  notes?: string;
  labelCode: string;
  photo_path?: string | null;
  services: GarmentService[];
}

interface AlterationStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
  orderType: 'alteration' | 'custom';
  client?: any;
  onChangeCustomer?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AlterationStep({
  data,
  onUpdate,
  onNext,
  onPrev,
  orderType = 'alteration',
  client: _client,
  onChangeCustomer: _onChangeCustomer,
}: AlterationStepProps) {
  void _client;
  void _onChangeCustomer;

  // ===========================================================================
  // State: Garment Configuration
  // ===========================================================================
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [groupedTypes, setGroupedTypes] = useState<Record<string, GarmentType[]>>({});
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [currentGarment, setCurrentGarment] = useState<Partial<Garment>>({
    type: '',
    garment_type_id: null,
    notes: '',
    labelCode: nanoid(8).toUpperCase(),
    photo_path: null,
    services: [],
  });

  // Garment dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Inline price editing state
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');

  // Custom service state
  const [showAddCustomService, setShowAddCustomService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePriceValue, setCustomServicePriceValue] = useState('');

  // Custom garment type state
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeCategory, setCustomTypeCategory] = useState('other');
  const [customTypeIcon, setCustomTypeIcon] = useState('\u{1F4DD}');

  // Garment type manage mode (edit/delete)
  const [garmentManageMode, setGarmentManageMode] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeIcon, setEditTypeIcon] = useState('');

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===========================================================================
  // State: Service Selection (alteration services only)
  // ===========================================================================
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Service manage mode (edit/delete)
  const [manageMode, setManageMode] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServicePrice, setEditServicePrice] = useState('');

  // ===========================================================================
  // State: Staff Assignment
  // ===========================================================================
  const { staff } = useStaff();
  const toast = useToast();

  // Helper to get seamstress name from ID
  const getSeamstressName = (id: string | null): string => {
    if (!id) return 'Assigner';
    const found = staff.find(s => s.id === id);
    return found ? found.name : 'Assigner';
  };

  // ===========================================================================
  // State: View Mode (grid/list toggle)
  // ===========================================================================
  const { viewMode, setViewMode } = useViewPreference('grid');

  const supabase = createClient();

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadGarmentTypes = async () => {
    try {
      const response = await fetch('/api/garment-types', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        setGarmentTypes(responseData.garmentTypes || []);
        setGroupedTypes(responseData.groupedTypes || {});
        setCategoryLabels(responseData.categories || {});
      } else {
        console.error('Failed to load garment types');
      }
    } catch (error) {
      console.error('Error loading garment types:', error);
    }
  };

  // Garment type manage mode handlers
  const handleStartEditType = (type: GarmentType) => {
    setEditingTypeId(type.id);
    setEditTypeName(type.name);
    setEditTypeIcon(type.icon);
  };

  const handleSaveEditType = async () => {
    if (!editingTypeId || !editTypeName.trim()) return;

    try {
      const response = await fetch('/api/admin/garment-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTypeId,
          name: editTypeName.trim(),
          icon: editTypeIcon,
        }),
      });
      if (response.ok) {
        await loadGarmentTypes();
        toast.success('Type mis a jour');
      } else {
        const result = await response.json();
        toast.error(result.error || 'Echec de la mise a jour');
      }
    } catch (error) {
      console.error('Error updating garment type:', error);
      toast.error('Echec de la mise a jour');
    }
    setEditingTypeId(null);
    setEditTypeName('');
    setEditTypeIcon('');
  };

  const handleCancelEditType = () => {
    setEditingTypeId(null);
    setEditTypeName('');
    setEditTypeIcon('');
  };

  const handleDeleteType = async (typeId: string) => {
    try {
      const response = await fetch(`/api/admin/garment-types?id=${typeId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok) {
        await loadGarmentTypes();
        toast.success('Type supprime');
      } else {
        toast.error(result.error || result.message || 'Impossible de supprimer ce type');
      }
    } catch (error) {
      console.error('Error deleting garment type:', error);
      toast.error('Echec de la suppression');
    }
  };

  // Fetch only alteration-category services
  const fetchServices = async () => {
    try {
      const { data: fetchedServices, error } = await supabase
        .from('service')
        .select('*')
        .eq('is_active', true)
        .in('category', ['alterations', 'alteration'])
        .order('display_order')
        .order('name');

      if (error) {
        console.error('Error fetching alteration services:', error);
      } else {
        setServices(fetchedServices || []);
      }
    } catch (error) {
      console.error('Error fetching alteration services:', error);
    }
  };

  // Service manage mode handlers
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
        await fetchServices();
        toast.success('Service mis a jour');
      } else {
        const result = await response.json();
        toast.error(result.error || 'Echec de la mise a jour');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Echec de la mise a jour');
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
        await fetchServices();
        toast.success('Service supprime');
      } else {
        toast.error(result.error || 'Impossible de supprimer ce service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Echec de la suppression');
    }
  };

  // Initial data loading
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([loadGarmentTypes(), fetchServices()]);
      setLoading(false);
    };
    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  // Filter services with search
  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const search = searchTerm.toLowerCase().trim();
    return services.filter(s => s.name.toLowerCase().includes(search));
  }, [services, searchTerm]);

  // Calculate subtotal for current garment
  const currentGarmentSubtotal = useMemo(() => {
    let total = 0;
    currentGarment.services?.forEach(svc => {
      total += (svc.customPriceCents || 0) * svc.qty;
    });
    return total;
  }, [currentGarment.services]);

  // ===========================================================================
  // Handlers: Garment Type Selection
  // ===========================================================================

  const handleGarmentTypeChange = (garmentTypeId: string) => {
    const selectedType = garmentTypes.find(gt => gt.id === garmentTypeId);
    if (selectedType) {
      setCurrentGarment(prev => ({
        ...prev,
        type: selectedType.name,
        garment_type_id: selectedType.id,
      }));
    }
    setIsDropdownOpen(false);
  };

  const handleCreateCustomType = async () => {
    if (!customTypeName.trim()) return;

    try {
      const response = await fetch('/api/admin/garment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customTypeName.trim(),
          category: customTypeCategory,
          icon: customTypeIcon,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Echec de la creation du type de vetement personnalise');
        return;
      }

      await loadGarmentTypes();

      if (result.garmentType) {
        handleGarmentTypeChange(result.garmentType.id);
      }

      setCustomTypeName('');
      setCustomTypeCategory('other');
      setCustomTypeIcon('\u{1F4DD}');
      setShowAddCustomForm(false);
    } catch (error) {
      console.error('Error creating custom type:', error);
      alert('Echec de la creation du type de vetement personnalise');
    }
  };

  // Close dropdown when clicking/tapping outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = (event instanceof TouchEvent ? event.target : event.target) as HTMLElement;
      if (
        target.closest('.garment-type-dropdown') ||
        target.closest('em-emoji-picker') ||
        target.tagName?.startsWith('EM-') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      setIsDropdownOpen(false);
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
    return undefined;
  }, [isDropdownOpen]);

  // ===========================================================================
  // Handlers: Photo Capture
  // ===========================================================================

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async event => {
        const dataUrl = event.target?.result as string;
        setPhotoPreview(dataUrl);

        const fileName = `garment-${currentGarment.labelCode}-${Date.now()}.jpg`;
        const response = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, dataUrl }),
        });

        if (response.ok) {
          const result = await response.json();
          setCurrentGarment(prev => ({ ...prev, photo_path: result.path }));
        } else {
          console.error('Photo upload failed');
          alert('Echec du telechargement de la photo. Veuillez reessayer.');
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setCurrentGarment(prev => ({ ...prev, photo_path: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ===========================================================================
  // Handlers: Service Selection
  // ===========================================================================

  const addServiceToCurrentGarment = (service: Service) => {
    const existingIndex = currentGarment.services?.findIndex(
      s => s.serviceId === service.id
    );

    if (existingIndex !== undefined && existingIndex >= 0) {
      const updatedServices = [...(currentGarment.services || [])];
      const existingService = updatedServices[existingIndex];
      if (existingService) {
        existingService.qty += 1;
      }
      setCurrentGarment({ ...currentGarment, services: updatedServices });
    } else {
      setCurrentGarment({
        ...currentGarment,
        services: [
          ...(currentGarment.services || []),
          {
            serviceId: service.id,
            serviceName: service.name,
            qty: 1,
            customPriceCents: service.base_price_cents,
            assignedSeamstressId: null,
            estimatedMinutes: (service as any).estimated_minutes || 0,
            isAccessory: false,
          },
        ],
      });
    }
  };

  const updateQty = (serviceIndex: number, delta: number) => {
    const updatedServices = [...(currentGarment.services || [])];
    const svc = updatedServices[serviceIndex];
    if (svc) {
      const newQty = svc.qty + delta;
      if (newQty <= 0) {
        updatedServices.splice(serviceIndex, 1);
      } else {
        svc.qty = newQty;
      }
      setCurrentGarment({ ...currentGarment, services: updatedServices });
    }
  };

  const updateAssignment = (serviceIndex: number, seamstressId: string | null) => {
    const updatedServices = [...(currentGarment.services || [])];
    const svc = updatedServices[serviceIndex];
    if (svc) {
      svc.assignedSeamstressId = seamstressId;
      setCurrentGarment({ ...currentGarment, services: updatedServices });
    }
  };

  const updateEstimatedMinutes = (serviceIndex: number, minutes: number) => {
    const updatedServices = [...(currentGarment.services || [])];
    const svc = updatedServices[serviceIndex];
    if (svc) {
      svc.estimatedMinutes = Math.max(0, minutes);
      setCurrentGarment({ ...currentGarment, services: updatedServices });
    }
  };

  const updatePrice = (serviceIndex: number, newPriceCents: number) => {
    const updatedServices = [...(currentGarment.services || [])];
    const svc = updatedServices[serviceIndex];
    if (svc) {
      svc.customPriceCents = Math.max(0, newPriceCents);
      setCurrentGarment({ ...currentGarment, services: updatedServices });
    }
    setEditingPriceIndex(null);
  };

  const removeService = (serviceIndex: number) => {
    const updatedServices =
      currentGarment.services?.filter((_, i) => i !== serviceIndex) || [];
    setCurrentGarment({ ...currentGarment, services: updatedServices });
  };

  const handleAddCustomService = () => {
    const name = customServiceName.trim();
    if (!name) return;

    const priceDollars = parseFloat(customServicePriceValue) || 0;
    const priceCents = Math.round(priceDollars * 100);

    if (priceCents <= 0) {
      alert('Le prix doit etre superieur a 0');
      return;
    }

    const isDuplicate = currentGarment.services?.some(
      s => (s.serviceName || '').toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      alert(`Le service "${name}" existe deja dans cet article`);
      return;
    }

    const customService: GarmentService = {
      serviceId: `custom_${nanoid(8)}`,
      serviceName: name,
      qty: 1,
      customPriceCents: priceCents,
      customServiceName: name,
      assignedSeamstressId: null,
      estimatedMinutes: 0,
      isAccessory: false,
    };

    setCurrentGarment({
      ...currentGarment,
      services: [...(currentGarment.services || []), customService],
    });

    setCustomServiceName('');
    setCustomServicePriceValue('');
    setShowAddCustomService(false);
  };

  // ===========================================================================
  // Handlers: Order Management
  // ===========================================================================

  const handleAddToOrder = () => {
    if (!currentGarment.garment_type_id || !currentGarment.services?.length) {
      return;
    }

    const newGarment: Garment = {
      type: currentGarment.type || '',
      garment_type_id: currentGarment.garment_type_id,
      notes: currentGarment.notes || '',
      labelCode: currentGarment.labelCode || nanoid(8).toUpperCase(),
      photo_path: currentGarment.photo_path || null,
      services: currentGarment.services || [],
    };

    onUpdate([...data, newGarment]);

    toast.success('Article ajoute a la commande');

    setCurrentGarment({
      type: '',
      garment_type_id: null,
      notes: '',
      labelCode: nanoid(8).toUpperCase(),
      photo_path: null,
      services: [],
    });
    setPhotoPreview(null);
  };

  const removeGarmentFromOrder = (index: number) => {
    const updatedGarments = data.filter((_, i) => i !== index);
    onUpdate(updatedGarments);
  };

  // ===========================================================================
  // Validation
  // ===========================================================================

  const allServicesHaveTime = currentGarment.services?.every(
    svc => (svc.estimatedMinutes || 0) > 0
  ) ?? false;

  const canAddToOrder =
    currentGarment.garment_type_id && currentGarment.services?.length && allServicesHaveTime;

  // AlterationStep is optional — user can always proceed
  const canProceedToNext = true;

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
          <h2 className="text-lg font-semibold text-foreground">Retouches</h2>
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
          <h2 className="text-lg font-semibold text-foreground">Retouches</h2>
          <p className="text-xs text-muted-foreground">
            {data.length} article{data.length !== 1 ? 's' : ''} dans la commande
          </p>
        </div>

        <Button
          onClick={onNext}
          disabled={!canProceedToNext}
          className="bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white disabled:opacity-50"
        >
          {data.length > 0 ? 'Suivant' : 'Passer aux accessoires'}
        </Button>
      </div>

      {/* Main Content - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-24 md:pb-4">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Empty state hint */}
          {data.length === 0 && !currentGarment.garment_type_id && (
            <div className="text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              Aucune retouche ajoutee. Vous pouvez passer aux accessoires.
            </div>
          )}

          {/* Section 1: Garment Configuration */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  1. Type de vetement
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setGarmentManageMode(!garmentManageMode);
                    if (garmentManageMode) {
                      handleCancelEditType();
                    }
                  }}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 text-xs ${garmentManageMode ? 'text-primary-600 bg-primary-50 font-medium' : 'text-muted-foreground hover:text-primary-600 hover:bg-muted/50'}`}
                  title={garmentManageMode ? 'Terminer la gestion' : 'Gerer les types'}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{garmentManageMode ? 'OK' : 'Gerer'}</span>
                </button>
              </div>

              {/* Garment Type Dropdown */}
              <div className="garment-type-dropdown">
                <label className="block text-sm font-medium mb-1">Type de vetement *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3 py-3 text-sm border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-left flex items-center justify-between min-h-[44px]"
                  >
                    <span className="truncate">
                      {currentGarment.garment_type_id
                        ? `${garmentTypes.find(gt => gt.id === currentGarment.garment_type_id)?.icon || ''} ${currentGarment.type || 'Choisir un type...'}`
                        : 'Choisir un type de vetement...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                      {Object.entries(groupedTypes).map(([category, types]) => {
                        const activeTypes = types
                          .filter(type => type.is_active !== false)
                          .sort((a, b) => a.name.localeCompare(b.name));

                        if (activeTypes.length === 0) return null;

                        return (
                          <div key={category}>
                            <div className="px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground sticky top-0">
                              {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                            </div>
                            {activeTypes.map(type => (
                              garmentManageMode ? (
                                <div key={type.id} className="px-3 py-2 min-h-[44px]">
                                  {editingTypeId === type.id ? (
                                    <div className="flex items-center gap-2">
                                      <EmojiPicker
                                        value={editTypeIcon}
                                        onSelect={(emoji) => setEditTypeIcon(emoji)}
                                      />
                                      <input
                                        type="text"
                                        value={editTypeName}
                                        onChange={e => setEditTypeName(e.target.value)}
                                        className="flex-1 px-2 py-1 border border-border rounded text-sm min-h-[36px]"
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveEditType();
                                          if (e.key === 'Escape') handleCancelEditType();
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={handleSaveEditType}
                                        className="px-2 py-1 bg-primary-500 text-white rounded text-xs min-h-[36px] touch-manipulation"
                                      >
                                        OK
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditType}
                                        className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs min-h-[36px] touch-manipulation"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span>{type.icon}</span>
                                      <span className="text-sm flex-1">{type.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditType(type)}
                                        className="p-1.5 text-muted-foreground hover:text-primary-600 rounded touch-manipulation"
                                        title="Modifier"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteType(type.id)}
                                        className="p-1.5 text-muted-foreground hover:text-red-600 rounded touch-manipulation"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => handleGarmentTypeChange(type.id)}
                                  className={`w-full px-3 py-3 text-left flex items-center gap-2 hover:bg-muted/50 min-h-[44px] ${
                                    currentGarment.garment_type_id === type.id ? 'bg-primary-50' : ''
                                  }`}
                                >
                                  <span>{type.icon}</span>
                                  <span className="text-sm">{type.name}</span>
                                </button>
                              )
                            ))}
                          </div>
                        );
                      })}
                      {/* Add Custom Type Section */}
                      <div className='border-t border-border'>
                        {showAddCustomForm ? (
                          <div className='p-3 space-y-2 bg-muted/50'>
                            <div className='flex items-center gap-2'>
                              <EmojiPicker
                                value={customTypeIcon}
                                onSelect={(emoji) => setCustomTypeIcon(emoji)}
                              />
                              <input
                                type='text'
                                value={customTypeName}
                                onChange={e => setCustomTypeName(e.target.value)}
                                placeholder='Nom du type personnalise...'
                                className='flex-1 px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleCreateCustomType();
                                  if (e.key === 'Escape') {
                                    setShowAddCustomForm(false);
                                    setCustomTypeName('');
                                    setCustomTypeIcon('\u{1F4DD}');
                                  }
                                }}
                              />
                            </div>
                            <select
                              value={customTypeCategory}
                              onChange={e => setCustomTypeCategory(e.target.value)}
                              className='w-full px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                            >
                              <option value='other'>Autre</option>
                              <option value='alteration'>Retouches</option>
                              <option value='custom'>Sur mesure</option>
                              <option value='outdoor'>Exterieur</option>
                            </select>
                            <div className='flex gap-2'>
                              <button
                                onClick={() => {
                                  setShowAddCustomForm(false);
                                  setCustomTypeName('');
                                  setCustomTypeIcon('\u{1F4DD}');
                                }}
                                className='flex-1 px-3 py-2 bg-muted text-muted-foreground rounded text-sm min-h-[44px] touch-manipulation'
                              >
                                Annuler
                              </button>
                              <button
                                onClick={handleCreateCustomType}
                                disabled={!customTypeName.trim()}
                                className='flex-1 px-3 py-2 bg-primary-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50'
                              >
                                Creer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type='button'
                            onClick={() => setShowAddCustomForm(true)}
                            className='w-full px-3 py-3 text-left text-sm text-primary-600 hover:bg-muted/50 flex items-center gap-2 min-h-[44px] touch-manipulation'
                          >
                            <span>+</span>
                            <span>Ajouter un type personnalise...</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Capture */}
              <div>
                <label className="block text-sm font-medium mb-1">Photo (optionnel)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Apercu"
                      className="w-20 h-20 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary-400 hover:text-primary-600 transition-colors min-h-[44px]"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-sm">Prendre une photo</span>
                  </button>
                )}
              </div>

              {/* Notes Field */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
                <textarea
                  value={currentGarment.notes || ''}
                  onChange={e => setCurrentGarment(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Instructions speciales, notes sur les dommages, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Service Selection (Alteration services only — no tabs) */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    2. Retouches
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setManageMode(!manageMode);
                      if (manageMode) {
                        handleCancelEditService();
                      }
                    }}
                    className={`p-1 rounded transition-colors ${manageMode ? 'text-primary-600 bg-primary-50' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
                    title={manageMode ? 'Terminer la gestion' : 'Gerer les services'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* View Toggle */}
                <div className="flex bg-muted p-1 rounded-lg border border-border">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`gap-2 h-8 ${viewMode === 'grid' ? 'shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Grille</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`gap-2 h-8 ${viewMode === 'list' ? 'shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Liste</span>
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un service..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Service List - Grid or List View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {filteredServices.map(service => (
                    <div key={service.id} className="relative">
                      {editingServiceId === service.id ? (
                        <div className="p-3 bg-white rounded-lg border-2 border-primary-500 space-y-2">
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
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditService}
                                className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (manageMode) {
                              handleStartEditService(service);
                            } else {
                              addServiceToCurrentGarment(service);
                            }
                          }}
                          className={`w-full p-3 rounded-lg text-left transition-colors ${
                            manageMode
                              ? 'bg-muted/50 hover:bg-primary-50 border border-dashed border-muted-foreground/30'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium">{service.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-primary-600 font-medium">
                                {formatCurrency(service.base_price_cents)}
                              </span>
                              {manageMode && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteService(service.id);
                                  }}
                                  className="p-1 text-muted-foreground/60 hover:text-red-500 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {manageMode && (
                            <p className="text-[10px] text-muted-foreground mt-1">Cliquer pour modifier</p>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                  {filteredServices.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                      Aucun service trouve
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-lg shadow overflow-hidden max-h-[200px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Prix
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Temps (min)
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {filteredServices.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-sm text-muted-foreground">
                            Aucun service trouve
                          </td>
                        </tr>
                      ) : (
                        filteredServices.map(service => (
                          <tr
                            key={service.id}
                            className="hover:bg-muted/50"
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span
                                className="text-sm font-medium truncate max-w-[200px] inline-block"
                                title={service.name}
                              >
                                {service.name}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-primary-600 font-medium">
                              {formatCurrency(service.base_price_cents)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {(service as any).estimated_minutes ? `${(service as any).estimated_minutes} min` : '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                {manageMode && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditService(service)}
                                      className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-primary-600 rounded-md transition-colors"
                                      title="Modifier"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteService(service.id)}
                                      className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-red-500 rounded-md transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => addServiceToCurrentGarment(service)}
                                  className="h-8 px-3 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-md transition-colors min-w-[70px]"
                                >
                                  Ajouter
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Custom Service */}
              <div className="border-t border-border pt-3 mt-3">
                {showAddCustomService ? (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <input
                      type="text"
                      value={customServiceName}
                      onChange={e => setCustomServiceName(e.target.value)}
                      placeholder="Nom du service..."
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm min-h-[44px] focus:ring-2 focus:ring-primary-500"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          setShowAddCustomService(false);
                          setCustomServiceName('');
                          setCustomServicePriceValue('');
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={customServicePriceValue}
                        onChange={e => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          setCustomServicePriceValue(value);
                        }}
                        placeholder="Prix"
                        className="w-24 px-3 py-2 border border-border rounded-lg text-sm min-h-[44px] focus:ring-2 focus:ring-primary-500"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddCustomService();
                          if (e.key === 'Escape') {
                            setShowAddCustomService(false);
                            setCustomServiceName('');
                            setCustomServicePriceValue('');
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCustomService(false);
                          setCustomServiceName('');
                          setCustomServicePriceValue('');
                        }}
                        className="flex-1 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm min-h-[44px] touch-manipulation"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomService}
                        disabled={!customServiceName.trim() || !customServicePriceValue}
                        className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm min-h-[44px] touch-manipulation disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomService(true)}
                    className="w-full px-3 py-2 text-sm text-primary-600 hover:bg-muted/50 rounded-lg flex items-center gap-2 min-h-[44px] touch-manipulation"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter un service personnalise...</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Selected Services with Assignment */}
          {currentGarment.services && currentGarment.services.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    3. Services selectionnes
                  </h3>
                  <span className="text-sm font-medium">
                    Sous-total: {formatCurrency(currentGarmentSubtotal)}
                  </span>
                </div>

                <div className="space-y-2">
                  {currentGarment.services.map((svc, idx) => (
                    <div
                      key={svc.serviceId}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      {/* Row 1: Service name + qty controls */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex-1 text-sm font-medium truncate min-w-0">{svc.serviceName || 'Service'}</span>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQty(idx, -1)}
                            className="min-h-[44px] min-w-[44px] p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{svc.qty}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQty(idx, 1)}
                            className="min-h-[44px] min-w-[44px] p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Row 2: Price + time estimate (required) + assignment + remove */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Price (editable per-unit price) */}
                        <div className="flex flex-col items-end gap-0.5 w-20">
                          {editingPriceIndex === idx ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editPriceValue}
                                onChange={e => {
                                  const value = e.target.value.replace(/[^0-9.]/g, '');
                                  setEditPriceValue(value);
                                }}
                                onBlur={() => {
                                  const dollars = parseFloat(editPriceValue) || 0;
                                  updatePrice(idx, Math.round(dollars * 100));
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const dollars = parseFloat(editPriceValue) || 0;
                                    updatePrice(idx, Math.round(dollars * 100));
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingPriceIndex(null);
                                  }
                                }}
                                className="w-16 px-1 py-0.5 text-sm border border-primary rounded text-right focus:ring-1 focus:ring-primary"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceIndex(idx);
                                setEditPriceValue(((svc.customPriceCents || 0) / 100).toFixed(2));
                              }}
                              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline cursor-pointer group"
                              title="Cliquer pour modifier le prix"
                            >
                              {formatCurrency(svc.customPriceCents || 0)}
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Total: {formatCurrency((svc.customPriceCents || 0) * svc.qty)}
                          </span>
                        </div>

                        {/* Time Estimate (Required for alterations) */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={svc.estimatedMinutes || ''}
                            onChange={e => updateEstimatedMinutes(idx, parseInt(e.target.value) || 0)}
                            placeholder="min"
                            className={`w-14 px-1 py-1 text-xs text-center border rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
                              !svc.estimatedMinutes ? 'border-red-300 bg-red-50' : 'border-border'
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">
                            min<span className="text-red-500">*</span>
                          </span>
                        </div>

                        {/* Assignment Dropdown */}
                        <div className="w-32">
                          <Select
                            value={svc.assignedSeamstressId || ''}
                            onValueChange={val => updateAssignment(idx, val || null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <span className="truncate">{getSeamstressName(svc.assignedSeamstressId ?? null)}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Non assigne</SelectItem>
                              {staff.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(idx)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time validation message */}
                {currentGarment.services && currentGarment.services.length > 0 && !allServicesHaveTime && (
                  <p className="text-xs text-red-500">
                    Le temps estime est requis pour chaque service (planification)
                  </p>
                )}

                {/* Add to Order Button */}
                <Button
                  onClick={handleAddToOrder}
                  disabled={!canAddToOrder}
                  className="w-full bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white disabled:opacity-50"
                >
                  Ajouter a la commande
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Order Items */}
          {data.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Articles dans la commande ({data.length})
                </h3>

                <div className="space-y-2">
                  {data.map((garment, index) => (
                    <div
                      key={garment.labelCode}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      {garment.photo_path && (
                        <img
                          src={`/api/photo/${garment.photo_path}`}
                          alt={garment.type}
                          className="w-12 h-12 object-cover rounded-lg border border-border"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {garmentTypes.find(gt => gt.id === garment.garment_type_id)?.icon || ''}{' '}
                          {garment.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {garment.services.length} service{garment.services.length !== 1 ? 's' : ''} -{' '}
                          {formatCurrency(
                            garment.services.reduce(
                              (sum, s) => sum + (s.customPriceCents || 0) * s.qty,
                              0
                            )
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGarmentFromOrder(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
