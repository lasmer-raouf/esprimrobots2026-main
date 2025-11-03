-- Add new roles to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'founder';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'executive';

-- Note: The actual user data will be inserted after the migration is approved