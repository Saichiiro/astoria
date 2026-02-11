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

        return { success: true, item: data[0] };
    } catch (error) {
        console.error('Error in toggleItemState:', error);
        return { success: false };
    }
}

export async function getAllItems() {
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

        return data || [];
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error in getAllItems:', error);
        }
        return [];
    }
}
