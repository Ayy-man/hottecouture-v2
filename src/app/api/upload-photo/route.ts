import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { fileName, dataUrl } = await req.json()

    if (!fileName || !dataUrl) {
      return NextResponse.json({ error: 'Missing fileName or dataUrl' }, { status: 400 })
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Upload to Supabase Storage
    const supabase = await createServiceRoleClient()
    
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Photo upload failed:', error)
      return NextResponse.json({ 
        error: 'Upload failed', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      path: data.path 
    })

  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
