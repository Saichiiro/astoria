-- ============================================================================
-- Items Rarity/Rank Normalization Hotfix
-- Fixes:
-- 1) items_rarity_check failures across mixed formats (Commun/common/commun/etc.)
-- 2) rank values like "Aucun" should become NULL safely
-- ============================================================================

BEGIN;

-- Ensure columns exist (safe for older schemas)
ALTER TABLE IF EXISTS public.items
    ADD COLUMN IF NOT EXISTS rarity TEXT,
    ADD COLUMN IF NOT EXISTS rank TEXT;

-- ----------------------------------------------------------------------------
-- Normalization helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_item_rarity_value(v TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    norm TEXT;
BEGIN
    IF v IS NULL OR btrim(v) = '' THEN
        RETURN NULL;
    END IF;

    norm := lower(
        translate(
            btrim(v),
            'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸàáâãäåæçèéêëìíîïñòóôõöùúûüýÿ',
            'AAAAAAACEEEEIIIINOOOOOUUUUYYaaaaaaaceeeeiiiinooooouuuuyy'
        )
    );

    -- English/French compatibility
    IF norm = 'common' THEN norm := 'commun'; END IF;
    IF norm = 'epic' THEN norm := 'epique'; END IF;
    IF norm = 'mythic' THEN norm := 'mythique'; END IF;
    IF norm = 'legendary' THEN norm := 'legendaire'; END IF;

    IF norm IN ('commun', 'rare', 'epique', 'mythique', 'legendaire') THEN
        RETURN norm;
    END IF;

    -- Unknown values become NULL instead of breaking write path.
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_item_rank_value(v TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    norm TEXT;
BEGIN
    IF v IS NULL OR btrim(v) = '' THEN
        RETURN NULL;
    END IF;

    norm := upper(btrim(v));

    IF norm IN ('AUCUN', 'NONE', 'NULL', '-') THEN
        RETURN NULL;
    END IF;

    IF norm IN ('F','E','D','C','B','A','S','S+','SS','SSS') THEN
        RETURN norm;
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.items_normalize_fields_trg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.rarity := public.normalize_item_rarity_value(NEW.rarity);
    NEW.rank := public.normalize_item_rank_value(NEW.rank);
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Apply normalization to existing rows before constraints are tightened.
-- ----------------------------------------------------------------------------

UPDATE public.items
SET
    rarity = public.normalize_item_rarity_value(rarity),
    rank = public.normalize_item_rank_value(rank)
WHERE true;

-- ----------------------------------------------------------------------------
-- Constraints (canonical)
-- ----------------------------------------------------------------------------

ALTER TABLE public.items
    DROP CONSTRAINT IF EXISTS items_rarity_check;

ALTER TABLE public.items
    ADD CONSTRAINT items_rarity_check CHECK (
        rarity IS NULL OR rarity IN ('commun', 'rare', 'epique', 'mythique', 'legendaire')
    );

ALTER TABLE public.items
    DROP CONSTRAINT IF EXISTS items_rank_check;

ALTER TABLE public.items
    ADD CONSTRAINT items_rank_check CHECK (
        rank IS NULL OR rank IN ('F','E','D','C','B','A','S','S+','SS','SSS')
    );

-- ----------------------------------------------------------------------------
-- Trigger (insert/update safety)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'items_normalize_fields'
          AND tgrelid = 'public.items'::regclass
    ) THEN
        DROP TRIGGER items_normalize_fields ON public.items;
    END IF;

    CREATE TRIGGER items_normalize_fields
        BEFORE INSERT OR UPDATE ON public.items
        FOR EACH ROW
        EXECUTE FUNCTION public.items_normalize_fields_trg();
END $$;

CREATE INDEX IF NOT EXISTS idx_items_rarity ON public.items(rarity);
CREATE INDEX IF NOT EXISTS idx_items_rank ON public.items(rank);

COMMIT;
