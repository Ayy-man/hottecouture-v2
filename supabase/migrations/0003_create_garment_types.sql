-- Create garment_type table
CREATE TABLE garment_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    is_common BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to garment table
ALTER TABLE garment ADD COLUMN garment_type_id UUID REFERENCES garment_type(id);
ALTER TABLE garment ADD CONSTRAINT garment_type_fk FOREIGN KEY (garment_type_id) REFERENCES garment_type(id);

-- Create indexes
CREATE INDEX idx_garment_type_category ON garment_type(category);
CREATE INDEX idx_garment_type_is_common ON garment_type(is_common);
CREATE INDEX idx_garment_type_is_active ON garment_type(is_active);
CREATE INDEX idx_garment_garment_type_id ON garment(garment_type_id);

-- Enable RLS
ALTER TABLE garment_type ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Enable all operations for authenticated users" ON garment_type
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert garment types
INSERT INTO garment_type (code, name, category, icon, is_common) VALUES
-- Women's Clothing
('DRESS', 'Dress', 'womens', '👗', true),
('SKIRT', 'Skirt', 'womens', '👗', true),
('BLOUSE', 'Blouse', 'womens', '👚', true),
('PANTS', 'Pants', 'womens', '👖', true),
('JEANS', 'Jeans', 'womens', '👖', true),
('SHORTS', 'Shorts', 'womens', '🩳', true),
('LEGGINGS', 'Leggings', 'womens', '👖', false),
('JUMPSUIT', 'Jumpsuit', 'womens', '👗', false),
('ROMPER', 'Romper', 'womens', '👗', false),

-- Men's Clothing
('SHIRT', 'Shirt', 'mens', '👔', true),
('DRESS_SHIRT', 'Dress Shirt', 'mens', '👔', true),
('POLO', 'Polo Shirt', 'mens', '👕', true),
('T_SHIRT', 'T-Shirt', 'mens', '👕', true),
('TROUSERS', 'Trousers', 'mens', '👖', true),
('DRESS_PANTS', 'Dress Pants', 'mens', '👖', true),
('CHINOS', 'Chinos', 'mens', '👖', false),
('CARGO_PANTS', 'Cargo Pants', 'mens', '👖', false),

-- Outerwear
('JACKET', 'Jacket', 'outerwear', '🧥', true),
('BLAZER', 'Blazer', 'outerwear', '👔', true),
('COAT', 'Coat', 'outerwear', '🧥', true),
('SWEATER', 'Sweater', 'outerwear', '🧥', true),
('CARDIGAN', 'Cardigan', 'outerwear', '🧥', false),
('HOODIE', 'Hoodie', 'outerwear', '👕', false),
('VEST', 'Vest', 'outerwear', '🦺', false),

-- Formal Wear
('SUIT', 'Suit', 'formal', '👔', true),
('TUXEDO', 'Tuxedo', 'formal', '🎩', false),
('EVENING_GOWN', 'Evening Gown', 'formal', '👗', false),
('COCKTAIL_DRESS', 'Cocktail Dress', 'formal', '👗', false),

-- Activewear
('ATHLETIC_WEAR', 'Athletic Wear', 'activewear', '🏃', false),
('YOGA_PANTS', 'Yoga Pants', 'activewear', '🧘', false),
('SPORTS_JERSEY', 'Sports Jersey', 'activewear', '⚽', false),

-- Other
('OTHER', 'Other', 'other', '👕', true);
