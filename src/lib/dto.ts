import { z } from 'zod';
import { UserRole } from '@/lib/auth/roles';

// Base schemas
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
export const emailSchema = z.string().email('Invalid email format');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const correlationIdSchema = z
  .string()
  .min(1, 'Correlation ID is required');

// Client schemas
export const clientCreateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema,
  email: emailSchema, // Required for GHL contact sync
  language: z.enum(['fr', 'en']).default('fr'),
  preferred_contact: z.enum(['email', 'sms']).default('sms'),
  newsletter_consent: z.boolean().default(false),
});

export const clientUpdateSchema = clientCreateSchema.partial();

// Order schemas
export const orderTypeSchema = z.enum(['alteration', 'custom']);
export const prioritySchema = z.enum(['normal', 'rush', 'custom']);
export const orderStatusSchema = z.enum([
  'pending',
  'working',
  'done',
  'ready',
  'delivered',
  'archived',
]);

export const orderCreateSchema = z.object({
  client_id: uuidSchema.optional(), // Optional because API handles client creation/upsert
  type: orderTypeSchema,
  priority: prioritySchema.default('normal'),
  due_date: z.string().datetime().optional(),
  rush: z.boolean().default(false),
  rush_fee_type: z.enum(['small', 'large']).optional(),
  ghl_opportunity_id: z.string().max(100).optional(),
  assigned_to: z.string().max(100).optional(),
  deposit_required: z.boolean().optional(),
  deposit_amount_cents: z.number().int().min(0).optional(),
});

// Garment schemas
export const garmentCreateSchema = z.object({
  type: z.string().min(1, 'Garment type is required').max(100),
  color: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  photoTempPath: z.string().max(500).optional(),
  positionNotes: z.record(z.any()).optional(),
  services: z
    .array(
      z.object({
        serviceId: uuidSchema,
        qty: z.number().int().min(1, 'Quantity must be at least 1'),
        customPriceCents: z.number().int().min(0).optional(),
      })
    )
    .min(1, 'At least one service is required'),
});

// Intake API schemas
export const intakeRequestSchema = z.object({
  client: clientCreateSchema,
  order: orderCreateSchema,
  garments: z
    .array(garmentCreateSchema)
    .min(1, 'At least one garment is required'),
  notes: z
    .object({
      measurements: z.string().optional(),
      specialInstructions: z.string().optional(),
    })
    .optional(),
});

export const intakeResponseSchema = z.object({
  orderId: uuidSchema,
  orderNumber: z.number().int().positive(),
  totals: z.object({
    subtotal_cents: z.number().int().min(0),
    tax_cents: z.number().int().min(0),
    tps_cents: z.number().int().min(0).optional(),
    tvq_cents: z.number().int().min(0).optional(),
    total_cents: z.number().int().min(0),
    rush_fee_cents: z.number().int().min(0),
  }),
  qrcode: z.string().optional(),
});

// Task schemas
export const taskStartSchema = z.object({
  correlationId: correlationIdSchema,
});

export const taskStopSchema = z.object({
  correlationId: correlationIdSchema,
  actual_minutes: z.number().int().min(0).optional(),
});

export const taskResponseSchema = z.object({
  taskId: uuidSchema,
  status: z.enum(['started', 'stopped']),
  actual_minutes: z.number().int().min(0).optional(),
  message: z.string(),
});

// Order stage schemas
export const orderStageSchema = z.object({
  stage: orderStatusSchema,
  correlationId: correlationIdSchema,
  notes: z.string().max(1000).optional(),
  sendNotification: z.boolean().optional().default(false),
});

export const orderStageResponseSchema = z.object({
  orderId: uuidSchema,
  status: orderStatusSchema,
  message: z.string(),
  allTasksComplete: z.boolean(),
});

// Label schemas
export const labelRequestSchema = z.object({
  correlationId: correlationIdSchema,
});

export const labelResponseSchema = z.object({
  orderId: uuidSchema,
  labelUrl: z.string().url(),
  qrCodes: z.array(
    z.object({
      type: z.enum(['order', 'garment']),
      value: z.string(),
      position: z.string(),
    })
  ),
});

// Status lookup schemas
export const statusQuerySchema = z.object({
  phone: z.string().optional(),
  last: z.string().optional(),
});

export const statusResponseSchema = z.object({
  orderId: uuidSchema,
  orderNumber: z.number().int().positive(),
  status: orderStatusSchema,
  due_date: z.string().datetime().optional(),
  client: z.object({
    first_name: z.string(),
    last_name: z.string(),
    phone: z.string().optional(),
  }),
  garments: z.array(
    z.object({
      type: z.string(),
      color: z.string().optional(),
      brand: z.string().optional(),
    })
  ),
  last_updated: z.string().datetime(),
});

// Webhook schemas
export const webhookOrderReadySchema = z.object({
  orderId: uuidSchema,
  correlationId: correlationIdSchema,
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export const webhookPaymentSchema = z.object({
  orderId: uuidSchema,
  correlationId: correlationIdSchema,
  amount_cents: z.number().int().min(0),
  currency: z.string().length(3).default('CAD'),
  payment_method: z.string().max(50),
  transaction_id: z.string().max(100),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export const webhookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  correlationId: correlationIdSchema,
});

// Error schemas
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  correlationId: correlationIdSchema,
  timestamp: z.string().datetime(),
  path: z.string().optional(),
  statusCode: z.number().int().min(400).max(599),
});

// Event log schemas
export const eventLogCreateSchema = z.object({
  entity: z.string().max(50),
  entity_id: uuidSchema,
  action: z.string().max(50),
  details: z.record(z.any()).optional(),
  correlationId: correlationIdSchema,
});

// User role schemas
export const userRoleSchema = z.nativeEnum(UserRole);

export const userUpdateSchema = z.object({
  app_role: userRoleSchema.optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
});

// Pagination schemas
export const paginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const paginationResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    pages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// File upload schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.string().min(1).max(100),
  size: z
    .number()
    .int()
    .min(1)
    .max(20 * 1024 * 1024), // 20MB max
  buffer: z.instanceof(Buffer),
});

// Search schemas
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(['client', 'order', 'garment']).optional(),
  filters: z.record(z.any()).optional(),
});

// Export all schemas for easy importing
export const schemas = {
  // Client
  clientCreate: clientCreateSchema,
  clientUpdate: clientUpdateSchema,

  // Order
  orderCreate: orderCreateSchema,
  orderStage: orderStageSchema,
  orderStageResponse: orderStageResponseSchema,

  // Garment
  garmentCreate: garmentCreateSchema,

  // Intake
  intakeRequest: intakeRequestSchema,
  intakeResponse: intakeResponseSchema,

  // Task
  taskStart: taskStartSchema,
  taskStop: taskStopSchema,
  taskResponse: taskResponseSchema,

  // Label
  labelRequest: labelRequestSchema,
  labelResponse: labelResponseSchema,

  // Status
  statusQuery: statusQuerySchema,
  statusResponse: statusResponseSchema,

  // Webhooks
  webhookOrderReady: webhookOrderReadySchema,
  webhookPayment: webhookPaymentSchema,
  webhookResponse: webhookResponseSchema,

  // Error
  apiError: apiErrorSchema,

  // Event log
  eventLogCreate: eventLogCreateSchema,

  // User
  userRole: userRoleSchema,
  userUpdate: userUpdateSchema,

  // Pagination
  paginationQuery: paginationQuerySchema,
  paginationResponse: paginationResponseSchema,

  // File upload
  fileUpload: fileUploadSchema,

  // Search
  searchQuery: searchQuerySchema,
} as const;

// Type exports
export type ClientCreate = z.infer<typeof clientCreateSchema>;
export type ClientUpdate = z.infer<typeof clientUpdateSchema>;
export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type GarmentCreate = z.infer<typeof garmentCreateSchema>;
export type IntakeRequest = z.infer<typeof intakeRequestSchema>;
export type IntakeResponse = z.infer<typeof intakeResponseSchema>;
export type TaskStart = z.infer<typeof taskStartSchema>;
export type TaskStop = z.infer<typeof taskStopSchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;
export type OrderStage = z.infer<typeof orderStageSchema>;
export type OrderStageResponse = z.infer<typeof orderStageResponseSchema>;
export type LabelRequest = z.infer<typeof labelRequestSchema>;
export type LabelResponse = z.infer<typeof labelResponseSchema>;
export type StatusQuery = z.infer<typeof statusQuerySchema>;
export type StatusResponse = z.infer<typeof statusResponseSchema>;
export type WebhookOrderReady = z.infer<typeof webhookOrderReadySchema>;
export type WebhookPayment = z.infer<typeof webhookPaymentSchema>;
export type WebhookResponse = z.infer<typeof webhookResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type EventLogCreate = z.infer<typeof eventLogCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationResponse = z.infer<typeof paginationResponseSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
