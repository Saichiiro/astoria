-- ============================================================================
-- Activity Logs Table
-- Tracks all player actions for admin monitoring and audit trails
-- ============================================================================

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- User and character references
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,

    -- Action details
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}',

    -- Additional metadata
    metadata JSONB DEFAULT '{}',

    -- Indexes for efficient querying
    CONSTRAINT activity_logs_action_type_check CHECK (action_type <> '')
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_character_id ON public.activity_logs(character_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON public.activity_logs(user_id, action_type);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_char_created ON public.activity_logs(character_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "activity_logs_admin_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_service_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_authenticated_insert" ON public.activity_logs;

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

-- Policy: Authenticated users can INSERT their own logs
CREATE POLICY "activity_logs_authenticated_insert"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Policy: Service role can INSERT (for server-side logging)
CREATE POLICY "activity_logs_service_insert"
ON public.activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- Create a function to clean up old logs (optional, run manually or via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.activity_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Comment on table and columns
COMMENT ON TABLE public.activity_logs IS 'Activity audit log for tracking all player actions';
COMMENT ON COLUMN public.activity_logs.action_type IS 'Type of action performed (e.g., item_purchase, quest_join)';
COMMENT ON COLUMN public.activity_logs.action_data IS 'Structured data about the action in JSON format';
COMMENT ON COLUMN public.activity_logs.metadata IS 'Additional metadata like timestamp, user_agent, IP address';

-- Create a view for admin dashboard with enriched data
CREATE OR REPLACE VIEW public.activity_logs_enriched AS
SELECT
    al.id,
    al.created_at,
    al.action_type,
    al.action_data,
    al.metadata,
    u.id as user_id,
    u.role as user_role,
    c.id as character_id,
    c.name as character_name,
    c.race as character_race,
    c.class as character_class
FROM public.activity_logs al
LEFT JOIN public.users u ON al.user_id = u.id
LEFT JOIN public.characters c ON al.character_id = c.id;

-- Grant SELECT on view to admins
GRANT SELECT ON public.activity_logs_enriched TO authenticated;

-- Example queries for testing:
--
-- -- Get recent activity
-- SELECT * FROM activity_logs_enriched
-- ORDER BY created_at DESC
-- LIMIT 100;
--
-- -- Get activity by user ID
-- SELECT * FROM activity_logs_enriched
-- WHERE user_id = 'user-uuid-here'
-- ORDER BY created_at DESC;
--
-- -- Get activity stats by type
-- SELECT action_type, COUNT(*) as count
-- FROM activity_logs
-- WHERE created_at >= NOW() - INTERVAL '7 days'
-- GROUP BY action_type
-- ORDER BY count DESC;
--
-- -- Cleanup logs older than 90 days
-- SELECT public.cleanup_old_activity_logs(90);
