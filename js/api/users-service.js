// Users table reads for the admin panel. Returns { data, error } / { count, error }.
import { getSupabaseClient } from './supabase-client.js';
import { TABLES } from './tables.js';

export async function fetchUserSummary(userId) {
    const supabase = await getSupabaseClient();
    return supabase
        .from(TABLES.users)
        .select('id, username, role')
        .eq('id', userId)
        .single();
}

export async function countUsers() {
    const supabase = await getSupabaseClient();
    return supabase
        .from(TABLES.users)
        .select('id', { count: 'exact', head: true });
}
