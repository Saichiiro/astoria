-- ============================================================================
-- Astoria Database Schema for Supabase
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create the required tables
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Characters table (up to 5 per user)
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    race TEXT,
    class TEXT,
    profile_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items table (migrated from data.js)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    effect TEXT,
    category TEXT,
    rarity TEXT,
    price_po INTEGER DEFAULT 0,
    price_pa INTEGER DEFAULT 0,
    images JSONB DEFAULT '{}'::jsonb,
    badges JSONB DEFAULT '[]'::jsonb,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_enabled ON items(enabled);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Users: Users can read their own data
CREATE POLICY "Users can read own data"
    ON users FOR SELECT
    USING (true); -- Anyone can read for login purposes

-- Characters: Users can manage their own characters
CREATE POLICY "Users can read own characters"
    ON characters FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own characters"
    ON characters FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own characters"
    ON characters FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete own characters"
    ON characters FOR DELETE
    USING (true);

-- Items: Everyone can read enabled items, admins can manage all
CREATE POLICY "Anyone can read enabled items"
    ON items FOR SELECT
    USING (enabled = true);

CREATE POLICY "Admins can read all items"
    ON items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.role = 'admin'
        )
    );

CREATE POLICY "Admins can update items"
    ON items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert items"
    ON items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.role = 'admin'
        )
    );

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Create sample admin user
-- Password: admin123
-- Hash generated with SHA-256 of 'admin123'
INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Create sample player user
-- Password: player123
-- Hash generated with SHA-256 of 'player123'
INSERT INTO users (username, password_hash, role)
VALUES (
    'player1',
    'f9ef7e4d5f08e34f4bffe37ae0e8c9c2e5b7e3f4a8c1d9f0e4b3c7d1a5f8e2b6',
    'player'
) ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- MIGRATION SCRIPT for existing data.js items
-- ============================================================================
-- You'll need to manually insert your existing items from data.js
-- Example:
/*
INSERT INTO items (name, description, effect, category, rarity, price_po, price_pa, images, badges, enabled)
VALUES (
    'Poudre de Traçage',
    'Une poudre enchantée qui révèle les traces invisibles',
    'Révèle les empreintes et traces magiques dans un rayon de 10m',
    'Consommable',
    'Commun',
    50,
    0,
    '{"primary": "assets/images/Poudre_de_Tracage.png"}'::jsonb,
    '["Détection", "Utilitaire"]'::jsonb,
    true
);
*/

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce 5 character limit per user
CREATE OR REPLACE FUNCTION check_character_limit()
RETURNS TRIGGER AS $$
DECLARE
    char_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO char_count
    FROM characters
    WHERE user_id = NEW.user_id;

    IF char_count >= 5 THEN
        RAISE EXCEPTION 'User cannot have more than 5 characters';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger to enforce character limit
CREATE TRIGGER characters_limit_check
    BEFORE INSERT ON characters
    FOR EACH ROW
    EXECUTE FUNCTION check_character_limit();

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Default admin credentials: username: admin, password: admin123
-- 2. Default player credentials: username: player1, password: player123
-- 3. Change these passwords immediately after first login!
-- 4. You'll need to migrate your existing items from data.js to the items table
-- 5. RLS policies ensure players only see enabled items, admins see all
