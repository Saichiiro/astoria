-- ============================================================================
-- Migration 025: character_equipped table
-- Remplace profile_data.inventory.equippedSlots (JSONB blob) par une table
-- relationnelle propre. Max 15 lignes par personnage × ~80 bytes = ~1.2 KB/perso.
--
-- ORDRE D'EXÉCUTION :
--   1. SECTION A  — Créer la table + index + RLS + trigger
--   2. SECTION B  — Vérifier les données sources (SELECT, rien n'est modifié)
--   3. SECTION C  — Migrer les données depuis profile_data
--   4. SECTION D  — Vérifier les données migrées (SELECT avant cleanup)
--   5. SECTION E  — Nettoyer profile_data (supprimer equippedSlots du blob)
--
-- !! Exécute les sections B et D AVANT D et E. Si les données semblent
--    correctes, passe à la suite. Si quelque chose cloche, NE LANCE PAS E. !!
-- ============================================================================


-- ============================================================================
-- SECTION A — Structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.character_equipped (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID       NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    slot_key    TEXT        NOT NULL,
    item_id     UUID        REFERENCES public.items(id) ON DELETE SET NULL,
    item_key    TEXT        NOT NULL DEFAULT '',
    item_index  INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT character_equipped_slot_unique UNIQUE (character_id, slot_key)
);

-- Index pour getEquippedSlots(characterId) — query la plus fréquente
CREATE INDEX IF NOT EXISTS idx_character_equipped_character_id
    ON public.character_equipped(character_id);

ALTER TABLE public.character_equipped ENABLE ROW LEVEL SECURITY;

-- Même pattern RLS que character_inventory (custom auth, anon key)
CREATE POLICY "Public can read equipped"
    ON public.character_equipped FOR SELECT
    USING (true);

CREATE POLICY "Public can insert equipped"
    ON public.character_equipped FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can update equipped"
    ON public.character_equipped FOR UPDATE
    USING (true);

CREATE POLICY "Public can delete equipped"
    ON public.character_equipped FOR DELETE
    USING (true);

-- Trigger updated_at (réutilise la fonction déjà existante)
CREATE TRIGGER character_equipped_updated_at
    BEFORE UPDATE ON public.character_equipped
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- SECTION B — Vérification des sources (lecture seule, rien n'est modifié)
--             Lance ce SELECT et vérifie que tes persos ont bien leurs équipements
-- ============================================================================

SELECT
    c.name                                          AS character_name,
    kv.key                                          AS slot_key,
    COALESCE(
        NULLIF(TRIM(kv.value->>'item_key'), ''),
        NULLIF(TRIM(kv.value->>'name'), ''),
        '(sans nom)'
    )                                               AS item_key,
    NULLIF(TRIM(COALESCE(kv.value->>'item_id', kv.value->>'id', '')), '')
                                                    AS item_id,
    CASE
        WHEN (kv.value->>'item_index') ~ '^-?[0-9]+$' THEN (kv.value->>'item_index')::int
        WHEN (kv.value->>'sourceIndex') ~ '^-?[0-9]+$' THEN (kv.value->>'sourceIndex')::int
        ELSE NULL
    END                                             AS item_index
FROM public.characters c
CROSS JOIN LATERAL jsonb_each(c.profile_data->'inventory'->'equippedSlots') AS kv(key, value)
WHERE
    c.profile_data->'inventory'->'equippedSlots' IS NOT NULL
    AND jsonb_typeof(c.profile_data->'inventory'->'equippedSlots') = 'object'
ORDER BY c.name, kv.key;


-- ============================================================================
-- SECTION C — Migration des données
--             (INSERT depuis profile_data → character_equipped)
--             ON CONFLICT DO NOTHING = idempotent, safe à relancer.
-- ============================================================================

INSERT INTO public.character_equipped (character_id, slot_key, item_id, item_key, item_index)
SELECT
    c.id                                            AS character_id,
    kv.key                                          AS slot_key,
    CASE
        WHEN NULLIF(TRIM(COALESCE(kv.value->>'item_id', kv.value->>'id', '')), '')
             ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN NULLIF(TRIM(COALESCE(kv.value->>'item_id', kv.value->>'id', '')), '')::uuid
        ELSE NULL
    END                                             AS item_id,
    COALESCE(
        NULLIF(TRIM(kv.value->>'item_key'), ''),
        NULLIF(TRIM(kv.value->>'name'), ''),
        ''
    )                                               AS item_key,
    CASE
        WHEN (kv.value->>'item_index') ~ '^-?[0-9]+$' THEN (kv.value->>'item_index')::int
        WHEN (kv.value->>'sourceIndex') ~ '^-?[0-9]+$' THEN (kv.value->>'sourceIndex')::int
        ELSE NULL
    END                                             AS item_index
FROM public.characters c
CROSS JOIN LATERAL jsonb_each(c.profile_data->'inventory'->'equippedSlots') AS kv(key, value)
WHERE
    c.profile_data->'inventory'->'equippedSlots' IS NOT NULL
    AND jsonb_typeof(c.profile_data->'inventory'->'equippedSlots') = 'object'
    AND COALESCE(
        NULLIF(TRIM(kv.value->>'item_key'), ''),
        NULLIF(TRIM(kv.value->>'name'), ''),
        ''
    ) <> ''
ON CONFLICT (character_id, slot_key) DO NOTHING;


-- ============================================================================
-- SECTION D — Vérification post-migration
--             Vérifie que tout a été migré correctement avant de toucher
--             à profile_data. Compare avec ce que tu as vu en section B.
-- ============================================================================

SELECT
    c.name      AS character_name,
    ce.slot_key,
    ce.item_key,
    ce.item_id,
    ce.item_index,
    ce.created_at
FROM public.character_equipped ce
JOIN public.characters c ON c.id = ce.character_id
ORDER BY c.name, ce.slot_key;


-- ============================================================================
-- SECTION E — Nettoyage de profile_data
--             NE LANCE QUE SI la section D est correcte !
--             Conserve uniquement scrollTypes dans le blob inventory.
--             Toutes les autres clés (equippedSlots, items, equipped, etc.)
--             sont maintenant dans des tables dédiées.
-- ============================================================================

UPDATE public.characters
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{inventory}',
    jsonb_build_object(
        'scrollTypes',
        COALESCE(profile_data->'inventory'->'scrollTypes', '{}'::jsonb)
    )
)
WHERE profile_data->'inventory' IS NOT NULL;

-- Vérification finale : le blob inventory ne doit plus contenir equippedSlots
SELECT
    c.name,
    c.profile_data->'inventory' AS inventory_blob
FROM public.characters c
ORDER BY c.name;
