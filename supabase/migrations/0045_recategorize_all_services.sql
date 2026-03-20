-- Fix: recategorize services that were invisible in the 2-step intake form
-- After MKT-116 split, only 'alterations' and 'accessories' categories are queried.
-- Services in curtains, fabrics, jeans, custom, null were hidden unintentionally.

-- Curtains = labour work → alterations
UPDATE service SET category = 'alterations' WHERE category = 'curtains';

-- Fabrics = product sales → accessories
UPDATE service SET category = 'accessories' WHERE category = 'fabrics';

-- Jeans = labour work → alterations
UPDATE service SET category = 'alterations' WHERE category = 'jeans';

-- Custom = labour work → alterations
UPDATE service SET category = 'alterations' WHERE lower(category) = 'custom';

-- Uncategorized (null) = mostly labour (Bord Machine, Bord Robe, etc.) → alterations
UPDATE service SET category = 'alterations' WHERE category IS NULL;

-- Junk test category → deactivate
UPDATE service SET is_active = false WHERE category = 'examplecategory';
