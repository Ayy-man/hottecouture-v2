import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError } from '@/lib/dto'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly correlationId: string
  public readonly path?: string

  constructor(
    message: string,
    statusCode: number = 500,
    correlationId?: string,
    path?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.correlationId = correlationId || uuidv4()
    this.path = path
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, correlationId?: string, path?: string) {
    super(message, 400, correlationId, path)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, correlationId?: string, path?: string) {
    super(`${resource} not found`, 404, correlationId, path)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', correlationId?: string, path?: string) {
    super(message, 401, correlationId, path)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', correlationId?: string, path?: string) {
    super(message, 403, correlationId, path)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, correlationId?: string, path?: string) {
    super(message, 409, correlationId, path)
    this.name = 'ConflictError'
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', correlationId?: string, path?: string) {
    super(message, 500, correlationId, path)
    this.name = 'InternalServerError'
  }
}

export function handleApiError(
  error: unknown,
  request: NextRequest,
  correlationId?: string
): NextResponse<ApiError> {
  const path = request.nextUrl.pathname
  const timestamp = new Date().toISOString()

  // Handle known API errors
  if (error instanceof ApiError) {
    const apiError: ApiError = {
      error: error.name,
      message: error.message,
      correlationId: error.correlationId || correlationId || uuidv4(),
      timestamp,
      path: error.path || path,
      statusCode: error.statusCode,
    }

    return NextResponse.json(apiError, { status: error.statusCode })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError: ApiError = {
      error: 'ValidationError',
      message: 'Invalid request data',
      correlationId: correlationId || uuidv4(),
      timestamp,
      path,
      statusCode: 400,
    }

    return NextResponse.json(validationError, { status: 400 })
  }

  // Handle unexpected errors
  const internalError: ApiError = {
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    correlationId: correlationId || uuidv4(),
    timestamp,
    path,
    statusCode: 500,
  }

  console.error('Unexpected API error:', error)
  return NextResponse.json(internalError, { status: 500 })
}

export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  request: NextRequest,
  correlationId?: string
): Promise<NextResponse> {
  try {
    const result = await handler()
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error, request, correlationId)
  }
}

export function getCorrelationId(request: NextRequest): string {
  // Try to get correlation ID from headers
  const correlationId = request.headers.get('x-correlation-id')
  if (correlationId) {
    return correlationId
  }

  // Generate new correlation ID
  return uuidv4()
}

export async function logEvent(
  entity: string,
  entityId: string,
  action: string,
  details: Record<string, any> = {},
  correlationId?: string
): Promise<void> {
  try {
    const supabase = createClient()
    
    await supabase.from('event_log').insert({
      entity,
      entity_id: entityId,
      action,
      details: {
        ...details,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to log event:', error)
    // Don't throw - event logging should not break the main flow
  }
}

export function validateRequest<T>(
  schema: any,
  data: unknown,
  correlationId?: string
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      throw new ValidationError(message, correlationId)
    }
    throw error
  }
}

export function requireAuth(request: NextRequest): string {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header')
  }

  // Extract token (in real implementation, verify JWT here)
  const token = authHeader.substring(7)
  if (!token) {
    throw new UnauthorizedError('Invalid token format')
  }

  return token
}

export function requireRole(allowedRoles: string[], userRole: string): void {
  if (!allowedRoles.includes(userRole)) {
    throw new ForbiddenError(`Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`)
  }
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

export function createErrorResponse(
  error: string,
  status: number = 500,
  correlationId?: string
): NextResponse<ApiError> {
  const apiError: ApiError = {
    error: 'ApiError',
    message: error,
    correlationId: correlationId || uuidv4(),
    timestamp: new Date().toISOString(),
    statusCode: status,
  }

  return NextResponse.json(apiError, { status })
}
