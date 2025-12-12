-- Migration: Add notification_log and chat_log tables
-- Requested by: Agent C (Comms & AI)
-- Date: 2024-12-12

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES "order"(id) ON DELETE CASCADE,
  client_id uuid REFERENCES client(id) ON DELETE CASCADE,
  type text NOT NULL,
  template text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create chat_log table (for analytics, not persistence)
CREATE TABLE IF NOT EXISTS chat_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  type text NOT NULL,
  query text NOT NULL,
  response text NOT NULL,
  tokens_used integer,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_order ON notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_client ON notification_log(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_chat_log_session ON chat_log(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_log_created ON chat_log(created_at DESC);

-- RLS policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for service role" ON notification_log
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for service role" ON chat_log
  FOR ALL USING (true);

-- Add notification tracking columns to order table if not exists
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS last_notification_sent_at timestamptz;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS notification_count integer DEFAULT 0;
