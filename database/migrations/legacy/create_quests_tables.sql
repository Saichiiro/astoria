-- ============================================================================
-- Migration: Création des Tables de Quêtes
-- ============================================================================
-- Date: 2026-01-29
-- Description: Ajoute les tables quests et quest_history manquantes
-- ============================================================================

-- Quests table (Tableau principal des quêtes)
CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rank TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_progress', 'locked')),
    repeatable BOOLEAN DEFAULT false,
    description TEXT,
    locations TEXT[] DEFAULT '{}',
    rewards JSONB DEFAULT '[]'::jsonb,
    images TEXT[] DEFAULT '{}',
    participants JSONB DEFAULT '[]'::jsonb,
    max_participants INTEGER DEFAULT 1 CHECK (max_participants > 0),
    completed_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quest history table (Historique des quêtes complétées)
CREATE TABLE IF NOT EXISTS quest_history (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    rank TEXT NOT NULL,
    name TEXT NOT NULL,
    gains TEXT,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    character_label TEXT,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes pour quests
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_rank ON quests(rank);
CREATE INDEX IF NOT EXISTS idx_quests_created_at ON quests(created_at);

-- Indexes pour quest_history
CREATE INDEX IF NOT EXISTS idx_quest_history_character_id ON quest_history(character_id);
CREATE INDEX IF NOT EXISTS idx_quest_history_date ON quest_history(date);
CREATE INDEX IF NOT EXISTS idx_quest_history_type ON quest_history(type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- RLS pour quests
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quests"
    ON quests FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert quests"
    ON quests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can update quests"
    ON quests FOR UPDATE
    USING (true);

CREATE POLICY "Admins can delete quests"
    ON quests FOR DELETE
    USING (true);

-- RLS pour quest_history
ALTER TABLE quest_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quest history"
    ON quest_history FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert quest history"
    ON quest_history FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour auto-update de updated_at sur quests
CREATE TRIGGER quests_updated_at
    BEFORE UPDATE ON quests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Cette migration crée les tables quests et quest_history
-- 2. Les politiques RLS sont permissives car l'app utilise une auth custom
-- 3. Exécuter cette migration dans l'éditeur SQL de Supabase
-- 4. Les données de quêtes existantes en localStorage devront être migrées manuellement
