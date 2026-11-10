// Data access for the admin dashboard (admin/). Each function returns the raw
// Supabase result ({ data, error } or { count, error }) so the dashboard keeps
// its own error handling and messages.
import { getSupabaseClient } from './supabase-client.js';
import { TABLES } from './tables.js';

const db = async (table) => (await getSupabaseClient()).from(table);

// ---- Counts ---------------------------------------------------------------
export async function countUsers() {
    return (await db(TABLES.users)).select('id', { count: 'exact', head: true });
}

export async function countQuests({ status = null } = {}) {
    const query = (await db(TABLES.quests)).select('id', { count: 'exact', head: true });
    return status ? query.eq('status', status) : query;
}

// ---- Users ----------------------------------------------------------------
export async function listUsersWithCharacters() {
    return (await db(TABLES.users))
        .select(`
                    id,
                    username,
                    role,
                    created_at,
                    last_login,
                    is_active,
                    characters (
                        id,
                        name,
                        kaels,
                        is_active
                    )
                `)
        .order('last_login', { ascending: false, nullsLast: true });
}

export async function updateUser(userId, fields) {
    return (await db(TABLES.users)).update(fields).eq('id', userId);
}

// ---- Characters -----------------------------------------------------------
export async function deleteCharacterRow(characterId) {
    return (await db(TABLES.characters)).delete().eq('id', characterId);
}

export async function updateCharacterRow(characterId, fields) {
    return (await db(TABLES.characters)).update(fields).eq('id', characterId);
}

export async function listCharactersOfUser(userId) {
    return (await db(TABLES.characters))
        .select('id, name, kaels, is_active, profile_data')
        .eq('user_id', userId);
}

export async function fetchCharacterWithProfile(characterId) {
    return (await db(TABLES.characters))
        .select('id, name, profile_data')
        .eq('id', characterId)
        .maybeSingle();
}

export async function listCharactersWithProfile() {
    return (await db(TABLES.characters))
        .select('id, name, profile_data')
        .order('name');
}

// ---- Quests ---------------------------------------------------------------
export async function listQuestsForAdmin() {
    return (await db(TABLES.quests))
        .select('id, name, type, rank, status, repeatable, max_participants, description, rewards, images, completed_by')
        .order('created_at', { ascending: false });
}

export async function listQuestParticipantQuestIds() {
    return (await db(TABLES.questParticipants)).select('quest_id');
}

export async function updateQuestRow(questId, payload) {
    return (await db(TABLES.quests)).update(payload).eq('id', questId);
}

export async function insertQuestRow(payload) {
    return (await db(TABLES.quests)).insert(payload);
}

export async function deleteQuestRow(questId) {
    return (await db(TABLES.quests)).delete().eq('id', questId);
}

export async function listParticipantsOfQuest(questId) {
    return (await db(TABLES.questParticipants))
        .select('joined_at, characters(id, name)')
        .eq('quest_id', questId)
        .order('joined_at', { ascending: true });
}

export async function listParticipationsOfCharacters(characterIds) {
    return (await db(TABLES.questParticipants))
        .select('quest_id, joined_at, characters(name), quests(name, rank, status)')
        .in('character_id', characterIds)
        .order('joined_at', { ascending: false });
}

export async function listParticipationsWithQuestType(characterIds) {
    return (await db(TABLES.questParticipants))
        .select('quest_id, joined_at, characters(name), quests(id, name, rank, status, type)')
        .in('character_id', characterIds)
        .order('joined_at', { ascending: false });
}

// column: 'character_id' or 'character_label'
export async function listQuestHistoryBy(column, values, limit) {
    return (await db(TABLES.questHistory))
        .select('*')
        .in(column, values)
        .order('date', { ascending: false })
        .limit(limit);
}

// ---- Inventory ------------------------------------------------------------
export async function listInventoryOfCharacters(characterIds) {
    return (await db(TABLES.characterInventory))
        .select('id, character_id, item_key, qty, item_id')
        .in('character_id', characterIds)
        .order('item_key');
}

export async function deleteInventoryRow(rowId) {
    return (await db(TABLES.characterInventory)).delete().eq('id', rowId);
}

// ---- Competences ----------------------------------------------------------
export async function fetchCompetencesRow(characterId) {
    return (await db(TABLES.characterCompetences))
        .select('data')
        .eq('character_id', characterId)
        .maybeSingle();
}

export async function listCompetencesRows(characterIds) {
    return (await db(TABLES.characterCompetences))
        .select('character_id, data')
        .in('character_id', characterIds);
}

export async function upsertCompetencesRow(characterId, data) {
    return (await db(TABLES.characterCompetences))
        .upsert({ character_id: characterId, data });
}

// ---- Activity logs --------------------------------------------------------
export async function fetchActivityLogDetails(logId) {
    return (await db(TABLES.activityLogs))
        .select(`
                *,
                user:users(id, role),
                character:characters(id, name)
            `)
        .eq('id', logId)
        .single();
}
