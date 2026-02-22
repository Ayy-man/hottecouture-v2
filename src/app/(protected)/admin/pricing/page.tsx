'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Download as DownloadIcon,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

export default function PricingManagementPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [csvData, setCsvData] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Service management state
  interface ServiceRow {
    id: string;
    code: string;
    name: string;
    category: string | null;
    base_price_cents: number;
    estimated_minutes: number;
    is_active: boolean;
    is_custom: boolean;
  }
  const [servicesList, setServicesList] = useState<ServiceRow[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', estimated_minutes: '' });
  const [deletingService, setDeletingService] = useState<string | null>(null);

  const fetchServicesList = async () => {
    setLoadingServices(true);
    try {
      const response = await fetch('/api/admin/services');
      if (response.ok) {
        const data = await response.json();
        setServicesList(data.services || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchServicesList();
  }, []);

  const handleStartEdit = (service: ServiceRow) => {
    setEditingService(service.id);
    setEditForm({
      name: service.name,
      price: (service.base_price_cents / 100).toFixed(2),
      category: service.category || '',
      estimated_minutes: String(service.estimated_minutes || 15),
    });
  };

  const handleSaveEdit = async (serviceId: string) => {
    try {
      const response = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: serviceId,
          name: editForm.name,
          price: parseFloat(editForm.price),
          category: editForm.category || null,
          estimated_minutes: parseInt(editForm.estimated_minutes) || 15,
        }),
      });
      if (response.ok) {
        setEditingService(null);
        await fetchServicesList();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      alert('Failed to update service');
    }
  };

  const handleExportService = (service: ServiceRow) => {
    const csvContent = [
      'Name,Category,Price,Minutes,Code',
      `"${service.name}","${service.category || ''}",${(service.base_price_cents / 100).toFixed(2)},${service.estimated_minutes},"${service.code}"`,
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-${service.code}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteService = async (serviceId: string) => {
    setDeletingService(serviceId);
    try {
      const usageRes = await fetch(`/api/admin/services?id=${serviceId}&usage=true`);
      const usageData = await usageRes.json();
      if (!usageData.canDelete) {
        alert(`Ce service est utilise dans ${usageData.usageCount} commande(s). Retirez-le des commandes avant de supprimer.`);
        return;
      }
      const response = await fetch(`/api/admin/services?id=${serviceId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchServicesList();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    } finally {
      setDeletingService(null);
    }
  };

  const handleImport = async (type: 'sample' | 'csv' | 'json') => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const requestData: any = { type, replaceExisting };

      if (type === 'csv') {
        requestData.data = csvData;
      }

      const response = await fetch('/api/pricing/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      setImportResult(result);
      if (result.success) {
        await fetchServicesList();
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [`Import failed: ${error}`],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      'Name,Category,Price,Description,Minutes,IsCustom,Icon',
      'Pants Hem,hemming,15.00,Basic pants hemming,15,false,👖',
      'Skirt Hem,hemming,12.00,Basic skirt hemming,10,false,👗',
      'Dress Hem,hemming,20.00,Dress hemming (simple),20,false,👗',
      'Pants Waist In,waist,25.00,Take in pants waist,30,false,👖',
      'Sleeve Shorten,sleeves,18.00,Shorten sleeves,25,false,👕',
      'Zipper Repair,repairs,25.00,Replace or repair zipper,45,false,🔧',
      'Custom Design Consultation,custom,0.00,Free consultation for custom design,30,true,✨',
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pricing-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className='h-full flex flex-col overflow-hidden bg-muted/50'>
      <div className='flex-1 overflow-y-auto'>
        <div className='container mx-auto px-4 py-8 max-w-4xl'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-center mb-2'>
            Pricing Management
          </h1>
          <p className='text-center text-muted-foreground'>
            Import and manage your service pricing from Excel/CSV files
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle>Import Pricing Data</CardTitle>
              <CardDescription>
                Import your pricing from Excel/CSV files or use sample data
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Sample Data Import */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>Quick Start</h3>
                <p className='text-sm text-muted-foreground'>
                  Import sample pricing data to get started quickly
                </p>
                <Button
                  onClick={() => handleImport('sample')}
                  disabled={isImporting}
                  className='w-full'
                >
                  {isImporting ? (
                    <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                  ) : (
                    <Upload className='w-4 h-4 mr-2' />
                  )}
                  Import Sample Data
                </Button>
              </div>

              {/* CSV Import */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>Import from CSV</h3>
                <div className='space-y-2'>
                  <Label htmlFor='csv-data'>CSV Data</Label>
                  <Textarea
                    id='csv-data'
                    placeholder='Paste your CSV data here...'
                    value={csvData}
                    onChange={e => setCsvData(e.target.value)}
                    rows={6}
                    className='font-mono text-sm'
                  />
                </div>
                <div className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    id='replace-existing'
                    checked={replaceExisting}
                    onChange={e => setReplaceExisting(e.target.checked)}
                  />
                  <Label htmlFor='replace-existing' className='text-sm'>
                    Replace existing pricing data
                  </Label>
                </div>
                <div className='flex space-x-2'>
                  <Button
                    onClick={() => handleImport('csv')}
                    disabled={isImporting || !csvData.trim()}
                    className='flex-1'
                  >
                    {isImporting ? (
                      <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                    ) : (
                      <Upload className='w-4 h-4 mr-2' />
                    )}
                    Import CSV
                  </Button>
                  <Button
                    onClick={downloadSampleCSV}
                    variant='outline'
                    className='flex-1'
                  >
                    <Download className='w-4 h-4 mr-2' />
                    Download Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>
                View the results of your pricing import
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!importResult ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Upload className='w-12 h-12 mx-auto mb-4 text-muted-foreground/50' />
                  <p>No import results yet</p>
                  <p className='text-sm'>
                    Import pricing data to see results here
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {/* Success/Error Status */}
                  <div className='flex items-center space-x-2'>
                    {importResult.success ? (
                      <CheckCircle className='w-5 h-5 text-green-500' />
                    ) : (
                      <XCircle className='w-5 h-5 text-red-500' />
                    )}
                    <span
                      className={`font-semibold ${
                        importResult.success ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {importResult.success
                        ? 'Import Successful'
                        : 'Import Failed'}
                    </span>
                  </div>

                  {/* Import Stats */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='text-center p-3 bg-green-50 rounded-lg'>
                      <div className='text-2xl font-bold text-green-700'>
                        {importResult.imported}
                      </div>
                      <div className='text-sm text-green-600'>
                        Items Imported
                      </div>
                    </div>
                    <div className='text-center p-3 bg-red-50 rounded-lg'>
                      <div className='text-2xl font-bold text-red-700'>
                        {importResult.errors.length}
                      </div>
                      <div className='text-sm text-red-600'>Errors</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importResult.errors.length > 0 && (
                    <div className='space-y-2'>
                      <h4 className='font-semibold text-red-700 flex items-center'>
                        <XCircle className='w-4 h-4 mr-2' />
                        Errors
                      </h4>
                      <div className='space-y-1 max-h-32 overflow-y-auto'>
                        {importResult.errors.map((error, index) => (
                          <div
                            key={index}
                            className='text-sm text-red-600 bg-red-50 p-2 rounded'
                          >
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {importResult.warnings.length > 0 && (
                    <div className='space-y-2'>
                      <h4 className='font-semibold text-yellow-700 flex items-center'>
                        <AlertCircle className='w-4 h-4 mr-2' />
                        Warnings
                      </h4>
                      <div className='space-y-1 max-h-32 overflow-y-auto'>
                        {importResult.warnings.map((warning, index) => (
                          <div
                            key={index}
                            className='text-sm text-yellow-600 bg-yellow-50 p-2 rounded'
                          >
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className='mt-6'>
          <CardHeader>
            <CardTitle>How to Import Your Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div>
                <h3 className='font-semibold mb-2'>
                  1. Prepare Your Excel/CSV File
                </h3>
                <p className='text-sm text-muted-foreground mb-2'>
                  Your file should have these columns (in order):
                </p>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-2 text-sm'>
                  <Badge variant='outline'>Name</Badge>
                  <Badge variant='outline'>Category</Badge>
                  <Badge variant='outline'>Price</Badge>
                  <Badge variant='outline'>Description</Badge>
                  <Badge variant='outline'>Minutes</Badge>
                  <Badge variant='outline'>IsCustom</Badge>
                  <Badge variant='outline'>Icon</Badge>
                </div>
              </div>

              <div>
                <h3 className='font-semibold mb-2'>2. Categories</h3>
                <p className='text-sm text-muted-foreground mb-2'>
                  Use these standard categories:
                </p>
                <div className='flex flex-wrap gap-2 text-sm'>
                  <Badge>hemming</Badge>
                  <Badge>waist</Badge>
                  <Badge>sleeves</Badge>
                  <Badge>repairs</Badge>
                  <Badge>custom</Badge>
                  <Badge>bridal</Badge>
                  <Badge>menswear</Badge>
                </div>
              </div>

              <div>
                <h3 className='font-semibold mb-2'>3. Price Format</h3>
                <p className='text-sm text-muted-foreground'>
                  Enter prices in dollars (e.g., 15.00 for $15.00). The system
                  will automatically convert to cents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Management Table */}
        <Card className='mt-6'>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Gerer les services et les prix</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingServices ? (
              <div className='text-center py-8 text-muted-foreground'>
                <RefreshCw className='w-8 h-8 mx-auto mb-2 animate-spin' />
                <p>Chargement des services...</p>
              </div>
            ) : servicesList.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                <p>Aucun service trouve. Importez des donnees ci-dessus.</p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-border'>
                      <th className='text-left py-2 px-3 font-medium'>Nom</th>
                      <th className='text-left py-2 px-3 font-medium'>Categorie</th>
                      <th className='text-right py-2 px-3 font-medium'>Prix</th>
                      <th className='text-right py-2 px-3 font-medium'>Minutes</th>
                      <th className='w-10 py-2 px-3'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesList.map(service => (
                      <tr key={service.id} className='border-b border-border/50 hover:bg-muted/50'>
                        {editingService === service.id ? (
                          <>
                            <td className='py-2 px-3'>
                              <input
                                type='text'
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                className='w-full px-2 py-1 border border-border rounded text-sm'
                              />
                            </td>
                            <td className='py-2 px-3'>
                              <input
                                type='text'
                                value={editForm.category}
                                onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                                className='w-full px-2 py-1 border border-border rounded text-sm'
                              />
                            </td>
                            <td className='py-2 px-3 text-right'>
                              <input
                                type='number'
                                step='0.01'
                                value={editForm.price}
                                onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                                className='w-20 px-2 py-1 border border-border rounded text-sm text-right'
                              />
                            </td>
                            <td className='py-2 px-3 text-right'>
                              <input
                                type='number'
                                value={editForm.estimated_minutes}
                                onChange={e => setEditForm(f => ({ ...f, estimated_minutes: e.target.value }))}
                                className='w-16 px-2 py-1 border border-border rounded text-sm text-right'
                              />
                            </td>
                            <td className='py-2 px-3'>
                              <div className='flex gap-1'>
                                <Button size='sm' variant='ghost' onClick={() => handleSaveEdit(service.id)} className='h-8 px-2 text-xs'>
                                  OK
                                </Button>
                                <Button size='sm' variant='ghost' onClick={() => setEditingService(null)} className='h-8 px-2 text-xs'>
                                  X
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className='py-2 px-3 font-medium'>{service.name}</td>
                            <td className='py-2 px-3 text-muted-foreground capitalize'>{service.category || '\u2014'}</td>
                            <td className='py-2 px-3 text-right'>{(service.base_price_cents / 100).toFixed(2)} $</td>
                            <td className='py-2 px-3 text-right'>{service.estimated_minutes} min</td>
                            <td className='py-2 px-3'>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                                    <MoreHorizontal className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuItem onClick={() => handleStartEdit(service)}>
                                    <Edit className='w-4 h-4 mr-2' />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportService(service)}>
                                    <DownloadIcon className='w-4 h-4 mr-2' />
                                    Exporter
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteService(service.id)}
                                    className='text-red-600'
                                    disabled={deletingService === service.id}
                                  >
                                    <Trash2 className='w-4 h-4 mr-2' />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
