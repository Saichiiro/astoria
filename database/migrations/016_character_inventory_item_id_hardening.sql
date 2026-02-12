-- ============================================================================
-- Character Inventory UUID Hardening
-- Purpose:
-- 1) Add item_id reference to avoid name-based mismatches
-- 2) Backfill existing rows from item_key -> items.id
-- 3) Keep item_key/item_id synchronized on insert/update
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.normalize_inventory_item_key(v TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF v IS NULL OR btrim(v) = '' THEN
        RETURN '';
    END IF;

    RETURN lower(
        regexp_replace(
            translate(
                btrim(v),
                'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸàáâãäåæçèéêëìíîïñòóôõöùúûüýÿ',
                'AAAAAAACEEEEIIIINOOOOOUUUUYYaaaaaaaceeeeiiiinooooouuuuyy'
            ),
            '\s+',
            ' ',
            'g'
        )
    );
END;
$$;

ALTER TABLE IF EXISTS public.character_inventory
    ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_character_inventory_item_id
    ON public.character_inventory(item_id);

-- Backfill UUID references from canonicalized item names.
UPDATE public.character_inventory ci
SET
    item_id = it.id,
    item_key = it.name
FROM public.items it
WHERE public.normalize_inventory_item_key(ci.item_key) = public.normalize_inventory_item_key(it.name)
  AND (ci.item_id IS DISTINCT FROM it.id OR ci.item_key IS DISTINCT FROM it.name);

-- Consolidate duplicates that now point to same character+item_id.
WITH grouped AS (
    SELECT
        character_id,
        item_id,
        SUM(qty) AS merged_qty
    FROM public.character_inventory
    WHERE item_id IS NOT NULL
    GROUP BY character_id, item_id
    HAVING COUNT(*) > 1
),
dupes AS (
    SELECT DISTINCT ON (ci.character_id, ci.item_id)
        ci.character_id,
        ci.item_id,
        ci.id AS keep_id,
        g.merged_qty
    FROM public.character_inventory ci
    JOIN grouped g
      ON g.character_id = ci.character_id
     AND g.item_id = ci.item_id
    ORDER BY ci.character_id, ci.item_id, ci.created_at ASC, ci.id ASC
)
UPDATE public.character_inventory ci
SET qty = d.merged_qty
FROM dupes d
WHERE ci.id = d.keep_id;

WITH dupes AS (
    SELECT DISTINCT ON (character_id, item_id)
        character_id,
        item_id,
        id AS keep_id
    FROM public.character_inventory
    WHERE item_id IS NOT NULL
    ORDER BY character_id, item_id, created_at ASC, id ASC
)
DELETE FROM public.character_inventory ci
USING dupes d
WHERE ci.character_id = d.character_id
  AND ci.item_id = d.item_id
  AND ci.id <> d.keep_id;

DROP INDEX IF EXISTS idx_character_inventory_unique_item_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_inventory_unique_item_id
    ON public.character_inventory(character_id, item_id);

CREATE OR REPLACE FUNCTION public.character_inventory_sync_item_refs_trg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    matched_id UUID;
    matched_name TEXT;
BEGIN
    -- Prefer UUID when provided.
    IF NEW.item_id IS NOT NULL THEN
        SELECT i.name INTO matched_name
        FROM public.items i
        WHERE i.id = NEW.item_id;

        IF matched_name IS NOT NULL THEN
            NEW.item_key := matched_name;
        END IF;
    END IF;

    -- Backfill UUID from item_key when possible.
    IF NEW.item_id IS NULL AND COALESCE(btrim(NEW.item_key), '') <> '' THEN
        SELECT i.id, i.name INTO matched_id, matched_name
        FROM public.items i
        WHERE public.normalize_inventory_item_key(i.name) = public.normalize_inventory_item_key(NEW.item_key)
        ORDER BY i.created_at ASC NULLS LAST, i.id ASC
        LIMIT 1;

        IF matched_id IS NOT NULL THEN
            NEW.item_id := matched_id;
            NEW.item_key := matched_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'character_inventory_sync_item_refs'
          AND tgrelid = 'public.character_inventory'::regclass
    ) THEN
        DROP TRIGGER character_inventory_sync_item_refs ON public.character_inventory;
    END IF;

    CREATE TRIGGER character_inventory_sync_item_refs
        BEFORE INSERT OR UPDATE ON public.character_inventory
        FOR EACH ROW
        EXECUTE FUNCTION public.character_inventory_sync_item_refs_trg();
END $$;

COMMIT;
