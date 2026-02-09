-- ============================================================================
-- Fix Activity Logs RLS Policy v2
-- Completely rebuild policies with both USING and WITH CHECK clauses
-- ============================================================================

-- Drop ALL existing policies on activity_logs
DROP POLICY IF EXISTS "activity_logs_admin_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_authenticated_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_service_insert" ON public.activity_logs;

-- Policy: Only admins can SELECT logs
CREATE POLICY "activity_logs_admin_select"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Policy: Any authenticated user can INSERT logs
-- Uses both USING and WITH CHECK for complete permission
CREATE POLICY "activity_logs_authenticated_insert"
ON public.activity_logs
FOR INSERT
TO authenticated
USING (true)  -- Allow reading for insert operation
WITH CHECK (true);  -- Allow the actual insert

-- Policy: Service role can INSERT (for server-side logging)
CREATE POLICY "activity_logs_service_insert"
ON public.activity_logs
FOR INSERT
TO service_role
USING (true)
WITH CHECK (true);

-- Verify grants
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- Comment
COMMENT ON POLICY "activity_logs_authenticated_insert" ON public.activity_logs IS
'Allows any authenticated user to insert activity logs. Both USING and WITH CHECK set to true for permissive access.';
