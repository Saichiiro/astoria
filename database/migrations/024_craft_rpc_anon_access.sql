-- ============================================================================
-- Craft RPC Anonymous Access
-- Purpose:
-- - Remove user ownership checks for anonymous site
-- - Allow craft execution without auth validation
-- - Keep recipe validation and inventory checks
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.execute_craft_recipe(
    p_character_id UUID,
    p_recipe_id UUID,
    p_times INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_times INTEGER := GREATEST(1, COALESCE(p_times, 1));
    v_recipe public.craft_recipes%ROWTYPE;
    v_character_id UUID;
    v_total_consumed INTEGER := 0;
    v_output_added INTEGER := 0;
    v_missing TEXT[] := ARRAY[]::TEXT[];

    v_line RECORD;
    v_current_qty INTEGER;
    v_needed_qty INTEGER;
    v_ingredient_count INTEGER := 0;
BEGIN
    -- For anon site: just validate character exists, skip ownership check
    SELECT c.id
    INTO v_character_id
    FROM public.characters c
    WHERE c.id = p_character_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'character_not_found');
    END IF;

    -- Get the recipe
    SELECT *
    INTO v_recipe
    FROM public.craft_recipes
    WHERE id = p_recipe_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'recipe_not_found');
    END IF;

    IF COALESCE(btrim(v_recipe.output_item_key), '') = '' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid_recipe_output');
    END IF;

    -- Recipe must have ingredients
    SELECT COUNT(*)
    INTO v_ingredient_count
    FROM public.craft_recipe_ingredients
    WHERE recipe_id = v_recipe.id;

    IF v_ingredient_count <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid_recipe_no_ingredients');
    END IF;

    -- Check if all ingredients are available
    FOR v_line IN
        SELECT *
        FROM public.craft_recipe_ingredients
        WHERE recipe_id = v_recipe.id
        ORDER BY created_at ASC, id ASC
    LOOP
        v_needed_qty := v_line.qty * v_times;

        SELECT COALESCE(ci.qty, 0)
        INTO v_current_qty
        FROM public.character_inventory ci
        WHERE ci.character_id = p_character_id
          AND (
              (v_line.item_id IS NOT NULL AND ci.item_id = v_line.item_id)
              OR ci.item_key = v_line.item_key
          )
        ORDER BY ci.updated_at DESC NULLS LAST, ci.created_at DESC NULLS LAST
        LIMIT 1;

        IF COALESCE(v_current_qty, 0) < v_needed_qty THEN
            v_missing := array_append(v_missing, format('%s x%s', v_line.item_key, (v_needed_qty - COALESCE(v_current_qty, 0))));
        END IF;
    END LOOP;

    IF array_length(v_missing, 1) IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'reason', 'missing_materials',
            'missing', v_missing
        );
    END IF;

    -- Consume ingredients
    FOR v_line IN
        SELECT *
        FROM public.craft_recipe_ingredients
        WHERE recipe_id = v_recipe.id
        ORDER BY created_at ASC, id ASC
    LOOP
        v_needed_qty := v_line.qty * v_times;

        -- Delete rows where consumption would bring qty to 0 or below
        DELETE FROM public.character_inventory ci
        WHERE ci.character_id = p_character_id
          AND (
              (v_line.item_id IS NOT NULL AND ci.item_id = v_line.item_id)
              OR ci.item_key = v_line.item_key
          )
          AND ci.qty <= v_needed_qty;

        -- Update remaining rows (where qty > v_needed_qty)
        UPDATE public.character_inventory ci
        SET qty = ci.qty - v_needed_qty
        WHERE ci.character_id = p_character_id
          AND (
              (v_line.item_id IS NOT NULL AND ci.item_id = v_line.item_id)
              OR ci.item_key = v_line.item_key
          )
          AND ci.qty > v_needed_qty;

        v_total_consumed := v_total_consumed + v_needed_qty;
    END LOOP;

    -- Add output
    v_output_added := GREATEST(1, COALESCE(v_recipe.output_qty, 1) * v_times);

    IF v_recipe.output_item_id IS NOT NULL THEN
        INSERT INTO public.character_inventory (character_id, item_id, item_key, qty)
        VALUES (p_character_id, v_recipe.output_item_id, v_recipe.output_item_key, v_output_added)
        ON CONFLICT (character_id, item_id)
        DO UPDATE SET qty = public.character_inventory.qty + EXCLUDED.qty;
    ELSE
        INSERT INTO public.character_inventory (character_id, item_key, qty)
        VALUES (p_character_id, v_recipe.output_item_key, v_output_added)
        ON CONFLICT (character_id, item_key)
        DO UPDATE SET qty = public.character_inventory.qty + EXCLUDED.qty;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'consumed', v_total_consumed,
        'output_qty', v_output_added,
        'output_item_key', v_recipe.output_item_key,
        'recipe_id', v_recipe.id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_craft_recipe(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_craft_recipe(UUID, UUID, INTEGER) TO authenticated, anon;

COMMIT;
