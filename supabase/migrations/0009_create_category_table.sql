-- Create category table for service categories
-- This allows CRUD operations on categories

CREATE TABLE IF NOT EXISTS category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_category_key ON category(key);
CREATE INDEX IF NOT EXISTS idx_category_is_active ON category(is_active);
CREATE INDEX IF NOT EXISTS idx_category_display_order ON category(display_order);

-- Enable RLS
ALTER TABLE category ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Enable all operations for authenticated users" ON category
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert default categories (matching existing hardcoded categories)
INSERT INTO category (key, name, icon, display_order, is_active) VALUES
('alterations', 'Alterations', '✂️', 1, true),
('accessories', 'Accessories', '🧵', 2, true),
('fabrics', 'Fabrics', '🪡', 3, true),
('curtains', 'Curtains', '🪟', 4, true),
('custom', 'Custom', '⚙️', 5, true)
ON CONFLICT (key) DO NOTHING;

