-- Performance indexes for the Hotte Couture application

-- Composite indexes for frequent query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_client_status_created
ON "order" (client_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_created_archived
ON "order" (created_at DESC, is_archived);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status_rush
ON "order" (status, rush) WHERE is_archived = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_due_date
ON "order" (due_date) WHERE is_archived = false AND due_date IS NOT NULL;

-- Garment indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_order_created
ON garment (order_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_label_code
ON garment (label_code) WHERE label_code IS NOT NULL;

-- Garment Service indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_service_garment
ON garment_service (garment_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_garment_service_service
ON garment_service (service_id);

-- Task indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_garment_stage
ON task (garment_id, stage);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_status
ON task (status) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_assigned_user
ON task (assigned_user_id, status) WHERE is_active = true;

-- Client indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_phone_name
ON client (phone, last_name, first_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_search
ON client (last_name, first_name, email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_active
ON client (is_active) WHERE is_active = true;

-- Time tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_tracking_user_date
ON time_tracking (user_id, start_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_tracking_active
ON time_tracking (is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_tracking_date
ON time_tracking (DATE(start_time));

-- Service indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_active
ON service (is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_category
ON service (category) WHERE is_active = true;

-- Log indexes (for audit trail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_log_table_timestamp
ON log (table_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_log_record_id
ON log (table_name, record_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_log_action
ON log (action, created_at DESC);

-- Photo indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_order
ON photo (order_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_garment
ON photo (garment_id, created_at DESC);

-- Status change history indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_change_order
ON status_change_history (order_id, changed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_change_date
ON status_change_history (changed_at DESC);

-- Full-text search indexes for client names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_fulltext
ON client USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- Full-text search indexes for order notes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_notes_fulltext
ON "order" USING gin(to_tsvector('english', COALESCE(notes, '')));

-- Performance monitoring query
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;