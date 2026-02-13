-- ============================================================================
-- Supabase Auth Transition (Phase 1: linked identities + hybrid RLS)
-- Purpose:
-- 1) Link public.users rows to auth.users via auth_user_id
-- 2) Prepare existing users for auth migration with deterministic auth_email
-- 3) Add auth.uid()-based policies without breaking legacy login bridge
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- users <-> auth.users link
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS auth_user_id UUID,
    ADD COLUMN IF NOT EXISTS auth_email TEXT,
    ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.users'::regclass
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_auth_user_id_fkey'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_auth_user_id_fkey
            FOREIGN KEY (auth_user_id)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Deterministic fallback email used by frontend migration-on-login.
UPDATE public.users u
SET auth_email = lower(
    regexp_replace(
        regexp_replace(
            COALESCE(NULLIF(trim(u.username), ''), 'player'),
            '[^a-zA-Z0-9._-]+',
            '.',
            'g'
        ),
        '[.]{2,}',
        '.',
        'g'
    )
    || '.'
    || substr(replace(COALESCE(u.id::text, ''), '-', ''), 1, 8)
    || '@astoria.local'
)
WHERE COALESCE(trim(u.auth_email), '') = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id_unique
    ON public.users(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_email_unique
    ON public.users((lower(auth_email)))
    WHERE auth_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role
    ON public.users(role);

-- ---------------------------------------------------------------------------
-- Helpers for auth.uid() -> public.users resolution
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT u.id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_app_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
          AND u.role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.current_app_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: users (hybrid during migration)
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_auth_select_self_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_auth_insert_linked_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_auth_update_self_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_auth_delete_admin_only" ON public.users;
DROP POLICY IF EXISTS "users_auth_anon_login_lookup" ON public.users;
DROP POLICY IF EXISTS "users_auth_anon_legacy_link_update" ON public.users;

CREATE POLICY "users_auth_select_self_or_admin"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    );

CREATE POLICY "users_auth_insert_linked_or_admin"
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth_user_id = auth.uid()
        OR public.current_app_user_is_admin()
    );

CREATE POLICY "users_auth_update_self_or_admin"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    )
    WITH CHECK (
        (
            id = public.current_app_user_id()
            AND (auth_user_id IS NULL OR auth_user_id = auth.uid())
        )
        OR public.current_app_user_is_admin()
    );

CREATE POLICY "users_auth_delete_admin_only"
    ON public.users
    FOR DELETE
    TO authenticated
    USING (public.current_app_user_is_admin());

-- Temporary bridge for username-based login + legacy first-login migration.
-- Remove these two policies once all users are linked and auth-service no longer
-- queries/updates public.users before auth sign-in.
CREATE POLICY "users_auth_anon_login_lookup"
    ON public.users
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "users_auth_anon_legacy_link_update"
    ON public.users
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

GRANT SELECT, UPDATE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: characters (owner/admin)
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "characters_auth_select_owner_or_admin" ON public.characters;
DROP POLICY IF EXISTS "characters_auth_insert_owner_or_admin" ON public.characters;
DROP POLICY IF EXISTS "characters_auth_update_owner_or_admin" ON public.characters;
DROP POLICY IF EXISTS "characters_auth_delete_owner_or_admin" ON public.characters;

CREATE POLICY "characters_auth_select_owner_or_admin"
    ON public.characters
    FOR SELECT
    TO authenticated
    USING (
        user_id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    );

CREATE POLICY "characters_auth_insert_owner_or_admin"
    ON public.characters
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    );

CREATE POLICY "characters_auth_update_owner_or_admin"
    ON public.characters
    FOR UPDATE
    TO authenticated
    USING (
        user_id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    )
    WITH CHECK (
        user_id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    );

CREATE POLICY "characters_auth_delete_owner_or_admin"
    ON public.characters
    FOR DELETE
    TO authenticated
    USING (
        user_id = public.current_app_user_id()
        OR public.current_app_user_is_admin()
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;

COMMIT;

-- Notes:
-- - Existing legacy users are migrated progressively on first login in frontend
--   (username/password validated, then linked to Supabase Auth).
-- - After all active users are linked, drop legacy bridge policies on users
--   and remove password_hash safely.
