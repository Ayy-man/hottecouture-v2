import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test Photo Upload API: Starting...');

    const { fileName, dataUrl } = await req.json();
    console.log('🧪 Test Photo Upload API: Received data:', {
      hasFileName: !!fileName,
      hasDataUrl: !!dataUrl,
      fileName: fileName,
      dataUrlLength: dataUrl?.length,
    });

    if (!fileName || !dataUrl) {
      return NextResponse.json(
        { error: 'Missing fileName or dataUrl' },
        { status: 400 }
      );
    }

    // Convert data URL to blob
    console.log('🧪 Test Photo Upload API: Converting data URL to blob...');
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    console.log('🧪 Test Photo Upload API: Blob created:', {
      size: blob.size,
      type: blob.type,
    });

    // Upload to Supabase Storage
    console.log('🧪 Test Photo Upload API: Creating Supabase client...');
    const supabase = await createServiceRoleClient();

    console.log('🧪 Test Photo Upload API: Uploading to storage...');
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('🧪 Test Photo Upload API: Upload failed:', error);
      return NextResponse.json(
        {
          error: 'Upload failed',
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log('🧪 Test Photo Upload API: Upload successful:', data);
    return NextResponse.json({
      success: true,
      path: data.path,
      fullPath: data.fullPath,
    });
  } catch (error) {
    console.error('🧪 Test Photo Upload API: Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
