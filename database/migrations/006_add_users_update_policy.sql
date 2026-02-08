-- ============================================================================
-- Add UPDATE policy for users table
-- Fixes: last_login updates were being silently blocked by RLS
-- ============================================================================

-- Drop existing policy if it exists (in case of re-running migration)
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;

-- Create UPDATE policy for users table
-- NOTE: This project uses custom auth (not Supabase Auth), so policies are permissive
-- In production, you may want to restrict this to:
-- - Users updating their own last_login
-- - Admins updating any user fields
CREATE POLICY "Anyone can update users"
    ON public.users FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Grant UPDATE permission to authenticated role
GRANT UPDATE ON public.users TO authenticated;
GRANT UPDATE ON public.users TO anon;

-- Comment on the policy
COMMENT ON POLICY "Anyone can update users" ON public.users IS 'Allows updates to users table (e.g., last_login tracking). Uses permissive policy for custom auth.';
