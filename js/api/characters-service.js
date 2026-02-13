import { getSupabaseClient } from './supabase-client.js';
import { getActiveCharacter, setActiveCharacterLocal } from './session-store.js';
import { isAdmin, refreshSessionUser } from './auth-service.js';

let authRefreshPromise = null;

async function ensureAuthContext() {
    if (!authRefreshPromise) {
        authRefreshPromise = refreshSessionUser().catch(() => ({ success: false }));
        try {
            await authRefreshPromise;
        } finally {
            authRefreshPromise = null;
        }
        return;
    }
    await authRefreshPromise;
}

function isAbortLikeError(error) {
    if (!error) return false;
    if (error.name === 'AbortError') return true;
    const msg = String(error.message || '').toLowerCase();
    return msg.includes('signal is aborted') || msg.includes('aborted');
}

export async function getUserCharacters(userId) {
    if (!userId) return [];

    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            if (!isAbortLikeError(error)) {
                console.error('Error fetching characters:', error);
            }
            return [];
        }

        return data || [];
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error in getUserCharacters:', error);
        }
        return [];
    }
}

export async function getAllCharacters() {
    if (!isAdmin()) return [];

    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .select('id, name, user_id, race, class, profile_data, kaels, created_at')
            .order('created_at', { ascending: true });

        if (error) {
            if (!isAbortLikeError(error)) {
                console.error('Error fetching all characters:', error);
            }
            return [];
        }

        return data || [];
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error in getAllCharacters:', error);
        }
        return [];
    }
}

/**
 * Crée la structure de compétences par défaut pour un nouveau personnage
 */
function createDefaultCompetences() {
    const DEFAULT_CATEGORY_POINTS = {
        arts: 75,
        connaissances: 75,
        combat: 25,
        pouvoirs: 5,
        social: 75,
        artisanat: 10,
        nature: 60,
        physique: 55,
        reputation: 25,
    };

    const pointsByCategory = {};
    const allocationsByCategory = {};
    const baseValuesByCategory = {};
    const locksByCategory = {};
    const customSkillsByCategory = {};

    // Initialiser pour chaque catégorie
    Object.keys(DEFAULT_CATEGORY_POINTS).forEach((categoryId) => {
        pointsByCategory[categoryId] = DEFAULT_CATEGORY_POINTS[categoryId];
        allocationsByCategory[categoryId] = {};
        baseValuesByCategory[categoryId] = {};
        locksByCategory[categoryId] = false;
        customSkillsByCategory[categoryId] = [];
    });

    return {
        version: 1,
        pointsByCategory,
        allocationsByCategory,
        baseValuesByCategory,
        locksByCategory,
        customSkillsByCategory
    };
}

export async function createCharacter(userId, characterData) {
    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const characters = await getUserCharacters(userId);
        if (characters.length >= 5) {
            return { success: false, error: 'Limite de 5 personnages atteinte' };
        }

        // Initialiser profile_data avec les compétences par défaut
        const defaultProfileData = {
            competences: createDefaultCompetences(),
            inventory: {},
            ...characterData.profileData
        };

        const { data, error } = await supabase
            .from('characters')
            .insert([{
                user_id: userId,
                name: characterData.name,
                race: characterData.race,
                class: characterData.class,
                profile_data: defaultProfileData,
                kaels: 0  // Les admins donnent les kaels de départ
            }])
            .select();

        if (error) {
            console.error('Error creating character:', error);
            return { success: false, error: 'Erreur lors de la création du personnage' };
        }

        return { success: true, character: data[0] };
    } catch (error) {
        console.error('Error in createCharacter:', error);
        return { success: false, error: 'Erreur lors de la création du personnage' };
    }
}

export async function getCharacterById(characterId) {
    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .single();

        if (error) {
            console.error('Error fetching character by ID:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error in getCharacterById:', error);
        return null;
    }
}

export async function setActiveCharacter(characterId) {
    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .single();

        if (error) {
            console.error('Error fetching character:', error);
            return { success: false };
        }

        // Check if character is active
        if (data.is_active === false) {
            console.warn('Attempted to select inactive character:', characterId);
            return { success: false, error: 'Ce personnage est désactivé' };
        }

        setActiveCharacterLocal(data);
        return { success: true };
    } catch (error) {
        console.error('Error in setActiveCharacter:', error);
        return { success: false };
    }
}

export async function updateCharacter(characterId, updates) {
    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .update(updates)
            .eq('id', characterId)
            .select();

        if (error) {
            console.error('Error updating character:', error);
            return { success: false };
        }

        const activeChar = getActiveCharacter();
        if (activeChar && activeChar.id === characterId) {
            setActiveCharacterLocal(data[0]);
        }

        return { success: true, character: data[0] };
    } catch (error) {
        console.error('Error in updateCharacter:', error);
        return { success: false };
    }
}
