'use client';

import { useState } from 'react';
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
} from 'lucide-react';

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
        </div>
      </div>
    </div>
  );
}
