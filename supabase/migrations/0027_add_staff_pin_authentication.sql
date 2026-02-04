-- Migration: Add PIN-based staff authentication and one-task-per-person enforcement
-- This enables staff to clock in with a 4-digit PIN and ensures only one active task per person

-- Add PIN hash column to staff table for authentication
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(64);

-- Add last clock in timestamp for session tracking
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_clock_in TIMESTAMPTZ;

-- Create unique partial index to enforce one active task per staff member at database level
-- This prevents multiple garments being active for the same assignee
CREATE UNIQUE INDEX IF NOT EXISTS idx_garment_one_active_per_assignee
  ON garment(assignee)
  WHERE is_active = true AND assignee IS NOT NULL;

-- Create index for faster staff name lookups
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);

-- Set unique PINs for each staff member
UPDATE staff SET pin_hash = '1235' WHERE name = 'Audrey' AND pin_hash IS NULL;
UPDATE staff SET pin_hash = '1236' WHERE name = 'Solange' AND pin_hash IS NULL;
UPDATE staff SET pin_hash = '1237' WHERE name = 'Audrey-Anne' AND pin_hash IS NULL;
