-- ============================================================================
-- Craft Recipes Output Qty Hardening
-- Purpose:
-- - Ensure all craft_recipes have valid output_qty (>0)
-- - Fix any legacy recipes with NULL or invalid qty values
-- ============================================================================

BEGIN;

-- Fix any craft_recipes with NULL or invalid output_qty
UPDATE public.craft_recipes
SET output_qty = 1
WHERE output_qty IS NULL OR output_qty <= 0;

COMMIT;
