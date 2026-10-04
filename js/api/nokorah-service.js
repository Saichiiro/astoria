import { getSupabaseClient } from './supabase-client.js';

/**
 * Get the Nokorah for a specific character
 * Returns null if no Nokorah exists
 */
export async function getNokorahByCharacterId(characterId) {
    try {
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('nokorahs')
            .select('*')
            .eq('character_id', characterId)
            .maybeSingle();

        if (error) {
            console.error('[NOKORAH] Error fetching Nokorah:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('[NOKORAH] Error in getNokorahByCharacterId:', error);
        return null;
    }
}

/**
 * Create or replace a Nokorah for a character
 * Uses UPSERT to ensure only one Nokorah per character
 */
export async function upsertNokorah(characterId, nokorahData) {
    try {
        const supabase = await getSupabaseClient();

        const payload = {
            character_id: characterId,
            name: nokorahData.name || 'Nokorah',
            appearance_id: nokorahData.appearanceId || 'sprout',
            appearance_src: nokorahData.appearanceSrc || null,
            rarity: nokorahData.rarity || 'commun',
            upgrade_level: Number(nokorahData.upgradeLevel) || 0,
            bonuses: nokorahData.bonuses || [],
            status_label: nokorahData.statusLabel || 'Combat',
            is_accessory: Boolean(nokorahData.isAccessory),
            rainbow_frame: Boolean(nokorahData.rainbowFrame),
            effects_admin: nokorahData.effectsAdmin || ''
        };

        const { data, error } = await supabase
            .from('nokorahs')
            .upsert(payload, {
                onConflict: 'character_id',
                returning: 'representation'
            })
            .select()
            .single();

        if (error) {
            console.error('[NOKORAH] Error upserting Nokorah:', error);
            return { success: false, error: error.message };
        }

        console.log('[NOKORAH] Nokorah saved successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[NOKORAH] Error in upsertNokorah:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing Nokorah
 */
export async function updateNokorah(characterId, updates) {
    try {
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('nokorahs')
            .update(updates)
            .eq('character_id', characterId)
            .select()
            .single();

        if (error) {
            console.error('[NOKORAH] Error updating Nokorah:', error);
            return { success: false, error: error.message };
        }

        console.log('[NOKORAH] Nokorah updated:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[NOKORAH] Error in updateNokorah:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a Nokorah (for abandonment)
 */
export async function deleteNokorah(characterId) {
    try {
        const supabase = await getSupabaseClient();

        const { error } = await supabase
            .from('nokorahs')
            .delete()
            .eq('character_id', characterId);

        if (error) {
            console.error('[NOKORAH] Error deleting Nokorah:', error);
            return { success: false, error: error.message };
        }

        console.log('[NOKORAH] Nokorah deleted for character:', characterId);
        return { success: true };
    } catch (error) {
        console.error('[NOKORAH] Error in deleteNokorah:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update only the rarity field
 */
export async function upgradeNokorahRarity(characterId, newRarity) {
    return updateNokorah(characterId, { rarity: newRarity });
}

/**
 * Update upgrade level and bonuses
 */
export async function upgradeNokorahStats(characterId, newLevel, newBonuses) {
    return updateNokorah(characterId, {
        upgrade_level: newLevel,
        bonuses: newBonuses
    });
}

/**
 * Update appearance
 */
export async function updateNokorahAppearance(characterId, appearanceId, appearanceSrc) {
    return updateNokorah(characterId, {
        appearance_id: appearanceId,
        appearance_src: appearanceSrc
    });
}

/**
 * Toggle rainbow frame (legendary only)
 */
export async function toggleNokorahRainbow(characterId, rainbowFrame) {
    return updateNokorah(characterId, { rainbow_frame: rainbowFrame });
}
