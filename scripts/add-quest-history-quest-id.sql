-- Make quest completion history directly linkable to quests.
-- The frontend now falls back to quest name if this column is missing,
-- but adding it makes prerequisite checks robust and future-proof.

ALTER TABLE IF EXISTS quest_history
    ADD COLUMN IF NOT EXISTS quest_id TEXT REFERENCES quests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quest_history_quest_id
    ON quest_history(quest_id);
