/**
 * realtime-service.js
 *
 * Supabase Realtime wrapper — free tier safe:
 *   - 200 concurrent connections max → on ouvre UNE connexion partagée
 *   - ~2M messages/mois → on ne subscribe qu'aux tables utiles, filtrées par character_id
 *
 * Usage:
 *   import { subscribeCharacter, onQuestUpdate, onNotification } from './api/realtime-service.js';
 *   subscribeCharacter(characterId);
 *   onQuestUpdate(handler);
 */

import { supabase } from './supabase-client.js';

let channel = null;
let activeCharacterId = null;

const listeners = {
    quest_participants: [],
    quetes:            [],
    notifications:     [],
    characters:        [],
};

function emit(table, payload) {
    (listeners[table] || []).forEach(fn => {
        try { fn(payload); } catch {}
    });
}

/**
 * Subscribe to realtime updates for a given character.
 * Call once when the active character changes.
 * Safe to call multiple times — reopens only if characterId changed.
 */
export function subscribeCharacter(characterId) {
    if (!characterId) return;
    if (activeCharacterId === characterId && channel) return;

    unsubscribeAll();
    activeCharacterId = characterId;

    channel = supabase
        .channel(`character:${characterId}`)
        // Quest participation changes for this character
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'quest_participants',
            filter: `character_id=eq.${characterId}`,
        }, payload => emit('quest_participants', payload))
        // Quest status changes (e.g. admin closes a quest you're in)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'quetes',
        }, payload => emit('quetes', payload))
        // Character updates (kaels, is_active, etc.)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'characters',
            filter: `id=eq.${characterId}`,
        }, payload => emit('characters', payload))
        .subscribe();
}

/** Stop all realtime subscriptions. */
export function unsubscribeAll() {
    if (channel) {
        supabase.removeChannel(channel);
        channel = null;
        activeCharacterId = null;
    }
}

// ── Listener registration helpers ──────────────────────────────────────────

/** Called when a quest participation row changes for the active character. */
export function onQuestParticipantUpdate(fn) {
    listeners.quest_participants.push(fn);
    return () => { listeners.quest_participants = listeners.quest_participants.filter(f => f !== fn); };
}

/** Called when any quest row is updated (status, title, etc.). */
export function onQuestUpdate(fn) {
    listeners.quetes.push(fn);
    return () => { listeners.quetes = listeners.quetes.filter(f => f !== fn); };
}

/** Called when the active character row is updated (kaels, is_active). */
export function onCharacterUpdate(fn) {
    listeners.characters.push(fn);
    return () => { listeners.characters = listeners.characters.filter(f => f !== fn); };
}
