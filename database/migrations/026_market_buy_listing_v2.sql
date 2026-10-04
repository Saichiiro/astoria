-- 026: buy_listing v2
-- * Partial purchase: the front sends p_quantity when buying part of a lot, but
--   only the 3-argument function existed in production (PGRST202 on every
--   partial buy).
-- * Same-account trading: a player may buy from another of their own
--   characters. Buying from the very same character is still refused.
-- total_price is a generated column (quantity * unit_price) and must not be written.

DROP FUNCTION IF EXISTS public.buy_listing(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.buy_listing(UUID, UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.buy_listing(
    p_listing_id UUID,
    p_buyer_id UUID,
    p_buyer_character_id UUID,
    p_quantity INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_listing market%ROWTYPE;
    v_qty INTEGER;
    v_total BIGINT;
    v_buyer_kaels BIGINT;
    v_sold_id UUID;
BEGIN
    SELECT * INTO v_listing
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

    IF v_listing.seller_character_id = p_buyer_character_id THEN
        RAISE EXCEPTION 'Cannot buy your own listing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM characters
        WHERE id = p_buyer_character_id
          AND user_id = p_buyer_id
    ) THEN
        RAISE EXCEPTION 'Invalid buyer character';
    END IF;

    v_qty := COALESCE(p_quantity, v_listing.quantity);
    IF v_qty < 1 OR v_qty > v_listing.quantity THEN
        RAISE EXCEPTION 'Invalid quantity';
    END IF;

    v_total := v_qty::BIGINT * v_listing.unit_price;

    -- Lock both characters in a stable order to avoid deadlocks.
    PERFORM 1 FROM characters
    WHERE id IN (p_buyer_character_id, v_listing.seller_character_id)
    ORDER BY id
    FOR UPDATE;

    SELECT kaels INTO v_buyer_kaels
    FROM characters
    WHERE id = p_buyer_character_id;

    IF COALESCE(v_buyer_kaels, 0) < v_total THEN
        RAISE EXCEPTION 'Insufficient kaels';
    END IF;

    UPDATE characters SET kaels = kaels - v_total WHERE id = p_buyer_character_id;
    UPDATE characters SET kaels = kaels + v_total WHERE id = v_listing.seller_character_id;

    IF v_qty = v_listing.quantity THEN
        UPDATE market
        SET status = 'sold',
            buyer_id = p_buyer_id,
            buyer_character_id = p_buyer_character_id,
            sold_at = NOW()
        WHERE id = v_listing.id;
        RETURN v_listing.id;
    END IF;

    -- Partial: shrink the active lot and record the sold part as its own row
    -- so history (getMyHistory) keeps working unchanged.
    UPDATE market
    SET quantity = quantity - v_qty
    WHERE id = v_listing.id;

    INSERT INTO market (
        status, seller_id, seller_character_id, buyer_id, buyer_character_id,
        item_id, item_category, item_level, item_rarity, scroll_type,
        quantity, unit_price, created_at, sold_at
    ) VALUES (
        'sold', v_listing.seller_id, v_listing.seller_character_id, p_buyer_id, p_buyer_character_id,
        v_listing.item_id, v_listing.item_category, v_listing.item_level, v_listing.item_rarity, v_listing.scroll_type,
        v_qty, v_listing.unit_price, v_listing.created_at, NOW()
    )
    RETURNING id INTO v_sold_id;

    RETURN v_sold_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_listing(UUID, UUID, UUID, INTEGER) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
