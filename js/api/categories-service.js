import { getSupabaseClient } from './supabase-client.js';

const FALLBACK_CATEGORIES = [
    { slug: 'agricole', name: 'Agricole', icon: '🌾', is_active: true, display_order: 1 },
    { slug: 'consommable', name: 'Consommable', icon: '🧪', is_active: true, display_order: 2 },
    { slug: 'equipement', name: 'Équipement', icon: '⚔️', is_active: true, display_order: 3 },
    { slug: 'materiau', name: 'Matériaux', icon: '⚒️', is_active: true, display_order: 4 },
    { slug: 'quete', name: 'Quêtes', icon: '✨', is_active: true, display_order: 5 }
];

function isMissingCategoriesTable(error) {
    const code = String(error?.code || '').trim();
    const message = String(error?.message || '').toLowerCase();
    return code === '42P01'
        || code === 'PGRST205'
        || code === 'PGRST204'
        || (message.includes('relation') && message.includes('categories') && message.includes('does not exist'))
        || (message.includes('categories') && message.includes('schema cache'))
        || (message.includes('column') && message.includes('display_order'));
}

/**
 * Get all active categories, ordered by display_order
 * @returns {Promise<Array>} Array of category objects
 */
export async function getCategories() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) {
        if (isMissingCategoriesTable(error)) {
            return FALLBACK_CATEGORIES;
        }
        throw error;
    }
    return data || [];
}

/**
 * Get a single category by slug
 * @param {string} slug - Category slug (e.g., 'agricole')
 * @returns {Promise<Object|null>} Category object or null if not found
 */
export async function getCategory(slug) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    if (error) {
        if (isMissingCategoriesTable(error)) {
            return FALLBACK_CATEGORIES.find((entry) => entry.slug === slug) || null;
        }
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data;
}

/**
 * Create or update a category (admin only)
 * @param {Object} category - Category data
 * @returns {Promise<Object>} Created/updated category
 */
export async function upsertCategory(category) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'slug' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get categories as a Map (slug -> category object) for quick lookups
 * @returns {Promise<Map>} Map of categories keyed by slug
 */
export async function getCategoriesMap() {
    const categories = await getCategories();
    const map = new Map();
    categories.forEach(cat => {
        map.set(cat.slug, cat);
    });
    return map;
}

/**
 * Get categories formatted for dropdowns/selects
 * @param {boolean} includeAll - Whether to include "Toutes catégories" option
 * @returns {Promise<Array>} Array of {value, label, icon} objects
 */
export async function getCategoriesForSelect(includeAll = true) {
    const categories = await getCategories();
    const options = categories.map(cat => ({
        value: cat.slug,
        label: cat.name,
        icon: cat.icon || ''
    }));

    if (includeAll) {
        options.unshift({
            value: 'all',
            label: 'Toutes catégories',
            icon: '📦'
        });
    }

    return options;
}
