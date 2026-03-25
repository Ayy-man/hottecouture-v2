'use client';

import { useState, useEffect, useCallback } from 'react';
import { RACK_CONFIG } from '@/lib/config/production';
import { useTranslations } from 'next-intl';

interface RackGridPickerProps {
  orderId: string;
  orderNumber: number;
  currentPosition: string | null;
  disabled?: boolean;
  onPositionChange: (position: string | null) => void;
}

interface OccupancyEntry {
  orderId: string;
  orderNumber: number;
}

export function RackGridPicker({
  orderId,
  orderNumber,
  currentPosition,
  disabled = false,
  onPositionChange,
}: RackGridPickerProps) {
  const t = useTranslations('board.modal');
  const [occupancy, setOccupancy] = useState<Record<string, OccupancyEntry>>({});
  const [saving, setSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Derive rows and columns from RACK_CONFIG
  const rows = [...new Set(RACK_CONFIG.positions.map((p: string) => p.charAt(0)))];
  const cols = [...new Set(RACK_CONFIG.positions.map((p: string) => parseInt(p.slice(1))))].sort(
    (a: number, b: number) => a - b
  );

  const fetchOccupancy = useCallback(async () => {
    try {
      const res = await fetch('/api/rack-occupancy');
      if (res.ok) {
        const data = await res.json();
        setOccupancy(data.occupancy || {});
      }
    } catch (err) {
      console.error('Error fetching rack occupancy:', err);
    }
  }, []);

  useEffect(() => {
    fetchOccupancy();
  }, [orderId, fetchOccupancy]);

  const savePosition = async (position: string | null) => {
    setSaving(true);
    try {
      await fetch(`/api/order/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rack_position: position }),
      });
      onPositionChange(position);
      await fetchOccupancy();
    } catch (err) {
      console.error('Error saving rack position:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCellClick = async (position: string) => {
    if (disabled || saving) return;

    const existing = occupancy[position];

    if (position === currentPosition) {
      // Unassign current position
      await savePosition(null);
    } else if (!existing) {
      // Empty cell: assign immediately
      await savePosition(position);
    } else {
      // Occupied by a different order: confirm before reassigning
      const confirmed = window.confirm(
        t('rackReassignConfirm', { position, orderNumber: existing.orderNumber })
      );
      if (confirmed) {
        // First clear the other order's position
        await fetch(`/api/order/${existing.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rack_position: null }),
        });
        // Then assign to current order
        await savePosition(position);
      }
    }
  };

  const handleCustomSave = async () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    setShowCustomInput(false);
    setCustomValue('');
    await savePosition(trimmed);
  };

  const getCellStyle = (position: string): string => {
    const isSelected = position === currentPosition;
    const isOccupied = !!occupancy[position] && occupancy[position].orderId !== orderId;
    const baseStyle =
      'w-10 h-10 rounded-md text-xs font-medium transition-colors flex items-center justify-center';

    if (isSelected) {
      return `${baseStyle} bg-blue-600 text-white`;
    }
    if (isOccupied) {
      return `${baseStyle} bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300`;
    }
    return `${baseStyle} bg-gray-50 hover:bg-blue-50 text-gray-600 border border-gray-200`;
  };

  const getCellLabel = (position: string): string => {
    const isSelected = position === currentPosition;
    const existing = occupancy[position];
    if (!isSelected && existing) {
      return `#${existing.orderNumber}`;
    }
    return position;
  };

  const gridDisabled = disabled || saving;

  return (
    <div className='space-y-3'>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${cols.length}, 40px)`,
          gap: '4px',
        }}
      >
        {/* Top-left corner cell */}
        <div />
        {/* Column headers */}
        {cols.map((col: number) => (
          <div
            key={col}
            className='w-10 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium'
          >
            {col}
          </div>
        ))}

        {/* Data rows */}
        {rows.map((row: string) => (
          <>
            {/* Row header */}
            <div
              key={`row-${row}`}
              className='flex items-center justify-center text-xs font-medium text-muted-foreground w-6'
            >
              {row}
            </div>
            {/* Cells */}
            {cols.map((col: number) => {
              const position = `${row}${col}`;
              return (
                <button
                  key={position}
                  type='button'
                  className={`${getCellStyle(position)} ${gridDisabled ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleCellClick(position)}
                  disabled={gridDisabled}
                  title={position}
                >
                  {getCellLabel(position)}
                </button>
              );
            })}
          </>
        ))}
      </div>

      {/* Custom entry link */}
      {!showCustomInput ? (
        <button
          type='button'
          className='text-xs text-blue-600 hover:text-blue-700 underline'
          onClick={() => setShowCustomInput(true)}
          disabled={gridDisabled}
        >
          {t('rackCustomEntry')}
        </button>
      ) : (
        <div className='flex items-center gap-2'>
          <input
            type='text'
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={t('rackPlaceholder')}
            className='w-24 px-2 py-1 border border-border rounded-md text-sm focus:ring-2 focus:ring-blue-500'
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSave();
              if (e.key === 'Escape') {
                setShowCustomInput(false);
                setCustomValue('');
              }
            }}
          />
          <button
            type='button'
            onClick={handleCustomSave}
            disabled={!customValue.trim()}
            className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md disabled:opacity-50'
          >
            {t('ok')}
          </button>
          <button
            type='button'
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue('');
            }}
            className='text-xs text-muted-foreground hover:text-foreground'
          >
            ✕
          </button>
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <p className='text-xs text-blue-600'>{t('saving')}</p>
      )}
    </div>
  );
}
