import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    console.log('🔍 CLIENTS API: Fetching all clients...')
    
    const supabase = await createServiceRoleClient()
    
    // Get all clients with basic info
    const { data: clients, error: clientsError } = await supabase
      .from('client')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        created_at
      `)
      .order('created_at', { ascending: false }) as { data: any[] | null, error: any }

    if (clientsError) {
      console.error('❌ Error fetching clients:', clientsError)
      return NextResponse.json({ error: clientsError.message }, { status: 500 })
    }

    console.log('✅ CLIENTS API: Successfully fetched', clients?.length || 0, 'clients')

    const response = NextResponse.json({
      success: true,
      clients: clients || [],
      count: clients?.length || 0
    })
    
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (error) {
    console.error('❌ CLIENTS API ERROR:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}