-- ============================================================================
-- Add Item Rarity System
-- Adds rarity/tier field to items for progression system
-- ============================================================================

-- Add rarity column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS rarity VARCHAR(10) DEFAULT NULL;

-- Add check constraint for valid rarity values
ALTER TABLE public.items
DROP CONSTRAINT IF EXISTS items_rarity_check;

ALTER TABLE public.items
ADD CONSTRAINT items_rarity_check CHECK (
    rarity IS NULL OR rarity IN (
        'commun', 'rare', 'epique', 'mythique', 'legendaire'
    )
);

-- Create index for filtering by rarity
CREATE INDEX IF NOT EXISTS idx_items_rarity ON public.items(rarity);

-- Comment
COMMENT ON COLUMN public.items.rarity IS
'Item rarity/tier: commun (common) to legendaire (legendary). Tiers: commun, rare, epique, mythique, legendaire';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added rarity column to items table with tiers: commun, rare, epique, mythique, legendaire';
END $$;
