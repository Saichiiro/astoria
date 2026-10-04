import { getSupabaseClient } from './supabase-client.js';

async function readCompetencesTable(characterId) {
    if (!characterId) return { data: null, error: null };
    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('character_competences')
            .select('data')
            .eq('character_id', characterId)
            .maybeSingle();
        if (error) throw error;
        return { data: data?.data || null, error: null };
    } catch (error) {
        console.error('[competences-service] table fetch error:', error);
        return { data: null, error };
    }
}

/**
 * Fetches the competences data for a character from the dedicated table.
 * Returns the raw competences object (same shape as profile_data.competences),
 * or null if no record exists.
 */
export async function getCharacterCompetences(characterId) {
    const result = await readCompetencesTable(characterId);
    return result.data || null;
}

/**
 * Reads competences from the primary dedicated table, then falls back
 * to legacy profile_data.competences if the table has no row yet.
 */
export async function getCharacterCompetencesSnapshot(characterId) {
    if (!characterId) {
        return { data: null, source: 'missing', error: null };
    }

    const tableResult = await readCompetencesTable(characterId);
    if (tableResult.error) {
        return { data: null, source: 'error', error: tableResult.error };
    }
    if (tableResult.data && typeof tableResult.data === 'object') {
        return { data: tableResult.data, source: 'table', error: null };
    }

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('characters')
            .select('profile_data')
            .eq('id', characterId)
            .maybeSingle();
        if (error) throw error;

        const legacyData = data?.profile_data?.competences || null;
        if (legacyData && typeof legacyData === 'object') {
            return { data: legacyData, source: 'legacy', error: null };
        }

        return { data: null, source: 'missing', error: null };
    } catch (error) {
        console.error('[competences-service] legacy fallback error:', error);
        return { data: null, source: 'error', error };
    }
}
