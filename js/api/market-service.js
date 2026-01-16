import { getSupabaseClient } from './supabase-client.js';
import { getCurrentUser } from './auth-service.js';
import { getActiveCharacter } from './session-store.js';

function requireCharacter() {
    const user = getCurrentUser();
    if (!user || !user.id) {
        throw new Error('Vous devez etre connecte.');
    }
    const character = getActiveCharacter();
    if (!character || !character.id) {
        throw new Error('Selectionnez un personnage.');
    }
    return { user, character };
}

function asInt(value) {
    if (value === null || value === undefined || value === '') return null;
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    return Math.trunc(numberValue);
}

function escapeIlike(value) {
    return String(value || '').replace(/[%_,()]/g, '');
}

function resolveItemMeta(itemId, item) {
    let found = item || null;
    if (!found) {
        const items =
            (typeof inventoryData !== 'undefined' && Array.isArray(inventoryData) ? inventoryData : null) ||
            (Array.isArray(window.inventoryData) ? window.inventoryData : null);
        if (Array.isArray(items)) {
            found = items.find((entry) => (entry && (entry.id || entry.name)) === itemId) ||
                items.find((entry) => entry && entry.name === itemId);
        }
    }

    if (!found) return null;

    const level = asInt(found.level ?? found.niveau ?? found.item_level) ?? 0;
    const rarity =
        String(found.rarity ?? found.rarete ?? found.item_rarity ?? '').trim() ||
        (/\[.+\]/.test(found.name || '') ? 'Rare' : 'Inconnue');

    return {
        item_name: found.name || itemId,
        item_category: found.category || found.type || null,
        item_level: level,
        item_rarity: rarity
    };
}

export async function searchListings(filters = {}, sort = 'price_asc', page = 1, pageSize = 20) {
    const supabase = await getSupabaseClient();

    const safePage = Math.max(1, asInt(page) ?? 1);
    const safePageSize = Math.min(50, Math.max(5, asInt(pageSize) ?? 20));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    let query = supabase
        .from('market')
        .select('*, seller_character:characters!market_seller_character_id_fkey(id,name)', { count: 'exact' })
        .eq('status', 'active');

    const q = String(filters.q || '').trim();
    if (q) {
        const needle = escapeIlike(q);
        query = query.or(`item_name.ilike.%${needle}%,item_id.ilike.%${needle}%`);
    }

    if (filters.category && filters.category !== 'all') {
        query = query.eq('item_category', filters.category);
    }

    if (filters.rarity && filters.rarity !== 'all') {
        query = query.eq('item_rarity', filters.rarity);
    }

    const minLevel = asInt(filters.minLevel);
    if (minLevel !== null) {
        query = query.gte('item_level', minLevel);
    }

    const maxLevel = asInt(filters.maxLevel);
    if (maxLevel !== null) {
        query = query.lte('item_level', maxLevel);
    }

    const maxTotalPrice = asInt(filters.maxTotalPrice);
    if (maxTotalPrice !== null) {
        query = query.lte('total_price', maxTotalPrice);
    }

    switch (sort) {
        case 'price_desc':
            query = query.order('total_price', { ascending: false }).order('unit_price', { ascending: false });
            break;
        case 'level_desc':
            query = query.order('item_level', { ascending: false }).order('total_price', { ascending: true });
            break;
        case 'recent_desc':
            query = query.order('created_at', { ascending: false });
            break;
        case 'price_asc':
        default:
            query = query.order('total_price', { ascending: true }).order('unit_price', { ascending: true });
            break;
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

    return {
        listings: data || [],
        page: safePage,
        pageSize: safePageSize,
        totalCount,
        totalPages
    };
}

export async function createListing({ itemId, item, quantity, unitPrice, scrollType }) {
    const { user, character } = requireCharacter();
    const supabase = await getSupabaseClient();

    const safeQuantity = Math.max(1, asInt(quantity) ?? 1);
    const safeUnitPrice = Math.max(0, asInt(unitPrice) ?? 0);

    const meta = resolveItemMeta(itemId, item) || {};

    const payload = {
        seller_id: user.id,
        seller_character_id: character.id,
        item_id: String(itemId),
        quantity: safeQuantity,
        unit_price: safeUnitPrice,
        scroll_type: scrollType || null,
        ...meta
    };

    const { data, error } = await supabase
        .from('market')
        .insert([payload])
        .select('*')
        .single();

    if (error) throw error;
    return data;
}

export async function buyListing(listingId) {
    const { user, character } = requireCharacter();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase.rpc('buy_listing', {
        p_listing_id: listingId,
        p_buyer_id: user.id,
        p_buyer_character_id: character.id
    });

    if (error) throw error;
    return data;
}

export async function getMyListings() {
    const { user, character } = requireCharacter();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('market')
        .select('*')
        .in('status', ['active'])
        .or(`seller_id.eq.${user.id},seller_character_id.eq.${character.id}`)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function cancelListing(listingId) {
    const { user } = requireCharacter();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('market')
        .update({ status: 'cancelled' })
        .eq('id', listingId)
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getMyHistory() {
    const { character } = requireCharacter();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('market')
        .select('*, seller_character:characters!market_seller_character_id_fkey(id,name), buyer_character:characters!market_buyer_character_id_fkey(id,name)')
        .eq('status', 'sold')
        .or(`buyer_character_id.eq.${character.id},seller_character_id.eq.${character.id}`)
        .order('sold_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
