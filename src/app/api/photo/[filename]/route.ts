import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    console.log('🔍 Photo API: Requesting photo:', filename);

    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get signed URL for the photo
    const { data, error } = await supabase.storage
      .from('photos')
      .createSignedUrl(filename, 3600); // 1 hour expiry

    if (error) {
      console.error('❌ Photo API: Error creating signed URL:', error);
      return new NextResponse('Photo not found', { status: 404 });
    }

    if (!data?.signedUrl) {
      console.error('❌ Photo API: No signed URL returned');
      return new NextResponse('Photo not found', { status: 404 });
    }

    console.log('✅ Photo API: Generated signed URL for:', filename);

    // Redirect to the signed URL
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error('❌ Photo API: Unexpected error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
