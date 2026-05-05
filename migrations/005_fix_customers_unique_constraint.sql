-- Migration 005: Fix customers unique constraint for multi-tenancy
-- The old constraint was UNIQUE(phone_number) which breaks when the same
-- phone number contacts multiple merchants. Replace with UNIQUE(phone_number, user_id).

-- Step 1: Assign existing customers with NULL user_id to the first user found
-- (handles pre-migration data from single-tenant era)
UPDATE customers
SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1)
WHERE user_id IS NULL;

-- Step 2: Drop the old single-column unique constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_number_key;

-- Step 3: Add composite unique constraint for multi-tenancy
ALTER TABLE customers ADD CONSTRAINT customers_phone_number_user_id_key UNIQUE (phone_number, user_id);
