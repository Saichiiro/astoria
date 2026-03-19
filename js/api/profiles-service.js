import { getSupabaseClient } from './supabase-client.js';
import { getCurrentUser } from './auth-service.js';
import { getActiveCharacter, setActiveCharacterLocal } from './session-store.js?v=20260319';

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
        .from('characters')
        .select('id, user_id, name, race, class, profile_data, kaels')
        .eq('id', character.id)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Personnage introuvable.');

    // Strip profile_data before storing in localStorage — it can be a huge blob
    const { profile_data: _pd, ...slimChar } = data;
    setActiveCharacterLocal(slimChar);
    return { character_id: data.id, kaels: data.kaels, character: data };
}
