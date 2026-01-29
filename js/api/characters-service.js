import { getSupabaseClient } from './supabase-client.js';
import { getActiveCharacter, setActiveCharacterLocal } from './session-store.js';
import { isAdmin } from './auth-service.js';

export async function getUserCharacters(userId) {
    try {
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching characters:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getUserCharacters:', error);
        return [];
    }
}

export async function getAllCharacters() {
    if (!isAdmin()) return [];

    try {
        const supabase = await getSupabaseClient();

        const { data, error } = await supabase
            .from('characters')
            .select('id, name, user_id, race, class, profile_data')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching all characters:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getAllCharacters:', error);
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

        setActiveCharacterLocal(data);
        return { success: true };
    } catch (error) {
        console.error('Error in setActiveCharacter:', error);
        return { success: false };
    }
}

export async function updateCharacter(characterId, updates) {
    try {
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
