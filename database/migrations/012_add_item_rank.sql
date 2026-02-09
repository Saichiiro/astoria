-- ============================================================================
-- Add Item Rank Field
-- Adds rank field to items (separate from rarity)
-- ============================================================================

-- Add rank column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS rank VARCHAR(50) DEFAULT NULL;

-- Add index for filtering by rank
CREATE INDEX IF NOT EXISTS idx_items_rank ON public.items(rank);

-- Comment
COMMENT ON COLUMN public.items.rank IS
'Item rank/level requirement or tier (e.g., "Novice", "Expert", "Master", or numeric ranks)';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added rank column to items table';
END $$;
