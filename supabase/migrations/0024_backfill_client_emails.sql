-- Backfill dummy emails for clients without email addresses
-- Email is now required for GHL contact sync

UPDATE client
SET email = CONCAT(
  LOWER(REPLACE(COALESCE(first_name, 'client'), ' ', '')),
  '.',
  LOWER(REPLACE(COALESCE(last_name, 'unknown'), ' ', '')),
  '@hottecouture.placeholder'
)
WHERE email IS NULL OR email = '';
