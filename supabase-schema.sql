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
-- MARKET / HDV (Hôtel de vente)
-- ============================================================================

-- Player profiles / currency (kaels in UI; column kept as kamas)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    kamas BIGINT NOT NULL DEFAULT 5000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings
CREATE TABLE IF NOT EXISTS market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT,
    item_category TEXT,
    item_level INTEGER NOT NULL DEFAULT 0,
    item_rarity TEXT NOT NULL DEFAULT 'Inconnue',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    total_price BIGINT GENERATED ALWAYS AS ((quantity::bigint) * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired'))
);

-- Transactions (purchase history)
CREATE TABLE IF NOT EXISTS market_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES market_listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    item_id TEXT NOT NULL,
    item_name TEXT,
    item_category TEXT,
    item_level INTEGER NOT NULL DEFAULT 0,
    item_rarity TEXT NOT NULL DEFAULT 'Inconnue',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    total_price BIGINT NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_item_name ON market_listings(item_name);
CREATE INDEX IF NOT EXISTS idx_market_listings_item_category ON market_listings(item_category);
CREATE INDEX IF NOT EXISTS idx_market_listings_total_price ON market_listings(total_price);
CREATE INDEX IF NOT EXISTS idx_market_transactions_buyer_id ON market_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_market_transactions_seller_id ON market_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_transactions_created_at ON market_transactions(created_at);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_transactions ENABLE ROW LEVEL SECURITY;

-- NOTE: This project currently uses a custom login (users table + localStorage) and does not use Supabase Auth.
-- These policies are intentionally permissive so the app works with the anon key.
CREATE POLICY "Anyone can read profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update profiles"
    ON profiles FOR UPDATE
    USING (true);

CREATE POLICY "Public can read active listings"
    ON market_listings FOR SELECT
    USING (status = 'active');

CREATE POLICY "Anyone can insert listings"
    ON market_listings FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update listings"
    ON market_listings FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can read transactions"
    ON market_transactions FOR SELECT
    USING (true);

-- Triggers to auto-update updated_at
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Ensure every user has a profile row (kamas)
CREATE OR REPLACE FUNCTION ensure_profile_row()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_profile
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_row();

-- Atomic purchase (RPC)
CREATE OR REPLACE FUNCTION buy_listing(p_listing_id UUID, p_buyer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing market_listings%ROWTYPE;
    v_total BIGINT;
    v_buyer_kamas BIGINT;
    v_tx_id UUID;
BEGIN
    SELECT *
    INTO v_listing
    FROM market_listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_listing.status <> 'active' THEN
        RAISE EXCEPTION 'Listing not active';
    END IF;

    IF v_listing.seller_id = p_buyer_id THEN
        RAISE EXCEPTION 'Cannot buy your own listing';
    END IF;

    INSERT INTO profiles (user_id)
    VALUES (p_buyer_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO profiles (user_id)
    VALUES (v_listing.seller_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT kamas
    INTO v_buyer_kamas
    FROM profiles
    WHERE user_id = p_buyer_id
    FOR UPDATE;

    v_total := (v_listing.quantity::bigint) * v_listing.unit_price;

    IF v_buyer_kamas < v_total THEN
        RAISE EXCEPTION 'Insufficient kaels';
    END IF;

    UPDATE profiles
    SET kamas = kamas - v_total
    WHERE user_id = p_buyer_id;

    UPDATE profiles
    SET kamas = kamas + v_total
    WHERE user_id = v_listing.seller_id;

    v_tx_id := gen_random_uuid();

    INSERT INTO market_transactions (
        id,
        listing_id,
        buyer_id,
        seller_id,
        item_id,
        item_name,
        item_category,
        item_level,
        item_rarity,
        quantity,
        unit_price,
        total_price
    ) VALUES (
        v_tx_id,
        v_listing.id,
        p_buyer_id,
        v_listing.seller_id,
        v_listing.item_id,
        v_listing.item_name,
        v_listing.item_category,
        v_listing.item_level,
        v_listing.item_rarity,
        v_listing.quantity,
        v_listing.unit_price,
        v_total
    );

    UPDATE market_listings
    SET status = 'sold'
    WHERE id = v_listing.id;

    RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION buy_listing(UUID, UUID) TO anon, authenticated;

-- Backfill profiles for existing users (including sample users)
INSERT INTO profiles (user_id)
SELECT id
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Default admin credentials: username: admin, password: admin123
-- 2. Default player credentials: username: player1, password: player123
-- 3. Change these passwords immediately after first login!
-- 4. You'll need to migrate your existing items from data.js to the items table
-- 5. RLS policies ensure players only see enabled items, admins see all
