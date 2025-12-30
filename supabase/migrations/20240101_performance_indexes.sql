-- Performance indexes for the Hotte Couture application
-- Updated: 2025-12-30 - Fixed references to non-existent columns/tables

-- =============================================================================
-- ORDER INDEXES
-- =============================================================================

-- Composite index for client orders with status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_client_status_created
ON "order" (client_id, status, created_at DESC);

-- Archive filtering optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_created_archived
ON "order" (created_at DESC, is_archived);

-- Active orders by status and rush
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status_rush
ON "order" (status, rush) WHERE is_archived = false;

-- Due date lookup for non-archived orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_due_date
ON "order" (due_date) WHERE is_archived = false AND due_date IS NOT NULL;

-- Payment status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_payment_status
ON "order" (payment_status) WHERE is_archived = false;

-- =============================================================================
-- GARMENT INDEXES
-- =============================================================================

-- Garment lookup by order (garment has updated_at, not created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_order
ON garment (order_id);

-- Label code lookup (QR code scanning)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_label_code
ON garment (label_code) WHERE label_code IS NOT NULL;

-- Active garments by assignee (for staff task tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_assignee_active
ON garment (assignee, is_active) WHERE is_active = true;

-- Garment stage filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_stage
ON garment (stage) WHERE stage IS NOT NULL;

-- =============================================================================
-- GARMENT SERVICE INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_service_garment
ON garment_service (garment_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_service_service
ON garment_service (service_id);

-- =============================================================================
-- TASK INDEXES
-- =============================================================================

-- Task lookup by garment and stage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_garment_stage
ON task (garment_id, stage);

-- Active tasks by stage (task uses 'stage' column, not 'status')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_stage_active
ON task (stage) WHERE is_active = true;

-- Tasks by assignee (task uses 'assignee' column, not 'assigned_user_id')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_assignee
ON task (assignee, stage) WHERE is_active = true AND assignee IS NOT NULL;

-- =============================================================================
-- CLIENT INDEXES
-- =============================================================================

-- Phone and name lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_phone_name
ON client (phone, last_name, first_name);

-- Search by name and email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_search
ON client (last_name, first_name, email);

-- Full-text search for client names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_fulltext
ON client USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- =============================================================================
-- TIME TRACKING INDEXES
-- =============================================================================

-- Time tracking by order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_tracking_order
ON time_tracking (order_id, created_at DESC);

-- Time tracking by garment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_tracking_garment
ON time_tracking (garment_id, is_tracking);

-- Active time tracking sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_tracking_active
ON time_tracking (is_tracking) WHERE is_tracking = true;

-- =============================================================================
-- SERVICE INDEXES
-- =============================================================================

-- Active services by category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_active
ON service (is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_category
ON service (category) WHERE is_active = true;

-- Service display order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_display_order
ON service (category, display_order) WHERE is_active = true;

-- =============================================================================
-- STAFF INDEXES
-- =============================================================================

-- Active staff lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_active
ON staff (is_active) WHERE is_active = true;

-- =============================================================================
-- EVENT LOG INDEXES (replaces non-existent 'log' table)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_log_entity
ON event_log (entity, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_log_action
ON event_log (action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_log_actor
ON event_log (actor, created_at DESC);

-- =============================================================================
-- NOTIFICATION LOG INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_order
ON notification_log (order_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_client
ON notification_log (client_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_status
ON notification_log (status, created_at DESC);

-- =============================================================================
-- CATEGORY INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_active
ON category (is_active, display_order) WHERE is_active = true;

-- =============================================================================
-- NOTE: The following tables do not exist in the current schema:
-- - photo (photos are stored in Supabase Storage, referenced via garment.photo_path)
-- - log (use event_log instead)
-- - status_change_history (status changes are tracked in event_log)
-- =============================================================================
