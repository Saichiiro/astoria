-- ============================================================================
-- Astoria Database Migration V2 - Backend Cleanup
-- ============================================================================
-- This migration cleans up redundancies, adds foreign keys, and normalizes the schema
--
-- IMPORTANT: Test on a database copy first!
-- Run verification queries before executing this migration
-- ============================================================================

-- ============================================================================
-- PHASE 1: CRITICAL FIXES
-- ============================================================================

-- Step 1: Verify no orphaned market entries before adding FK
-- (Run this first to check data integrity)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM market m
    LEFT JOIN items i
        ON (CASE
                WHEN m.item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN m.item_id::uuid
            END) = i.id
    WHERE i.id IS NULL;

    IF orphan_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % orphaned market entries with invalid item_id', orphan_count;
        RAISE NOTICE 'Review these entries before proceeding:';
        -- List orphaned entries
        RAISE NOTICE '%', (
            SELECT string_agg(m.id::text || ' (item_id: ' || m.item_id || ')', ', ')
            FROM market m
            LEFT JOIN items i
                ON (CASE
                        WHEN m.item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                        THEN m.item_id::uuid
                    END) = i.id
            WHERE i.id IS NULL
        );
    ELSE
        RAISE NOTICE 'OK: No orphaned market entries found';
    END IF;
END $$;

-- Step 2: Add foreign key constraint market.item_id → items.id
-- This ensures referential integrity for all market listings
ALTER TABLE market ALTER COLUMN item_id DROP NOT NULL;

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM market
    WHERE item_id IS NOT NULL
      AND item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF invalid_count > 0 THEN
        CREATE TABLE IF NOT EXISTS market_invalid_item_id (LIKE market INCLUDING ALL);
        -- Generated columns (e.g., total_price) can't be inserted into, so build a column list.
        EXECUTE (
            SELECT format(
                'INSERT INTO market_invalid_item_id (%s) SELECT %s FROM market WHERE item_id IS NOT NULL AND item_id !~* %L ON CONFLICT DO NOTHING',
                string_agg(quote_ident(column_name), ', '),
                string_agg(quote_ident(column_name), ', '),
                '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            )
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'market'
              AND is_generated = 'NEVER'
        );

        UPDATE market
        SET item_id = NULL
        WHERE item_id IS NOT NULL
          AND item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        RAISE NOTICE 'WARNING: % market rows had non-UUID item_id. Backed up to market_invalid_item_id and set to NULL.', invalid_count;
    END IF;
END $$;

ALTER TABLE market ALTER COLUMN item_id TYPE UUID
    USING (CASE
        WHEN item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN item_id::uuid
        ELSE NULL
    END);
ALTER TABLE market ADD CONSTRAINT fk_market_item
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;

DO $$ BEGIN RAISE NOTICE '✅ Added FK constraint: market.item_id → items.id'; END $$;

-- Step 3: Remove unused items.badges column
-- This column was never used in the codebase
ALTER TABLE items DROP COLUMN IF EXISTS badges;

DO $$ BEGIN RAISE NOTICE '✅ Removed unused column: items.badges'; END $$;

-- ============================================================================
-- PHASE 2: NORMALIZE QUEST PARTICIPANTS
-- ============================================================================

-- Step 5: Create quest_participants table
-- Replaces the JSONB participants field with proper relational structure
CREATE TABLE IF NOT EXISTS quest_participants (
    quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (quest_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_participants_quest ON quest_participants(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_participants_character ON quest_participants(character_id);

-- Enable RLS
ALTER TABLE quest_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for custom auth)
CREATE POLICY "Public can read quest participants"
    ON quest_participants FOR SELECT
    USING (true);

CREATE POLICY "Public can insert quest participants"
    ON quest_participants FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can delete quest participants"
    ON quest_participants FOR DELETE
    USING (true);

DO $$ BEGIN RAISE NOTICE '✅ Created table: quest_participants'; END $$;

-- Step 6: Migrate existing participants data
-- Extract character UUIDs from JSONB array and insert into new table
INSERT INTO quest_participants (quest_id, character_id)
SELECT
    q.id,
    participant::uuid
FROM quests q,
    jsonb_array_elements_text(q.participants) participant
WHERE q.participants IS NOT NULL
  AND jsonb_array_length(q.participants) > 0
ON CONFLICT (quest_id, character_id) DO NOTHING;

DO $$ BEGIN RAISE NOTICE '✅ Migrated participants data to quest_participants table'; END $$;

-- Step 7: Drop the old JSONB participants column
ALTER TABLE quests DROP COLUMN IF EXISTS participants;

DO $$ BEGIN RAISE NOTICE '✅ Removed column: quests.participants'; END $$;

-- ============================================================================
-- PHASE 3: MARKET OPTIMIZATION
-- ============================================================================

-- Step 8: Remove redundant market.item_name column
-- We can JOIN items table to get the name when needed
-- Keep item_category, item_level, item_rarity for filtering performance
ALTER TABLE market DROP COLUMN IF EXISTS item_name;

DO $$ BEGIN RAISE NOTICE '✅ Removed redundant column: market.item_name'; END $$;

-- ============================================================================
-- PHASE 4: INTEGRATE CATEGORIES
-- ============================================================================

-- Step 9: Add optional FK from items.category → categories.slug
-- This validates that item categories exist in the categories table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'categories'
    ) THEN
        ALTER TABLE items
            ADD CONSTRAINT fk_items_category
            FOREIGN KEY (category) REFERENCES categories(slug) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added FK constraint: items.category → categories.slug';
    ELSE
        RAISE NOTICE '⚠️ Skipped FK: categories table does not exist';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all foreign keys are in place
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public';

    RAISE NOTICE 'Total foreign key constraints: %', fk_count;
END $$;

-- Verify quest_participants data
DO $$
DECLARE
    participant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO participant_count FROM quest_participants;
    RAISE NOTICE 'Quest participants migrated: %', participant_count;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration V2 Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of changes:';
    RAISE NOTICE '- Added FK: market.item_id → items.id';
    RAISE NOTICE '- Removed: items.badges (unused)';
    RAISE NOTICE '- Created: quest_participants table';
    RAISE NOTICE '- Migrated: quests.participants → quest_participants';
    RAISE NOTICE '- Removed: market.item_name (redundant)';
    RAISE NOTICE '- Added FK: items.category → categories.slug';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update frontend JS files (hdv.js, market-service.js, quetes.js)';
    RAISE NOTICE '2. Test all functionality thoroughly';
    RAISE NOTICE '3. Monitor performance after deployment';
    RAISE NOTICE '';
END $$;
