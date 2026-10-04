/**
 * realtime-service.js
 * One shared WebSocket connection — free tier safe (200 concurrent max).
 * Call subscribeCharacter() once per page when active character is known.
 */

import { getSupabaseClient } from './supabase-client.js';

let characterChannel = null;
let marketChannel = null;
let questsChannel = null;

const listeners = {
    market:             [],
    quetes:             [],
    quest_participants: [],
    characters:         [],
};

function emit(key, payload) {
    (listeners[key] || []).forEach(fn => { try { fn(payload); } catch {} });
}

// ── Market (HDV) ────────────────────────────────────────────────────────────

export async function subscribeMarket(onChange) {
    const off = onMarketChange(onChange);
    if (marketChannel) return off;

    const sb = await getSupabaseClient();
    marketChannel = sb
        .channel('market-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market' },
            payload => emit('market', payload))
        .subscribe();

    return off;
}

export function onMarketChange(fn) {
    listeners.market.push(fn);
    return () => { listeners.market = listeners.market.filter(f => f !== fn); };
}

// ── Quêtes ──────────────────────────────────────────────────────────────────

export async function subscribeQuests(onChange) {
    const off = onQuestChange(onChange);
    if (questsChannel) return off;

    const sb = await getSupabaseClient();
    questsChannel = sb
        .channel('quetes-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quetes' },
            payload => emit('quetes', payload))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_participants' },
            payload => emit('quest_participants', payload))
        .subscribe();

    return off;
}

export function onQuestChange(fn) {
    listeners.quetes.push(fn);
    listeners.quest_participants.push(fn);
    return () => {
        listeners.quetes             = listeners.quetes.filter(f => f !== fn);
        listeners.quest_participants = listeners.quest_participants.filter(f => f !== fn);
    };
}

// ── Character (kaels, is_active) ────────────────────────────────────────────

export async function subscribeCharacter(characterId) {
    if (!characterId) return;
    if (characterChannel) return;

    const sb = await getSupabaseClient();
    characterChannel = sb
        .channel(`character:${characterId}`)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'characters',
            filter: `id=eq.${characterId}`,
        }, payload => emit('characters', payload))
        .subscribe();
}

export function onCharacterUpdate(fn) {
    listeners.characters.push(fn);
    return () => { listeners.characters = listeners.characters.filter(f => f !== fn); };
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

export async function unsubscribeAll() {
    const sb = await getSupabaseClient();
    [characterChannel, marketChannel, questsChannel].forEach(ch => {
        if (ch) sb.removeChannel(ch);
    });
    characterChannel = marketChannel = questsChannel = null;
}
