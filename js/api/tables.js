// Single source of truth for database table / view / bucket / RPC names.
// Services reference these instead of repeating string literals.

export const TABLES = Object.freeze({
    users: 'users',
    characters: 'characters',
    items: 'items',
    categories: 'categories',
    market: 'market',
    characterInventory: 'character_inventory',
    characterEquipped: 'character_equipped',
    characterCompetences: 'character_competences',
    skillsCatalog: 'skills_catalog',
    craftRecipes: 'craft_recipes',
    craftRecipeIngredients: 'craft_recipe_ingredients',
    nokorahs: 'nokorahs',
    activityLogs: 'activity_logs',
    quests: 'quests',
    questsListView: 'quests_list',
    questParticipants: 'quest_participants',
    questHistory: 'quest_history',
});

export const BUCKETS = Object.freeze({
    items: 'items',
    avatars: 'avatars',
});

export const RPC = Object.freeze({
    buyListing: 'buy_listing',
    executeCraftRecipe: 'execute_craft_recipe',
});

export const CHANNELS = Object.freeze({
    quests: 'astoria-quests-live',
});
