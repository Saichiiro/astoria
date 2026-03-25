import { getSupabaseClient } from './supabase-client.js';

/**
 * Fetches the competences data for a character from the dedicated table.
 * Returns the raw competences object (same shape as profile_data.competences),
 * or null if no record exists.
 */
export async function getCharacterCompetences(characterId) {
    if (!characterId) return null;
    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('character_competences')
            .select('data')
            .eq('character_id', characterId)
            .maybeSingle();
        if (error) throw error;
        return data?.data || null;
    } catch (err) {
        console.error('[competences-service] fetch error:', err);
        return null;
    }
}
