// Quests data access: quests, participants, history, realtime channel.
// Pages call these functions and never touch the Supabase client directly.
import { getSupabaseClient } from './supabase-client.js';
import { TABLES, CHANNELS } from './tables.js';

const QUESTS_SELECT_COLUMNS = 'id,name,type,rank,status,repeatable,description,locations,rewards,prerequisites,images,max_participants,completed_by,created_at';
const QUESTS_POLL_COLUMNS = 'id,status,max_participants,completed_by';
const QUEST_HISTORY_SELECT_COLUMNS = '*';

// Some deployments restrict the quests table; the public list view is the fallback.
function shouldFallbackToListView(error, { includeMissingRelation }) {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '');
    const permissionLike = code === '42501' || message.includes('permission') || message.includes('forbidden');
    if (!includeMissingRelation) return permissionLike;
    return permissionLike || message.includes('relation') || message.includes('does not exist');
}

export async function fetchQuestsPage(from, to) {
    const supabase = await getSupabaseClient();
    let { data, error } = await supabase
        .from(TABLES.quests)
        .select(QUESTS_SELECT_COLUMNS)
        .order('created_at', { ascending: true })
        .range(from, to);

    if (error && shouldFallbackToListView(error, { includeMissingRelation: true })) {
        ({ data, error } = await supabase
            .from(TABLES.questsListView)
            .select('*')
            .order('created_at', { ascending: true })
            .range(from, to));
    }

    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

export async function fetchQuestsDeltaPoll() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLES.quests)
        .select(QUESTS_POLL_COLUMNS)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

// Returns the raw quest row (the page maps it).
export async function fetchQuestRowById(questId) {
    const supabase = await getSupabaseClient();
    let { data, error } = await supabase
        .from(TABLES.quests)
        .select(QUESTS_SELECT_COLUMNS)
        .eq('id', questId)
        .single();
    if (error && shouldFallbackToListView(error, { includeMissingRelation: false })) {
        ({ data, error } = await supabase
            .from(TABLES.questsListView)
            .select('*')
            .eq('id', questId)
            .single());
    }
    if (error) throw error;
    return data;
}

export async function fetchQuestParticipants(questIds = null) {
    const supabase = await getSupabaseClient();
    let query = supabase
        .from(TABLES.questParticipants)
        .select(`
                quest_id,
                character_id,
                joined_at,
                characters (
                    id,
                    name
                )
            `);
    if (questIds) {
        query = query.in('quest_id', questIds);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// Replaces the participants of a quest (delete then insert), same as before.
export async function replaceQuestParticipants(questId, rows) {
    const supabase = await getSupabaseClient();
    await supabase
        .from(TABLES.questParticipants)
        .delete()
        .eq('quest_id', questId);
    if (!rows.length) return;
    const { error } = await supabase
        .from(TABLES.questParticipants)
        .insert(rows);
    if (error) throw error;
}

export async function upsertQuestRow(payload) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from(TABLES.quests)
        .upsert([payload], { onConflict: 'id' });
    if (error) throw error;
}

export async function deleteQuestRow(questId) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from(TABLES.quests)
        .delete()
        .eq('id', questId);
    if (error) throw error;
}

export async function fetchQuestHistoryRows(characterId, limit) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLES.questHistory)
        .select(QUEST_HISTORY_SELECT_COLUMNS)
        .order('date', { ascending: false })
        .limit(limit)
        .eq('character_id', characterId);
    if (error) throw error;
    return data;
}

// Returns { error } (null error on success) so the caller can retry with fewer columns.
export async function upsertQuestHistoryRow(payload) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from(TABLES.questHistory)
        .upsert([payload], { onConflict: 'id' });
    return { error };
}

// Live updates on quests, participants and history. Returns { unsubscribe } or null
// when the client has no realtime support (caller falls back to polling).
// onChange receives { refreshHistory } as before.
export async function subscribeToQuestChanges({ onChange, onStatus }) {
    const supabase = await getSupabaseClient();
    if (!supabase?.channel) return null;
    const channel = supabase
        .channel(CHANNELS.quests)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.quests }, () => {
            onChange({ refreshHistory: false });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.questParticipants }, () => {
            onChange({ refreshHistory: false });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.questHistory }, () => {
            onChange({ refreshHistory: true });
        })
        .subscribe(onStatus);
    return {
        unsubscribe() {
            try {
                supabase.removeChannel(channel);
            } catch {}
        }
    };
}

// id, name, type, rank, description of every quest (prerequisites picker).
export async function fetchQuestSummaries() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLES.quests)
        .select('id, name, type, rank, description')
        .order('name', { ascending: true });
    if (error) throw error;
    return data;
}
