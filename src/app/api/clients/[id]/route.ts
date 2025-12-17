import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    console.log('🔍 CLIENT API: Fetching client:', clientId)
    
    const supabase = await createServiceRoleClient()
    
    const { data: client, error: clientError } = await supabase
      .from('client')
      .select('id, first_name, last_name, phone, email, created_at')
      .eq('id', clientId)
      .single() as { data: any | null, error: any }

    if (clientError) {
      console.error('❌ Error fetching client:', clientError)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    console.log('✅ CLIENT API: Successfully fetched client:', client.first_name, client.last_name)

    const response = NextResponse.json(client)
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (error) {
    console.error('❌ CLIENT API ERROR:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
