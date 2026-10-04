-- ============================================================================
-- Add is_active status to users and characters
-- Allows deactivating accounts and characters without deletion
-- ============================================================================

-- Add is_active to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active to characters table
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for filtering active/inactive records
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_characters_is_active ON public.characters(is_active);

-- Comments
COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active. Inactive users cannot login.';
COMMENT ON COLUMN public.characters.is_active IS 'Whether the character is active. Inactive characters cannot be used.';

-- Update existing records to be active by default
UPDATE public.users SET is_active = true WHERE is_active IS NULL;
UPDATE public.characters SET is_active = true WHERE is_active IS NULL;
