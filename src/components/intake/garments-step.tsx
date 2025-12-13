'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { nanoid } from 'nanoid';

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

interface Garment {
  type: string;
  garment_type_id?: string | null;
  color?: string;
  brand?: string;
  notes?: string;
  labelCode: string;
  services: Array<{
    serviceId: string;
    qty: number;
    customPriceCents?: number;
  }>;
}

interface GarmentsStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function GarmentsStep({
  data,
  onUpdate,
  onNext,
  onPrev,
}: GarmentsStepProps) {
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [groupedTypes, setGroupedTypes] = useState<
    Record<string, GarmentType[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [currentGarment, setCurrentGarment] = useState<Partial<Garment>>({
    type: '',
    garment_type_id: null,
    notes: '',
    labelCode: nanoid(8).toUpperCase(),
    services: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Custom dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeCategory, setCustomTypeCategory] = useState('other');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);

  // Load garment types from API
  const loadGarmentTypes = async () => {
    try {
      // Add cache-busting to prevent stale data in production
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGarmentTypes();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.garment-type-dropdown')) {
        setIsDropdownOpen(false);
        setContextMenuId(null);
        setShowAddCustomForm(false);
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

  const addGarment = () => {
    if (!currentGarment.type || !currentGarment.garment_type_id) return;

    const newGarment: Garment = {
      type: currentGarment.type,
      garment_type_id: currentGarment.garment_type_id,
      notes: currentGarment.notes || '',
      labelCode: currentGarment.labelCode || nanoid(8).toUpperCase(),
      services: [],
    };

    onUpdate([...data, newGarment]);
    setCurrentGarment({
      type: '',
      notes: '',
      labelCode: nanoid(8).toUpperCase(),
      services: [],
    });
    setShowAddForm(false);
    if (data.length === 0) {
      setTimeout(() => onNext(), 300);
    }
  };

  const handleGarmentTypeChange = (garmentTypeId: string) => {
    const selectedType = garmentTypes.find(gt => gt.id === garmentTypeId);
    if (selectedType) {
      setCurrentGarment(prev => ({
        ...prev,
        type: selectedType.name,
        garment_type_id: selectedType.id,
      }));
    }
  };

  const removeGarment = (index: number) => {
    const updatedGarments = data.filter((_, i) => i !== index);
    onUpdate(updatedGarments);
  };

  const updateGarmentField = (field: keyof Garment, value: any) => {
    setCurrentGarment(prev => ({ ...prev, [field]: value }));
  };

  // Handle creating custom garment type
  const handleCreateCustomType = async () => {
    if (!customTypeName.trim()) return;

    try {
      const response = await fetch('/api/admin/garment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customTypeName.trim(),
          category: customTypeCategory,
          icon: '📝',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to create custom garment type');
        return;
      }

      // Reload garment types
      await loadGarmentTypes();

      // Select the newly created type
      if (result.garmentType) {
        handleGarmentTypeChange(result.garmentType.id);
      }

      // Reset form
      setCustomTypeName('');
      setCustomTypeCategory('other');
      setShowAddCustomForm(false);
    } catch (error) {
      console.error('Error creating custom type:', error);
      alert('Failed to create custom garment type');
    }
  };

  // Handle editing garment type
  const handleStartEdit = (typeId: string) => {
    const type = garmentTypes.find(t => t.id === typeId);
    if (type) {
      setEditingTypeId(typeId);
      setEditName(type.name);
      setContextMenuId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTypeId || !editName.trim()) return;

    try {
      const response = await fetch('/api/admin/garment-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTypeId,
          name: editName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to update garment type');
        return;
      }

      // Update state directly with the updated garment type
      if (result.garmentType) {
        setGarmentTypes(prevTypes =>
          prevTypes.map(type =>
            type.id === editingTypeId ? result.garmentType : type
          )
        );

        // Update groupedTypes
        setGroupedTypes(prevGrouped => {
          const newGrouped = { ...prevGrouped };
          Object.keys(newGrouped).forEach(category => {
            newGrouped[category] = newGrouped[category]!.map(type =>
              type.id === editingTypeId ? result.garmentType : type
            );
          });
          return newGrouped;
        });

        // Update current selection if it was the edited type
        if (currentGarment.garment_type_id === editingTypeId) {
          setCurrentGarment(prev => ({
            ...prev,
            type: editName.trim(),
          }));
        }
      } else {
        // Fallback: reload if response doesn't include garmentType
        await loadGarmentTypes();
      }

      setEditingTypeId(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating type:', error);
      alert('Failed to update garment type');
    }
  };

  const handleCancelEdit = () => {
    setEditingTypeId(null);
    setEditName('');
  };

  // Handle deleting garment type
  const handleCheckUsage = async (typeId: string) => {
    try {
      const response = await fetch(
        `/api/admin/garment-types?usage=true&id=${typeId}`
      );
      const result = await response.json();

      if (response.ok) {
        setUsageCount(result.usageCount || 0);
        setDeleteConfirmId(typeId);
        setContextMenuId(null);
      }
    } catch (error) {
      console.error('Error checking usage:', error);
    }
  };

  const handleDeleteType = async () => {
    if (!deleteConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/garment-types?id=${deleteConfirmId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.message || result.error || 'Failed to delete garment type'
        );
        setDeleteConfirmId(null);
        setUsageCount(null);
        return;
      }

      // Remove the deleted garment type from state directly
      // Check if deleted type was selected before removing from state
      const wasSelected = currentGarment.garment_type_id === deleteConfirmId;

      setGarmentTypes(prevTypes =>
        prevTypes.filter(type => type.id !== deleteConfirmId)
      );

      // Update groupedTypes
      setGroupedTypes(prevGrouped => {
        const newGrouped = { ...prevGrouped };
        Object.keys(newGrouped).forEach(category => {
          newGrouped[category] = newGrouped[category]!.filter(
            type => type.id !== deleteConfirmId
          );
        });
        return newGrouped;
      });

      // Clear selection if deleted type was selected
      if (wasSelected) {
        setCurrentGarment(prev => ({
          ...prev,
          type: '',
          garment_type_id: null,
        }));
      }

      setDeleteConfirmId(null);
      setUsageCount(null);
    } catch (error) {
      console.error('Error deleting type:', error);
      alert('Failed to delete garment type');
    }
  };

  // Get custom types count
  const customTypesCount = garmentTypes.filter(
    t => t.is_custom && t.is_active !== false
  ).length;

  if (loading) {
    return (
      <div className='h-full flex flex-col overflow-hidden min-h-0'>
        <div className='flex items-center justify-between px-1 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
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
            <h2 className='text-lg font-semibold text-gray-900'>
              Add Garments
            </h2>
            <p className='text-sm text-gray-500'>Loading garment types...</p>
          </div>
          <Button
            onClick={onNext}
            disabled={true}
            className='bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Next
          </Button>
        </div>
        <div className='flex-1 overflow-y-auto min-h-0 flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading garment types...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header with Navigation */}
      <div className='flex items-center justify-between px-1 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
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
          <h2 className='text-lg font-semibold text-gray-900'>Add Garments</h2>
          <p className='text-sm text-gray-500'>
            Add garments that need alterations or custom work
          </p>
        </div>

        <Button
          onClick={onNext}
          disabled={data.length === 0}
          className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          Next
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 space-y-4'>
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className='w-full btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm py-2'
            >
              Add Garment
            </Button>
          ) : (
            <div className='space-y-3 p-3 border border-gray-200 rounded-lg'>
              <div className='garment-type-dropdown'>
                <label
                  htmlFor='garmentType'
                  className='block text-sm font-medium mb-1'
                >
                  Garment Type *
                </label>
                <div className='relative'>
                  {/* Custom Dropdown Button */}
                  <button
                    type='button'
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className='w-full px-3 py-3 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-left transition-all duration-200 hover:border-gray-400 touch-manipulation min-h-[44px] flex items-center justify-between'
                  >
                    <span className='truncate'>
                      {currentGarment.garment_type_id
                        ? `${garmentTypes.find(gt => gt.id === currentGarment.garment_type_id)?.icon || ''} ${currentGarment.type || 'Choose a garment type...'}`
                        : 'Choose a garment type...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>

                  {/* Custom Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className='absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-[400px] overflow-y-auto overflow-x-visible'>
                      {/* Garment Types List */}
                      {Object.entries(groupedTypes).map(([category, types]) => {
                        const activeTypes = types
                          .filter(type => type.is_active !== false)
                          .sort((a, b) => a.name.localeCompare(b.name));

                        if (activeTypes.length === 0) return null;

                        return (
                          <div key={category}>
                            {/* Category Header */}
                            <div className='px-3 py-2 bg-gray-100 text-xs font-semibold text-gray-700 sticky top-0'>
                              {category.charAt(0).toUpperCase() +
                                category.slice(1).replace('_', ' ')}
                            </div>

                            {/* Types in Category */}
                            {activeTypes.map((type, typeIndex) => {
                              const isEditing = editingTypeId === type.id;
                              const isSelected =
                                currentGarment.garment_type_id === type.id;
                              const isFirstItem = typeIndex === 0;

                              return (
                                <div
                                  key={type.id}
                                  className={`relative group hover:bg-gray-50 ${
                                    isSelected ? 'bg-primary-50' : ''
                                  }`}
                                  style={{
                                    position: 'relative',
                                    zIndex:
                                      contextMenuId === type.id ? 60 : 'auto',
                                  }}
                                >
                                  {isEditing ? (
                                    // Inline Edit Mode
                                    <div className='px-3 py-3 flex items-center gap-2'>
                                      <input
                                        type='text'
                                        value={editName}
                                        onChange={e =>
                                          setEditName(e.target.value)
                                        }
                                        className='flex-1 px-2 py-2 border border-gray-300 rounded text-sm min-h-[44px]'
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter')
                                            handleSaveEdit();
                                          if (e.key === 'Escape')
                                            handleCancelEdit();
                                        }}
                                      />
                                      <button
                                        onClick={handleSaveEdit}
                                        className='px-3 py-2 bg-green-500 text-white rounded text-sm min-h-[44px] touch-manipulation'
                                        disabled={!editName.trim()}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className='px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm min-h-[44px] touch-manipulation'
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    // Normal Display Mode
                                    <div className='flex items-center justify-between px-3 py-3 min-h-[44px]'>
                                      <button
                                        type='button'
                                        onClick={() => {
                                          handleGarmentTypeChange(type.id);
                                          setIsDropdownOpen(false);
                                        }}
                                        className='flex-1 text-left flex items-center gap-2'
                                      >
                                        <span>{type.icon}</span>
                                        <span className='text-sm'>
                                          {type.name}
                                          {type.is_custom && (
                                            <span className='ml-1 text-xs text-gray-500'>
                                              ✨
                                            </span>
                                          )}
                                        </span>
                                      </button>

                                      {/* Context Menu Button */}
                                      <button
                                        type='button'
                                        onClick={e => {
                                          e.stopPropagation();
                                          setContextMenuId(
                                            contextMenuId === type.id
                                              ? null
                                              : type.id
                                          );
                                        }}
                                        className='p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 touch-manipulation'
                                      >
                                        <svg
                                          className='w-5 h-5'
                                          fill='currentColor'
                                          viewBox='0 0 20 20'
                                        >
                                          <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
                                        </svg>
                                      </button>

                                      {/* Context Menu */}
                                      {contextMenuId === type.id && (
                                        <div
                                          className={`absolute right-0 bg-white border border-gray-300 rounded-lg shadow-xl z-[60] min-w-[180px] ${
                                            isFirstItem
                                              ? 'top-full mt-1'
                                              : 'bottom-full mb-1'
                                          }`}
                                          style={{ position: 'absolute' }}
                                        >
                                          <button
                                            type='button'
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleStartEdit(type.id);
                                            }}
                                            className='w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center gap-2 min-h-[44px] touch-manipulation'
                                          >
                                            <span>✏️</span>
                                            <span>Edit Name</span>
                                          </button>
                                          <button
                                            type='button'
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleCheckUsage(type.id);
                                            }}
                                            className='w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center gap-2 min-h-[44px] touch-manipulation text-red-600'
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
                          </div>
                        );
                      })}

                      {/* Add Custom Type Section */}
                      <div className='border-t border-gray-200'>
                        {showAddCustomForm ? (
                          <div className='p-3 space-y-2 bg-gray-50'>
                            <input
                              type='text'
                              value={customTypeName}
                              onChange={e => setCustomTypeName(e.target.value)}
                              placeholder='Custom garment type name...'
                              className='w-full px-3 py-2 border border-gray-300 rounded text-sm min-h-[44px]'
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleCreateCustomType();
                                if (e.key === 'Escape') {
                                  setShowAddCustomForm(false);
                                  setCustomTypeName('');
                                }
                              }}
                            />
                            <select
                              value={customTypeCategory}
                              onChange={e =>
                                setCustomTypeCategory(e.target.value)
                              }
                              className='w-full px-3 py-2 border border-gray-300 rounded text-sm min-h-[44px]'
                            >
                              <option value='other'>Other</option>
                              <option value='home'>Home</option>
                              <option value='outdoor'>Outdoor</option>
                              <option value='womens'>Women's</option>
                              <option value='mens'>Men's</option>
                              <option value='outerwear'>Outerwear</option>
                              <option value='formal'>Formal</option>
                              <option value='activewear'>Activewear</option>
                            </select>
                            <div className='flex gap-2'>
                              <button
                                onClick={() => {
                                  setShowAddCustomForm(false);
                                  setCustomTypeName('');
                                }}
                                className='flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm min-h-[44px] touch-manipulation'
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleCreateCustomType}
                                disabled={
                                  !customTypeName.trim() ||
                                  customTypesCount >= 10
                                }
                                className='flex-1 px-3 py-2 bg-primary-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50'
                              >
                                Create
                              </button>
                            </div>
                            {customTypesCount >= 10 && (
                              <p className='text-xs text-red-600'>
                                Maximum 10 custom types reached
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            type='button'
                            onClick={() => setShowAddCustomForm(true)}
                            disabled={customTypesCount >= 10}
                            className='w-full px-3 py-3 text-left text-sm text-primary-600 hover:bg-gray-50 flex items-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <span>+</span>
                            <span>Add Custom Type...</span>
                            {customTypesCount >= 10 && (
                              <span className='ml-auto text-xs text-red-600'>
                                (Limit reached)
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  {deleteConfirmId && (
                    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                      <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
                        <h3 className='text-lg font-semibold mb-4'>
                          Delete Garment Type?
                        </h3>
                        <p className='text-sm text-gray-600 mb-2'>
                          Are you sure you want to delete this garment type?
                        </p>
                        {usageCount !== null && (
                          <p className='text-sm text-gray-600 mb-4'>
                            {usageCount > 0 ? (
                              <span className='text-red-600 font-semibold'>
                                This type is used in {usageCount} order(s).
                                Cannot delete.
                              </span>
                            ) : (
                              <span className='text-green-600'>
                                This type is not used in any orders. Safe to
                                delete.
                              </span>
                            )}
                          </p>
                        )}
                        <div className='flex gap-2'>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(null);
                              setUsageCount(null);
                            }}
                            className='flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm min-h-[44px] touch-manipulation'
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteType}
                            disabled={usageCount !== null && usageCount > 0}
                            className='flex-1 px-4 py-2 bg-red-500 text-white rounded text-sm min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {currentGarment.garment_type_id && (
                  <div className='mt-1 text-xs text-green-600 flex items-center'>
                    <svg
                      className='w-3 h-3 mr-1'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Garment type selected
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor='labelCode'
                  className='block text-xs font-medium mb-1'
                >
                  Label Code
                </label>
                <input
                  id='labelCode'
                  type='text'
                  value={currentGarment.labelCode}
                  readOnly
                  className='w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 min-h-[36px] text-sm'
                  placeholder='Auto-generated'
                />
                <p className='text-xs text-gray-500 mt-1'>
                  This code will be used to identify the garment
                </p>
              </div>

              <div>
                <label
                  htmlFor='garmentNotes'
                  className='block text-xs font-medium mb-1'
                >
                  Notes
                </label>
                <textarea
                  id='garmentNotes'
                  value={currentGarment.notes}
                  onChange={e => updateGarmentField('notes', e.target.value)}
                  rows={2}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px] text-sm touch-manipulation'
                  placeholder='Special instructions, damage notes, etc.'
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => setShowAddForm(false)}
                  className='flex-1 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 text-sm py-2'
                >
                  Cancel
                </Button>
                <Button
                  onClick={addGarment}
                  disabled={
                    !currentGarment.type || !currentGarment.garment_type_id
                  }
                  className='flex-1 btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2'
                >
                  Add Garment
                </Button>
              </div>
            </div>
          )}

          {data.length > 0 && (
            <div className='space-y-2'>
              <h3 className='font-medium text-sm'>
                Added Garments ({data.length})
              </h3>
              {data.map((garment, index) => {
                return (
                  <div key={index} className='p-3 bg-gray-50 rounded-lg'>
                    <div className='space-y-1'>
                      <div className='flex items-center space-x-2'>
                        {garment.garment_type_id && (
                          <span className='text-sm'>
                            {garmentTypes.find(
                              gt => gt.id === garment.garment_type_id
                            )?.icon || '👕'}
                          </span>
                        )}
                        <div className='font-medium text-gray-900 text-sm'>
                          {garment.type}
                        </div>
                      </div>
                      <div className='text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded'>
                        #{garment.labelCode}
                      </div>
                      {garment.color && (
                        <div className='text-xs text-gray-500'>
                          <span className='font-medium'>Color:</span>{' '}
                          {garment.color}
                        </div>
                      )}
                      {garment.brand && (
                        <div className='text-xs text-gray-500'>
                          <span className='font-medium'>Brand:</span>{' '}
                          {garment.brand}
                        </div>
                      )}
                      {garment.notes && (
                        <div className='text-xs text-gray-500 italic'>
                          <span className='font-medium'>Notes:</span>{' '}
                          {garment.notes}
                        </div>
                      )}
                      <div className='pt-1'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => removeGarment(index)}
                          className='btn-press bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-red-300 text-xs px-2 py-1'
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
