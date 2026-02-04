'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPhotoPage() {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Create a simple test image
    canvas.width = 400;
    canvas.height = 300;

    if (ctx) {
      // Draw a simple test pattern
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(0, 0, 200, 150);
      ctx.fillStyle = '#4ecdc4';
      ctx.fillRect(200, 0, 200, 150);
      ctx.fillStyle = '#45b7d1';
      ctx.fillRect(0, 150, 200, 150);
      ctx.fillStyle = '#f9ca24';
      ctx.fillRect(200, 150, 200, 150);

      // Add text
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText('Test Photo', 150, 160);
      ctx.fillText(new Date().toLocaleTimeString(), 150, 190);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoDataUrl(dataUrl);
    setResult(null);
    setError(null);
  };

  const uploadPhoto = async () => {
    if (!photoDataUrl) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const fileName = `test-photo-${Date.now()}.jpg`;

      console.log('🧪 Frontend: Starting upload test...');
      const response = await fetch('/api/test-photo-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          dataUrl: photoDataUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      console.log('🧪 Frontend: Upload successful:', data);
      setResult(data);
    } catch (err) {
      console.error('🧪 Frontend: Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8 max-w-2xl'>
      <Card>
        <CardHeader>
          <CardTitle>🧪 Photo Upload Test</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-4'>
            <Button onClick={capturePhoto}>Generate Test Photo</Button>
            <Button onClick={uploadPhoto} disabled={!photoDataUrl || uploading}>
              {uploading ? 'Uploading...' : 'Upload to Supabase'}
            </Button>
          </div>

          {photoDataUrl && (
            <div>
              <h3 className='font-medium mb-2'>Generated Photo:</h3>
              <img
                src={photoDataUrl}
                alt='Test photo'
                className='w-full max-w-md border rounded'
              />
            </div>
          )}

          {result && (
            <div className='p-4 bg-green-50 border border-green-200 rounded'>
              <h3 className='font-medium text-green-800 mb-2'>
                ✅ Upload Successful!
              </h3>
              <pre className='text-sm text-green-700'>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className='p-4 bg-red-50 border border-red-200 rounded'>
              <h3 className='font-medium text-red-800 mb-2'>
                ❌ Upload Failed
              </h3>
              <p className='text-sm text-red-700'>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
