import { getSupabaseClient } from './supabase-client.js';

export async function getInventoryRows(characterId) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from('character_inventory')
        .select('id, item_id, item_key, item_index, qty')
        .eq('character_id', characterId)
        .order('item_index', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function replaceInventoryRows(characterId, rows) {
    const supabase = await getSupabaseClient();
    const { error: deleteError } = await supabase
        .from('character_inventory')
        .delete()
        .eq('character_id', characterId);

    if (deleteError) throw deleteError;
    if (!rows || rows.length === 0) return [];

    const { data, error } = await supabase
        .from('character_inventory')
        .insert(rows)
        .select('id, item_id, item_key, item_index, qty');

    if (error) throw error;
    return data || [];
}

export async function upsertInventoryRows(rows) {
    const supabase = await getSupabaseClient();
    if (!rows || rows.length === 0) return [];

    const hasItemId = rows.every((row) => Boolean(row?.item_id));
    const { data, error } = await supabase
        .from('character_inventory')
        .upsert(rows, { onConflict: hasItemId ? 'character_id,item_id' : 'character_id,item_key' })
        .select('id, item_id, item_key, item_index, qty');

    if (error) throw error;
    return data || [];
}

export async function setInventoryItem(characterId, itemKeyOrPayload, itemIndex, qty, itemId = null) {
    const supabase = await getSupabaseClient();
    const isPayloadObject = itemKeyOrPayload && typeof itemKeyOrPayload === 'object' && !Array.isArray(itemKeyOrPayload);
    const normalized = isPayloadObject
        ? {
            itemKey: itemKeyOrPayload.itemKey ?? itemKeyOrPayload.item_key ?? null,
            itemIndex: itemKeyOrPayload.itemIndex ?? itemKeyOrPayload.item_index ?? null,
            itemId: itemKeyOrPayload.itemId ?? itemKeyOrPayload.item_id ?? null,
            qty: itemIndex
        }
        : {
            itemKey: itemKeyOrPayload,
            itemIndex,
            itemId,
            qty
        };
    const safeQty = Math.floor(Number(normalized.qty) || 0);
    const normalizedItemKey = normalized.itemKey != null ? String(normalized.itemKey).trim() : '';
    const normalizedItemId = normalized.itemId != null ? String(normalized.itemId).trim() : '';
    const safeItemId = normalizedItemId || null;
    const safeItemIndex = Number.isFinite(Number(normalized.itemIndex)) ? Number(normalized.itemIndex) : null;

    if (!characterId || (!normalizedItemKey && !safeItemId)) {
        throw new Error('Missing inventory identifiers.');
    }

    if (safeQty <= 0) {
        let query = supabase
            .from('character_inventory')
            .delete()
            .eq('character_id', characterId);
        query = safeItemId
            ? query.eq('item_id', safeItemId)
            : query.eq('item_key', normalizedItemKey);
        const { error } = await query;
        if (error) throw error;
        return null;
    }

    const payload = {
        character_id: characterId,
        item_key: normalizedItemKey || safeItemId,
        item_id: safeItemId,
        item_index: safeItemIndex,
        qty: safeQty
    };

    const { data, error } = await supabase
        .from('character_inventory')
        .upsert([payload], { onConflict: safeItemId ? 'character_id,item_id' : 'character_id,item_key' })
        .select('id, item_id, item_key, item_index, qty')
        .single();

    if (error) throw error;
    return data;
}
