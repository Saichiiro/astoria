import { getSupabaseClient } from './supabase-client.js';
import { isAdmin } from './auth-service.js';

function isAbortLikeError(error) {
    if (!error) return false;
    if (error.name === 'AbortError') return true;
    const msg = String(error.message || '').toLowerCase();
    return msg.includes('signal is aborted') || msg.includes('aborted');
}

export async function toggleItemState(itemId, enabled) {
    if (!isAdmin()) {
        return { success: false, error: 'Accès non autorisé' };
    }

    try {
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('items')
            .update({ enabled })
            .eq('id', itemId)
            .select();

        if (error) {
            console.error('Error toggling item:', error);
            return { success: false };
        }

        invalidateItemsCache();
        return { success: true, item: data[0] };
    } catch (error) {
        console.error('Error in toggleItemState:', error);
        return { success: false };
    }
}

export const ITEMS_CACHE_KEY = 'astoria_items_cache';
const ITEMS_CACHE_TTL = 60 * 60 * 1000; // 60 minutes

export function invalidateItemsCache() {
    try { localStorage.removeItem(ITEMS_CACHE_KEY); } catch {}
}

export async function getAllItems({ force = false } = {}) {
    if (!force) {
        try {
            const raw = localStorage.getItem(ITEMS_CACHE_KEY);
            if (raw) {
                const { data, expiry } = JSON.parse(raw);
                if (Array.isArray(data) && Date.now() < expiry) return data;
            }
        } catch {}
    }

    try {
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            if (!isAbortLikeError(error)) {
                console.error('Error fetching items:', error);
            }
            return [];
        }

        const result = data || [];
        try {
            localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify({
                data: result,
                expiry: Date.now() + ITEMS_CACHE_TTL
            }));
        } catch {}
        return result;
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error in getAllItems:', error);
        }
        return [];
    }
}
