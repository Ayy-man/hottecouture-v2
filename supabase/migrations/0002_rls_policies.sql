-- RLS Policies Migration
-- This migration updates RLS policies to be role-based

-- First, drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON client;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "order";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON garment;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON service;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON garment_service;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON task;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON price_list;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON document;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON event_log;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Extract app_role from JWT claims, default to 'owner' if not present
  RETURN COALESCE(
    (auth.jwt() ->> 'app_role')::TEXT,
    'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access task (owner or assignee)
CREATE OR REPLACE FUNCTION can_access_task(task_assignee TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  current_user_id TEXT;
BEGIN
  user_role := get_user_role();
  current_user_id := auth.uid()::TEXT;
  
  -- Owner can access all tasks
  IF user_role = 'owner' THEN
    RETURN TRUE;
  END IF;
  
  -- Non-owners can only access tasks assigned to them
  RETURN task_assignee = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CLIENT TABLE POLICIES
-- All authenticated users can read/write clients
CREATE POLICY "Authenticated users can manage clients" ON client
    FOR ALL USING (auth.role() = 'authenticated');

-- ORDER TABLE POLICIES
-- All authenticated users can read/write orders
CREATE POLICY "Authenticated users can manage orders" ON "order"
    FOR ALL USING (auth.role() = 'authenticated');

-- GARMENT TABLE POLICIES
-- All authenticated users can read/write garments
CREATE POLICY "Authenticated users can manage garments" ON garment
    FOR ALL USING (auth.role() = 'authenticated');

-- SERVICE TABLE POLICIES
-- All authenticated users can read services, only owners can modify
CREATE POLICY "Authenticated users can read services" ON service
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only owners can modify services" ON service
    FOR INSERT WITH CHECK (is_owner());

CREATE POLICY "Only owners can update services" ON service
    FOR UPDATE USING (is_owner());

CREATE POLICY "Only owners can delete services" ON service
    FOR DELETE USING (is_owner());

-- GARMENT_SERVICE TABLE POLICIES
-- All authenticated users can read/write garment services
CREATE POLICY "Authenticated users can manage garment services" ON garment_service
    FOR ALL USING (auth.role() = 'authenticated');

-- TASK TABLE POLICIES
-- All authenticated users can read/write tasks, with assignee restrictions for non-owners
CREATE POLICY "Authenticated users can manage tasks" ON task
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (is_owner() OR can_access_task(assignee))
    );

-- PRICE_LIST TABLE POLICIES
-- All authenticated users can read, only owners can modify
CREATE POLICY "Authenticated users can read price lists" ON price_list
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only owners can modify price lists" ON price_list
    FOR INSERT WITH CHECK (is_owner());

CREATE POLICY "Only owners can update price lists" ON price_list
    FOR UPDATE USING (is_owner());

CREATE POLICY "Only owners can delete price lists" ON price_list
    FOR DELETE USING (is_owner());

-- DOCUMENT TABLE POLICIES
-- All authenticated users can read/write documents
CREATE POLICY "Authenticated users can manage documents" ON document
    FOR ALL USING (auth.role() = 'authenticated');

-- EVENT_LOG TABLE POLICIES
-- All authenticated users can insert, only owners can read
CREATE POLICY "Authenticated users can insert event logs" ON event_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only owners can read event logs" ON event_log
    FOR SELECT USING (is_owner());

-- Update event logs to automatically set actor
CREATE OR REPLACE FUNCTION set_event_log_actor()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actor := auth.uid()::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set actor
DROP TRIGGER IF EXISTS set_event_log_actor_trigger ON event_log;
CREATE TRIGGER set_event_log_actor_trigger
  BEFORE INSERT ON event_log
  FOR EACH ROW
  EXECUTE FUNCTION set_event_log_actor();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
