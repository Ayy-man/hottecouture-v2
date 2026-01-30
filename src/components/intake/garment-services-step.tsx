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
import { Camera, X, Search, Plus, Minus, Trash2, LayoutGrid, List } from 'lucide-react';
import { useViewPreference } from '@/lib/hooks/useViewPreference';

// ============================================================================
// Type Definitions
// ============================================================================

interface GarmentType {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  is_common: boolean;
  is_active?: boolean;
  is_custom?: boolean;
}

interface Category {
  id: string;
  key: string;
  name: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface GarmentService {
  serviceId: string;
  serviceName?: string;
  qty: number;
  customPriceCents?: number;
  customServiceName?: string;
  assignedSeamstressId?: string | null;
}

interface Garment {
  type: string;
  garment_type_id?: string | null;
  color?: string;
  brand?: string;
  notes?: string;
  labelCode: string;
  photo_path?: string | null;
  services: GarmentService[];
}

interface GarmentServicesStepProps {
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

export function GarmentServicesStep({
  data,
  onUpdate,
  onNext,
  onPrev,
  orderType = 'alteration',
  client: _client,
  onChangeCustomer: _onChangeCustomer,
}: GarmentServicesStepProps) {
  // Props reserved for future use
  void _client;
  void _onChangeCustomer;
  // ===========================================================================
  // State: Garment Configuration (from garments-step.tsx)
  // ===========================================================================
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [groupedTypes, setGroupedTypes] = useState<Record<string, GarmentType[]>>({});
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===========================================================================
  // State: Service Selection (from services-step-new.tsx)
  // ===========================================================================
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // ===========================================================================
  // State: Staff Assignment (from assignment-step.tsx)
  // ===========================================================================
  const { staff } = useStaff();

  // BUG-002 fix: Helper to get seamstress name from ID (avoids showing UUID)
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

  // Load garment types from API
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
        const data = await response.json();
        setGarmentTypes(data.garmentTypes || []);
        setGroupedTypes(data.groupedTypes || {});
      } else {
        console.error('Failed to load garment types');
      }
    } catch (error) {
      console.error('Error loading garment types:', error);
    }
  };

  // Load services from Supabase
  const fetchServices = async () => {
    try {
      const { data: fetchedServices, error } = await supabase
        .from('service')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('display_order')
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(fetchedServices || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Load categories from API
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories || []);

        // Set initial active tab if not set
        if (!activeTab && result.categories && result.categories.length > 0) {
          const filtered =
            orderType === 'alteration'
              ? result.categories.filter(
                  (cat: Category) =>
                    ['alterations', 'accessories', 'outdoor'].includes(cat.key)
                )
              : result.categories;
          if (filtered.length > 0) {
            setActiveTab(filtered[0].key);
          }
        }
      } else {
        console.error('Failed to load categories');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Initial data loading
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([loadGarmentTypes(), fetchServices(), loadCategories()]);
      setLoading(false);
    };
    loadAllData();
  }, []);

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  // Filter categories based on order type
  const filteredCategories = useMemo(() => {
    let result;
    if (orderType === 'alteration') {
      result = categories.filter(cat =>
        ['alterations', 'accessories', 'outdoor'].includes(cat.key)
      );
    } else {
      result = categories;
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, orderType]);

  // Reset active tab if it becomes hidden
  useEffect(() => {
    const isActiveTabVisible = filteredCategories.some(cat => cat.key === activeTab);
    if (!isActiveTabVisible && filteredCategories.length > 0 && filteredCategories[0]) {
      setActiveTab(filteredCategories[0].key);
    }
  }, [filteredCategories, activeTab]);

  // Get services by category with search filter
  const getServicesByCategory = (categoryKey: string) => {
    const filtered = services.filter(service => {
      if (!service.category) return false;
      const serviceCategory = service.category.toLowerCase();
      const key = categoryKey.toLowerCase();

      // Category match
      let categoryMatches = false;
      if (serviceCategory === key) {
        categoryMatches = true;
      } else if (
        serviceCategory === `${key}s` ||
        serviceCategory === key.slice(0, -1)
      ) {
        categoryMatches = true;
      } else if (serviceCategory.startsWith(key)) {
        categoryMatches = true;
      }

      if (!categoryMatches) return false;

      // Search filter
      if (searchTerm.trim()) {
        const serviceName = service.name.toLowerCase();
        const search = searchTerm.toLowerCase().trim();
        return serviceName.includes(search);
      }

      return true;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.garment-type-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
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
          alert('Photo upload failed. Please try again.');
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
      // Increment qty if already exists
      const updatedServices = [...(currentGarment.services || [])];
      const existingService = updatedServices[existingIndex];
      if (existingService) {
        existingService.qty += 1;
      }
      setCurrentGarment({ ...currentGarment, services: updatedServices });
    } else {
      // Add new service
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
        // Remove service if qty becomes 0
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

  const removeService = (serviceIndex: number) => {
    const updatedServices =
      currentGarment.services?.filter((_, i) => i !== serviceIndex) || [];
    setCurrentGarment({ ...currentGarment, services: updatedServices });
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

    // Reset for next garment
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

  const canAddToOrder =
    currentGarment.garment_type_id && currentGarment.services?.length;

  const canProceedToNext = data.length > 0;

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
          <h2 className="text-lg font-semibold text-foreground">Ajouter un article</h2>
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
    <div className="h-full flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0">
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
          <h2 className="text-lg font-semibold text-foreground">Ajouter un article</h2>
          <p className="text-xs text-muted-foreground">
            {data.length} article{data.length !== 1 ? 's' : ''} dans la commande
          </p>
        </div>

        <Button
          onClick={onNext}
          disabled={!canProceedToNext}
          className="bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white disabled:opacity-50"
        >
          Suivant
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Section 1: Garment Configuration */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                1. Type de vetement
              </h3>

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
                              {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                            </div>
                            {activeTypes.map(type => (
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
                            ))}
                          </div>
                        );
                      })}
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

          {/* Section 2: Service Selection */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  2. Services
                </h3>
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

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === cat.key
                        ? 'bg-primary-500 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
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
                  {getServicesByCategory(activeTab).map(service => (
                    <button
                      key={service.id}
                      onClick={() => addServiceToCurrentGarment(service)}
                      className="p-3 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">{service.name}</span>
                        <span className="text-sm text-primary-600 font-medium">
                          {formatCurrency(service.base_price_cents)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {getServicesByCategory(activeTab).length === 0 && (
                    <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                      Aucun service trouve
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-lg shadow overflow-hidden max-h-[200px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Prix
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Temps
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {getServicesByCategory(activeTab).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-sm text-muted-foreground">
                            Aucun service trouve
                          </td>
                        </tr>
                      ) : (
                        getServicesByCategory(activeTab).map(service => (
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
                              -
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addServiceToCurrentGarment(service)}
                                className="h-7 px-3 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                              >
                                Ajouter
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      {/* Service Name */}
                      <span className="flex-1 text-sm font-medium truncate">{svc.serviceName || 'Service'}</span>

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

                      {/* Price */}
                      <span className="w-16 text-right text-sm text-muted-foreground">
                        {formatCurrency((svc.customPriceCents || 0) * svc.qty)}
                      </span>

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
                  ))}
                </div>

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
