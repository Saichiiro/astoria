-- ============================================================================
-- Quests UPSERT Hotfix
-- Fixes:
-- 1) "record NEW has no field updated_at" from trigger function
-- 2) Missing quests columns expected by frontend upsert payload
-- ============================================================================

BEGIN;

-- Safe generic trigger function (works even if updated_at is missing).
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', NOW()));
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bring quests table in sync with frontend payload used in js/quetes.js.
ALTER TABLE IF EXISTS public.quests
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
    IF EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.quests'::regclass
    ) THEN
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
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class
        WHERE oid = 'public.quests'::regclass
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'quests_updated_at'
              AND tgrelid = 'public.quests'::regclass
        ) THEN
            DROP TRIGGER quests_updated_at ON public.quests;
        END IF;

        CREATE TRIGGER quests_updated_at
            BEFORE UPDATE ON public.quests
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;

COMMIT;
