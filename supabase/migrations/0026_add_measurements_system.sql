-- Migration: 0026_add_measurements_system.sql
-- Purpose: Add measurement tracking for clients and orders
-- Created: 2025-12-23

-- 1. Measurement Template (admin-defined measurement fields)
CREATE TABLE IF NOT EXISTS measurement_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- 'bust', 'waist', etc.
  name_fr VARCHAR(100) NOT NULL,        -- French label
  category VARCHAR(50) DEFAULT 'body',  -- 'body', 'curtain', 'upholstery', 'bedding'
  unit VARCHAR(20) DEFAULT 'cm',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measurement_template_active
  ON measurement_template(is_active, display_order);

-- 2. Client Measurement (client's stored measurements)
CREATE TABLE IF NOT EXISTS client_measurement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES measurement_template(id),
  value DECIMAL(10,2),
  notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT now(),
  measured_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_client_measurement_client
  ON client_measurement(client_id);

-- 3. Order Measurement (snapshot for specific order)
CREATE TABLE IF NOT EXISTS order_measurement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES measurement_template(id),
  value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_order_measurement_order
  ON order_measurement(order_id);

-- Seed default measurement templates
INSERT INTO measurement_template (name, name_fr, category, unit, display_order) VALUES
  -- Body measurements (for clothing)
  ('bust', 'Tour de poitrine', 'body', 'cm', 1),
  ('waist', 'Tour de taille', 'body', 'cm', 2),
  ('hips', 'Tour de hanches', 'body', 'cm', 3),
  ('inseam', 'Entrejambe', 'body', 'cm', 4),
  ('arm_length', 'Longueur bras', 'body', 'cm', 5),
  ('neck', 'Tour de cou', 'body', 'cm', 6),
  ('shoulders', 'Largeur épaules', 'body', 'cm', 7),
  ('height', 'Hauteur totale', 'body', 'cm', 8),
  -- Curtain measurements
  ('window_width', 'Largeur de fenêtre', 'curtain', 'cm', 1),
  ('window_height', 'Hauteur de fenêtre', 'curtain', 'cm', 2),
  ('rod_position', 'Position de la tringle', 'curtain', 'cm', 3),
  ('floor_clearance', 'Hauteur du sol', 'curtain', 'cm', 4),
  ('left_return', 'Retour côté gauche', 'curtain', 'cm', 5),
  ('right_return', 'Retour côté droit', 'curtain', 'cm', 6),
  -- Upholstery measurements
  ('seat_width', 'Largeur assise', 'upholstery', 'cm', 1),
  ('seat_depth', 'Profondeur assise', 'upholstery', 'cm', 2),
  ('back_height', 'Hauteur dossier', 'upholstery', 'cm', 3),
  ('foam_thickness', 'Épaisseur mousse', 'upholstery', 'cm', 4),
  -- Bedding measurements
  ('mattress_width', 'Largeur matelas', 'bedding', 'cm', 1),
  ('mattress_length', 'Longueur matelas', 'bedding', 'cm', 2),
  ('mattress_depth', 'Épaisseur matelas', 'bedding', 'cm', 3);

-- Enable RLS
ALTER TABLE measurement_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_measurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_measurement ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "measurement_template_readable" ON measurement_template
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "client_measurement_all" ON client_measurement
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "order_measurement_all" ON order_measurement
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
