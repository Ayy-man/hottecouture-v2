-- Phase 6 MKT-116: Decimal quantities + accessory recategorization

-- Operation 1: Change garment_service.quantity from INTEGER to NUMERIC(10,2)
-- Safely converts existing integer values (1, 2, 3) to (1.00, 2.00, 3.00)
ALTER TABLE garment_service
  ALTER COLUMN quantity TYPE NUMERIC(10,2)
  USING quantity::NUMERIC(10,2);

-- Operation 2: Normalize service.category to use plural forms matching category.key
-- Fixes the singular/plural mismatch (service table used 'alteration' singular,
-- category table uses 'alterations' plural)
UPDATE service SET category = 'alterations'
WHERE lower(category) = 'alteration';

-- Operation 3: Recategorize product services from alterations to accessories
-- Match by name keywords (supports French and English service names)
UPDATE service SET category = 'accessories'
WHERE lower(name) SIMILAR TO '%(zipper|fermeture|zip|bouton|button|velcro|thread|fil)%'
  AND lower(category) IN ('alteration', 'alterations');

-- Also explicitly recategorize by known seed codes
UPDATE service SET category = 'accessories'
WHERE code IN ('ZIPPER', 'BUTTONS')
  AND category != 'accessories';
