-- ============================================================================
-- Crafting System Base
-- Purpose:
-- 1) Add craft recipes + ingredients tables
-- 2) Add atomic RPC to craft an item from recipe requirements
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.craft_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Autre' CHECK (category IN ('Alchimie', 'Forge', 'Autre')),
    rarity TEXT NOT NULL DEFAULT 'Commun',
    rank TEXT NOT NULL DEFAULT 'F',
    output_item_id UUID NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    output_item_key TEXT NOT NULL,
    output_qty INTEGER NOT NULL DEFAULT 1 CHECK (output_qty > 0),
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.craft_recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.craft_recipes(id) ON DELETE CASCADE,
    item_id UUID NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    item_key TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_craft_recipes_category ON public.craft_recipes(category);
CREATE INDEX IF NOT EXISTS idx_craft_recipes_rank ON public.craft_recipes(rank);
CREATE INDEX IF NOT EXISTS idx_craft_recipes_output_item_id ON public.craft_recipes(output_item_id);
CREATE INDEX IF NOT EXISTS idx_craft_recipe_ingredients_recipe_id ON public.craft_recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_craft_recipe_ingredients_item_id ON public.craft_recipe_ingredients(item_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'craft_recipe_ingredients_recipe_item_unique'
          AND conrelid = 'public.craft_recipe_ingredients'::regclass
    ) THEN
        ALTER TABLE public.craft_recipe_ingredients
            ADD CONSTRAINT craft_recipe_ingredients_recipe_item_unique
            UNIQUE (recipe_id, item_key);
    END IF;
END $$;

DROP TRIGGER IF EXISTS craft_recipes_updated_at ON public.craft_recipes;
CREATE TRIGGER craft_recipes_updated_at
    BEFORE UPDATE ON public.craft_recipes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS craft_recipe_ingredients_updated_at ON public.craft_recipe_ingredients;
CREATE TRIGGER craft_recipe_ingredients_updated_at
    BEFORE UPDATE ON public.craft_recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.craft_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craft_recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS craft_recipes_select_all ON public.craft_recipes;
DROP POLICY IF EXISTS craft_recipes_admin_insert ON public.craft_recipes;
DROP POLICY IF EXISTS craft_recipes_admin_update ON public.craft_recipes;
DROP POLICY IF EXISTS craft_recipes_admin_delete ON public.craft_recipes;

DROP POLICY IF EXISTS craft_recipe_ingredients_select_all ON public.craft_recipe_ingredients;
DROP POLICY IF EXISTS craft_recipe_ingredients_admin_insert ON public.craft_recipe_ingredients;
DROP POLICY IF EXISTS craft_recipe_ingredients_admin_update ON public.craft_recipe_ingredients;
DROP POLICY IF EXISTS craft_recipe_ingredients_admin_delete ON public.craft_recipe_ingredients;

CREATE POLICY craft_recipes_select_all
    ON public.craft_recipes
    FOR SELECT
    USING (true);

CREATE POLICY craft_recipes_admin_insert
    ON public.craft_recipes
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_app_user_is_admin());

CREATE POLICY craft_recipes_admin_update
    ON public.craft_recipes
    FOR UPDATE
    TO authenticated
    USING (public.current_app_user_is_admin())
    WITH CHECK (public.current_app_user_is_admin());

CREATE POLICY craft_recipes_admin_delete
    ON public.craft_recipes
    FOR DELETE
    TO authenticated
    USING (public.current_app_user_is_admin());

CREATE POLICY craft_recipe_ingredients_select_all
    ON public.craft_recipe_ingredients
    FOR SELECT
    USING (true);

CREATE POLICY craft_recipe_ingredients_admin_insert
    ON public.craft_recipe_ingredients
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_app_user_is_admin());

CREATE POLICY craft_recipe_ingredients_admin_update
    ON public.craft_recipe_ingredients
    FOR UPDATE
    TO authenticated
    USING (public.current_app_user_is_admin())
    WITH CHECK (public.current_app_user_is_admin());

CREATE POLICY craft_recipe_ingredients_admin_delete
    ON public.craft_recipe_ingredients
    FOR DELETE
    TO authenticated
    USING (public.current_app_user_is_admin());

GRANT SELECT ON public.craft_recipes TO anon, authenticated;
GRANT SELECT ON public.craft_recipe_ingredients TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.craft_recipes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.craft_recipe_ingredients TO authenticated;

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
    v_total_consumed INTEGER := 0;
    v_output_added INTEGER := 0;
    v_missing TEXT[] := ARRAY[]::TEXT[];
    v_line RECORD;
    v_current_qty INTEGER;
    v_needed_qty INTEGER;
BEGIN
    SELECT *
    INTO v_recipe
    FROM public.craft_recipes
    WHERE id = p_recipe_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipe not found';
    END IF;

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

    FOR v_line IN
        SELECT *
        FROM public.craft_recipe_ingredients
        WHERE recipe_id = v_recipe.id
        ORDER BY created_at ASC, id ASC
    LOOP
        v_needed_qty := v_line.qty * v_times;

        UPDATE public.character_inventory ci
        SET qty = ci.qty - v_needed_qty
        WHERE ci.character_id = p_character_id
          AND (
              (v_line.item_id IS NOT NULL AND ci.item_id = v_line.item_id)
              OR ci.item_key = v_line.item_key
          );

        DELETE FROM public.character_inventory ci
        WHERE ci.character_id = p_character_id
          AND ci.qty <= 0;

        v_total_consumed := v_total_consumed + v_needed_qty;
    END LOOP;

    v_output_added := v_recipe.output_qty * v_times;

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
GRANT EXECUTE ON FUNCTION public.execute_craft_recipe(UUID, UUID, INTEGER) TO authenticated;

COMMIT;

