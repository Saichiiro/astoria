-- ============================================================================
-- Character Rank Server Projection
-- Purpose:
-- 1) Compute rank_score from profile_data.competences (combat + pouvoirs)
-- 2) Derive rank from the same CSV thresholds used by frontend
-- 3) Keep profile_data.inventory snapshot in sync server-side
-- ============================================================================

BEGIN;

-- Ensure destination columns exist.
ALTER TABLE IF EXISTS public.characters
    ADD COLUMN IF NOT EXISTS rank TEXT,
    ADD COLUMN IF NOT EXISTS rank_score INTEGER;

ALTER TABLE public.characters
    ALTER COLUMN rank SET DEFAULT 'F',
    ALTER COLUMN rank_score SET DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sum_json_object_positive_values(v JSONB)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT COALESCE(SUM(GREATEST((entry.value)::numeric, 0)), 0)::integer
    FROM jsonb_each_text(
        CASE
            WHEN jsonb_typeof(v) = 'object' THEN v
            ELSE '{}'::jsonb
        END
    ) AS entry(key, value)
    WHERE entry.value ~ '^-?[0-9]+(\\.[0-9]+)?$';
$$;

CREATE OR REPLACE FUNCTION public.compute_character_rank_score(profile JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    competences JSONB;
    category_id TEXT;
    category_score INTEGER := 0;
    total_score INTEGER := 0;
BEGIN
    IF jsonb_typeof(profile) = 'object' THEN
        competences := COALESCE(profile->'competences', '{}'::jsonb);
    ELSE
        competences := '{}'::jsonb;
    END IF;

    FOREACH category_id IN ARRAY ARRAY['combat', 'pouvoirs'] LOOP
        category_score :=
            public.sum_json_object_positive_values(competences->'baseValuesByCategory'->category_id)
            + public.sum_json_object_positive_values(competences->'allocationsByCategory'->category_id);

        total_score := total_score + COALESCE(category_score, 0);
    END LOOP;

    RETURN GREATEST(total_score, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.rank_from_score(score INTEGER)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN COALESCE(score, 0) <= 230 THEN 'F'
        WHEN score <= 510 THEN 'E'
        WHEN score <= 840 THEN 'D'
        WHEN score <= 1220 THEN 'C'
        WHEN score <= 1650 THEN 'B'
        WHEN score <= 2130 THEN 'A'
        WHEN score <= 2670 THEN 'S'
        WHEN score <= 3270 THEN 'S+'
        WHEN score <= 3920 THEN 'SS'
        ELSE 'SSS'
    END;
$$;

CREATE OR REPLACE FUNCTION public.apply_rank_to_profile_inventory(
    profile JSONB,
    computed_rank TEXT,
    computed_score INTEGER,
    source_label TEXT DEFAULT 'server'
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    safe_profile JSONB;
    inventory_obj JSONB;
BEGIN
    safe_profile := CASE
        WHEN jsonb_typeof(profile) = 'object' THEN profile
        ELSE '{}'::jsonb
    END;

    inventory_obj := CASE
        WHEN jsonb_typeof(safe_profile->'inventory') = 'object' THEN safe_profile->'inventory'
        ELSE '{}'::jsonb
    END;

    inventory_obj := jsonb_set(inventory_obj, '{characterRank}', to_jsonb(COALESCE(computed_rank, 'F')), true);
    inventory_obj := jsonb_set(inventory_obj, '{characterRankScore}', to_jsonb(COALESCE(computed_score, 0)), true);
    inventory_obj := jsonb_set(inventory_obj, '{characterRankSource}', to_jsonb(COALESCE(source_label, 'server')), true);

    RETURN jsonb_set(safe_profile, '{inventory}', inventory_obj, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Constraints + indexes
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'characters_rank_check'
          AND conrelid = 'public.characters'::regclass
    ) THEN
        ALTER TABLE public.characters
            ADD CONSTRAINT characters_rank_check
            CHECK (rank IN ('F','E','D','C','B','A','S','S+','SS','SSS'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'characters_rank_score_check'
          AND conrelid = 'public.characters'::regclass
    ) THEN
        ALTER TABLE public.characters
            ADD CONSTRAINT characters_rank_score_check
            CHECK (rank_score >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_characters_rank ON public.characters(rank);
CREATE INDEX IF NOT EXISTS idx_characters_rank_score ON public.characters(rank_score DESC);

-- ---------------------------------------------------------------------------
-- Backfill current rows from profile_data
-- ---------------------------------------------------------------------------

WITH computed AS (
    SELECT
        c.id,
        public.compute_character_rank_score(c.profile_data) AS score
    FROM public.characters c
)
UPDATE public.characters c
SET
    rank_score = computed.score,
    rank = public.rank_from_score(computed.score),
    profile_data = public.apply_rank_to_profile_inventory(
        c.profile_data,
        public.rank_from_score(computed.score),
        computed.score,
        'server'
    )
FROM computed
WHERE c.id = computed.id;

-- ---------------------------------------------------------------------------
-- Trigger: keep projection synced when profile_data changes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.characters_sync_rank_from_profile_trg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    computed_score INTEGER;
    computed_rank TEXT;
BEGIN
    computed_score := public.compute_character_rank_score(NEW.profile_data);
    computed_rank := public.rank_from_score(computed_score);

    NEW.rank_score := computed_score;
    NEW.rank := computed_rank;
    NEW.profile_data := public.apply_rank_to_profile_inventory(
        NEW.profile_data,
        computed_rank,
        computed_score,
        'server'
    );

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'characters_sync_rank_from_profile'
          AND tgrelid = 'public.characters'::regclass
    ) THEN
        DROP TRIGGER characters_sync_rank_from_profile ON public.characters;
    END IF;

    CREATE TRIGGER characters_sync_rank_from_profile
        BEFORE INSERT OR UPDATE OF profile_data
        ON public.characters
        FOR EACH ROW
        EXECUTE FUNCTION public.characters_sync_rank_from_profile_trg();
END $$;

-- Optional RPC for manual resync after bulk imports or admin fixes.
CREATE OR REPLACE FUNCTION public.recompute_character_rank(p_character_id UUID DEFAULT NULL)
RETURNS TABLE(character_id UUID, rank TEXT, rank_score INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_character_id IS NULL THEN
        RETURN QUERY
        WITH computed AS (
            SELECT
                c.id,
                public.compute_character_rank_score(c.profile_data) AS score
            FROM public.characters c
        ),
        updated AS (
            UPDATE public.characters c
            SET
                rank_score = computed.score,
                rank = public.rank_from_score(computed.score),
                profile_data = public.apply_rank_to_profile_inventory(
                    c.profile_data,
                    public.rank_from_score(computed.score),
                    computed.score,
                    'server'
                )
            FROM computed
            WHERE c.id = computed.id
            RETURNING c.id, c.rank, c.rank_score
        )
        SELECT u.id, u.rank, u.rank_score
        FROM updated u;
    ELSE
        RETURN QUERY
        WITH computed AS (
            SELECT
                c.id,
                public.compute_character_rank_score(c.profile_data) AS score
            FROM public.characters c
            WHERE c.id = p_character_id
        ),
        updated AS (
            UPDATE public.characters c
            SET
                rank_score = computed.score,
                rank = public.rank_from_score(computed.score),
                profile_data = public.apply_rank_to_profile_inventory(
                    c.profile_data,
                    public.rank_from_score(computed.score),
                    computed.score,
                    'server'
                )
            FROM computed
            WHERE c.id = computed.id
            RETURNING c.id, c.rank, c.rank_score
        )
        SELECT u.id, u.rank, u.rank_score
        FROM updated u;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_character_rank(UUID) TO anon, authenticated;

COMMIT;
