import { getSupabaseClient } from './supabase-client.js';
import { getActiveCharacter, setActiveCharacterLocal } from './session-store.js';

// profile_data is a shared JSON blob written by several pages (inventaire, HDV,
// quêtes, magie, fiche). Writing a cached copy back overwrites whatever another
// page or tab saved in the meantime (lost update). patchCharacterProfile always
// re-reads the row and only commits if it was not modified since (optimistic
// concurrency on characters.updated_at, maintained by the characters_updated_at
// trigger), retrying on conflict.

const MAX_ATTEMPTS = 4;

function cloneJson(value) {
    if (!value || typeof value !== 'object') return {};
    return JSON.parse(JSON.stringify(value));
}

function syncActiveCharacterCache(characterId, profileData) {
    const active = getActiveCharacter();
    if (!active || active.id !== characterId) return;
    setActiveCharacterLocal({ ...active, profile_data: profileData });
}

/**
 * @param {string} characterId
 * @param {(profileData: object) => object | null | undefined} mutate
 *   Receives a fresh deep copy of profile_data. Return the next profile_data,
 *   or null/undefined to abort without writing.
 * @returns {Promise<{ success: boolean, profileData?: object, aborted?: boolean, error?: unknown }>}
 */
export async function patchCharacterProfile(characterId, mutate) {
    if (!characterId || typeof mutate !== 'function') {
        return { success: false, error: new Error('Invalid patch arguments') };
    }
    const supabase = await getSupabaseClient();
    let lastError = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const { data: row, error: readError } = await supabase
            .from('characters')
            .select('profile_data, updated_at')
            .eq('id', characterId)
            .single();
        if (readError || !row) {
            return { success: false, error: readError || new Error('Character not found') };
        }

        const next = mutate(cloneJson(row.profile_data));
        if (!next || typeof next !== 'object') {
            return { success: false, aborted: true, profileData: row.profile_data || {} };
        }

        let query = supabase
            .from('characters')
            .update({ profile_data: next }, { count: 'exact' })
            .eq('id', characterId);
        query = row.updated_at ? query.eq('updated_at', row.updated_at) : query;
        const { error: writeError, count } = await query;

        if (writeError) {
            lastError = writeError;
            break;
        }
        if (count === 1 || (count == null && !row.updated_at)) {
            syncActiveCharacterCache(characterId, next);
            return { success: true, profileData: next };
        }
        // count === 0 → row changed between read and write: retry on fresh data.
        await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
    }

    console.warn('[profile-patch] could not commit profile_data patch', lastError || 'conflict');
    return { success: false, error: lastError || new Error('Concurrent update conflict') };
}
