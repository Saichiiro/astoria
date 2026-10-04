-- ============================================================================
-- Fix Activity Logs RLS Policy
-- Allow authenticated users to insert activity logs without strict user_id check
-- ============================================================================

-- Drop the overly restrictive INSERT policy
DROP POLICY IF EXISTS "activity_logs_authenticated_insert" ON public.activity_logs;

-- Create a more permissive policy for authenticated users
-- Allows logging for any authenticated user without requiring user_id to match auth.uid()
-- This is needed because activity logging can happen for character actions
-- where the user_id is auto-detected from the session
CREATE POLICY "activity_logs_authenticated_insert"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
    -- Allow if user is authenticated (no strict user_id check needed)
    -- The application layer handles user_id auto-detection
    true
);

-- Keep admin bypass for completeness
-- (Admins can still insert logs for any user)

-- Comment on the policy change
COMMENT ON POLICY "activity_logs_authenticated_insert" ON public.activity_logs IS
'Allows authenticated users to insert activity logs. User ID is auto-detected by the application layer from the session.';
