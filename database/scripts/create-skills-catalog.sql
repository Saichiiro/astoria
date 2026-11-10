-- ============================================================================
-- Global Skills Catalog
-- ============================================================================
-- Stores shared skill definitions for all characters.
-- Character progression remains in characters.profile_data.competences.

CREATE TABLE IF NOT EXISTS skills_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    cap INTEGER NOT NULL DEFAULT 200,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT skills_catalog_category_slug_unique UNIQUE (category_id, slug),
    CONSTRAINT skills_catalog_cap_positive CHECK (cap > 0)
);

CREATE INDEX IF NOT EXISTS idx_skills_catalog_category
    ON skills_catalog(category_id);

CREATE INDEX IF NOT EXISTS idx_skills_catalog_active
    ON skills_catalog(is_active);

CREATE INDEX IF NOT EXISTS idx_skills_catalog_order
    ON skills_catalog(category_id, sort_order, name);

CREATE OR REPLACE FUNCTION update_skills_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skills_catalog_updated_at ON skills_catalog;
CREATE TRIGGER skills_catalog_updated_at
    BEFORE UPDATE ON skills_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_skills_catalog_updated_at();

ALTER TABLE skills_catalog ENABLE ROW LEVEL SECURITY;

-- Permissive policies for current custom-auth frontend.
-- Tighten later when admin auth is fully enforced server-side.
DROP POLICY IF EXISTS "Public can read skills catalog" ON skills_catalog;
CREATE POLICY "Public can read skills catalog"
    ON skills_catalog FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can manage skills catalog" ON skills_catalog;
CREATE POLICY "Public can manage skills catalog"
    ON skills_catalog FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE skills_catalog IS 'Global catalog of shared skill definitions';
COMMENT ON COLUMN skills_catalog.category_id IS 'Matches frontend category ids from skillsCategories';
COMMENT ON COLUMN skills_catalog.slug IS 'Stable normalized key for a skill within a category';
COMMENT ON COLUMN skills_catalog.cap IS 'Global cap applied to all characters for this skill';
