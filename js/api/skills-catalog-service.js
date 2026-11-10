// Skills catalogue table access (read by js/domain/skills-catalog.js).
import { getSupabaseClient } from './supabase-client.js';
import { TABLES } from './tables.js';


export async function countCatalogRows() {
    const supabase = await getSupabaseClient();
    const { count, error } = await supabase
        .from(TABLES.skillsCatalog)
        .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return Number(count) || 0;
}

export async function insertCatalogRows(rows) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from(TABLES.skillsCatalog).insert(rows);
    if (error) throw error;
}

// Returns { data, error }: the caller falls back to static data on error.
export async function fetchActiveCatalogRows() {
    const supabase = await getSupabaseClient();
    return supabase
        .from(TABLES.skillsCatalog)
        .select('category_id, slug, name, icon, cap, sort_order, is_active')
        .eq('is_active', true)
        .order('category_id', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
}

export async function fetchCatalogKeys() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLES.skillsCatalog)
        .select('category_id, slug');
    if (error) throw error;
    return data || [];
}

export async function deleteCatalogRow(categoryId, slug) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from(TABLES.skillsCatalog)
        .delete()
        .eq('category_id', categoryId)
        .eq('slug', slug);
    if (error) throw error;
}

export async function upsertCatalogRows(rows) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from(TABLES.skillsCatalog)
        .upsert(rows, { onConflict: 'category_id,slug' });
    if (error) throw error;
}
