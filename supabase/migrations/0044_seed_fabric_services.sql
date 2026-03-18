-- MKT-117: Pre-built fabric accessory services with unit-based pricing
-- Fabric items appear in AccessoriesStep (category = 'accessories')
-- base_price_cents = 0 forces user to enter price at order time

INSERT INTO service (code, name, base_price_cents, category, unit, is_custom, display_order, is_active)
VALUES
  ('FABRIC_YARD', 'Tissu au verge',      0, 'accessories', 'yard',  false, 100, true),
  ('FABRIC_SQFT', 'Tissu au pied carre', 0, 'accessories', 'sq ft', false, 101, true)
ON CONFLICT (code) DO NOTHING;
