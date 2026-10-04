-- ============================================================================
-- Categories Table for Items
-- ============================================================================
-- This table stores all item categories used across the application
-- (Codex, HDV, Inventaire, Quêtes, etc.)

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- Insert standard categories
INSERT INTO categories (slug, name, icon, display_order) VALUES
    ('agricole', 'Agricole', '🌾', 1),
    ('consommable', 'Consommable', '🧪', 2),
    ('equipement', 'Équipement', '⚔️', 3),
    ('materiau', 'Matériaux', '⚒️', 4),
    ('quete', 'Quêtes', '✨', 5)
ON CONFLICT (slug) DO NOTHING;

-- Optional: Add foreign key to items table (if you want strict validation)
-- This is commented out because it might fail if items already have invalid categories
-- Uncomment if you want to enforce category validation:

-- ALTER TABLE items
--     ADD CONSTRAINT fk_items_category
--     FOREIGN KEY (category)
--     REFERENCES categories(slug)
--     ON DELETE SET NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read categories
CREATE POLICY "Categories are viewable by everyone"
    ON categories FOR SELECT
    USING (true);

-- Policy: Only admins can insert/update/delete categories
-- Adjust this based on your auth setup
CREATE POLICY "Only admins can manage categories"
    ON categories FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'admin'
        OR auth.jwt() ->> 'email' IN (
            SELECT email FROM profiles WHERE role = 'admin'
        )
    );

COMMENT ON TABLE categories IS 'Item categories used across the application';
COMMENT ON COLUMN categories.slug IS 'Unique identifier used in code (e.g., "agricole", "consommable")';
COMMENT ON COLUMN categories.name IS 'Display name shown to users';
COMMENT ON COLUMN categories.icon IS 'Emoji or icon representation';
COMMENT ON COLUMN categories.display_order IS 'Sort order for displaying categories';
COMMENT ON COLUMN categories.is_active IS 'Whether this category is currently in use';
