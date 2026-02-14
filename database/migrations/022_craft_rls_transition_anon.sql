-- ============================================================================
-- Craft RLS transition (temporary)
-- Purpose:
-- - Allow anon clients to create/update/delete craft recipes during auth transition
-- - Keep SELECT open as before
-- NOTE: tighten these policies again once custom auth is fully linked to Supabase auth.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS craft_recipes_admin_insert ON public.craft_recipes;
DROP POLICY IF EXISTS craft_recipes_admin_update ON public.craft_recipes;
DROP POLICY IF EXISTS craft_recipes_admin_delete ON public.craft_recipes;

DROP POLICY IF EXISTS craft_recipe_ingredients_admin_insert ON public.craft_recipe_ingredients;
DROP POLICY IF EXISTS craft_recipe_ingredients_admin_update ON public.craft_recipe_ingredients;
DROP POLICY IF EXISTS craft_recipe_ingredients_admin_delete ON public.craft_recipe_ingredients;

CREATE POLICY craft_recipes_admin_insert
    ON public.craft_recipes
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY craft_recipes_admin_update
    ON public.craft_recipes
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY craft_recipes_admin_delete
    ON public.craft_recipes
    FOR DELETE
    TO anon, authenticated
    USING (true);

CREATE POLICY craft_recipe_ingredients_admin_insert
    ON public.craft_recipe_ingredients
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY craft_recipe_ingredients_admin_update
    ON public.craft_recipe_ingredients
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY craft_recipe_ingredients_admin_delete
    ON public.craft_recipe_ingredients
    FOR DELETE
    TO anon, authenticated
    USING (true);

GRANT INSERT, UPDATE, DELETE ON public.craft_recipes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.craft_recipe_ingredients TO anon, authenticated;

COMMIT;
