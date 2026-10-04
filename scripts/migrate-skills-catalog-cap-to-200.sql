-- ============================================================================
-- Migrate global skill caps to 200
-- ============================================================================
-- Run this on Supabase after deploying the frontend/catalog changes.
-- It updates the default for future rows and upgrades existing rows still at 40.

ALTER TABLE IF EXISTS skills_catalog
    ALTER COLUMN cap SET DEFAULT 200;

UPDATE skills_catalog
SET cap = 200
WHERE cap = 40;
