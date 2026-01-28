'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingLogo } from '@/components/ui/loading-logo';

interface WorkListExportProps {
  onExportComplete?: () => void;
}

export function WorkListExport({ onExportComplete }: WorkListExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'alterations', label: 'Alterations' },
    { value: 'projects', label: 'Projects' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'fabrics', label: 'Fabrics' },
    { value: 'curtains', label: 'Curtains' },
    { value: 'custom', label: 'Custom' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
      });

      const response = await fetch(`/api/admin/worklist-export?${params}`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Download the CSV file
        const blob = new Blob([data.csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success message
        alert(
          `Work list exported successfully!\n\nTotal orders: ${data.workList.totalOrders}\nFilename: ${data.filename}`
        );

        if (onExportComplete) {
          onExportComplete();
        }
      } else {
        throw new Error(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (isExporting) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-card rounded-lg p-6 max-w-sm w-full mx-4'>
          <div className='text-center'>
            <LoadingLogo size='lg' text='Generating work list...' />
            <p className='text-sm text-muted-foreground mt-4'>
              Please wait while we generate your work list...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-lg p-4 shadow-sm border border-border'>
      <h3 className='text-lg font-semibold text-foreground mb-4'>
        Export Work List
      </h3>

      <div className='space-y-4'>
        {/* Category Filter */}
        <div>
          <label
            htmlFor='export-category'
            className='block text-sm font-medium text-foreground mb-2'
          >
            Category Filter
          </label>
          <select
            id='export-category'
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className='w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm'
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200'
        >
          📊 Export Working Tasks
        </Button>
      </div>
    </div>
  );
}
