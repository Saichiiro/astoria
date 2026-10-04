-- ============================================================================
-- Migration: Renommer price_po/price_pa en price_kaels
-- ============================================================================
-- Date: 2026-01-29
-- Description: Simplifie le système de prix - une seule colonne price_kaels
-- ============================================================================

-- Étape 1: Ajouter nouvelle colonne price_kaels (prix de vente aux joueurs)
ALTER TABLE items ADD COLUMN IF NOT EXISTS price_kaels INTEGER DEFAULT 0;

-- Étape 2: Migrer les données - utiliser price_po (prix de vente)
UPDATE items SET price_kaels = COALESCE(price_po, 0) WHERE price_kaels = 0;

-- Étape 3: Supprimer les anciennes colonnes (après vérification)
-- ATTENTION: Décommenter ces lignes SEULEMENT après avoir vérifié que la migration fonctionne
-- ALTER TABLE items DROP COLUMN IF EXISTS price_po;
-- ALTER TABLE items DROP COLUMN IF EXISTS price_pa;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Cette migration garde les anciennes colonnes au cas où
-- 2. Une fois que tout fonctionne, décommenter les DROP COLUMN
-- 3. price_kaels = prix de vente (ancien price_po)
-- 4. On abandonne price_pa (prix d'achat) - pas utilisé dans le gameplay
