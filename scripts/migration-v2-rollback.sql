-- ============================================================================
-- Astoria Database Migration V2 - ROLLBACK Script
-- ============================================================================
-- Use this to revert the V2 migration if something goes wrong
--
-- IMPORTANT: Only run this if you need to rollback!
-- This will restore the database to its pre-V2 state
-- ============================================================================

-- ============================================================================
-- ROLLBACK PHASE 4: CATEGORIES INTEGRATION
-- ============================================================================

-- Remove FK constraint from items.category
ALTER TABLE items DROP CONSTRAINT IF EXISTS fk_items_category;

RAISE NOTICE '✅ Removed FK: items.category → categories.slug';

-- ============================================================================
-- ROLLBACK PHASE 3: MARKET OPTIMIZATION
-- ============================================================================

-- Restore market.item_name column
ALTER TABLE market ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Populate from items table
UPDATE market m
SET item_name = i.name
FROM items i
WHERE m.item_id = i.id;

RAISE NOTICE '✅ Restored column: market.item_name';

-- ============================================================================
-- ROLLBACK PHASE 2: QUEST PARTICIPANTS NORMALIZATION
-- ============================================================================

-- Restore quests.participants JSONB column
ALTER TABLE quests ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;

-- Migrate data back from quest_participants table to JSONB
UPDATE quests q
SET participants = (
    SELECT jsonb_agg(qp.character_id::text)
    FROM quest_participants qp
    WHERE qp.quest_id = q.id
)
WHERE EXISTS (
    SELECT 1 FROM quest_participants qp WHERE qp.quest_id = q.id
);

-- Set empty array for quests with no participants
UPDATE quests
SET participants = '[]'::jsonb
WHERE participants IS NULL;

RAISE NOTICE '✅ Restored column: quests.participants';

-- Drop quest_participants table
DROP TABLE IF EXISTS quest_participants CASCADE;

RAISE NOTICE '✅ Dropped table: quest_participants';

-- ============================================================================
-- ROLLBACK PHASE 1: CRITICAL FIXES
-- ============================================================================

-- Restore items.badges column
ALTER TABLE items ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

RAISE NOTICE '✅ Restored column: items.badges';

-- Remove FK constraint from market.item_id
ALTER TABLE market DROP CONSTRAINT IF EXISTS fk_market_item;

-- Restore market.item_id to TEXT type
ALTER TABLE market ALTER COLUMN item_id TYPE TEXT;

RAISE NOTICE '✅ Removed FK: market.item_id → items.id';
RAISE NOTICE '✅ Restored type: market.item_id TEXT';

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'Rollback V2 Complete!';
RAISE NOTICE '========================================';
RAISE NOTICE '';
RAISE NOTICE 'Database has been restored to pre-V2 state.';
RAISE NOTICE '';
RAISE NOTICE 'Summary of rollback:';
RAISE NOTICE '- Removed FK: items.category → categories.slug';
RAISE NOTICE '- Restored: market.item_name';
RAISE NOTICE '- Restored: quests.participants JSONB';
RAISE NOTICE '- Dropped: quest_participants table';
RAISE NOTICE '- Restored: items.badges';
RAISE NOTICE '- Removed FK: market.item_id → items.id';
RAISE NOTICE '- Restored type: market.item_id TEXT';
RAISE NOTICE '';
