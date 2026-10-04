-- ============================================================================
-- Custom Auth Sync Hardening
-- Purpose:
-- 1) Make activity_logs work with custom session auth (anon key + app session)
-- 2) Normalize quest history/participants schema for current frontend upserts
-- 3) Ensure character_inventory is backend-authoritative with permissive custom-auth RLS
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Shared helper (safe overwrite)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Safe generic behavior: if the row type has an updated_at field, set it.
    -- If not, keep NEW unchanged (avoids runtime errors on legacy schemas).
    BEGIN
        NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', NOW()));
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACTIVITY LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.activity_logs
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS action_type TEXT,
    ADD COLUMN IF NOT EXISTS action_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_character_id ON public.activity_logs(character_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_admin_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_authenticated_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_service_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_public_select_custom_auth" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_public_insert_custom_auth" ON public.activity_logs;

-- Custom auth app: read/write is controlled at app layer (role in users table + admin UI).
CREATE POLICY "activity_logs_public_select_custom_auth"
    ON public.activity_logs
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "activity_logs_public_insert_custom_auth"
    ON public.activity_logs
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        (user_id IS NULL OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = activity_logs.user_id))
        AND
        (character_id IS NULL OR EXISTS (SELECT 1 FROM public.characters c WHERE c.id = activity_logs.character_id))
    );

GRANT SELECT, INSERT ON public.activity_logs TO anon, authenticated;

-- ============================================================================
-- QUEST PARTICIPANTS / HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rank TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_progress', 'locked')),
    repeatable BOOLEAN DEFAULT false,
    description TEXT,
    locations TEXT[] DEFAULT '{}',
    rewards JSONB DEFAULT '[]'::jsonb,
    images TEXT[] DEFAULT '{}',
    max_participants INTEGER DEFAULT 1 CHECK (max_participants > 0),
    completed_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quests
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available',
    ADD COLUMN IF NOT EXISTS repeatable BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS rewards JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS completed_by TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quests_status_check'
          AND conrelid = 'public.quests'::regclass
    ) THEN
        ALTER TABLE public.quests
            ADD CONSTRAINT quests_status_check
            CHECK (status IN ('available', 'in_progress', 'locked'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quests_max_participants_check'
          AND conrelid = 'public.quests'::regclass
    ) THEN
        ALTER TABLE public.quests
            ADD CONSTRAINT quests_max_participants_check
            CHECK (max_participants > 0);
    END IF;
END $$;

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quests" ON public.quests;
DROP POLICY IF EXISTS "Admins can insert quests" ON public.quests;
DROP POLICY IF EXISTS "Admins can update quests" ON public.quests;
DROP POLICY IF EXISTS "Admins can delete quests" ON public.quests;
DROP POLICY IF EXISTS "quests_public_select_custom_auth" ON public.quests;
DROP POLICY IF EXISTS "quests_public_insert_custom_auth" ON public.quests;
DROP POLICY IF EXISTS "quests_public_update_custom_auth" ON public.quests;
DROP POLICY IF EXISTS "quests_public_delete_custom_auth" ON public.quests;

CREATE POLICY "quests_public_select_custom_auth"
    ON public.quests
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "quests_public_insert_custom_auth"
    ON public.quests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "quests_public_update_custom_auth"
    ON public.quests
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "quests_public_delete_custom_auth"
    ON public.quests
    FOR DELETE
    TO anon, authenticated
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quests TO anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'quests_updated_at'
    ) THEN
        CREATE TRIGGER quests_updated_at
            BEFORE UPDATE ON public.quests
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quest_participants (
    quest_id TEXT NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (quest_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_participants_quest ON public.quest_participants(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_participants_character ON public.quest_participants(character_id);

ALTER TABLE public.quest_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quest participants" ON public.quest_participants;
DROP POLICY IF EXISTS "Anyone can join quests" ON public.quest_participants;
DROP POLICY IF EXISTS "Anyone can leave quests" ON public.quest_participants;
DROP POLICY IF EXISTS "quest_participants_public_select_custom_auth" ON public.quest_participants;
DROP POLICY IF EXISTS "quest_participants_public_insert_custom_auth" ON public.quest_participants;
DROP POLICY IF EXISTS "quest_participants_public_delete_custom_auth" ON public.quest_participants;

CREATE POLICY "quest_participants_public_select_custom_auth"
    ON public.quest_participants
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "quest_participants_public_insert_custom_auth"
    ON public.quest_participants
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "quest_participants_public_delete_custom_auth"
    ON public.quest_participants
    FOR DELETE
    TO anon, authenticated
    USING (true);

GRANT SELECT, INSERT, DELETE ON public.quest_participants TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.quest_history (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    rank TEXT NOT NULL,
    name TEXT NOT NULL,
    gains TEXT,
    character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    character_label TEXT,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quest_history
    ADD COLUMN IF NOT EXISTS gains TEXT,
    ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS character_label TEXT,
    ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_quest_history_character_id ON public.quest_history(character_id);
CREATE INDEX IF NOT EXISTS idx_quest_history_date ON public.quest_history(date);
CREATE INDEX IF NOT EXISTS idx_quest_history_type ON public.quest_history(type);

ALTER TABLE public.quest_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quest history" ON public.quest_history;
DROP POLICY IF EXISTS "Anyone can insert quest history" ON public.quest_history;
DROP POLICY IF EXISTS "quest_history_public_select_custom_auth" ON public.quest_history;
DROP POLICY IF EXISTS "quest_history_public_insert_custom_auth" ON public.quest_history;
DROP POLICY IF EXISTS "quest_history_public_update_custom_auth" ON public.quest_history;

CREATE POLICY "quest_history_public_select_custom_auth"
    ON public.quest_history
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "quest_history_public_insert_custom_auth"
    ON public.quest_history
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Required for UPSERT (ON CONFLICT DO UPDATE) paths.
CREATE POLICY "quest_history_public_update_custom_auth"
    ON public.quest_history
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.quest_history TO anon, authenticated;

-- Optional migration: hydrate normalized quest_participants from legacy quests.participants JSONB.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quests'
          AND column_name = 'participants'
    ) THEN
        INSERT INTO public.quest_participants (quest_id, character_id, joined_at)
        SELECT
            q.id,
            (COALESCE(
                NULLIF(p.entry->>'id', ''),
                NULLIF(regexp_replace(COALESCE(p.entry->>'key', ''), '^id:', ''), '')
            ))::uuid AS character_id,
            CASE
                WHEN COALESCE(p.entry->>'joinedAt', '') ~ '^\d+$' THEN to_timestamp((p.entry->>'joinedAt')::double precision / 1000.0)
                WHEN COALESCE(p.entry->>'joinedAt', '') ~ '^\d{4}-\d{2}-\d{2}' THEN (p.entry->>'joinedAt')::timestamptz
                ELSE NOW()
            END AS joined_at
        FROM public.quests q
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.participants, '[]'::jsonb)) AS p(entry)
        WHERE COALESCE(
                NULLIF(p.entry->>'id', ''),
                NULLIF(regexp_replace(COALESCE(p.entry->>'key', ''), '^id:', ''), '')
            ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ON CONFLICT (quest_id, character_id) DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- CHARACTER INVENTORY (backend authoritative)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.character_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    item_index INTEGER NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.character_inventory
    ADD COLUMN IF NOT EXISTS item_key TEXT,
    ADD COLUMN IF NOT EXISTS item_index INTEGER,
    ADD COLUMN IF NOT EXISTS qty INTEGER,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Force sane defaults/constraints for sync consistency.
UPDATE public.character_inventory
SET item_key = COALESCE(item_key, '')
WHERE item_key IS NULL;

UPDATE public.character_inventory
SET qty = 1
WHERE qty IS NULL OR qty <= 0;

ALTER TABLE public.character_inventory
    ALTER COLUMN item_key SET NOT NULL,
    ALTER COLUMN qty SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_character_inventory_unique
    ON public.character_inventory(character_id, item_key);

CREATE INDEX IF NOT EXISTS idx_character_inventory_character_id
    ON public.character_inventory(character_id);

CREATE INDEX IF NOT EXISTS idx_character_inventory_updated_at
    ON public.character_inventory(updated_at DESC);

ALTER TABLE public.character_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read inventory" ON public.character_inventory;
DROP POLICY IF EXISTS "Public can insert inventory" ON public.character_inventory;
DROP POLICY IF EXISTS "Public can update inventory" ON public.character_inventory;
DROP POLICY IF EXISTS "Public can delete inventory" ON public.character_inventory;
DROP POLICY IF EXISTS "character_inventory_public_select_custom_auth" ON public.character_inventory;
DROP POLICY IF EXISTS "character_inventory_public_insert_custom_auth" ON public.character_inventory;
DROP POLICY IF EXISTS "character_inventory_public_update_custom_auth" ON public.character_inventory;
DROP POLICY IF EXISTS "character_inventory_public_delete_custom_auth" ON public.character_inventory;

CREATE POLICY "character_inventory_public_select_custom_auth"
    ON public.character_inventory
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "character_inventory_public_insert_custom_auth"
    ON public.character_inventory
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        qty > 0
        AND EXISTS (
            SELECT 1
            FROM public.characters c
            WHERE c.id = character_inventory.character_id
        )
    );

CREATE POLICY "character_inventory_public_update_custom_auth"
    ON public.character_inventory
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (
        qty > 0
        AND EXISTS (
            SELECT 1
            FROM public.characters c
            WHERE c.id = character_inventory.character_id
        )
    );

CREATE POLICY "character_inventory_public_delete_custom_auth"
    ON public.character_inventory
    FOR DELETE
    TO anon, authenticated
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_inventory TO anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'character_inventory_updated_at'
    ) THEN
        CREATE TRIGGER character_inventory_updated_at
            BEFORE UPDATE ON public.character_inventory
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Notes
-- 1) This migration intentionally uses permissive RLS for anon/authenticated
--    because the project uses custom auth in application code.
-- 2) If you later migrate to Supabase Auth, tighten policies around auth.uid().
-- ============================================================================
