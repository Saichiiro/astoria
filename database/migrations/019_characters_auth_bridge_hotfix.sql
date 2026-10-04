-- ============================================================================
-- Characters Auth Bridge Hotfix
-- Purpose:
-- 1) Prevent 401/blocked gameplay during Supabase Auth rollout
-- 2) Keep authenticated owner/admin policies
-- 3) Re-enable temporary anon bridge for legacy pages/session flow
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "characters_anon_bridge_select" ON public.characters;
DROP POLICY IF EXISTS "characters_anon_bridge_insert" ON public.characters;
DROP POLICY IF EXISTS "characters_anon_bridge_update" ON public.characters;
DROP POLICY IF EXISTS "characters_anon_bridge_delete" ON public.characters;

CREATE POLICY "characters_anon_bridge_select"
    ON public.characters
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "characters_anon_bridge_insert"
    ON public.characters
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "characters_anon_bridge_update"
    ON public.characters
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "characters_anon_bridge_delete"
    ON public.characters
    FOR DELETE
    TO anon
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO anon;

COMMIT;

-- NOTE:
-- Remove this bridge once all clients are guaranteed Supabase-authenticated
-- on every call path and auth migration is complete.
