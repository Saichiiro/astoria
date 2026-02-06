/**
 * Activity Logger Service
 * Tracks all player actions for admin monitoring and audit trails
 */

import { getSupabaseClient } from './supabase-client.js';

/**
 * Action types for categorization
 */
export const ActionTypes = {
    // Economy
    ITEM_PURCHASE: 'item_purchase',
    ITEM_SELL: 'item_sell',
    KAELS_TRANSACTION: 'kaels_transaction',
    KAELS_ADMIN_GRANT: 'kaels_admin_grant',

    // Quests
    QUEST_JOIN: 'quest_join',
    QUEST_COMPLETE: 'quest_complete',
    QUEST_ABANDON: 'quest_abandon',

    // Character
    CHARACTER_CREATE: 'character_create',
    CHARACTER_UPDATE: 'character_update',
    CHARACTER_DELETE: 'character_delete',

    // Inventory
    INVENTORY_ADD: 'inventory_add',
    INVENTORY_REMOVE: 'inventory_remove',
    INVENTORY_EQUIP: 'inventory_equip',
    INVENTORY_UNEQUIP: 'inventory_unequip',

    // Codex
    CODEX_ITEM_CREATE: 'codex_item_create',
    CODEX_ITEM_UPDATE: 'codex_item_update',
    CODEX_ITEM_DELETE: 'codex_item_delete',

    // Auth
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    USER_REGISTER: 'user_register',

    // Admin
    ADMIN_ACTION: 'admin_action'
};

/**
 * Log an activity to the database
 * @param {Object} params
 * @param {string} params.actionType - Type of action from ActionTypes
 * @param {Object} params.actionData - Structured data about the action
 * @param {string} [params.userId] - User ID (auto-detected if not provided)
 * @param {string} [params.characterId] - Character ID if action is character-specific
 * @param {Object} [params.metadata] - Additional metadata
 * @returns {Promise<boolean>} Success status
 */
export async function logActivity({ actionType, actionData, userId = null, characterId = null, metadata = {} }) {
    try {
        const supabase = await getSupabaseClient();

        // Get current user if not provided
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id || null;
        }

        // Prepare log entry
        const logEntry = {
            user_id: userId,
            character_id: characterId,
            action_type: actionType,
            action_data: actionData,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                url: window.location.href
            }
        };

        // Insert into activity_logs table
        const { error } = await supabase
            .from('activity_logs')
            .insert([logEntry]);

        if (error) {
            console.error('[ActivityLogger] Failed to log activity:', error);
            return false;
        }

        console.log('[ActivityLogger] Logged:', actionType, actionData);
        return true;

    } catch (err) {
        console.error('[ActivityLogger] Exception:', err);
        return false;
    }
}

/**
 * Batch log multiple activities at once
 * @param {Array<Object>} activities - Array of activity objects
 * @returns {Promise<boolean>} Success status
 */
export async function logActivitiesBatch(activities) {
    try {
        const supabase = await getSupabaseClient();

        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        const logEntries = activities.map(activity => ({
            user_id: activity.userId || userId,
            character_id: activity.characterId || null,
            action_type: activity.actionType,
            action_data: activity.actionData,
            metadata: {
                ...(activity.metadata || {}),
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                url: window.location.href
            }
        }));

        const { error } = await supabase
            .from('activity_logs')
            .insert(logEntries);

        if (error) {
            console.error('[ActivityLogger] Failed to batch log activities:', error);
            return false;
        }

        console.log('[ActivityLogger] Batch logged:', activities.length, 'activities');
        return true;

    } catch (err) {
        console.error('[ActivityLogger] Batch exception:', err);
        return false;
    }
}

/**
 * Query activity logs (admin only)
 * @param {Object} filters
 * @param {string} [filters.userId] - Filter by user
 * @param {string} [filters.characterId] - Filter by character
 * @param {string} [filters.actionType] - Filter by action type
 * @param {string} [filters.startDate] - Start date (ISO string)
 * @param {string} [filters.endDate] - End date (ISO string)
 * @param {number} [filters.limit=100] - Max results
 * @param {number} [filters.offset=0] - Pagination offset
 * @returns {Promise<Array>} Activity logs
 */
export async function queryActivityLogs(filters = {}) {
    try {
        const supabase = await getSupabaseClient();

        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                user:users(id, email),
                character:characters(id, name)
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        if (filters.characterId) {
            query = query.eq('character_id', filters.characterId);
        }

        if (filters.actionType) {
            query = query.eq('action_type', filters.actionType);
        }

        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }

        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }

        // Pagination
        const limit = filters.limit || 100;
        const offset = filters.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
            console.error('[ActivityLogger] Failed to query logs:', error);
            return [];
        }

        return data || [];

    } catch (err) {
        console.error('[ActivityLogger] Query exception:', err);
        return [];
    }
}

/**
 * Get activity statistics (admin only)
 * @param {Object} filters
 * @param {string} [filters.startDate] - Start date
 * @param {string} [filters.endDate] - End date
 * @returns {Promise<Object>} Statistics object
 */
export async function getActivityStats(filters = {}) {
    try {
        const supabase = await getSupabaseClient();

        let query = supabase
            .from('activity_logs')
            .select('action_type, created_at');

        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }

        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[ActivityLogger] Failed to get stats:', error);
            return {};
        }

        // Calculate stats
        const stats = {
            total: data.length,
            byType: {},
            byDay: {}
        };

        data.forEach(log => {
            // Count by type
            stats.byType[log.action_type] = (stats.byType[log.action_type] || 0) + 1;

            // Count by day
            const day = new Date(log.created_at).toISOString().split('T')[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        });

        return stats;

    } catch (err) {
        console.error('[ActivityLogger] Stats exception:', err);
        return {};
    }
}

/**
 * Helper functions for common actions
 */

export async function logItemPurchase({ characterId, itemName, itemId, price, quantity = 1 }) {
    return logActivity({
        actionType: ActionTypes.ITEM_PURCHASE,
        characterId,
        actionData: {
            item_name: itemName,
            item_id: itemId,
            price,
            quantity,
            total_cost: price * quantity
        }
    });
}

export async function logQuestJoin({ characterId, questId, questName }) {
    return logActivity({
        actionType: ActionTypes.QUEST_JOIN,
        characterId,
        actionData: {
            quest_id: questId,
            quest_name: questName
        }
    });
}

export async function logKaelsTransaction({ characterId, amount, reason, previousBalance, newBalance }) {
    return logActivity({
        actionType: ActionTypes.KAELS_TRANSACTION,
        characterId,
        actionData: {
            amount,
            reason,
            previous_balance: previousBalance,
            new_balance: newBalance
        }
    });
}

export async function logInventoryChange({ characterId, action, itemName, itemId, quantity = 1 }) {
    return logActivity({
        actionType: action === 'add' ? ActionTypes.INVENTORY_ADD : ActionTypes.INVENTORY_REMOVE,
        characterId,
        actionData: {
            item_name: itemName,
            item_id: itemId,
            quantity
        }
    });
}

export async function logCharacterCreate({ characterId, characterName, race, characterClass }) {
    return logActivity({
        actionType: ActionTypes.CHARACTER_CREATE,
        characterId,
        actionData: {
            character_name: characterName,
            race,
            class: characterClass
        }
    });
}
