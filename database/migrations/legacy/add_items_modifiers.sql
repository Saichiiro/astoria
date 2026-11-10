-- Add structured gameplay modifiers for items (equipment, consumables, etc.)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb;

-- Optional guard: ensure modifiers is always an array shape
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'items_modifiers_is_array'
    ) THEN
        ALTER TABLE items
        ADD CONSTRAINT items_modifiers_is_array
        CHECK (jsonb_typeof(modifiers) = 'array');
    END IF;
END
$$;
