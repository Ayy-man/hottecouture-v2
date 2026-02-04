-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE preferred_contact AS ENUM ('sms', 'email');
CREATE TYPE language AS ENUM ('fr', 'en');
CREATE TYPE order_type AS ENUM ('alteration', 'custom');
CREATE TYPE priority AS ENUM ('normal', 'rush', 'custom');
CREATE TYPE order_status AS ENUM ('pending', 'working', 'done', 'ready', 'delivered', 'archived');
CREATE TYPE task_stage AS ENUM ('pending', 'working', 'done', 'ready', 'delivered');
CREATE TYPE price_list_type AS ENUM ('alteration', 'custom');

-- Create clients table
CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    preferred_contact preferred_contact DEFAULT 'email',
    newsletter_consent BOOLEAN DEFAULT FALSE,
    language language DEFAULT 'en',
    ghl_contact_id VARCHAR(100),
    notes TEXT
);

-- Create orders table
CREATE TABLE "order" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    order_number BIGSERIAL UNIQUE,
    type order_type NOT NULL,
    priority priority DEFAULT 'normal',
    status order_status DEFAULT 'pending',
    due_date DATE,
    rush BOOLEAN DEFAULT FALSE,
    rush_fee_cents INTEGER DEFAULT 0,
    subtotal_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER DEFAULT 0,
    deposit_cents INTEGER DEFAULT 0,
    balance_due_cents INTEGER GENERATED ALWAYS AS (total_cents - deposit_cents) STORED,
    qrcode VARCHAR(255),
    rack_position VARCHAR(50),
    ghl_opportunity_id VARCHAR(100)
);

-- Create garments table
CREATE TABLE garment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    brand VARCHAR(100),
    notes TEXT,
    photo_path VARCHAR(500),
    position_notes JSONB,
    label_code VARCHAR(50) UNIQUE
);

-- Create services table
CREATE TABLE service (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    base_price_cents INTEGER NOT NULL,
    category VARCHAR(100),
    is_custom BOOLEAN DEFAULT FALSE
);

-- Create garment_services junction table
CREATE TABLE garment_service (
    garment_id UUID NOT NULL REFERENCES garment(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES service(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    custom_price_cents INTEGER,
    notes TEXT,
    PRIMARY KEY (garment_id, service_id)
);

-- Create tasks table
CREATE TABLE task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garment_id UUID NOT NULL REFERENCES garment(id) ON DELETE CASCADE,
    stage task_stage DEFAULT 'pending',
    operation VARCHAR(200) NOT NULL,
    assignee VARCHAR(100),
    planned_minutes INTEGER,
    actual_minutes INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT FALSE
);

-- Create price_lists table
CREATE TABLE price_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    default_price_cents INTEGER NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    type price_list_type NOT NULL
);

-- Create documents table
CREATE TABLE document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL,
    path VARCHAR(500) NOT NULL,
    meta JSONB
);

-- Create event_log table
CREATE TABLE event_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor VARCHAR(100),
    entity VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_client_email ON client(email);
CREATE INDEX idx_client_phone ON client(phone);
CREATE INDEX idx_client_ghl_contact_id ON client(ghl_contact_id);

CREATE INDEX idx_order_client_id ON "order"(client_id);
CREATE INDEX idx_order_status ON "order"(status);
CREATE INDEX idx_order_due_date ON "order"(due_date);
CREATE INDEX idx_order_created_at ON "order"(created_at);
CREATE INDEX idx_order_ghl_opportunity_id ON "order"(ghl_opportunity_id);

CREATE INDEX idx_garment_order_id ON garment(order_id);
CREATE INDEX idx_garment_label_code ON garment(label_code);

CREATE INDEX idx_garment_service_garment_id ON garment_service(garment_id);
CREATE INDEX idx_garment_service_service_id ON garment_service(service_id);

CREATE INDEX idx_task_garment_id ON task(garment_id);
CREATE INDEX idx_task_stage ON task(stage);
CREATE INDEX idx_task_assignee ON task(assignee);
CREATE INDEX idx_task_is_active ON task(is_active);

CREATE INDEX idx_document_order_id ON document(order_id);
CREATE INDEX idx_document_kind ON document(kind);

CREATE INDEX idx_event_log_entity ON event_log(entity, entity_id);
CREATE INDEX idx_event_log_created_at ON event_log(created_at);
CREATE INDEX idx_event_log_actor ON event_log(actor);

-- Create RLS policies (basic setup - can be customized)
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE garment ENABLE ROW LEVEL SECURITY;
ALTER TABLE service ENABLE ROW LEVEL SECURITY;
ALTER TABLE garment_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow all for now - customize based on your auth needs)
CREATE POLICY "Enable all operations for authenticated users" ON client
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "order"
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON garment
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON service
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON garment_service
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON task
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON price_list
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON document
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON event_log
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert some default services
INSERT INTO service (code, name, base_price_cents, category, is_custom) VALUES
('HEM', 'Hem Adjustment', 2500, 'alteration', false),
('TAKE_IN', 'Take In Sides', 3500, 'alteration', false),
('LET_OUT', 'Let Out Sides', 3000, 'alteration', false),
('SHORTEN', 'Shorten Sleeves', 2000, 'alteration', false),
('LENGTHEN', 'Lengthen Sleeves', 2500, 'alteration', false),
('ZIPPER', 'Replace Zipper', 4000, 'alteration', false),
('BUTTONS', 'Replace Buttons', 1500, 'alteration', false),
('CUSTOM', 'Custom Service', 0, 'custom', true);

-- Insert default price list
INSERT INTO price_list (code, name, default_price_cents, effective_from, type) VALUES
('DEFAULT_ALT', 'Default Alteration Prices', 0, CURRENT_DATE, 'alteration'),
('DEFAULT_CUSTOM', 'Default Custom Prices', 0, CURRENT_DATE, 'custom');
