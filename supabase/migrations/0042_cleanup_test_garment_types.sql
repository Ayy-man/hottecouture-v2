-- Soft-delete test entries from garment_type table (BUG-5)
-- Uses soft delete (is_active = false) to preserve FK integrity
-- if any orders reference these types via garment.garment_type_id
UPDATE garment_type
SET is_active = false, updated_at = NOW()
WHERE LOWER(name) IN ('h', 'testingg', 'tapis')
  AND is_custom = true;
