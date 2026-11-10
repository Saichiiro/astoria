-- =====================================================================
-- CHARACTER COMPETENCES TABLE
-- =====================================================================
-- Moves competences out of profile_data JSONB into a dedicated table.
-- Benefits:
--   - No more fetch-before-write (atomic upsert per character)
--   - No localStorage quota issue (never cached in session-store)
--   - Realtime-subscribable per character_id
--   - profile_data writes no longer risk erasing competences
-- =====================================================================

CREATE TABLE IF NOT EXISTS character_competences (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index (PK already covers this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_character_competences_character_id
    ON character_competences(character_id);

-- Auto-update timestamp on write
CREATE OR REPLACE FUNCTION update_character_competences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_character_competences_updated_at
    BEFORE UPDATE ON character_competences
    FOR EACH ROW
    EXECUTE FUNCTION update_character_competences_timestamp();

-- RLS (permissive — project uses custom auth via anon key)
ALTER TABLE character_competences ENABLE ROW LEVEL SECURITY;

CREATE POLICY competences_select ON character_competences
    FOR SELECT USING (true);

CREATE POLICY competences_insert ON character_competences
    FOR INSERT WITH CHECK (true);

CREATE POLICY competences_update ON character_competences
    FOR UPDATE USING (true);

CREATE POLICY competences_delete ON character_competences
    FOR DELETE USING (true);

-- =====================================================================
-- DATA MIGRATION from profile_data->'competences'
-- Copies existing competences into the new table.
-- Only migrates rows where competences is a non-null, non-empty object.
-- =====================================================================
INSERT INTO character_competences (character_id, data)
SELECT
    id,
    profile_data->'competences'
FROM characters
WHERE
    profile_data IS NOT NULL
    AND profile_data ? 'competences'
    AND jsonb_typeof(profile_data->'competences') = 'object'
    AND profile_data->'competences' != '{}'::jsonb
ON CONFLICT (character_id) DO UPDATE
    SET data     = EXCLUDED.data,
        updated_at = NOW()
WHERE character_competences.data = '{}'::jsonb;
