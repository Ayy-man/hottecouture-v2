import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withErrorHandling,
  getCorrelationId,
  logEvent,
  validateRequest,
  NotFoundError
} from '@/lib/api/error-handler'
import { statusQuerySchema, StatusQuery, StatusResponse } from '@/lib/dto'

async function handleOrderStatus(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<StatusResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = await createServiceRoleClient()

  // Parse and validate query parameters
  const { searchParams } = new URL(request.url)
  const queryData = {
    phone: searchParams.get('phone') || undefined,
    last: searchParams.get('last') || undefined,
  }

  const validatedQuery = validateRequest(statusQuerySchema, queryData, correlationId) as StatusQuery
  const { id: orderId } = await params

  // Build query with optional phone verification
  let query = supabase
    .from('order')
    .select(`
      id,
      order_number,
      status,
      due_date,
      created_at,
      client:client_id (
        first_name,
        last_name,
        phone
      ),
      garments (
        type,
        color,
        brand
      )
    `)
    .eq('id', orderId)

  // If phone is provided, verify it matches the client
  if (validatedQuery.phone) {
    query = query.eq('client.phone', validatedQuery.phone)
  }

  const { data: order, error: orderError } = await query.single()

  if (orderError || !order) {
    throw new NotFoundError('Order', correlationId)
  }

  // If phone verification failed, return not found
  if (validatedQuery.phone && (order as any).client?.phone !== validatedQuery.phone) {
    throw new NotFoundError('Order', correlationId)
  }

  // Log the status lookup
  await logEvent('order', orderId, 'status_lookup', {
    correlationId,
    phoneProvided: !!validatedQuery.phone,
    lastNameProvided: !!validatedQuery.last,
  })

  const response: StatusResponse = {
    orderId: (order as any).id,
    orderNumber: (order as any).order_number,
    status: (order as any).status,
    due_date: (order as any).due_date,
    client: {
      first_name: (order as any).client?.first_name || 'Unknown',
      last_name: (order as any).client?.last_name || 'Client',
      phone: (order as any).client?.phone || null,
    },
    garments: (order as any).garments?.map((garment: any) => ({
      type: garment.type,
      color: garment.color,
      brand: garment.brand,
    })) || [],
    last_updated: (order as any).created_at,
  }

  return response
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(() => handleOrderStatus(request, { params }), request)
}
