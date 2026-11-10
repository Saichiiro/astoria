import { getSupabaseClient } from './supabase-client.js';
import { getCurrentUser } from './auth-service.js';
import { getActiveCharacter, setActiveCharacterLocal } from './session-store.js';
import { TABLES, BUCKETS } from './tables.js';

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

export async function getMyProfile() {
    const { character } = requireCharacter();
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
        .from(TABLES.characters)
        .select('id, user_id, name, race, class, profile_data, kaels')
        .eq('id', character.id)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Personnage introuvable.');

    // buildCharacterStorageSnapshot (inside setActiveCharacterLocal) already slims
    // the data — pass the full object so avatar_url / fiche_summary are preserved.
    setActiveCharacterLocal(data);
    return { character_id: data.id, kaels: data.kaels, character: data };
}

// Uploads a character avatar to storage. Returns { publicUrl, error }.
export async function uploadCharacterAvatar(characterId, file) {
    const supabase = await getSupabaseClient();
    const safeName = String(file.name || 'avatar')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '_');
    const filePath = `characters/${characterId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
        .from(BUCKETS.avatars)
        .upload(filePath, file, {
            cacheControl: '31536000',
            upsert: true,
            contentType: file.type
        });
    if (error) return { publicUrl: null, error };
    const { data } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(filePath);
    return { publicUrl: data?.publicUrl || null, error: null };
}
