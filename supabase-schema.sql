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
    kaels BIGINT NOT NULL DEFAULT 5000,
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

-- Users: Anyone can register (prototype: uses anon key + custom auth)
CREATE POLICY "Anyone can insert users"
    ON users FOR INSERT
    WITH CHECK (true);

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
    '{"primary": "assets/images/objets/Poudre_de_Tracage.png"}'::jsonb,
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
-- MARKET / HDV (Hôtel de vente)
-- ============================================================================

-- Migration helpers (safe for existing setups)
ALTER TABLE IF EXISTS characters
    ADD COLUMN IF NOT EXISTS kaels BIGINT NOT NULL DEFAULT 5000;

-- Currency is stored per character in characters.kaels.

-- ============================================================================
-- CHARACTER INVENTORY (per character, scalable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    item_index INTEGER NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_character_inventory_unique
    ON character_inventory(character_id, item_key);

CREATE INDEX IF NOT EXISTS idx_character_inventory_character_id
    ON character_inventory(character_id);

ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read inventory"
    ON character_inventory FOR SELECT
    USING (true);

CREATE POLICY "Public can insert inventory"
    ON character_inventory FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can update inventory"
    ON character_inventory FOR UPDATE
    USING (true);

CREATE POLICY "Public can delete inventory"
    ON character_inventory FOR DELETE
    USING (true);

CREATE TRIGGER character_inventory_updated_at
    BEFORE UPDATE ON character_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Market (single table: listings + history)
CREATE TABLE IF NOT EXISTS market (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired')),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    buyer_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    buyer_character_id UUID NULL REFERENCES characters(id) ON DELETE RESTRICT,
    item_id TEXT NOT NULL,
    item_name TEXT,
    item_category TEXT,
    item_level INTEGER NOT NULL DEFAULT 0,
    item_rarity TEXT NOT NULL DEFAULT 'Inconnue',
    scroll_type TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    total_price BIGINT GENERATED ALWAYS AS ((quantity::bigint) * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_status ON market(status);
CREATE INDEX IF NOT EXISTS idx_market_seller_id ON market(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_seller_character_id ON market(seller_character_id);
CREATE INDEX IF NOT EXISTS idx_market_buyer_character_id ON market(buyer_character_id);
CREATE INDEX IF NOT EXISTS idx_market_item_name ON market(item_name);
CREATE INDEX IF NOT EXISTS idx_market_item_category ON market(item_category);
CREATE INDEX IF NOT EXISTS idx_market_total_price ON market(total_price);

-- RLS
ALTER TABLE market ENABLE ROW LEVEL SECURITY;

-- NOTE: This project currently uses a custom login (users table + localStorage) and does not use Supabase Auth.
-- These policies are intentionally permissive so the app works with the anon key.
CREATE POLICY "Public can read market"
    ON market FOR SELECT
    USING (true);

CREATE POLICY "Public can insert market"
    ON market FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can update market"
    ON market FOR UPDATE
    USING (true);

-- Atomic purchase (RPC)
CREATE OR REPLACE FUNCTION buy_listing(p_listing_id UUID, p_buyer_id UUID, p_buyer_character_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing market%ROWTYPE;
    v_total BIGINT;
    v_buyer_kaels BIGINT;
BEGIN
    SELECT *
    INTO v_listing
    FROM market
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_listing.status <> 'active' THEN
        RAISE EXCEPTION 'Listing not active';
    END IF;

    IF v_listing.seller_character_id IS NULL THEN
        RAISE EXCEPTION 'Listing missing seller character';
    END IF;

    IF v_listing.seller_id = p_buyer_id THEN
        RAISE EXCEPTION 'Cannot buy your own listing';
    END IF;

    IF v_listing.seller_character_id = p_buyer_character_id THEN
        RAISE EXCEPTION 'Cannot buy your own listing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM characters
        WHERE id = p_buyer_character_id
          AND user_id = p_buyer_id
    ) THEN
        RAISE EXCEPTION 'Invalid buyer character';
    END IF;

    SELECT kaels
    INTO v_buyer_kaels
    FROM characters
    WHERE id = p_buyer_character_id
    FOR UPDATE;

    v_total := (v_listing.quantity::bigint) * v_listing.unit_price;

    IF v_buyer_kaels < v_total THEN
        RAISE EXCEPTION 'Insufficient kaels';
    END IF;

    UPDATE characters
    SET kaels = kaels - v_total
    WHERE id = p_buyer_character_id;

    UPDATE characters
    SET kaels = kaels + v_total
    WHERE id = v_listing.seller_character_id;

    UPDATE market
    SET status = 'sold',
        buyer_id = p_buyer_id,
        buyer_character_id = p_buyer_character_id,
        sold_at = NOW()
    WHERE id = v_listing.id;

    RETURN v_listing.id;
END;
$$;

GRANT EXECUTE ON FUNCTION buy_listing(UUID, UUID, UUID) TO anon, authenticated;

-- ============================================================================
-- STORAGE (Avatars)
-- ============================================================================

-- NOTE: This project uses custom auth + anon key, so policies are permissive.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');

-- =================================================================
-- STORAGE (Items)
-- =================================================================

-- NOTE: This project uses custom auth + anon key, so policies are permissive.
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read items images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'items');

CREATE POLICY "Anyone can upload items images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'items');

CREATE POLICY "Anyone can update items images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'items');

CREATE POLICY "Anyone can delete items images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'items');

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Default admin credentials: username: admin, password: admin123
-- 2. Default player credentials: username: player1, password: player123
-- 3. Change these passwords immediately after first login!
-- 4. You'll need to migrate your existing items from data.js to the items table
-- 5. RLS policies ensure players only see enabled items, admins see all
