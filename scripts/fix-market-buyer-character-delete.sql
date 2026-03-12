-- Allow character deletion even when market history references the character as buyer.
-- Sold rows keep their buyer user, but the character reference is nulled automatically.

ALTER TABLE IF EXISTS market
    DROP CONSTRAINT IF EXISTS market_buyer_character_id_fkey;

ALTER TABLE IF EXISTS market
    ADD CONSTRAINT market_buyer_character_id_fkey
    FOREIGN KEY (buyer_character_id)
    REFERENCES characters(id)
    ON DELETE SET NULL;
