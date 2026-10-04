import { getSupabaseClient } from './supabase-client.js';
import { clearActiveCharacter, getActiveCharacter, setActiveCharacterLocal } from './session-store.js';
import { isAdmin, refreshSessionUser } from './auth-service.js';

let authRefreshPromise = null;
const USER_CHARACTERS_CACHE_TTL_MS = 60000;
const userCharactersCache = new Map();
// profile_data is now lean (equippedSlots → character_equipped, items → character_inventory)
// Include it in summary so avatar_url and fiche_summary are always available.
const CHARACTER_SUMMARY_COLUMNS = 'id,user_id,name,race,class,profile_data,kaels,is_active,created_at';
const CHARACTER_FULL_COLUMNS = 'id,user_id,name,race,class,profile_data,kaels,is_active,created_at';

function resolveCharacterColumns(includeProfileData = false) {
    return includeProfileData ? CHARACTER_FULL_COLUMNS : CHARACTER_SUMMARY_COLUMNS;
}

function rowNeedsProfileHydration(row) {
    if (!row || !row.id) return false;
    return typeof row.profile_data === 'undefined' || row.profile_data === null;
}

async function hydrateCharacterRows(supabase, rows) {
    if (!Array.isArray(rows) || rows.length === 0) return Array.isArray(rows) ? rows : [];

    const missingIds = rows
        .filter(rowNeedsProfileHydration)
        .map((row) => row.id)
        .filter(Boolean);

    if (missingIds.length === 0) {
        return rows;
    }

    const { data, error } = await supabase
        .from('characters')
        .select('id, profile_data, kaels, is_active')
        .in('id', missingIds);

    if (error) {
        if (!isAbortLikeError(error)) {
            console.warn('Could not hydrate character rows with profile_data:', error);
        }
        return rows;
    }

    const extrasById = new Map((data || []).map((row) => [row.id, row]));
    return rows.map((row) => {
        const extra = extrasById.get(row.id);
        if (!extra) return row;
        return {
            ...row,
            profile_data: row.profile_data ?? extra.profile_data ?? null,
            kaels: row.kaels ?? extra.kaels,
            is_active: typeof row.is_active === 'undefined' ? extra.is_active : row.is_active
        };
    });
}

function readUserCharactersCache(userId) {
    const entry = userCharactersCache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        userCharactersCache.delete(userId);
        return null;
    }
    return entry.data;
}

function writeUserCharactersCache(userId, data) {
    userCharactersCache.set(userId, {
        data: Array.isArray(data) ? data : [],
        expiresAt: Date.now() + USER_CHARACTERS_CACHE_TTL_MS
    });
}

function clearUserCharactersCache(userId = null) {
    if (userId) {
        for (const key of userCharactersCache.keys()) {
            if (key === userId || key.startsWith(`${userId}:`)) {
                userCharactersCache.delete(key);
            }
        }
        return;
    }
    userCharactersCache.clear();
}

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

function isPermissionLikeError(error) {
    if (!error) return false;
    const code = String(error.code || '').toLowerCase();
    const msg = String(error.message || '').toLowerCase();
    return code === '403' || code === '42501' || msg.includes('forbidden') || msg.includes('permission');
}

const FICHE_LOCKED_TABS = [
    'identite',
    'appartenance',
    'combat',
    'alice',
    'sorcellerie',
    'eater',
    'religion',
    'mental',
    'physique',
    'background'
];

function normalizeFicheLocks(rawLocks) {
    const locks = {};
    FICHE_LOCKED_TABS.forEach((tabName) => {
        locks[tabName] = Boolean(rawLocks?.[tabName]);
    });
    return locks;
}

function sanitizePlayerCharacterUpdates(currentCharacter, updates) {
    if (!currentCharacter || !updates || typeof updates !== 'object') {
        return updates;
    }

    const currentProfile = currentCharacter.profile_data && typeof currentCharacter.profile_data === 'object'
        ? currentCharacter.profile_data
        : {};
    const currentLocks = normalizeFicheLocks(currentProfile.fiche_locks);
    const nextUpdates = { ...updates };

    if (nextUpdates.profile_data && typeof nextUpdates.profile_data === 'object') {
        const nextProfile = { ...nextUpdates.profile_data };
        const requestedLocks = normalizeFicheLocks(nextProfile.fiche_locks);
        const mergedLocks = { ...currentLocks };

        FICHE_LOCKED_TABS.forEach((tabName) => {
            if (requestedLocks[tabName]) {
                mergedLocks[tabName] = true;
            }
            if (currentLocks[tabName] && tabName in nextProfile) {
                delete nextProfile[tabName];
            }
        });

        nextProfile.fiche_locks = mergedLocks;
        nextUpdates.profile_data = nextProfile;
    }

    if (currentLocks.identite) {
        if ('name' in nextUpdates && nextUpdates.name !== currentCharacter.name) {
            delete nextUpdates.name;
        }
        if ('race' in nextUpdates && nextUpdates.race !== currentCharacter.race) {
            delete nextUpdates.race;
        }
    }

    if (currentLocks.appartenance) {
        if ('class' in nextUpdates && nextUpdates.class !== currentCharacter.class) {
            delete nextUpdates.class;
        }
    }

    return nextUpdates;
}

export async function getUserCharacters(userId, options = {}) {
    if (!userId) return [];
    const includeProfileData = options?.includeProfileData === true;
    const cacheKey = `${userId}:${includeProfileData ? 'full' : 'summary'}`;

    const cached = readUserCharactersCache(cacheKey);
    if (cached) return cached;

    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();
        const columns = resolveCharacterColumns(includeProfileData);

        const { data, error } = await supabase
            .from('characters')
            .select(columns)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            if (!isAbortLikeError(error)) {
                console.error('Error fetching characters:', error);
            }
            return [];
        }

        const output = includeProfileData
            ? await hydrateCharacterRows(supabase, data || [])
            : (data || []);
        writeUserCharactersCache(cacheKey, output);
        return output;
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error in getUserCharacters:', error);
        }
        return [];
    }
}

export async function getAllCharacters(options = {}) {
    if (!isAdmin()) return [];
    const includeProfileData = options?.includeProfileData === true;

    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();
        const columns = resolveCharacterColumns(includeProfileData);

        const { data, error } = await supabase
            .from('characters')
            .select(columns)
            .order('created_at', { ascending: true });

        if (error) {
            if (!isAbortLikeError(error)) {
                console.error('Error fetching all characters:', error);
            }
            return [];
        }

        return includeProfileData
            ? await hydrateCharacterRows(supabase, data || [])
            : (data || []);
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

        clearUserCharactersCache(userId);
        return { success: true, character: data[0] };
    } catch (error) {
        console.error('Error in createCharacter:', error);
        return { success: false, error: 'Erreur lors de la création du personnage' };
    }
}

export async function getCharacterById(characterId, options = {}) {
    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();
        const columns = resolveCharacterColumns(options?.includeProfileData !== false);

        const { data, error } = await supabase
            .from('characters')
            .select(columns)
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
            .select(CHARACTER_SUMMARY_COLUMNS)
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
        let safeUpdates = updates;
        let currentCharacter = null;

        const touchesLockableFields = Boolean(updates) && typeof updates === 'object'
            && ['profile_data', 'name', 'race', 'class'].some((key) => key in updates);

        if (!isAdmin() && touchesLockableFields) {
            const currentResult = await supabase
                .from('characters')
                .select(CHARACTER_FULL_COLUMNS)
                .eq('id', characterId)
                .single();

            if (!currentResult.error && currentResult.data) {
                currentCharacter = currentResult.data;
                safeUpdates = sanitizePlayerCharacterUpdates(currentCharacter, updates);
            }
        }

        // profile_data is shared by every page; callers often send a cached (possibly
        // stale or session-stripped) copy. Merge their top-level keys onto the row
        // as stored now, so keys missing from the cached copy are never wiped.
        if (safeUpdates?.profile_data && typeof safeUpdates.profile_data === 'object') {
            let storedProfile = currentCharacter ? (currentCharacter.profile_data || {}) : null;
            if (!storedProfile) {
                const { data: stored, error: storedError } = await supabase
                    .from('characters')
                    .select('profile_data')
                    .eq('id', characterId)
                    .single();
                if (storedError || !stored) {
                    console.error('updateCharacter: current profile unavailable, update aborted:', storedError);
                    return { success: false };
                }
                storedProfile = stored.profile_data || {};
            }
            safeUpdates = {
                ...safeUpdates,
                profile_data: { ...storedProfile, ...safeUpdates.profile_data }
            };
        }

        if (!safeUpdates || typeof safeUpdates !== 'object' || Object.keys(safeUpdates).length === 0) {
            const activeChar = getActiveCharacter();
            if (currentCharacter && activeChar && activeChar.id === characterId) {
                setActiveCharacterLocal(currentCharacter);
            }
            return { success: true, character: currentCharacter || getActiveCharacter() || null };
        }

        let { data, error } = await supabase
            .from('characters')
            .update(safeUpdates)
            .eq('id', characterId)
            .select();

        if (error && isPermissionLikeError(error)) {
            const fallback = await supabase
                .from('characters')
                .update(safeUpdates)
                .eq('id', characterId);

            if (!fallback.error) {
                const activeChar = getActiveCharacter();
                // Deep-merge profile_data so a partial update.profile_data never wipes
                // fields (inventory, nokorahBonuses, etc.) that aren't in the update payload.
                const mergedCharacter = activeChar && activeChar.id === characterId
                    ? {
                        ...activeChar,
                        ...safeUpdates,
                        ...(safeUpdates.profile_data != null ? {
                            profile_data: { ...(activeChar.profile_data || {}), ...safeUpdates.profile_data }
                        } : {})
                    }
                    : null;

                clearUserCharactersCache();
                if (mergedCharacter) {
                    setActiveCharacterLocal(mergedCharacter);
                }

                return { success: true, character: mergedCharacter };
            }
        }

        if (error) {
            console.error('Error updating character:', error);
            return { success: false };
        }

        clearUserCharactersCache();
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

export async function deleteCharacter(characterId) {
    if (!characterId) {
        return { success: false, error: 'Personnage introuvable' };
    }

    try {
        await ensureAuthContext();
        const supabase = await getSupabaseClient();

        const { error: releaseBuyerRefsError } = await supabase
            .from('market')
            .update({ buyer_character_id: null })
            .eq('buyer_character_id', characterId);

        if (releaseBuyerRefsError) {
            console.error('Error releasing market buyer references:', releaseBuyerRefsError);
            return { success: false, error: 'Impossible de liberer les references du marche' };
        }

        const { data, error } = await supabase
            .from('characters')
            .delete()
            .eq('id', characterId)
            .select('id, user_id')
            .maybeSingle();

        if (error) {
            console.error('Error deleting character:', error);
            return { success: false, error: 'Erreur lors de la suppression du personnage' };
        }

        clearUserCharactersCache(data?.user_id || null);

        const activeChar = getActiveCharacter();
        if (activeChar && activeChar.id === characterId) {
            clearActiveCharacter();
        }

        return { success: true, character: data || null };
    } catch (error) {
        console.error('Error in deleteCharacter:', error);
        return { success: false, error: 'Erreur lors de la suppression du personnage' };
    }
}
