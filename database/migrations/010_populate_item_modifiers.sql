-- ============================================================================
-- Populate Item Modifiers from Effect Text
-- Parse existing effect text and populate the modifiers JSONB field
-- ============================================================================

-- Function to parse effect text and extract modifiers
CREATE OR REPLACE FUNCTION parse_item_modifiers(effect_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '[]'::JSONB;
    modifier JSONB;
    matches TEXT[];
    stat_name TEXT;
    stat_value INT;
    is_percent BOOLEAN;
BEGIN
    -- Pattern: +3 Agilité, +5 Force, +10% Vitesse, etc.
    -- Extract all matches of pattern: (+/-)number (%) stat_name

    FOR matches IN
        SELECT regexp_matches(
            effect_text,
            '([+-]\d+)\s*(%|pour\s*cent|points?)?\s*(?:de|d''|en)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'' -]{1,40})',
            'gi'
        )
    LOOP
        stat_value := matches[1]::INT;
        is_percent := matches[2] IS NOT NULL AND (matches[2] ILIKE '%' OR matches[2] ILIKE 'pour%');
        stat_name := TRIM(matches[3]);

        -- Skip if stat_name contains duration keywords
        IF stat_name ~* '(pendant|durée|tour|tours|recharge|rayon|utilisations?)' THEN
            CONTINUE;
        END IF;

        -- Build modifier object
        modifier := jsonb_build_object(
            'stat', stat_name,
            'value', stat_value,
            'type', CASE WHEN is_percent THEN 'percent' ELSE 'flat' END,
            'source', 'effect'
        );

        -- Add to result array if not already present
        IF NOT result @> jsonb_build_array(modifier) THEN
            result := result || jsonb_build_array(modifier);
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- Update all items that have effect text but empty modifiers
UPDATE public.items
SET modifiers = parse_item_modifiers(effect)
WHERE effect IS NOT NULL
  AND effect != ''
  AND (modifiers IS NULL OR modifiers = '[]'::JSONB OR modifiers = 'null'::JSONB);

-- Log results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.items
    WHERE modifiers IS NOT NULL
      AND modifiers != '[]'::JSONB;

    RAISE NOTICE 'Updated % items with parsed modifiers', updated_count;
END $$;

-- Comment on the function
COMMENT ON FUNCTION parse_item_modifiers(TEXT) IS
'Parses effect text and extracts stat modifiers into structured JSONB format';
