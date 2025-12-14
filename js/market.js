import { getCurrentUser, getSupabaseClient } from './auth.js';

function requireUser() {
    const user = getCurrentUser();
    if (!user || !user.id) {
        throw new Error('Vous devez être connecté.');
    }
    return user;
}

function asInt(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    return Math.trunc(numberValue);
}

function escapeIlike(value) {
    return String(value || '').replace(/[%_,()]/g, '');
}

function resolveItemMeta(itemId) {
    const items =
        (typeof inventoryData !== 'undefined' && Array.isArray(inventoryData) ? inventoryData : null) ||
        (Array.isArray(window.inventoryData) ? window.inventoryData : null);
    if (!Array.isArray(items)) return null;
    const found = items.find((item) => (item && (item.id || item.name)) === itemId) || items.find((item) => item && item.name === itemId);
    if (!found) return null;

    const level = asInt(found.level ?? found.niveau ?? found.item_level) ?? 0;
    const rarity =
        String(found.rarity ?? found.rarete ?? found.rareté ?? found.item_rarity ?? '').trim() ||
        (/\[.+\]/.test(found.name || '') ? 'Rare' : 'Inconnue');

    return {
        item_name: found.name || itemId,
        item_category: found.category || found.type || null,
        item_level: level,
        item_rarity: rarity
    };
}

export async function getMyProfile() {
    const user = requireUser();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('user_id,kamas')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) throw error;
    if (data) return data;

    const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert([{ user_id: user.id }])
        .select('user_id,kamas')
        .single();

    if (insertError) throw insertError;
    return inserted;
}

export async function searchListings(filters = {}, sort = 'price_asc', page = 1, pageSize = 20) {
    const supabase = await getSupabaseClient();

    const safePage = Math.max(1, asInt(page) ?? 1);
    const safePageSize = Math.min(50, Math.max(5, asInt(pageSize) ?? 20));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    let query = supabase
        .from('market_listings')
        .select('*', { count: 'exact' })
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

export async function createListing({ itemId, quantity, unitPrice }) {
    const user = requireUser();
    const supabase = await getSupabaseClient();

    const safeQuantity = Math.max(1, asInt(quantity) ?? 1);
    const safeUnitPrice = Math.max(0, asInt(unitPrice) ?? 0);

    const meta = resolveItemMeta(itemId) || {};

    const payload = {
        seller_id: user.id,
        item_id: String(itemId),
        quantity: safeQuantity,
        unit_price: safeUnitPrice,
        ...meta
    };

    const { data, error } = await supabase
        .from('market_listings')
        .insert([payload])
        .select('*')
        .single();

    if (error) throw error;
    return data;
}

export async function buyListing(listingId) {
    const user = requireUser();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase.rpc('buy_listing', {
        p_listing_id: listingId,
        p_buyer_id: user.id
    });

    if (error) throw error;
    return data;
}

export async function getMyListings() {
    const user = requireUser();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('seller_id', user.id)
        .in('status', ['active'])
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function cancelListing(listingId) {
    const user = requireUser();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('market_listings')
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
    const user = requireUser();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from('market_transactions')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
