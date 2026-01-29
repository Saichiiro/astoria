-- =====================================================================
-- NOKORAH TABLE - Spirit companions for characters
-- =====================================================================
-- Each character can have ONE active Nokorah at a time
-- Nokorah evolve through rarity tiers and stat upgrades

CREATE TABLE IF NOT EXISTS nokorahs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

    -- Nokorah identity
    name VARCHAR(50) NOT NULL,
    appearance_id VARCHAR(50) NOT NULL DEFAULT 'sprout',
    appearance_src TEXT, -- Data URL or storage path

    -- Rarity and progression
    rarity VARCHAR(20) NOT NULL DEFAULT 'commun' CHECK (rarity IN ('commun', 'rare', 'epique', 'mythique', 'legendaire')),
    upgrade_level INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_level >= 0),
    bonuses JSONB NOT NULL DEFAULT '[]',

    -- Status and flags
    status_label VARCHAR(50) NOT NULL DEFAULT 'Combat',
    is_accessory BOOLEAN NOT NULL DEFAULT false,
    rainbow_frame BOOLEAN NOT NULL DEFAULT false,

    -- Admin field (read-only for players)
    effects_admin TEXT DEFAULT '',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- IMPORTANT: One Nokorah per character
    CONSTRAINT unique_nokorah_per_character UNIQUE (character_id)
);

-- Index for fast character lookups
CREATE INDEX IF NOT EXISTS idx_nokorahs_character_id ON nokorahs(character_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_nokorah_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nokorah_timestamp
    BEFORE UPDATE ON nokorahs
    FOR EACH ROW
    EXECUTE FUNCTION update_nokorah_timestamp();

-- RLS (Row Level Security) Policies
-- NOTE: This project uses custom auth (users table + localStorage), not Supabase Auth
-- Policies are intentionally permissive to work with the anon key
ALTER TABLE nokorahs ENABLE ROW LEVEL SECURITY;

-- Anyone can read nokorahs (custom auth handles client-side filtering)
CREATE POLICY nokorahs_select_public ON nokorahs
    FOR SELECT
    USING (true);

-- Anyone can insert nokorahs (custom auth validates on client)
CREATE POLICY nokorahs_insert_public ON nokorahs
    FOR INSERT
    WITH CHECK (true);

-- Anyone can update nokorahs (custom auth validates on client)
CREATE POLICY nokorahs_update_public ON nokorahs
    FOR UPDATE
    USING (true);

-- Anyone can delete nokorahs (custom auth validates on client)
CREATE POLICY nokorahs_delete_public ON nokorahs
    FOR DELETE
    USING (true);
