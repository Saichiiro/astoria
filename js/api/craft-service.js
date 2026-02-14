import { getSupabaseClient } from './supabase-client.js';

export const CRAFT_CATEGORIES = ['Alchimie', 'Forge', 'Autre'];
export const CRAFT_RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'SS', 'SSS'];

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

export async function getCraftRecipes() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from('craft_recipes')
        .select(`
            id,
            title,
            category,
            rarity,
            rank,
            output_item_id,
            output_item_key,
            output_qty,
            created_at,
            craft_recipe_ingredients (
                id,
                item_id,
                item_key,
                qty
            )
        `)
        .order('title', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
        ...row,
        ingredients: Array.isArray(row.craft_recipe_ingredients) ? row.craft_recipe_ingredients : []
    }));
}

export async function createCraftRecipe(recipe) {
    const supabase = await getSupabaseClient();
    const computedTitle = String(recipe?.title || recipe?.output_item_key || '').trim();
    const payload = {
        title: computedTitle,
        category: String(recipe?.category || 'Autre').trim(),
        rarity: String(recipe?.rarity || 'Commun').trim(),
        rank: String(recipe?.rank || 'F').trim(),
        output_item_id: recipe?.output_item_id || null,
        output_item_key: String(recipe?.output_item_key || '').trim(),
        output_qty: Math.max(1, Math.floor(Number(recipe?.output_qty) || 1))
    };

    if (!payload.title || !payload.output_item_key) {
        throw new Error('Missing recipe title/output item.');
    }

    const { data: created, error: createError } = await supabase
        .from('craft_recipes')
        .insert([payload])
        .select('id')
        .single();

    if (createError) throw createError;

    const ingredients = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients
            .map((line) => ({
                recipe_id: created.id,
                item_id: line?.item_id || null,
                item_key: String(line?.item_key || '').trim(),
                qty: Math.max(1, Math.floor(Number(line?.qty) || 0))
            }))
            .filter((line) => line.item_key && line.qty > 0)
        : [];

    if (!ingredients.length) {
        throw new Error('Recipe requires at least one ingredient.');
    }

    const { error: ingredientsError } = await supabase
        .from('craft_recipe_ingredients')
        .insert(ingredients);

    if (ingredientsError) throw ingredientsError;

    return created;
}

export async function updateCraftRecipe(recipeId, recipe) {
    const supabase = await getSupabaseClient();
    const computedTitle = String(recipe?.title || recipe?.output_item_key || '').trim();
    const payload = {
        title: computedTitle,
        category: String(recipe?.category || 'Autre').trim(),
        rarity: String(recipe?.rarity || 'Commun').trim(),
        rank: String(recipe?.rank || 'F').trim(),
        output_item_id: recipe?.output_item_id || null,
        output_item_key: String(recipe?.output_item_key || '').trim(),
        output_qty: Math.max(1, Math.floor(Number(recipe?.output_qty) || 1))
    };

    if (!payload.title || !payload.output_item_key) {
        throw new Error('Missing recipe title/output item.');
    }

    const { error: updateError } = await supabase
        .from('craft_recipes')
        .update(payload)
        .eq('id', recipeId);

    if (updateError) throw updateError;

    const { error: wipeIngredientsError } = await supabase
        .from('craft_recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);

    if (wipeIngredientsError) throw wipeIngredientsError;

    const ingredients = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients
            .map((line) => ({
                recipe_id: recipeId,
                item_id: line?.item_id || null,
                item_key: String(line?.item_key || '').trim(),
                qty: Math.max(1, Math.floor(Number(line?.qty) || 0))
            }))
            .filter((line) => line.item_key && line.qty > 0)
        : [];

    if (!ingredients.length) {
        throw new Error('Recipe requires at least one ingredient.');
    }

    const { error: ingredientsError } = await supabase
        .from('craft_recipe_ingredients')
        .insert(ingredients);

    if (ingredientsError) throw ingredientsError;

    return { id: recipeId };
}

export async function deleteCraftRecipe(recipeId) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
        .from('craft_recipes')
        .delete()
        .eq('id', recipeId);

    if (error) throw error;
    return { id: recipeId };
}

export async function executeCraftRecipe(characterId, recipeId, times = 1) {
    const supabase = await getSupabaseClient();
    const safeTimes = Math.max(1, Math.floor(Number(times) || 1));

    const { data, error } = await supabase.rpc('execute_craft_recipe', {
        p_character_id: characterId,
        p_recipe_id: recipeId,
        p_times: safeTimes
    });

    if (error) throw error;
    return data;
}

export function buildInventoryIndex(rows) {
    const byItemId = new Map();
    const byItemKey = new Map();

    (rows || []).forEach((row) => {
        const qty = Math.max(0, Math.floor(Number(row?.qty) || 0));
        if (qty <= 0) return;

        const itemId = String(row?.item_id || '').trim();
        if (itemId) {
            byItemId.set(itemId, (byItemId.get(itemId) || 0) + qty);
        }

        const itemKey = normalizeText(row?.item_key || '');
        if (itemKey) {
            byItemKey.set(itemKey, (byItemKey.get(itemKey) || 0) + qty);
        }
    });

    return { byItemId, byItemKey };
}

export function getInventoryQty(index, ingredient) {
    if (!index || !ingredient) return 0;

    const itemId = String(ingredient.item_id || '').trim();
    if (itemId && index.byItemId.has(itemId)) {
        return index.byItemId.get(itemId) || 0;
    }

    const itemKey = normalizeText(ingredient.item_key || '');
    if (itemKey && index.byItemKey.has(itemKey)) {
        return index.byItemKey.get(itemKey) || 0;
    }

    return 0;
}

export function canCraftRecipe(recipe, inventoryIndex, times = 1) {
    const safeTimes = Math.max(1, Math.floor(Number(times) || 1));
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];

    // Recipe must have at least 1 ingredient (backend requirement)
    if (ingredients.length === 0) {
        return false;
    }

    return ingredients.every((line) => {
        const need = Math.max(1, Math.floor(Number(line?.qty) || 0)) * safeTimes;
        const have = getInventoryQty(inventoryIndex, line);
        return have >= need;
    });
}

