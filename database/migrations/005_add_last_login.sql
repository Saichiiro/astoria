-- ============================================================================
-- Add last_login tracking to users table
-- ============================================================================

-- Add last_login column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login DESC);

-- Comment on column
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of the user''s last successful login';

-- Function to update last_login on auth
CREATE OR REPLACE FUNCTION public.update_user_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET last_login = NOW()
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

-- Note: Supabase Auth doesn't have direct triggers we can hook into,
-- so we'll need to update last_login manually in the application code
-- when a user successfully logs in.
