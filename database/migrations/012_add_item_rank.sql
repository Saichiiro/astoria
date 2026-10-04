-- ============================================================================
-- Add Item Rank Field
-- Adds rank field to items (separate from rarity)
-- ============================================================================

-- Add rank column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS rank VARCHAR(10) DEFAULT NULL;

-- Add check constraint for valid rank values
ALTER TABLE public.items
DROP CONSTRAINT IF EXISTS items_rank_check;

ALTER TABLE public.items
ADD CONSTRAINT items_rank_check CHECK (
    rank IS NULL OR rank IN (
        'F', 'E', 'D', 'C', 'B', 'A',
        'S', 'S+', 'SS', 'SSS'
    )
);

-- Add index for filtering by rank
CREATE INDEX IF NOT EXISTS idx_items_rank ON public.items(rank);

-- Comment
COMMENT ON COLUMN public.items.rank IS
'Item rank/level requirement: F (lowest) to SSS (highest). Used to restrict equipment based on character rank.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added rank column to items table';
END $$;
