'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/lib/types/database';
import { formatCurrency } from '@/lib/pricing/calcTotal';

interface Category {
  id: string;
  key: string;
  name: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface Garment {
  type: string;
  color?: string;
  brand?: string;
  notes?: string;
  labelCode: string;
  services: Array<{
    serviceId: string;
    qty: number;
    customPriceCents?: number;
    customServiceName?: string; // Added for custom services
  }>;
}

interface ServicesStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
  orderType?: 'alteration' | 'custom'; // Order type from step 1
  client?: any; // Added client prop
  onChangeCustomer?: () => void; // Added callback to change client
}

export function ServicesStepNew({
  data,
  onUpdate,
  onNext,
  onPrev,
  orderType = 'alteration', // Default to alteration
  client,
  onChangeCustomer,
}: ServicesStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [subtotal, setSubtotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGarmentIndex, setActiveGarmentIndex] = useState(0); // Added active garment state

  // Category CRUD states
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [categoryUsageCount, setCategoryUsageCount] = useState<number | null>(
    null
  );

  // Service CRUD states
  const [serviceContextMenuId, setServiceContextMenuId] = useState<
    string | null
  >(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServicePrice, setEditServicePrice] = useState('');
  const [editServiceCategory, setEditServiceCategory] = useState('');
  const [editServiceUnit, setEditServiceUnit] = useState('');
  const [editServiceEstimatedMinutes, setEditServiceEstimatedMinutes] = useState<number>(15);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [newServiceUnit, setNewServiceUnit] = useState('');
  const [newServiceEstimatedMinutes, setNewServiceEstimatedMinutes] = useState<number>(15);
  const [deleteServiceConfirmId, setDeleteServiceConfirmId] = useState<
    string | null
  >(null);
  const [serviceUsageCount, setServiceUsageCount] = useState<number | null>(
    null
  );

  // Price editing state
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');

  // Zip selection modal states
  const [showZipModal, setShowZipModal] = useState(false);
  const [pendingService, setPendingService] = useState<{
    serviceId: string;
    garmentIndex: number;
  } | null>(null);
  const [selectedZipService, setSelectedZipService] = useState<string | null>(
    null
  );

  const supabase = createClient();

  // Filter categories based on order type and sort alphabetically
  const filteredCategories = useMemo(() => {
    let result;
    if (orderType === 'alteration') {
      // Hide curtains and custom for alterations
      result = categories.filter(
        cat => cat.key !== 'curtains' && cat.key !== 'custom'
      );
    } else {
      // Show all categories for custom design
      result = categories;
    }
    // Sort alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, orderType]);

  // Load categories from API
  const loadCategories = async () => {
    try {
      // Add cache-busting to prevent stale data in production
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
                  cat.key !== 'curtains' && cat.key !== 'custom'
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

  // Reset active tab if it's hidden
  useEffect(() => {
    const isActiveTabVisible = filteredCategories.some(
      cat => cat.key === activeTab
    );
    if (
      !isActiveTabVisible &&
      filteredCategories.length > 0 &&
      filteredCategories[0]
    ) {
      setActiveTab(filteredCategories[0].key);
    }
  }, [filteredCategories, activeTab]);

  useEffect(() => {
    fetchServices();
    loadCategories();
  }, []);

  // Close context menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.category-context-menu')) {
        setContextMenuId(null);
      }
      if (!target.closest('.service-context-menu')) {
        setServiceContextMenuId(null);
      }
    };

    if (contextMenuId || serviceContextMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [contextMenuId, serviceContextMenuId]);

  useEffect(() => {
    calculateSubtotal();
  }, [data, services]); // Recalculate when data or services change

  const fetchServices = async () => {
    setLoading(true);
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
        // Handle error appropriately
      } else {
        setServices(fetchedServices || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    let total = 0;
    data.forEach(garment => {
      garment.services.forEach(service => {
        const serviceData = services.find(s => s.id === service.serviceId);
        const isCustomService = service.serviceId.startsWith('custom-');

        if (serviceData || isCustomService) {
          const price =
            service.customPriceCents || serviceData?.base_price_cents || 0;
          total += price * service.qty;
        }
      });
    });
    setSubtotal(total);
  };

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

      // Search filter (if search term exists)
      if (searchTerm.trim()) {
        const serviceName = service.name.toLowerCase();
        const search = searchTerm.toLowerCase().trim();
        return serviceName.includes(search);
      }

      return true;
    });

    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Check if service triggers zip selection popup
  const serviceRequiresZipSelection = (serviceName: string): boolean => {
    const lowerName = serviceName.toLowerCase();
    const zipTriggerServices = [
      "changer zip d'une veste ou chandail",
      'changer zip de jeans',
      'changer zip de manteau + zip',
      'changer zip de manteau + zip (manteau long)',
      'changer zip de manteau scellé + zip',
    ];

    return zipTriggerServices.some(trigger =>
      lowerName.includes(trigger.toLowerCase())
    );
  };

  // Get all Zip séparable services
  const getZipServices = (): Service[] => {
    return services.filter(service => {
      const lowerName = service.name.toLowerCase();
      return lowerName.includes('zip séparable') && service.is_active !== false;
    });
  };

  // Category CRUD handlers
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to create category');
        return;
      }

      // Add the new category to state directly
      if (result.category) {
        setCategories(prevCategories => {
          // Check if category already exists (shouldn't, but safety check)
          const exists = prevCategories.some(
            cat => cat.id === result.category.id
          );
          if (exists) {
            return prevCategories.map(cat =>
              cat.id === result.category.id ? result.category : cat
            );
          }
          return [...prevCategories, result.category].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        });

        // Select the newly created category
        setActiveTab(result.category.key);
      } else {
        // Fallback: reload if response doesn't include category
        await loadCategories();
      }

      // Reset form
      setNewCategoryName('');
      setShowAddCategoryForm(false);
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const handleStartEditCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategoryId(categoryId);
      setEditCategoryName(category.name);
      setContextMenuId(null);
    }
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategoryId || !editCategoryName.trim()) return;

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategoryId,
          name: editCategoryName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to update category');
        return;
      }

      // Update state directly with the updated category
      if (result.category) {
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === editingCategoryId ? result.category : cat
          )
        );

        // Update active tab if it was the edited category
        if (activeTab === result.category.key) {
          setActiveTab(result.category.key);
        }
      } else {
        // Fallback: reload if response doesn't include category
        await loadCategories();
      }

      setEditingCategoryId(null);
      setEditCategoryName('');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  const handleCheckCategoryUsage = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    try {
      const response = await fetch(
        `/api/admin/categories?usage=true&key=${category.key}`
      );
      const result = await response.json();

      if (response.ok) {
        setCategoryUsageCount(result.usageCount || 0);
        setDeleteConfirmId(categoryId);
        setContextMenuId(null);
      }
    } catch (error) {
      console.error('Error checking usage:', error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/categories?id=${deleteConfirmId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || result.error || 'Failed to delete category');
        setDeleteConfirmId(null);
        setCategoryUsageCount(null);
        return;
      }

      // Remove the deleted category from state directly
      const deletedCategory = categories.find(c => c.id === deleteConfirmId);

      setCategories(prevCategories =>
        prevCategories.filter(cat => cat.id !== deleteConfirmId)
      );

      // Clear selection if deleted category was selected
      if (deletedCategory?.key === activeTab) {
        // Calculate filtered categories after deletion
        const remainingCategories = categories.filter(
          c => c.id !== deleteConfirmId
        );
        const filtered =
          orderType === 'alteration'
            ? remainingCategories.filter(
              cat => cat.key !== 'curtains' && cat.key !== 'custom'
            )
            : remainingCategories;

        const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
        if (sorted.length > 0 && sorted[0]) {
          setActiveTab(sorted[0].key);
        }
      }

      setDeleteConfirmId(null);
      setCategoryUsageCount(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const categoriesCount = categories.filter(c => c.is_active).length;

  // Service CRUD handlers
  const handleCreateService = async () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) return;

    const price = parseFloat(newServicePrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    try {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceName.trim(),
          price: price,
          category: newServiceCategory || activeTab || null,
          unit: newServiceUnit.trim() || null,
          estimated_minutes: newServiceEstimatedMinutes || 15,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to create service');
        return;
      }

      // Reload services
      await fetchServices();

      // Reset form
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceCategory('');
      setNewServiceUnit('');
      setNewServiceEstimatedMinutes(15);
      setShowAddServiceForm(false);
    } catch (error) {
      console.error('Error creating service:', error);
      alert('Failed to create service');
    }
  };

  const handleStartEditService = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setEditingServiceId(serviceId);
      setEditServiceName(service.name);
      setEditServicePrice((service.base_price_cents / 100).toFixed(2));
      setEditServiceCategory(service.category || '');
      setEditServiceUnit((service as any).unit || '');
      setEditServiceEstimatedMinutes((service as any).estimated_minutes || 15);
      setServiceContextMenuId(null);
    }
  };

  const handleSaveEditService = async () => {
    if (
      !editingServiceId ||
      !editServiceName.trim() ||
      !editServicePrice.trim()
    )
      return;

    const price = parseFloat(editServicePrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    try {
      const response = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingServiceId,
          name: editServiceName.trim(),
          price: price,
          category: editServiceCategory || null,
          unit: editServiceUnit.trim() || null,
          estimated_minutes: editServiceEstimatedMinutes || 15,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to update service');
        return;
      }

      // Reload services
      await fetchServices();

      setEditingServiceId(null);
      setEditServiceName('');
      setEditServicePrice('');
      setEditServiceCategory('');
      setEditServiceUnit('');
      setEditServiceEstimatedMinutes(15);
    } catch (error) {
      console.error('Error updating service:', error);
      alert('Failed to update service');
    }
  };

  const handleCancelEditService = () => {
    setEditingServiceId(null);
    setEditServiceName('');
    setEditServicePrice('');
    setEditServiceCategory('');
    setEditServiceUnit('');
    setEditServiceEstimatedMinutes(15);
  };

  const handleCheckServiceUsage = async (serviceId: string) => {
    try {
      const response = await fetch(
        `/api/admin/services?usage=true&id=${serviceId}`
      );
      const result = await response.json();

      if (response.ok) {
        setServiceUsageCount(result.usageCount || 0);
        setDeleteServiceConfirmId(serviceId);
        setServiceContextMenuId(null);
      }
    } catch (error) {
      console.error('Error checking usage:', error);
    }
  };

  const handleDeleteService = async () => {
    if (!deleteServiceConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/services?id=${deleteServiceConfirmId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || result.error || 'Failed to delete service');
        setDeleteServiceConfirmId(null);
        setServiceUsageCount(null);
        return;
      }

      // Reload services
      await fetchServices();

      setDeleteServiceConfirmId(null);
      setServiceUsageCount(null);
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    }
  };

  const addServiceToGarment = (garmentIndex: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Check if this service requires zip selection
    if (serviceRequiresZipSelection(service.name)) {
      // Show zip selection modal instead of adding directly
      setPendingService({ serviceId, garmentIndex });
      setShowZipModal(true);
      setSelectedZipService(null);
      return;
    }

    // Normal flow - add service directly
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    const existingServiceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );

    if (existingServiceIndex >= 0) {
      // Update quantity
      const existingService = garment.services[existingServiceIndex];
      if (existingService) {
        existingService.qty += 1;
      }
    } else {
      // Add new service
      garment.services.push({
        serviceId,
        qty: 1,
        customPriceCents: service.base_price_cents,
      });
    }

    onUpdate(updatedGarments);
  };

  // Handle zip selection and add services
  const handleZipSelection = (zipServiceId: string | null) => {
    if (!pendingService) return;

    const { serviceId, garmentIndex } = pendingService;
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    const mainService = services.find(s => s.id === serviceId);
    if (!mainService) return;

    // Add main service
    const existingServiceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );

    if (existingServiceIndex >= 0) {
      garment.services[existingServiceIndex]!.qty += 1;
    } else {
      garment.services.push({
        serviceId,
        qty: 1,
        customPriceCents: mainService.base_price_cents,
      });
    }

    // Add selected zip service if one was selected
    if (zipServiceId) {
      const zipService = services.find(s => s.id === zipServiceId);
      if (zipService) {
        const existingZipIndex = garment.services.findIndex(
          s => s.serviceId === zipServiceId
        );

        if (existingZipIndex >= 0) {
          garment.services[existingZipIndex]!.qty += 1;
        } else {
          garment.services.push({
            serviceId: zipServiceId,
            qty: 1,
            customPriceCents: zipService.base_price_cents,
          });
        }
      }
    }

    onUpdate(updatedGarments);

    // Close modal and reset state
    setShowZipModal(false);
    setPendingService(null);
    setSelectedZipService(null);
  };

  const updateServiceQuantity = (
    garmentIndex: number,
    serviceId: string,
    qty: number
  ) => {
    if (qty <= 0) {
      removeServiceFromGarment(garmentIndex, serviceId);
      return;
    }

    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    const serviceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );

    if (serviceIndex >= 0) {
      const service = garment.services[serviceIndex];
      if (service) {
        service.qty = qty;
        onUpdate(updatedGarments);
      }
    }
  };

  const removeServiceFromGarment = (
    garmentIndex: number,
    serviceId: string
  ) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    // Remove the service
    garment.services = garment.services.filter(s => s.serviceId !== serviceId);

    onUpdate(updatedGarments);
  };

  const updateServicePrice = (
    garmentIndex: number,
    serviceId: string,
    newPriceCents: number
  ) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    const serviceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );

    if (serviceIndex >= 0) {
      const service = garment.services[serviceIndex];
      if (service) {
        service.customPriceCents = newPriceCents;
        onUpdate(updatedGarments);
      }
    }
  };

  const handleStartPriceEdit = (garmentIndex: number, serviceId: string, currentPriceCents: number) => {
    const key = `${garmentIndex}-${serviceId}`;
    setEditingPriceKey(key);
    setEditPriceValue((currentPriceCents / 100).toFixed(2));
  };

  const handleSavePriceEdit = (garmentIndex: number, serviceId: string) => {
    const newPrice = parseFloat(editPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateServicePrice(garmentIndex, serviceId, Math.round(newPrice * 100));
    }
    setEditingPriceKey(null);
    setEditPriceValue('');
  };

  const handleCancelPriceEdit = () => {
    setEditingPriceKey(null);
    setEditPriceValue('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center h-32'>
            <p className='text-muted-foreground'>Loading services...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header with Navigation */}
      <div className='flex items-center justify-between px-1 py-3 border-b border-border bg-white flex-shrink-0'>
        <Button
          variant='ghost'
          onClick={onPrev}
          className='flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg transition-all duration-200'
        >
          <svg
            className='w-4 h-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
          <span className='font-medium'>Previous</span>
        </Button>

        <div className='flex-1 text-center'>
          <h2 className='text-lg font-semibold text-foreground'>
            Select Services
          </h2>
          {client ? (
            <p className='text-sm text-muted-foreground'>
              Client: {client.first_name} {client.last_name}{' '}
              {onChangeCustomer && (
                <button
                  onClick={onChangeCustomer}
                  className='text-primary-600 hover:underline font-medium ml-1'
                >
                  (Change)
                </button>
              )}
            </p>
          ) : (
            <p className='text-sm text-muted-foreground'>Choose what you need</p>
          )}
        </div>

        <Button
          onClick={onNext}
          disabled={data.length === 0}
          className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          Next
        </Button>
      </div>

      {/* Garment Selector Tabs (Only if multiple garments) */}
      {data.length > 1 && (
        <div className='bg-white px-4 py-2 border-b border-border overflow-x-auto whitespace-nowrap shadow-sm'>
          <div className='flex space-x-2'>
            {data.map((garment, index) => (
              <button
                key={index}
                onClick={() => setActiveGarmentIndex(index)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeGarmentIndex === index
                  ? 'bg-primary-500 text-white shadow-md transform scale-105'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
              >
                <span>
                  #{index + 1} {garment.labelCode}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeGarmentIndex === index
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {garment.services.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single Garment Indicator (if only 1 garment) */}
      {data.length === 1 && (
        <div className='bg-primary-50 px-4 py-2 border-b border-primary-100 flex items-center justify-center'>
          <span className='text-primary-800 text-sm font-medium flex items-center gap-2'>
            Adding services to:
            <span className='bg-white px-2 py-0.5 rounded-md shadow-sm border border-primary-100'>
              #{1} {data[0]?.labelCode}
            </span>
          </span>
        </div>
      )}

      {/* Ultra Compact Category Tabs */}
      <div className='bg-white border-b border-border px-1 py-1 flex-shrink-0'>
        <div
          className={`grid gap-1 ${filteredCategories.length + (showAddCategoryForm ? 0 : 1) <= 3 ? 'grid-cols-3' : filteredCategories.length + (showAddCategoryForm ? 0 : 1) <= 5 ? 'grid-cols-5' : filteredCategories.length + (showAddCategoryForm ? 0 : 1) <= 6 ? 'grid-cols-6' : 'grid-cols-4'}`}
        >
          {filteredCategories.map((category, index) => {
            const categoryServices = getServicesByCategory(category.key);
            const isEditing = editingCategoryId === category.id;
            const isFirstItem = index === 0;

            return (
              <div
                key={category.id}
                className='relative category-context-menu'
                style={{
                  position: 'relative',
                  zIndex: contextMenuId === category.id ? 60 : 'auto',
                }}
              >
                {isEditing ? (
                  // Inline Edit Mode
                  <div className='flex flex-col items-center gap-1 px-1 py-1 bg-white border-2 border-primary-500 rounded'>
                    <input
                      type='text'
                      value={editCategoryName}
                      onChange={e => setEditCategoryName(e.target.value)}
                      className='w-full px-2 py-1 border border-border rounded text-xs text-center min-h-[32px]'
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEditCategory();
                        if (e.key === 'Escape') handleCancelEditCategory();
                      }}
                    />
                    <div className='flex gap-1'>
                      <button
                        onClick={handleSaveEditCategory}
                        className='px-2 py-1 bg-green-500 text-white rounded text-xs min-h-[32px] touch-manipulation'
                        disabled={!editCategoryName.trim()}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditCategory}
                        className='px-2 py-1 bg-muted text-muted-foreground rounded text-xs min-h-[32px] touch-manipulation'
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal Display Mode
                  <div className='relative group'>
                    <button
                      onClick={() => setActiveTab(category.key)}
                      className={`w-full flex flex-col items-center gap-0.5 px-1 py-1 rounded text-xs font-medium transition-all duration-200 relative ${activeTab === category.key
                        ? 'bg-gradient-to-r from-primary-500 to-accent-clay text-white shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                        }`}
                    >
                      <span className='text-sm'>{category.icon}</span>
                      <span className='text-[10px] leading-tight text-center line-clamp-1'>
                        {category.name}
                      </span>
                      <span
                        className={`text-[10px] px-1 py-0.5 rounded-full ${activeTab === category.key
                          ? 'bg-white/20 text-white'
                          : 'bg-muted text-muted-foreground'
                          }`}
                      >
                        {categoryServices.length}
                      </span>
                    </button>

                    {/* Context Menu Button */}
                    <button
                      type='button'
                      onClick={e => {
                        e.stopPropagation();
                        setContextMenuId(
                          contextMenuId === category.id ? null : category.id
                        );
                      }}
                      className='absolute top-0 right-0 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center text-muted-foreground/70 hover:text-muted-foreground touch-manipulation opacity-40 hover:opacity-100 active:opacity-100 transition-opacity'
                    >
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
                      </svg>
                    </button>

                    {/* Context Menu */}
                    {contextMenuId === category.id && (
                      <div
                        className={`absolute right-0 bg-white border border-border rounded-lg shadow-xl z-[60] min-w-[160px] animate-[fadeIn_0.2s_ease-out,zoomIn_0.2s_ease-out] ${isFirstItem ? 'top-full mt-1' : 'bottom-full mb-1'
                          }`}
                        style={{ position: 'absolute' }}
                      >
                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation();
                            handleStartEditCategory(category.id);
                          }}
                          className='w-full px-3 py-2.5 text-left text-xs hover:bg-muted flex items-center gap-2 min-h-[44px] touch-manipulation'
                        >
                          <span>✏️</span>
                          <span>Edit Name</span>
                        </button>
                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation();
                            handleCheckCategoryUsage(category.id);
                          }}
                          className='w-full px-3 py-2.5 text-left text-xs hover:bg-muted flex items-center gap-2 min-h-[44px] touch-manipulation text-red-600'
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category Tab */}
          {!showAddCategoryForm && categoriesCount < 8 && (
            <button
              onClick={() => setShowAddCategoryForm(true)}
              className='flex flex-col items-center gap-0.5 px-0.5 py-1 rounded text-xs font-medium transition-all duration-200 bg-muted text-muted-foreground hover:bg-muted border-2 border-dashed border-border'
            >
              <span className='text-base'>+</span>
              <span className='text-xs leading-tight text-center'>Add</span>
            </button>
          )}

          {/* Add Category Form */}
          {showAddCategoryForm && (
            <div className='flex flex-col items-center gap-1 px-1 py-1 bg-white border-2 border-primary-500 rounded animate-[fadeIn_0.2s_ease-out,zoomIn_0.2s_ease-out]'>
              <input
                type='text'
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder='Category name...'
                className='w-full px-2 py-1 border border-border rounded text-xs text-center min-h-[32px]'
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateCategory();
                  if (e.key === 'Escape') {
                    setShowAddCategoryForm(false);
                    setNewCategoryName('');
                  }
                }}
              />
              <div className='flex gap-1'>
                <button
                  onClick={() => {
                    setShowAddCategoryForm(false);
                    setNewCategoryName('');
                  }}
                  className='px-2 py-1 bg-muted text-muted-foreground rounded text-xs min-h-[32px] touch-manipulation'
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || categoriesCount >= 8}
                  className='px-2 py-1 bg-primary-500 text-white rounded text-xs min-h-[32px] touch-manipulation disabled:opacity-50'
                >
                  Create
                </button>
              </div>
              {categoriesCount >= 8 && (
                <p className='text-xs text-red-600 text-center'>
                  Max 8 categories
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-[fadeIn_0.2s_ease-out,zoomIn_0.2s_ease-out]'>
            <h3 className='text-lg font-semibold mb-4'>Delete Category?</h3>
            <p className='text-sm text-muted-foreground mb-2'>
              Are you sure you want to delete this category?
            </p>
            {categoryUsageCount !== null && (
              <p className='text-sm text-muted-foreground mb-4'>
                {categoryUsageCount > 0 ? (
                  <span className='text-red-600 font-semibold'>
                    This category is used by {categoryUsageCount} service(s).
                    Cannot delete.
                  </span>
                ) : (
                  <span className='text-green-600'>
                    This category is not used by any services. Safe to delete.
                  </span>
                )}
              </p>
            )}
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setCategoryUsageCount(null);
                }}
                className='flex-1 px-4 py-2 bg-muted text-muted-foreground rounded text-sm min-h-[44px] touch-manipulation'
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={categoryUsageCount !== null && categoryUsageCount > 0}
                className='flex-1 px-4 py-2 bg-red-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - iOS-style Layout with Scrolling */}
      <div className='flex-1 flex overflow-hidden min-h-0'>
        {/* Services Grid / Custom Card - Now Scrollable */}
        <div className='flex-1 bg-muted/50 overflow-y-auto'>
          <div className='p-4 pb-32'>
            <div className='space-y-4 pb-32'>
              {/* Add Service Button and Search Box - Side by Side */}
              <div className='flex gap-3 items-start'>
                {/* Add Service Button */}
                {!showAddServiceForm && (
                  <button
                    onClick={() => {
                      setShowAddServiceForm(true);
                      setNewServiceCategory(activeTab || '');
                    }}
                    className='flex-shrink-0 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] touch-manipulation whitespace-nowrap'
                  >
                    <span>+</span>
                    <span>Add Service</span>
                  </button>
                )}

                {/* Search Box */}
                <div className='flex-1 relative min-w-0'>
                  <div className='relative'>
                    <svg
                      className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/70'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                      />
                    </svg>
                    <input
                      type='text'
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder='Search services...'
                      className='w-full pl-10 pr-10 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm min-h-[44px] touch-manipulation'
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors'
                        aria-label='Clear search'
                      >
                        <svg
                          className='w-5 h-5'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M6 18L18 6M6 6l12 12'
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Service Form */}
              {showAddServiceForm && (
                <div className='bg-white rounded-lg p-4 shadow-md border-2 border-primary-500 animate-[fadeIn_0.3s_ease-out,slideUp_0.3s_ease-out]'>
                  <h3 className='font-semibold text-foreground mb-3'>
                    Add New Service
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='block text-xs font-medium text-muted-foreground mb-1'>
                        Service Name *
                      </label>
                      <input
                        type='text'
                        value={newServiceName}
                        onChange={e => setNewServiceName(e.target.value)}
                        placeholder='e.g., Hem pants, Take in waist...'
                        className='w-full px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateService();
                          if (e.key === 'Escape') {
                            setShowAddServiceForm(false);
                            setNewServiceName('');
                            setNewServicePrice('');
                            setNewServiceUnit('');
                            setNewServiceEstimatedMinutes(15);
                          }
                        }}
                      />
                    </div>
                    <div className='grid grid-cols-3 gap-3'>
                      <div>
                        <label className='block text-xs font-medium text-muted-foreground mb-1'>
                          Price ($) *
                        </label>
                        <input
                          type='number'
                          step='0.01'
                          min='0'
                          value={newServicePrice}
                          onChange={e => setNewServicePrice(e.target.value)}
                          placeholder='0.00'
                          className='w-full px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-muted-foreground mb-1'>
                          Temps estimé (min)
                        </label>
                        <input
                          type='number'
                          min='1'
                          max='480'
                          step='5'
                          value={newServiceEstimatedMinutes}
                          onChange={e => setNewServiceEstimatedMinutes(parseInt(e.target.value) || 15)}
                          placeholder='15'
                          className='w-full px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-muted-foreground mb-1'>
                          Unit (optional)
                        </label>
                        <input
                          type='text'
                          value={newServiceUnit}
                          onChange={e => setNewServiceUnit(e.target.value)}
                          placeholder='e.g., meter...'
                          maxLength={50}
                          className='w-full px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-xs font-medium text-muted-foreground mb-1'>
                        Category
                      </label>
                      <select
                        value={newServiceCategory}
                        onChange={e => setNewServiceCategory(e.target.value)}
                        className='w-full px-3 py-2 border border-border rounded text-sm min-h-[44px]'
                      >
                        <option value=''>Select category...</option>
                        {categories
                          .filter(c => c.is_active)
                          .map(cat => (
                            <option key={cat.id} value={cat.key}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => {
                          setShowAddServiceForm(false);
                          setNewServiceName('');
                          setNewServicePrice('');
                          setNewServiceCategory('');
                          setNewServiceUnit('');
                          setNewServiceEstimatedMinutes(15);
                        }}
                        className='flex-1 px-4 py-2 bg-muted text-muted-foreground rounded text-sm min-h-[44px] touch-manipulation'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateService}
                        disabled={
                          !newServiceName.trim() || !newServicePrice.trim()
                        }
                        className='flex-1 px-4 py-2 bg-primary-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50'
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Grid */}
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
                {getServicesByCategory(activeTab).map(
                  (service, serviceIndex) => {
                    const isEditing = editingServiceId === service.id;
                    const isFirstService = serviceIndex === 0;
                    const animationDelay = serviceIndex * 0.05; // Stagger animation

                    return (
                      <div
                        key={service.id}
                        className='relative service-context-menu'
                        style={{
                          position: 'relative',
                          zIndex:
                            serviceContextMenuId === service.id ? 60 : 'auto',
                          animation: `fadeIn 0.3s ease-out ${animationDelay}s both`,
                        }}
                      >
                        {isEditing ? (
                          // Inline Edit Mode
                          <div className='bg-white rounded-lg p-3 shadow-md border-2 border-primary-500 flex flex-col h-full animate-[fadeIn_0.3s_ease-out,slideUp_0.3s_ease-out]'>
                            <div className='space-y-2 flex-1'>
                              <div>
                                <label className='block text-xs font-medium text-muted-foreground mb-1'>
                                  Name *
                                </label>
                                <input
                                  type='text'
                                  value={editServiceName}
                                  onChange={e =>
                                    setEditServiceName(e.target.value)
                                  }
                                  className='w-full px-2 py-1.5 border border-border rounded text-xs min-h-[36px]'
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter')
                                      handleSaveEditService();
                                    if (e.key === 'Escape')
                                      handleCancelEditService();
                                  }}
                                />
                              </div>
                              <div className='grid grid-cols-3 gap-2'>
                                <div>
                                  <label className='block text-xs font-medium text-muted-foreground mb-1'>
                                    Price ($) *
                                  </label>
                                  <input
                                    type='number'
                                    step='0.01'
                                    min='0'
                                    value={editServicePrice}
                                    onChange={e =>
                                      setEditServicePrice(e.target.value)
                                    }
                                    className='w-full px-2 py-1.5 border border-border rounded text-xs min-h-[36px]'
                                  />
                                </div>
                                <div>
                                  <label className='block text-xs font-medium text-muted-foreground mb-1'>
                                    Temps (min)
                                  </label>
                                  <input
                                    type='number'
                                    min='1'
                                    max='480'
                                    step='5'
                                    value={editServiceEstimatedMinutes}
                                    onChange={e =>
                                      setEditServiceEstimatedMinutes(parseInt(e.target.value) || 15)
                                    }
                                    className='w-full px-2 py-1.5 border border-border rounded text-xs min-h-[36px]'
                                  />
                                </div>
                                <div>
                                  <label className='block text-xs font-medium text-muted-foreground mb-1'>
                                    Unit
                                  </label>
                                  <input
                                    type='text'
                                    value={editServiceUnit}
                                    onChange={e =>
                                      setEditServiceUnit(e.target.value)
                                    }
                                    placeholder='meter...'
                                    maxLength={50}
                                    className='w-full px-2 py-1.5 border border-border rounded text-xs min-h-[36px]'
                                  />
                                </div>
                              </div>
                              <div>
                                <label className='block text-xs font-medium text-muted-foreground mb-1'>
                                  Category
                                </label>
                                <select
                                  value={editServiceCategory}
                                  onChange={e =>
                                    setEditServiceCategory(e.target.value)
                                  }
                                  className='w-full px-2 py-1.5 border border-border rounded text-xs min-h-[36px]'
                                >
                                  <option value=''>None</option>
                                  {categories
                                    .filter(c => c.is_active)
                                    .map(cat => (
                                      <option key={cat.id} value={cat.key}>
                                        {cat.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                            <div className='flex gap-2 mt-2'>
                              <button
                                onClick={handleCancelEditService}
                                className='flex-1 px-2 py-1.5 bg-muted text-muted-foreground rounded text-xs min-h-[36px] touch-manipulation'
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveEditService}
                                disabled={
                                  !editServiceName.trim() ||
                                  !editServicePrice.trim()
                                }
                                className='flex-1 px-2 py-1.5 bg-green-500 text-white rounded text-xs min-h-[36px] touch-manipulation disabled:opacity-50'
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal Display Mode
                          <div className='relative group bg-white rounded-lg p-3 shadow-sm border border-border hover:shadow-md transition-all duration-200 flex flex-col h-full'>
                            <div className='flex-1'>
                              <div className='flex items-start justify-between mb-1'>
                                <h3 className='font-medium text-foreground text-xs leading-tight line-clamp-2 flex-1 pr-2'>
                                  {service.name}
                                </h3>
                                {/* Context Menu Button */}
                                <button
                                  type='button'
                                  onClick={e => {
                                    e.stopPropagation();
                                    setServiceContextMenuId(
                                      serviceContextMenuId === service.id
                                        ? null
                                        : service.id
                                    );
                                  }}
                                  className='p-1 min-w-[32px] min-h-[32px] flex items-center justify-center text-muted-foreground/70 hover:text-muted-foreground touch-manipulation opacity-40 hover:opacity-100 active:opacity-100 transition-opacity flex-shrink-0'
                                >
                                  <svg
                                    className='w-4 h-4'
                                    fill='currentColor'
                                    viewBox='0 0 20 20'
                                  >
                                    <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
                                  </svg>
                                </button>
                              </div>
                              <p className='text-xs text-muted-foreground mb-2'>
                                Fixed {(service as any).estimated_minutes ? `· ⏱️ ${(service as any).estimated_minutes} min` : ''}
                              </p>
                              <div className='text-right'>
                                <div className='text-sm font-bold text-green-600'>
                                  {formatCurrency(service.base_price_cents)}
                                  {(service as any).unit &&
                                    `/${(service as any).unit}`}
                                </div>
                              </div>
                            </div>

                            {/* Context Menu */}
                            {serviceContextMenuId === service.id && (
                              <div
                                className={`absolute right-0 bg-white border border-border rounded-lg shadow-xl z-[60] min-w-[160px] animate-[fadeIn_0.2s_ease-out,zoomIn_0.2s_ease-out] ${isFirstService
                                  ? 'top-full mt-1'
                                  : 'bottom-full mb-1'
                                  }`}
                                style={{ position: 'absolute' }}
                              >
                                <button
                                  type='button'
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleStartEditService(service.id);
                                  }}
                                  className='w-full px-3 py-2.5 text-left text-xs hover:bg-muted flex items-center gap-2 min-h-[44px] touch-manipulation'
                                >
                                  <span>✏️</span>
                                  <span>Edit Service</span>
                                </button>
                                <button
                                  type='button'
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleCheckServiceUsage(service.id);
                                  }}
                                  className='w-full px-3 py-2.5 text-left text-xs hover:bg-muted flex items-center gap-2 min-h-[44px] touch-manipulation text-red-600'
                                >
                                  <span>🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}

                            {data.length > 0 && (
                              <div className='mt-auto pt-2'>
                                {(() => {
                                  // Only show button for the active garment
                                  const garment = data[activeGarmentIndex];
                                  if (!garment) return null;

                                  const garmentService = garment.services.find(
                                    s => s.serviceId === service.id
                                  );
                                  const isAdded = !!garmentService;

                                  return (
                                    <button
                                      onClick={() => {
                                        if (isAdded) {
                                          updateServiceQuantity(
                                            activeGarmentIndex,
                                            service.id,
                                            (garmentService?.qty || 0) + 1
                                          );
                                        } else {
                                          addServiceToGarment(
                                            activeGarmentIndex,
                                            service.id
                                          );
                                        }
                                      }}
                                      className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ${isAdded
                                        ? 'bg-gradient-to-r from-primary-500 to-accent-clay text-white shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                      {isAdded
                                        ? `✓ Add to #${activeGarmentIndex + 1} (${garmentService?.qty || 0})`
                                        : `+ Add to #${activeGarmentIndex + 1}`}
                                    </button>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {getServicesByCategory(activeTab).length === 0 &&
                !showAddServiceForm && (
                  <div className='text-center py-12'>
                    <div className='text-6xl mb-4'>📝</div>
                    <h3 className='text-lg font-medium text-foreground mb-2'>
                      {searchTerm
                        ? 'No services found'
                        : 'No services available'}
                    </h3>
                    <p className='text-muted-foreground'>
                      {searchTerm
                        ? 'Try a different search term or clear the search'
                        : 'Try selecting a different category or add a new service'}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className='mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors'
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                )}

              {/* Delete Service Confirmation Modal */}
              {deleteServiceConfirmId && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]'>
                  <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-[fadeIn_0.2s_ease-out,zoomIn_0.2s_ease-out]'>
                    <h3 className='text-lg font-semibold mb-4'>
                      Delete Service?
                    </h3>
                    <p className='text-sm text-muted-foreground mb-2'>
                      Are you sure you want to delete this service?
                    </p>
                    {serviceUsageCount !== null && (
                      <p className='text-sm text-muted-foreground mb-4'>
                        {serviceUsageCount > 0 ? (
                          <span className='text-red-600 font-semibold'>
                            This service is used in {serviceUsageCount}{' '}
                            garment(s). Cannot delete.
                          </span>
                        ) : (
                          <span className='text-green-600'>
                            This service is not used in any garments. Safe to
                            delete.
                          </span>
                        )}
                      </p>
                    )}
                    <div className='flex gap-2'>
                      <button
                        onClick={() => {
                          setDeleteServiceConfirmId(null);
                          setServiceUsageCount(null);
                        }}
                        className='flex-1 px-4 py-2 bg-muted text-muted-foreground rounded text-sm min-h-[44px] touch-manipulation'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteService}
                        disabled={
                          serviceUsageCount !== null && serviceUsageCount > 0
                        }
                        className='flex-1 px-4 py-2 bg-red-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Zip Selection Modal */}
              {showZipModal && pendingService && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]'>
                  <div className='bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col animate-[fadeIn_0.2s_ease-out,zoomIn_0.2s_ease-out]'>
                    <h3 className='text-lg font-semibold mb-2'>
                      Select Zip Type
                    </h3>
                    {(() => {
                      const mainService = services.find(
                        s => s.id === pendingService.serviceId
                      );
                      return (
                        mainService && (
                          <p className='text-sm text-muted-foreground mb-4'>
                            Service:{' '}
                            <span className='font-medium'>
                              {mainService.name}
                            </span>
                          </p>
                        )
                      );
                    })()}

                    <div className='flex-1 overflow-y-auto mb-4 min-h-0'>
                      <div className='space-y-2'>
                        {getZipServices().map(zipService => (
                          <button
                            key={zipService.id}
                            onClick={() =>
                              setSelectedZipService(
                                selectedZipService === zipService.id
                                  ? null
                                  : zipService.id
                              )
                            }
                            className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 ${selectedZipService === zipService.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-border bg-white hover:border-border hover:bg-accent'
                              }`}
                          >
                            <div className='flex items-center justify-between'>
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-medium text-foreground'>
                                  {zipService.name}
                                </p>
                                <p className='text-xs text-muted-foreground mt-0.5'>
                                  {(zipService as any).unit &&
                                    `Unit: ${(zipService as any).unit}`}
                                </p>
                              </div>
                              <div className='ml-3 flex items-center gap-2'>
                                <span className='text-sm font-bold text-green-600'>
                                  {formatCurrency(zipService.base_price_cents)}
                                  {(zipService as any).unit &&
                                    `/${(zipService as any).unit}`}
                                </span>
                                {selectedZipService === zipService.id && (
                                  <svg
                                    className='w-5 h-5 text-primary-500'
                                    fill='currentColor'
                                    viewBox='0 0 20 20'
                                  >
                                    <path
                                      fillRule='evenodd'
                                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                      clipRule='evenodd'
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className='flex gap-2 pt-4 border-t border-border'>
                      <button
                        onClick={() => {
                          setShowZipModal(false);
                          setPendingService(null);
                          setSelectedZipService(null);
                        }}
                        className='flex-1 px-4 py-2 bg-muted text-muted-foreground rounded text-sm min-h-[44px] touch-manipulation'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleZipSelection(null)}
                        className='flex-1 px-4 py-2 bg-muted text-muted-foreground rounded text-sm min-h-[44px] touch-manipulation hover:bg-muted'
                      >
                        Don't Include Zip
                      </button>
                      <button
                        onClick={() =>
                          handleZipSelection(selectedZipService || null)
                        }
                        disabled={!selectedZipService}
                        className='flex-1 px-4 py-2 bg-primary-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600'
                      >
                        Add {selectedZipService ? 'with Zip' : 'Service'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* iOS-style Selected Services Summary - Also Scrollable */}
        <div className='w-80 bg-white border-l border-border flex flex-col h-full'>
          <div className='p-4 border-b border-border flex-shrink-0'>
            <h3 className='font-semibold text-foreground'>Selected Services</h3>
            <div className='mt-2 p-3 bg-green-50 rounded-lg'>
              <div className='flex justify-between items-center'>
                <span className='font-semibold text-foreground'>Total</span>
                <span className='text-xl font-bold text-green-600'>
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>
          </div>

          <div className='flex-1 overflow-y-auto min-h-0'>
            {data.some(garment => garment.services.length > 0) ? (
              <div className='p-4 space-y-4'>
                {data.map((garment, garmentIndex) => {
                  if (garment.services.length === 0) return null;

                  return (
                    <div
                      key={garmentIndex}
                      className='bg-muted/50 rounded-lg p-3'
                    >
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
                          <span className='text-sm'>👕</span>
                        </div>
                        <div>
                          <h4 className='font-medium text-sm text-foreground'>
                            {garment.type}
                          </h4>
                          <p className='text-xs text-muted-foreground'>
                            #{garment.labelCode}
                          </p>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        {garment.services.map(garmentService => {
                          const service = services.find(
                            s => s.id === garmentService.serviceId
                          );
                          const isCustomService =
                            garmentService.serviceId.startsWith('custom-');

                          if (!service && !isCustomService) return null;

                          return (
                            <div
                              key={garmentService.serviceId}
                              className='bg-white rounded-lg p-3 border border-border'
                            >
                              <div className='flex items-start justify-between mb-2'>
                                <div className='flex-1 pr-2'>
                                  <h5 className='font-medium text-sm text-foreground'>
                                    {isCustomService
                                      ? garmentService.customServiceName
                                      : service?.name}
                                  </h5>
                                  {/* Editable price */}
                                  {editingPriceKey === `${garmentIndex}-${garmentService.serviceId}` ? (
                                    <div className='flex items-center gap-1 mt-1'>
                                      <span className='text-xs text-muted-foreground'>$</span>
                                      <input
                                        type='number'
                                        step='0.01'
                                        min='0'
                                        value={editPriceValue}
                                        onChange={e => setEditPriceValue(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSavePriceEdit(garmentIndex, garmentService.serviceId);
                                          if (e.key === 'Escape') handleCancelPriceEdit();
                                        }}
                                        className='w-20 px-1 py-0.5 border border-primary-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500'
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSavePriceEdit(garmentIndex, garmentService.serviceId)}
                                        className='p-1 text-green-600 hover:text-green-700'
                                        title='Save'
                                      >
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={handleCancelPriceEdit}
                                        className='p-1 text-muted-foreground/70 hover:text-muted-foreground'
                                        title='Cancel'
                                      >
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleStartPriceEdit(
                                        garmentIndex,
                                        garmentService.serviceId,
                                        garmentService.customPriceCents || service?.base_price_cents || 0
                                      )}
                                      className='text-xs text-muted-foreground hover:text-primary-600 hover:underline cursor-pointer flex items-center gap-1 group'
                                    >
                                      {formatCurrency(
                                        garmentService.customPriceCents ||
                                        service?.base_price_cents ||
                                        0
                                      )}{' '}
                                      each
                                      <svg className='w-3 h-3 opacity-40 group-hover:opacity-100 group-active:opacity-100 transition-opacity' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    removeServiceFromGarment(
                                      garmentIndex,
                                      garmentService.serviceId
                                    )
                                  }
                                  className='text-muted-foreground/70 hover:text-red-500 transition-colors'
                                >
                                  <svg
                                    className='w-4 h-4'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M6 18L18 6M6 6l12 12'
                                    />
                                  </svg>
                                </button>
                              </div>

                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                  <button
                                    onClick={() =>
                                      updateServiceQuantity(
                                        garmentIndex,
                                        garmentService.serviceId,
                                        garmentService.qty - 1
                                      )
                                    }
                                    className='w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors'
                                  >
                                    <svg
                                      className='w-3 h-3'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M20 12H4'
                                      />
                                    </svg>
                                  </button>
                                  <span className='w-8 text-center font-medium text-sm'>
                                    {garmentService.qty}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateServiceQuantity(
                                        garmentIndex,
                                        garmentService.serviceId,
                                        garmentService.qty + 1
                                      )
                                    }
                                    className='w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors'
                                  >
                                    <svg
                                      className='w-3 h-3'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                                      />
                                    </svg>
                                  </button>
                                </div>
                                <div className='font-semibold text-foreground'>
                                  {formatCurrency(
                                    (garmentService.customPriceCents ||
                                      service?.base_price_cents ||
                                      0) * garmentService.qty
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='p-8 text-center'>
                <div className='text-6xl mb-4'>🛍️</div>
                <h3 className='text-lg font-medium text-foreground mb-2'>
                  No services selected
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Choose services from the list to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
