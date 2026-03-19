import {
    getCurrentUser,
    getActiveCharacter,
    refreshSessionUser,
    getUserCharacters,
    setActiveCharacter,
    updateCharacter,
    getAllItems
} from './auth.js?v=20260319';
import {
    buyListing,
    cancelListing,
    createListing,
    getMyHistory,
    getMyListings,
    getMyProfile,
    searchListings
} from './market.js?v=20260319';
import { getInventoryRows, setInventoryItem } from './api/inventory-service.js';
import { getCategories } from './api/categories-service.js?v=2026031701';
import { initCharacterSummary } from './ui/character-summary.js';
import { logItemPurchase, logActivity, ActionTypes } from './api/activity-logger.js';

const dom = {
    kaelsBadge: document.getElementById('characterKaelsBadge'),
    tabs: Array.from(document.querySelectorAll('.hdv-tab')),
    panels: {
        search: document.getElementById('hdvTabSearch'),
        mine: document.getElementById('hdvTabMine'),
        history: document.getElementById('hdvTabHistory')
    },
    categories: document.getElementById('hdvCategories'),
    search: {
        root: document.getElementById('hdvSearch'),
        input: document.getElementById('hdvSearchInput'),
        toggle: document.getElementById('hdvSearchToggle'),
        clear: document.getElementById('hdvSearchClear'),
        history: document.getElementById('hdvSearchHistory'),
        minLevel: document.getElementById('hdvMinLevel'),
        maxLevel: document.getElementById('hdvMaxLevel'),
        rarity: document.getElementById('hdvRaritySelect'),
        sort: document.getElementById('hdvSortSelect'),
        affordable: document.getElementById('hdvAffordableToggle'),
        chips: document.getElementById('hdvChips'),
        status: document.getElementById('hdvSearchStatus'),
        body: document.getElementById('hdvListingsBody'),
        pagination: document.getElementById('hdvPagination')
    },
    mine: {
        status: document.getElementById('hdvMineStatus'),
        item: document.getElementById('hdvSellItem'),
        scrollTypeField: document.getElementById('hdvScrollTypeField'),
        scrollTypeSelect: document.getElementById('hdvScrollTypeSelect'),
        qty: document.getElementById('hdvSellQty'),
        unitPrice: document.getElementById('hdvSellUnitPrice'),
        baseHint: document.getElementById('hdvBasePriceHint'),
        create: document.getElementById('hdvCreateListing'),
        body: document.getElementById('hdvMyListingsBody')
    },
    history: {
        status: document.getElementById('hdvHistoryStatus'),
        body: document.getElementById('hdvHistoryBody')
    }
};

const state = {
    tab: 'search',
    category: 'all',
    filters: {
        q: '',
        minLevel: '',
        maxLevel: '',
        rarity: 'all',
        affordableOnly: false
    },
    sort: 'price_asc',
    page: 1,
    pageSize: 20,
    user: null,
    character: null,
    profile: null,
    items: [],
    inventory: [],
    categories: [], // Categories from database
    categoriesMap: new Map() // For quick lookups
};

const INVENTORY_SYNC_KEY = 'astoria_inventory_sync';
const INVENTORY_STORAGE_KEY = 'astoriaInventory';

function broadcastInventorySync(reason = 'update') {
    try {
        if (!state.character?.id) return;
        const payload = {
            characterId: String(state.character.id),
            reason,
            ts: Date.now()
        };
        localStorage.setItem(INVENTORY_SYNC_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('[HDV] Inventory sync broadcast failed:', error);
    }
}

const normalizeText = window.astoriaListHelpers?.normalizeText || ((value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase());

const DEFAULT_SCROLL_TYPES = [
    { key: 'feu', label: 'Feu', emoji: String.fromCodePoint(0x1F525), matchers: ['feu'] },
    { key: 'eau', label: 'Eau', emoji: String.fromCodePoint(0x1F4A7), matchers: ['eau'] },
    { key: 'glace', label: 'Glace', emoji: String.fromCodePoint(0x1F9CA), matchers: ['glace'] },
    { key: 'cryo', label: 'Cryo', emoji: String.fromCodePoint(0x1F9CA), matchers: ['cryo'] },
    { key: 'vent', label: 'Vent', emoji: String.fromCodePoint(0x1F32C), matchers: ['vent'] },
    { key: 'terre', label: 'Terre', emoji: String.fromCodePoint(0x1FAA8), matchers: ['terre'] },
    { key: 'roche', label: 'Roche', emoji: String.fromCodePoint(0x1FAA8), matchers: ['roche'] },
    { key: 'nature', label: 'Nature', emoji: String.fromCodePoint(0x1F331), matchers: ['nature'] },
    { key: 'osmose', label: 'Osmose', emoji: String.fromCodePoint(0x1F9EC), matchers: ['osmose'] },
    { key: 'foudre', label: 'Foudre', emoji: String.fromCodePoint(0x26A1), matchers: ['foudre'] },
    { key: 'lumiere', label: 'Lumiere', emoji: String.fromCodePoint(0x1F31F), matchers: ['lumiere'] },
    { key: 'tenebres', label: 'Tenebres', emoji: String.fromCodePoint(0x1F319), matchers: ['tenebres'] }
];

const SCROLL_TYPES = Array.isArray(window.astoriaScrollTypes) && window.astoriaScrollTypes.length
    ? DEFAULT_SCROLL_TYPES.map((entry) =>
        window.astoriaScrollTypes.find((type) => type.key === entry.key) || entry)
    : DEFAULT_SCROLL_TYPES;

const SCROLL_TYPE_MAP = new Map(SCROLL_TYPES.map((type) => [type.key, type]));
const SCROLL_TYPES_META_KEY = 'astoria_scroll_types_meta';

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function resolveInventoryStorageScopeId() {
    const activeCharacterId = state.character?.id || getActiveCharacter?.()?.id;
    if (activeCharacterId) return String(activeCharacterId);

    try {
        const raw = localStorage.getItem('astoria_active_character');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.id) return String(parsed.id);
        }
    } catch {
        // ignore
    }

    try {
        const raw = localStorage.getItem('astoria_character_summary');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.id) return String(parsed.id);
        }
    } catch {
        // ignore
    }

    try {
        const params = new URLSearchParams(window.location.search);
        const queryCharacterId = params.get('character');
        if (queryCharacterId) return String(queryCharacterId);
    } catch {
        // ignore
    }

    return '';
}

function getScopedInventoryStorageKey(baseKey) {
    const scopeId = resolveInventoryStorageScopeId();
    return scopeId ? `${baseKey}:${scopeId}` : baseKey;
}

function getInventoryItemsStorageKey() {
    return getScopedInventoryStorageKey(INVENTORY_STORAGE_KEY);
}
let scrollTypeMetaList = null;
let scrollTypeMetaMap = null;
const FALLBACK_SCROLL_EMOJI = String.fromCodePoint(0x2728);

function isScrollItem(item) {
    const helper = window.astoriaItemTags;
    if (helper?.isScrollItem) {
        return helper.isScrollItem(item);
    }
    if (!item || !item.name) return false;
    const name = normalizeText(item.name);
    return name.includes('parchemin') || name.includes('scroll');
}

function getScrollCategory(item) {
    const helper = window.astoriaItemTags;
    if (helper?.getScrollCategory) {
        return helper.getScrollCategory(item);
    }
    if (!item || !item.name) return null;
    const name = normalizeText(item.name);
    if (!name.includes('parchemin') && !name.includes('scroll')) return null;
    if (name.includes('eveil') || name.includes('eveille') || (name.includes('veil') && name.includes('parchemin'))) {
        return 'eveil';
    }
    if (name.includes('ascension')) return 'ascension';
    return null;
}

function getScrollItemKey(entry) {
    const sourceIndex = Number(entry?.sourceIndex);
    if (Number.isFinite(sourceIndex) && sourceIndex >= 0) {
        return `idx:${sourceIndex}`;
    }
    const name = entry?.name ? normalizeText(entry.name) : '';
    if (name) {
        return `name:${name}`;
    }
    const id = Number(entry?.id);
    if (Number.isFinite(id)) {
        return `id:${id}`;
    }
    return 'unknown';
}

function loadScrollTypeMeta() {
    if (scrollTypeMetaList && scrollTypeMetaMap) return;
    try {
        const raw = localStorage.getItem(SCROLL_TYPES_META_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return;
        scrollTypeMetaList = parsed
            .filter((entry) => entry && entry.key)
            .map((entry) => ({
                key: String(entry.key),
                label: entry.label ? String(entry.label) : String(entry.key),
                emoji: entry.emoji ? String(entry.emoji) : FALLBACK_SCROLL_EMOJI,
                matchers: Array.isArray(entry.matchers) ? entry.matchers : []
            }));
        scrollTypeMetaMap = new Map(scrollTypeMetaList.map((entry) => [entry.key, entry]));
    } catch (error) {
        console.warn('[HDV] Failed to load scroll type metadata:', error);
    }
}

function getScrollTypeMetaList() {
    loadScrollTypeMeta();
    return scrollTypeMetaList || SCROLL_TYPES;
}

function getScrollTypeMeta(key) {
    loadScrollTypeMeta();
    return (scrollTypeMetaMap && scrollTypeMetaMap.get(key)) || SCROLL_TYPE_MAP.get(key) || null;
}

function getScrollTypeKey(entry) {
    if (!entry) return null;
    const taggedKey = window.astoriaItemTags?.getScrollTypeKeyFromTags?.(entry);
    if (taggedKey) return taggedKey;
    const haystack = normalizeText([entry.name, entry.description, entry.effect].filter(Boolean).join(' '));
    for (const type of getScrollTypeMetaList()) {
        const matchers = Array.isArray(type.matchers) ? type.matchers : [type.key];
        if (matchers.some((matcher) => haystack.includes(normalizeText(matcher)))) {
            return type.key;
        }
    }
    return null;
}

function hasPositiveCounts(counts) {
    if (!counts || typeof counts !== 'object') return false;
    return Object.values(counts).some((value) => Number(value) > 0);
}

function getScrollTypeStoreFromLocal() {
    try {
        const raw = localStorage.getItem('astoria_active_character');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.profile_data?.inventory?.scrollTypes || null;
    } catch {
        return null;
    }
}

function getScrollTypeCounts(entry) {
    const store =
        state.character?.profile_data?.inventory?.scrollTypes ||
        state.profile?.character?.profile_data?.inventory?.scrollTypes ||
        state.profile?.inventory?.scrollTypes ||
        getScrollTypeStoreFromLocal() ||
        null;
    if (!store || typeof store !== 'object') return null;
    const category = getScrollCategory(entry);
    if (!category || !store[category]) return null;
    const bucket = store[category];
    const keys = [];
    const sourceIndex = Number(entry?.sourceIndex);
    if (Number.isFinite(sourceIndex) && sourceIndex >= 0) {
        keys.push(`idx:${sourceIndex}`);
    }
    if (entry?.name) {
        keys.push(`name:${normalizeText(entry.name)}`);
    }
    for (const key of keys) {
        if (bucket[key]?.counts && hasPositiveCounts(bucket[key].counts)) {
            return bucket[key].counts;
        }
    }
    const seededKey = getScrollTypeKey(entry);
    if (seededKey && Number(entry?.quantity) > 0) {
        return { [seededKey]: Math.max(0, Math.floor(Number(entry.quantity) || 0)) };
    }
    return null;
}

function buildScrollCountsForSale(entry, typeKey) {
    if (!typeKey) return null;
    const existing = getScrollTypeCounts(entry);
    if (existing) return { ...existing };
    const total = Math.max(0, Math.floor(Number(entry?.quantity) || 0));
    if (total <= 0) return null;
    return { [typeKey]: total };
}

async function applyScrollTypeSale(entry, typeKey, quantity) {
    if (!entry || !typeKey || !Number.isFinite(quantity) || quantity <= 0) return;
    const category = getScrollCategory(entry);
    if (!category || !state.character?.id) return;

    const profileData = { ...(state.character.profile_data || {}) };
    const inventory = { ...(profileData.inventory || {}) };
    const scrollTypes = { ...(inventory.scrollTypes || {}) };
    const itemKey = getScrollItemKey(entry);
    const bucket = { ...(scrollTypes[category] || {}) };
    const currentEntry = bucket[itemKey] || {};
    const counts = buildScrollCountsForSale(entry, typeKey) || { ...(currentEntry.counts || {}) };
    const current = Number(counts[typeKey]) || 0;
    const next = Math.max(0, current - Math.floor(quantity));
    if (next > 0) {
        counts[typeKey] = next;
    } else {
        delete counts[typeKey];
    }

    const hasAny = Object.values(counts).some((value) => Number(value) > 0);
    if (hasAny) {
        bucket[itemKey] = { counts, updatedAt: Date.now() };
    } else {
        delete bucket[itemKey];
    }

    if (Object.keys(bucket).length) {
        scrollTypes[category] = bucket;
    } else {
        delete scrollTypes[category];
    }

    inventory.scrollTypes = scrollTypes;
    profileData.inventory = inventory;

    const res = await updateCharacter(state.character.id, { profile_data: profileData });
    if (res?.success && res.character) {
        state.character = res.character;
        if (state.profile?.character?.id === res.character.id) {
            state.profile.character = res.character;
        }
        broadcastInventorySync('scroll-types');
    }
}

async function applyScrollTypeRestock(entry, typeKey, quantity) {
    if (!entry || !typeKey || !Number.isFinite(quantity) || quantity <= 0) return false;
    const category = getScrollCategory(entry);
    if (!category || !state.character?.id) return false;

    const profileData = { ...(state.character.profile_data || {}) };
    const inventory = { ...(profileData.inventory || {}) };
    const scrollTypes = { ...(inventory.scrollTypes || {}) };
    const itemKey = getScrollItemKey(entry);
    const bucket = { ...(scrollTypes[category] || {}) };
    const currentEntry = bucket[itemKey] || {};
    const counts = { ...(currentEntry.counts || {}) };
    const current = Number(counts[typeKey]) || 0;
    const next = current + Math.floor(quantity);

    counts[typeKey] = next;
    bucket[itemKey] = { counts, updatedAt: Date.now() };
    scrollTypes[category] = bucket;
    inventory.scrollTypes = scrollTypes;
    profileData.inventory = inventory;

    const res = await updateCharacter(state.character.id, { profile_data: profileData });
    if (res?.success && res.character) {
        state.character = res.character;
        if (state.profile?.character?.id === res.character.id) {
            state.profile.character = res.character;
        }
        broadcastInventorySync('scroll-types');
        return true;
    }
    return false;
}

function resolveRestockEntry(itemId, item) {
    const inventoryEntry = getInventoryEntry(itemId);
    if (inventoryEntry) return inventoryEntry;
    const baseItem = item || getItemById(itemId) || { name: itemId };
    const sourceIndex = resolveSourceIndex(baseItem);
    if (Number.isFinite(sourceIndex)) {
        return { ...baseItem, sourceIndex };
    }
    return baseItem;
}

function getScrollTypeLabel(typeKey) {
    const entry = getScrollTypeMeta(typeKey);
    if (!entry) {
        const label = String(typeKey || '').replace(/-/g, ' ').trim();
        if (!label) return '';
        return `${FALLBACK_SCROLL_EMOJI} ${label}`;
    }
    return `${entry.emoji} ${entry.label}`;
}

const searchHistory = window.astoriaSearchHistory
    ? window.astoriaSearchHistory.createSearchHistory({
        storageKey: 'astoriaHdvRecentSearches',
        maxItems: 4
    })
    : null;

function resolveCurrentUser() {
    console.log('[HDV] resolveCurrentUser - location:', window.location.href);

    // PRIORITÉ 1 : Lire directement localStorage (plus fiable sur GitHub Pages)
    try {
        const raw = localStorage.getItem('astoria_session');
        console.log('[HDV] localStorage astoria_session:', raw ? '✓ EXISTE' : '✗ NULL');

        if (raw) {
            const parsed = JSON.parse(raw);

            // Vérifier expiration
            const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
            const isExpired = !parsed.timestamp || (Date.now() - parsed.timestamp) > SESSION_MAX_AGE_MS;

            if (!isExpired && parsed.user && parsed.user.id) {
                console.log('[HDV] ✅ User trouvé via localStorage:', parsed.user.username);
                return parsed.user;
            } else if (isExpired) {
                console.warn('[HDV] ⚠️ Session expirée');
            }
        }
    } catch (err) {
        console.error('[HDV] Erreur lecture localStorage:', err);
    }

    // PRIORITÉ 2 : Fallback sur getCurrentUser()
    try {
        const direct = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        console.log('[HDV] getCurrentUser():', direct ? `✓ ${direct.username}` : '✗ NULL');
        if (direct && direct.id) return direct;
    } catch (err) {
        console.error('[HDV] Erreur getCurrentUser():', err);
    }

    console.error('[HDV] ❌ AUCUN USER - Affichage "Se connecter"');
    return null;
}

function resolveActiveCharacter() {
    console.log('[HDV] resolveActiveCharacter appelé');

    // PRIORITÉ 1 : Lire directement localStorage
    try {
        const raw = localStorage.getItem('astoria_active_character');
        console.log('[HDV] localStorage astoria_active_character:', raw ? '✓ EXISTE' : '✗ NULL');

        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id) {
                console.log('[HDV] ✅ Character trouvé via localStorage:', parsed.name);
                return parsed;
            }
        }
    } catch (err) {
        console.error('[HDV] Erreur lecture localStorage character:', err);
    }

    // PRIORITÉ 2 : Fallback sur getActiveCharacter()
    try {
        const direct = typeof getActiveCharacter === 'function' ? getActiveCharacter() : null;
        console.log('[HDV] getActiveCharacter():', direct ? `✓ ${direct.name}` : '✗ NULL');
        if (direct && direct.id) return direct;
    } catch (err) {
        console.error('[HDV] Erreur getActiveCharacter():', err);
    }

    console.warn('[HDV] ⚠️ Aucun character actif');
    return null;
}

function asInt(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    return Math.trunc(numberValue);
}

function parsePriceInput(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const normalized = raw.replace(/\s+/g, "").replace(",", ".");
    const numberValue = Number(normalized);
    if (!Number.isFinite(numberValue)) return null;
    return Math.trunc(numberValue);
}

function formatKaels(value) {
    const safe = Math.max(0, asInt(value) ?? 0);
    return safe.toLocaleString('fr-FR');
}

function formatDate(value) {
    try {
        const date = new Date(value);
        return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return String(value || '');
    }
}

function setStatus(el, message, kind = 'info') {
    if (!el) return;
    el.textContent = message || '';
    el.dataset.kind = kind;
}

function formatCharacterLink(characterId, label = '') {
    if (!characterId) return '';
    const shortId = String(characterId).slice(0, 8);
    const text = label || shortId;
    const url = `profil.html?character=${encodeURIComponent(characterId)}`;
    return `<a class="hdv-link" href="${url}" target="_blank" rel="noopener">${text}</a>`;
}

function resolveCharacterName(relation) {
    if (!relation) return null;
    if (Array.isArray(relation)) return relation[0]?.name || null;
    if (typeof relation === 'object') return relation.name || null;
    return null;
}

function resolveListingItem(listing) {
    return getItemById(listing.item_id) || listing.items || {
        name: listing.item_id,
        category: listing.item_category,
        description: listing.item_description,
        effect: listing.item_effect
    };
}

function getItemById(itemId) {
    const needle = String(itemId || '').trim();
    return state.items.find((item) => item && String(item.id || item.name || '').trim() === needle) ||
        state.items.find((item) => item && String(item.itemId || '').trim() === needle) ||
        state.items.find((item) => item && item.name === itemId) ||
        null;
}

function parseBasePrice(item) {
    if (!item) return 0;
    const raw =
        item.basePrice ??
        item.unitPrice ??
        item.price ??
        item.sellPrice ??
        item.buyPrice ??
        '';
    const match = String(raw).match(/(\d+)/);
    return match ? Math.max(0, asInt(match[1]) ?? 0) : 0;
}

function resolveItemImage(item) {
    const helpers = window.astoriaImageHelpers;
    if (helpers && typeof helpers.resolveItemImages === 'function') {
        return helpers.resolveItemImages(item || {}).primary;
    }
    return '';
}

function resolveSourceIndex(item) {
    if (!item) return null;
    const direct = Number(item.sourceIndex);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    const idx = state.items.findIndex((entry) => entry && entry.name === item.name);
    return idx >= 0 ? idx : null;
}

function resolveItemIndexByName(name) {
    const key = normalizeText(name);
    if (!key) return null;
    const idx = state.items.findIndex((entry) => entry && normalizeText(entry.name) === key);
    return idx >= 0 ? idx : null;
}

function resolveCatalogItemFromReference(ref = {}) {
    const itemId = String(ref?.itemId || ref?.item_id || ref?.id || '').trim();
    if (itemId) {
        const byId = state.items.find((entry) => entry && String(entry.id || '').trim() === itemId);
        if (byId) return byId;
    }

    const itemKey = normalizeText(ref?.itemKey || ref?.item_key || ref?.name || '');
    if (itemKey) {
        const byKey = state.items.find((entry) => entry && normalizeText(entry.name) === itemKey);
        if (byKey) return byKey;
    }

    const idx = Number(ref?.sourceIndex ?? ref?.item_index);
    if (Number.isFinite(idx) && idx >= 0 && state.items[idx]) {
        return state.items[idx];
    }

    return null;
}

function isCurrencyLikeItem(item) {
    if (!item) return false;
    if (item.isCurrency) return true;
    const name = normalizeText(item.name || item.itemKey || item.item_key || '');
    const category = normalizeText(item.category || '');
    return name === 'kaels' || category === 'monnaie' || category === 'currency';
}

function mapInventoryRows(rows) {
    const items = [];
    if (!Array.isArray(rows)) return items;

    for (const row of rows) {
        const resolved = resolveCatalogItemFromReference({
            item_id: row?.item_id,
            item_key: row?.item_key,
            item_index: row?.item_index
        });
        let idx = Number(row?.item_index);
        if (!Number.isFinite(idx) || idx < 0) {
            idx = resolveItemIndexByName(row?.item_key);
        }
        const qty = Math.floor(Number(row?.qty) || 0);
        if (qty <= 0) continue;
        const item = Number.isFinite(idx) && idx >= 0
            ? state.items[idx]
            : (resolved || (row?.item_key ? { name: row?.item_key } : null));
        if (!item) continue;
        if (isCurrencyLikeItem(item)) continue;
        const sourceIndex = Number.isFinite(idx) && idx >= 0
            ? idx
            : (Number.isFinite(resolveSourceIndex(resolved || item)) ? resolveSourceIndex(resolved || item) : null);
        items.push({
            ...item,
            sourceIndex,
            itemId: row?.item_id ? String(row.item_id) : null,
            itemKey: String(item?.name || row?.item_key || idx),
            inventoryQty: qty,
            equippedQty: 0,
            equippedSlots: [],
            quantity: qty
        });
    }

    return items;
}

function mapLocalInventoryItems(items) {
    const entries = [];
    if (!Array.isArray(items)) return entries;

    for (const rawItem of items) {
        if (!rawItem || isCurrencyLikeItem(rawItem)) continue;
        const qty = Math.max(0, Math.floor(Number(rawItem.quantity) || 0));
        if (!qty) continue;

        const resolved = resolveCatalogItemFromReference(rawItem || {});
        const rawItemId = String(rawItem?.item_id || rawItem?.dbItemId || '').trim();
        const resolvedItemId = String(resolved?.id || '').trim();
        const sourceIndex = Number.isFinite(Number(rawItem?.sourceIndex))
            ? Number(rawItem.sourceIndex)
            : (Number.isFinite(Number(rawItem?.item_index)) ? Number(rawItem.item_index) : resolveSourceIndex(resolved || rawItem));

        entries.push({
            ...(resolved || {}),
            sourceIndex: Number.isFinite(sourceIndex) ? sourceIndex : null,
            itemId: isUuid(rawItemId) ? rawItemId : (isUuid(resolvedItemId) ? resolvedItemId : null),
            itemKey: String(rawItem?.name || rawItem?.item_key || resolved?.name || '').trim(),
            name: rawItem?.name || rawItem?.item_key || resolved?.name || '',
            category: rawItem?.category || resolved?.category || '',
            rarity: rawItem?.rarity || resolved?.rarity || '',
            image: rawItem?.image || resolved?.image || '',
            images: rawItem?.images || resolved?.images || undefined,
            effect: rawItem?.effect || resolved?.effect || '',
            inventoryQty: qty,
            equippedQty: 0,
            equippedSlots: [],
            quantity: qty
        });
    }

    return entries;
}

function readLocalInventoryEntries() {
    try {
        const raw = localStorage.getItem(getInventoryItemsStorageKey());
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return mapLocalInventoryItems(parsed);
        }
        if (parsed && Array.isArray(parsed.items)) {
            return mapLocalInventoryItems(parsed.items);
        }
    } catch (error) {
        console.warn('[HDV] Local inventory fallback unreadable:', error);
    }

    return [];
}

function readProfileInventoryEntries() {
    const compactItems =
        (Array.isArray(state.character?.profile_data?.inventory?.items) && state.character.profile_data.inventory.items) ||
        (Array.isArray(state.profile?.character?.profile_data?.inventory?.items) && state.profile.character.profile_data.inventory.items) ||
        [];

    return mapLocalInventoryItems(
        compactItems.map((entry) => ({
            item_id: entry?.itemId || entry?.item_id || null,
            item_index: entry?.itemIndex ?? entry?.item_index ?? entry?.idx ?? null,
            itemKey: entry?.itemKey || entry?.item_key || '',
            item_key: entry?.itemKey || entry?.item_key || '',
            name: entry?.itemKey || entry?.item_key || entry?.name || '',
            quantity: entry?.qty
        }))
    );
}

function getInventoryIdentity(item) {
    const itemKey = normalizeText(item?.itemKey || item?.item_key || item?.name || '');
    if (itemKey) return `key:${itemKey}`;

    const itemId = String(item?.itemId || item?.item_id || item?.id || '').trim();
    if (itemId) return `id:${itemId}`;

    const sourceIndex = Number(item?.sourceIndex ?? item?.item_index);
    if (Number.isFinite(sourceIndex) && sourceIndex >= 0) return `idx:${sourceIndex}`;

    return '';
}

function extractEquippedInventoryEntries(character) {
    const equipped = character?.profile_data?.inventory?.equippedSlots;
    if (!equipped || typeof equipped !== 'object') return [];

    return Object.entries(equipped).map(([slotKey, item]) => {
        const resolved = resolveCatalogItemFromReference(item || {});
        const sourceIndex = Number.isFinite(Number(item?.sourceIndex)) ? Number(item.sourceIndex) : (Number.isFinite(Number(item?.item_index)) ? Number(item.item_index) : null);
        return {
            ...(resolved || {}),
            ...(item || {}),
            name: resolved?.name || item?.name || item?.item_key || '',
            category: resolved?.category || item?.category || '',
            rarity: resolved?.rarity || item?.rarity || '',
            image: resolved?.image || item?.image || '',
            images: resolved?.images || item?.images || undefined,
            effect: resolved?.effect || item?.effect || '',
            itemId: item?.item_id ? String(item.item_id) : (item?.id ? String(item.id) : (resolved?.id ? String(resolved.id) : null)),
            itemKey: item?.item_key ? String(item.item_key) : String(resolved?.name || item?.name || ''),
            sourceIndex: Number.isFinite(sourceIndex) ? sourceIndex : resolveSourceIndex(resolved || item),
            inventoryQty: 0,
            equippedQty: 1,
            equippedSlots: [slotKey],
            quantity: 1
        };
    }).filter((entry) => entry?.name || entry?.itemId || entry?.itemKey);
}

function mergeCharacterInventoryState(primaryCharacter, fallbackCharacter) {
    if (!primaryCharacter) return fallbackCharacter || null;
    if (!fallbackCharacter) return primaryCharacter;

    const primaryInventory = primaryCharacter?.profile_data?.inventory;
    const fallbackInventory = fallbackCharacter?.profile_data?.inventory;
    const primaryHasEquipped = primaryInventory?.equippedSlots && Object.keys(primaryInventory.equippedSlots).length > 0;
    const fallbackHasEquipped = fallbackInventory?.equippedSlots && Object.keys(fallbackInventory.equippedSlots).length > 0;

    if (primaryHasEquipped || !fallbackHasEquipped) {
        return primaryCharacter;
    }

    return {
        ...primaryCharacter,
        profile_data: {
            ...(primaryCharacter.profile_data || {}),
            inventory: {
                ...(fallbackInventory || {}),
                ...(primaryInventory || {}),
                equippedSlots: fallbackInventory.equippedSlots
            }
        }
    };
}

function mergeInventoryEntries(entries) {
    const merged = new Map();

    (Array.isArray(entries) ? entries : []).forEach((entry) => {
        const key = getInventoryIdentity(entry);
        if (!key) return;

        if (!merged.has(key)) {
            merged.set(key, {
                ...entry,
                inventoryQty: Math.max(0, Number(entry?.inventoryQty) || 0),
                equippedQty: Math.max(0, Number(entry?.equippedQty) || 0),
                equippedSlots: Array.isArray(entry?.equippedSlots) ? [...entry.equippedSlots] : [],
                quantity: 0
            });
            return;
        }

        const current = merged.get(key);
        current.inventoryQty += Math.max(0, Number(entry?.inventoryQty) || 0);
        current.equippedQty += Math.max(0, Number(entry?.equippedQty) || 0);
        current.equippedSlots.push(...(Array.isArray(entry?.equippedSlots) ? entry.equippedSlots : []));
        current.sourceIndex = current.sourceIndex ?? entry?.sourceIndex ?? null;
        current.itemId = current.itemId || entry?.itemId || entry?.id || null;
        current.itemKey = current.itemKey || entry?.itemKey || entry?.name || '';
    });

    return [...merged.values()].map((entry) => ({
        ...entry,
        quantity: entry.inventoryQty + entry.equippedQty
    }));
}

function mergeSellableInventoryEntries(primaryEntries, fallbackEntries) {
    const merged = new Map();

    for (const entry of Array.isArray(primaryEntries) ? primaryEntries : []) {
        const key = getInventoryIdentity(entry);
        if (!key) continue;
        merged.set(key, {
            ...entry,
            inventoryQty: Math.max(0, Math.floor(Number(entry?.inventoryQty ?? entry?.quantity) || 0)),
            equippedQty: 0,
            equippedSlots: [],
            quantity: Math.max(0, Math.floor(Number(entry?.inventoryQty ?? entry?.quantity) || 0))
        });
    }

    for (const entry of Array.isArray(fallbackEntries) ? fallbackEntries : []) {
        const key = getInventoryIdentity(entry);
        if (!key) continue;

        if (!merged.has(key)) {
            merged.set(key, {
                ...entry,
                inventoryQty: Math.max(0, Math.floor(Number(entry?.inventoryQty ?? entry?.quantity) || 0)),
                equippedQty: 0,
                equippedSlots: [],
                quantity: Math.max(0, Math.floor(Number(entry?.inventoryQty ?? entry?.quantity) || 0))
            });
            continue;
        }

        const current = merged.get(key);
        current.name = current.name || entry?.name || '';
        current.category = current.category || entry?.category || '';
        current.rarity = current.rarity || entry?.rarity || '';
        current.image = current.image || entry?.image || '';
        current.images = current.images || entry?.images || undefined;
        current.effect = current.effect || entry?.effect || '';
        current.sourceIndex = current.sourceIndex ?? entry?.sourceIndex ?? null;
        current.itemId = current.itemId || entry?.itemId || null;
        current.itemKey = current.itemKey || entry?.itemKey || entry?.name || '';
    }

    return [...merged.values()];
}

function entryMatchesInventoryTarget(candidate, target) {
    const targetId = String(target?.itemId || target?.item_id || target?.id || '').trim();
    const candidateId = String(candidate?.item_id || candidate?.itemId || candidate?.id || '').trim();
    if (targetId && candidateId && targetId === candidateId) return true;

    const targetKey = normalizeText(target?.itemKey || target?.item_key || target?.name || '');
    const candidateKey = normalizeText(candidate?.item_key || candidate?.itemKey || candidate?.name || '');
    if (targetKey && candidateKey && targetKey === candidateKey) return true;

    const targetIndex = Number(target?.sourceIndex ?? target?.item_index);
    const candidateIndex = Number(candidate?.sourceIndex ?? candidate?.item_index);
    if (Number.isFinite(targetIndex) && Number.isFinite(candidateIndex) && targetIndex === candidateIndex) return true;

    return false;
}

async function consumeEquippedQuantity(entry, quantity) {
    const needed = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!needed) return true;
    if (!state.character?.id) return false;

    const profileData = { ...(state.character.profile_data || {}) };
    const inventory = { ...(profileData.inventory || {}) };
    const equippedSlots = { ...(inventory.equippedSlots || {}) };
    let remaining = needed;

    Object.entries(equippedSlots).forEach(([slotKey, item]) => {
        if (remaining <= 0) return;
        if (!entryMatchesInventoryTarget(item, entry)) return;
        delete equippedSlots[slotKey];
        remaining -= 1;
    });

    if (remaining > 0) return false;

    inventory.equippedSlots = equippedSlots;
    profileData.inventory = inventory;

    const result = await updateCharacter(state.character.id, { profile_data: profileData });
    if (!(result?.success && result.character)) return false;

    state.character = result.character;
    if (state.profile?.character?.id === result.character.id) {
        state.profile.character = result.character;
    }
    document.dispatchEvent(new CustomEvent('astoria:character-updated', { detail: { profile_data: profileData } }));
    broadcastInventorySync('equipped-slots');
    return true;
}



async function refreshInventory() {
    if (!state.character || !state.character.id) {
        state.inventory = [];
        return;
    }

    try {
        const rows = await getInventoryRows(state.character.id);
        const backpackEntries = mapInventoryRows(Array.isArray(rows) ? rows : []);
        const profileEntries = readProfileInventoryEntries();
        if (backpackEntries.length) {
            state.inventory = mergeSellableInventoryEntries(backpackEntries, profileEntries);
            return;
        }
        if (profileEntries.length) {
            state.inventory = profileEntries;
            return;
        }
        // No localStorage fallback here: selling must stay consistent across devices.
        state.inventory = [];
    } catch (error) {
        console.error('Inventory load error:', error);
        const profileEntries = readProfileInventoryEntries();
        state.inventory = profileEntries.length ? profileEntries : [];
    }
}



function getInventoryEntry(itemId) {
    return state.inventory.find((item) => item && (item.itemId || item.id || item.itemKey || item.name) === itemId) ||
        state.inventory.find((item) => item && item.itemKey === itemId) ||
        state.inventory.find((item) => item && item.name === itemId) ||
        null;
}


async function applyInventoryDelta(itemId, delta) {
    if (!state.character || !Number.isFinite(delta) || delta == 0) return false;
    const entry = getInventoryEntry(itemId);
    const baseItem = entry || getItemById(itemId) || { name: itemId };
    const sourceIndex = resolveSourceIndex(baseItem);
    const inventoryQty = entry ? Math.max(0, Math.floor(Number(entry.inventoryQty ?? entry.quantity) || 0)) : 0;
    const equippedQty = entry ? Math.max(0, Math.floor(Number(entry.equippedQty) || 0)) : 0;
    const currentQty = inventoryQty + equippedQty;
    const nextQty = currentQty + delta;
    if (nextQty < 0 || (!Number.isFinite(sourceIndex) && !String(baseItem?.id || entry?.itemId || '').trim())) return false;

    const canonicalKey = baseItem?.name ? String(baseItem.name) : String(itemId || '');
    const canonicalItemId = baseItem?.id ? String(baseItem.id) : (entry?.itemId || null);
    const existingKey = entry?.itemKey ? String(entry.itemKey) : null;
    const itemKey = canonicalKey || existingKey || String(sourceIndex);
    let nextInventoryQty = inventoryQty;
    let nextEquippedQty = equippedQty;

    if (delta > 0) {
        nextInventoryQty = inventoryQty + delta;
    } else if (delta < 0) {
        let toRemove = Math.abs(delta);
        const fromInventory = Math.min(nextInventoryQty, toRemove);
        nextInventoryQty -= fromInventory;
        toRemove -= fromInventory;
        if (toRemove > 0) {
            const equippedConsumed = await consumeEquippedQuantity(baseItem, toRemove);
            if (!equippedConsumed) return false;
            nextEquippedQty = Math.max(0, equippedQty - toRemove);
        }
    }

    try {
        if (existingKey && canonicalKey && existingKey !== canonicalKey) {
            if (nextInventoryQty > 0) {
                await setInventoryItem(state.character.id, {
                    item_key: existingKey,
                    item_id: entry?.itemId || null,
                    item_index: sourceIndex
                }, 0);
                await setInventoryItem(state.character.id, {
                    item_key: canonicalKey,
                    item_id: canonicalItemId,
                    item_index: sourceIndex
                }, nextInventoryQty);
            } else {
                await setInventoryItem(state.character.id, {
                    item_key: existingKey,
                    item_id: entry?.itemId || null,
                    item_index: sourceIndex
                }, 0);
            }
        } else {
            await setInventoryItem(state.character.id, {
                item_key: itemKey,
                item_id: canonicalItemId,
                item_index: sourceIndex
            }, nextInventoryQty);
        }
    } catch (error) {
        console.error('Inventory update error:', error);
        return false;
    }

    if (nextQty == 0) {
        state.inventory = state.inventory.filter((item) => item !== entry);
    } else if (entry) {
        entry.inventoryQty = nextInventoryQty;
        entry.equippedQty = nextEquippedQty;
        entry.quantity = nextInventoryQty + nextEquippedQty;
        if (canonicalKey && existingKey && canonicalKey !== existingKey) {
            entry.itemKey = canonicalKey;
        }
        entry.itemId = canonicalItemId;
    } else {
        state.inventory.push({
            ...baseItem,
            sourceIndex,
            itemId: canonicalItemId,
            itemKey,
            inventoryQty: Math.max(0, nextInventoryQty),
            equippedQty: 0,
            equippedSlots: [],
            quantity: Math.max(0, nextInventoryQty)
        });
    }

    broadcastInventorySync('delta');
    return true;
}

async function loadItemCatalog() {
    const base =
        (typeof inventoryData !== 'undefined' && Array.isArray(inventoryData) ? inventoryData : null) ||
        (Array.isArray(window.inventoryData) ? window.inventoryData : null) ||
        [];
    state.items = Array.isArray(base) ? base.map((item) => ({ ...item })) : [];

    if (typeof getAllItems !== 'function') return;
    try {
        const rows = await getAllItems();
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (!state.items.length) {
            state.items = rows.map((row) => ({
                id: row.id,
                name: row.name,
                category: row.category,
                rarity: row.rarity,
                description: row.description,
                effect: row.effect,
                price: row.price_kaels || 0,
                images: row.images
            }));
            return;
        }
        const byName = new Map(
            rows
                .filter((row) => row && row.name)
                .map((row) => [String(row.name).toLowerCase(), row])
        );
        const mergedItems = state.items.map((item) => {
            const key = String(item?.name || '').toLowerCase();
            const match = byName.get(key);
            if (!match) return item;
            return {
                ...item,
                id: item.id ?? match.id,
                rarity: item.rarity ?? match.rarity,
                description: item.description ?? match.description,
                effect: item.effect ?? match.effect,
                price: item.price ?? match.price_kaels ?? 0,
                images: item.images ?? match.images
            };
        });
        const knownKeys = new Set(mergedItems.map((item) => String(item?.name || '').toLowerCase()).filter(Boolean));
        const appendedItems = rows
            .filter((row) => row && row.name)
            .filter((row) => !knownKeys.has(String(row.name).toLowerCase()))
            .map((row) => ({
                id: row.id,
                name: row.name,
                category: row.category,
                rarity: row.rarity,
                description: row.description,
                effect: row.effect,
                price: row.price_kaels || 0,
                images: row.images
            }));
        state.items = [...mergedItems, ...appendedItems];
    } catch (error) {
        console.warn('[HDV] Item catalog enrichment failed:', error);
    }
}


function setActiveTab(tabId) {
    state.tab = tabId;
    try {
        localStorage.setItem('astoria_hdv_active_tab', tabId);
    } catch {
        // ignore
    }
    for (const tab of dom.tabs) {
        const isActive = tab.dataset.tab === tabId;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    for (const [key, panel] of Object.entries(dom.panels)) {
        const isActive = key === tabId;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
    }
}

function buildCategories() {
    // Return database categories + 'all' option
    const slugs = state.categories
        .filter(cat => cat.is_active)
        .map(cat => cat.slug);

    return ['all', ...slugs];
}

function categoryLabel(category) {
    if (category === 'all') return 'Toutes';

    // Look up category from database
    const cat = state.categoriesMap.get(category);
    if (cat) return cat.name;

    // Fallback for unknown categories
    return String(category)
        .replace(/[_-]+/g, ' ')
        .replace(/^\w/, (m) => m.toUpperCase());
}

function categoryIcon(category) {
    if (category === 'all') return '📦';

    const cat = state.categoriesMap.get(category);
    return cat?.icon || '';
}

function renderCategories() {
    const categories = buildCategories();
    dom.categories.innerHTML = '';

    for (const category of categories) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hdv-category-btn' + (state.category === category ? ' active' : '');

        // Add icon + label
        const icon = categoryIcon(category);
        const label = categoryLabel(category);
        btn.textContent = icon ? `${icon} ${label}` : label;

        btn.addEventListener('click', () => {
            state.category = category;
            state.page = 1;
            try {
                localStorage.setItem('astoria_hdv_category', category);
            } catch {
                // ignore
            }
            renderCategories();
            populateSellSelect();
            syncSellPriceFromSelection();
            refreshSearch();
        });
        dom.categories.appendChild(btn);
    }
}

function renderChips() {
    const chips = [];

    if (state.category !== 'all') {
        chips.push({ key: 'category', label: `Catégorie: ${categoryLabel(state.category)}` });
    }
    if (state.filters.q) {
        chips.push({ key: 'q', label: `Recherche: ${state.filters.q}` });
    }
    if (String(state.filters.minLevel || '').trim() !== '') {
        chips.push({ key: 'minLevel', label: `Niv. ≥ ${state.filters.minLevel}` });
    }
    if (String(state.filters.maxLevel || '').trim() !== '') {
        chips.push({ key: 'maxLevel', label: `Niv. ≤ ${state.filters.maxLevel}` });
    }
    if (state.filters.rarity !== 'all') {
        chips.push({ key: 'rarity', label: `Rareté: ${state.filters.rarity}` });
    }
    if (state.filters.affordableOnly) {
        chips.push({ key: 'affordableOnly', label: `Achetable` });
    }
    if (state.sort !== 'price_asc') {
        const labelMap = {
            price_desc: 'Tri: plus chers',
            level_desc: 'Tri: niveau',
            recent_desc: 'Tri: récents'
        };
        chips.push({ key: 'sort', label: labelMap[state.sort] || 'Tri' });
    }

    dom.search.chips.innerHTML = '';

    if (chips.length === 0) return;

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'filter-chip filter-chip--action';
    reset.textContent = 'Réinitialiser';
    reset.addEventListener('click', () => {
        state.category = 'all';
        state.filters = { q: '', minLevel: '', maxLevel: '', rarity: 'all', affordableOnly: false };
        state.sort = 'price_asc';
        state.page = 1;
        syncFiltersToUI();
        renderScrollTypePanel();
        renderCategories();
        populateSellSelect();
        syncSellPriceFromSelection();
        renderChips();
        refreshSearch();
    });
    dom.search.chips.appendChild(reset);

    for (const chip of chips) {
        const el = document.createElement('span');
        el.className = 'filter-chip';
        el.textContent = chip.label;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'chip-remove';
        remove.title = 'Retirer le filtre';
        remove.textContent = '×';
        remove.addEventListener('click', () => {
            if (chip.key === 'category') state.category = 'all';
            if (chip.key === 'q') state.filters.q = '';
            if (chip.key === 'minLevel') state.filters.minLevel = '';
            if (chip.key === 'maxLevel') state.filters.maxLevel = '';
            if (chip.key === 'rarity') state.filters.rarity = 'all';
            if (chip.key === 'affordableOnly') state.filters.affordableOnly = false;
            if (chip.key === 'sort') state.sort = 'price_asc';
            state.page = 1;
            syncFiltersToUI();
            renderCategories();
            populateSellSelect();
            syncSellPriceFromSelection();
            renderChips();
            refreshSearch();
        });

        el.appendChild(remove);
        dom.search.chips.appendChild(el);
    }
}

function syncFiltersToUI() {
    dom.search.input.value = state.filters.q;
    dom.search.minLevel.value = state.filters.minLevel;
    dom.search.maxLevel.value = state.filters.maxLevel;
    dom.search.rarity.value = state.filters.rarity;
    dom.search.sort.value = state.sort;
    dom.search.affordable.checked = !!state.filters.affordableOnly;
    if (dom.search.clear) {
        if ('hidden' in dom.search.clear) {
            dom.search.clear.hidden = !state.filters.q;
        } else {
            dom.search.clear.style.display = state.filters.q ? 'block' : 'none';
        }
    }
}

function renderPagination(page, totalPages) {
    dom.search.pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const makeBtn = (label, targetPage, disabled = false) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hdv-page-btn' + (disabled ? ' disabled' : '');
        btn.textContent = label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            state.page = targetPage;
            refreshSearch();
        });
        return btn;
    };

    dom.search.pagination.appendChild(makeBtn('Précédent', Math.max(1, page - 1), page <= 1));

    const windowSize = 2;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);

    if (start > 1) dom.search.pagination.appendChild(makeBtn('1', 1, page === 1));
    if (start > 2) {
        const dots = document.createElement('span');
        dots.className = 'hdv-page-dots';
        dots.textContent = '…';
        dom.search.pagination.appendChild(dots);
    }
    for (let p = start; p <= end; p++) {
        dom.search.pagination.appendChild(makeBtn(String(p), p, p === page));
    }
    if (end < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'hdv-page-dots';
        dots.textContent = '…';
        dom.search.pagination.appendChild(dots);
    }
    if (end < totalPages) dom.search.pagination.appendChild(makeBtn(String(totalPages), totalPages, page === totalPages));

    dom.search.pagination.appendChild(makeBtn('Suivant', Math.min(totalPages, page + 1), page >= totalPages));
}

function renderListings(listings) {
    dom.search.body.innerHTML = '';

    if (!listings || listings.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'hdv-empty';
        td.textContent = 'Aucune offre.';
        tr.appendChild(td);
        dom.search.body.appendChild(tr);
        return;
    }

    for (const listing of listings) {
        const item = resolveListingItem(listing);
        const img = resolveItemImage(item);
        const total = listing.total_price ?? (listing.quantity * listing.unit_price);
        const canAfford = state.profile ? state.profile.kaels >= total : false;

        const tr = document.createElement('tr');

        const tdItem = document.createElement('td');
        const metaLines = [];
        const scrollLabel = listing.scroll_type ? getScrollTypeLabel(listing.scroll_type) : '';
        if (scrollLabel) metaLines.push(`<div class="hdv-item-meta hdv-item-meta--scroll">${scrollLabel}</div>`);
        if (item.category) metaLines.push(`<div class="hdv-item-meta">${categoryLabel(item.category)}</div>`);
        const sellerName = resolveCharacterName(listing.seller_character);
        const sellerLink = formatCharacterLink(listing.seller_character_id, sellerName || 'Profil');
        if (sellerLink) {
            metaLines.push(`<div class="hdv-item-meta">Vendeur: ${sellerLink}</div>`);
        }
        tdItem.innerHTML = `
            <div class="hdv-item-cell">
                <img class="hdv-item-icon" src="${img}" alt="">
                <div class="hdv-item-text">
                    <div class="hdv-item-name">${item.name || 'Item inconnu'}</div>
                    ${metaLines.join('')}
                </div>
            </div>
        `;

        const tdLvl = document.createElement('td');
        tdLvl.textContent = String(listing.item_level ?? 0);

        const tdRarity = document.createElement('td');
        tdRarity.textContent = String(listing.item_rarity ?? 'Inconnue');

        const tdLot = document.createElement('td');
        tdLot.textContent = `x${listing.quantity}`;

        const tdPrice = document.createElement('td');
        tdPrice.innerHTML = `
            <div class="hdv-price-cell">
                <div class="hdv-price-total">${formatKaels(total)}</div>
                <div class="hdv-price-unit">${formatKaels(listing.unit_price)}/u</div>
            </div>
        `;
        tdPrice.className = 'hdv-td-price';

        const tdAction = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-primary hdv-action-btn';

        if (!state.user) {
            btn.textContent = 'Connexion';
            btn.disabled = true;
            btn.classList.add('is-disabled');
        } else if (!state.character) {
            btn.textContent = 'Choisir perso';
            btn.disabled = true;
            btn.classList.add('is-disabled');
        } else if (!canAfford) {
            btn.textContent = 'Trop cher';
            btn.disabled = true;
            btn.classList.add('is-disabled');
        } else {
            btn.textContent = 'Acheter';
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const currentKaels = Number(state.profile?.kaels);
                if (Number.isFinite(currentKaels) && currentKaels < total) {
                    setStatus(
                        dom.search.status,
                        `Kaels insuffisants (${formatKaels(currentKaels)}/${formatKaels(total)}).`,
                        'error'
                    );
                    return;
                }
                const ok = window.confirm(`Acheter "${item.name}" pour ${formatKaels(total)} kaels ?`);
                if (!ok) return;

                btn.disabled = true;
                btn.textContent = '...';
                try {
                    await buyListing(listing.id);
                    await refreshProfile();
                    const inventoryUpdated = await applyInventoryDelta(listing.item_id, listing.quantity);
                    const restockEntry = resolveRestockEntry(listing.item_id, item);
                    const scrollUpdated = listing.scroll_type && isScrollItem(restockEntry)
                        ? await applyScrollTypeRestock(restockEntry, listing.scroll_type, listing.quantity)
                        : true;
                    populateSellSelect();
                    await refreshSearch();
                    if (!inventoryUpdated || !scrollUpdated) {
                        setStatus(dom.search.status, 'Achat effectue, inventaire non mis a jour.', 'error');
                    } else {
                        setStatus(dom.search.status, 'Achat effectue.', 'success');
                        // Log the purchase activity
                        await logItemPurchase({
                            characterId: state.character?.id,
                            itemName: item.name,
                            itemId: listing.item_id,
                            price: listing.unit_price,
                            quantity: listing.quantity
                        });
                    }
                } catch (err) {
                    console.error(err);
                    setStatus(dom.search.status, err?.message || "Erreur lors de l'achat.", 'error');
                } finally {
                    btn.disabled = false;
                }
            });
        }

        tdAction.appendChild(btn);

        tr.appendChild(tdItem);
        tr.appendChild(tdLvl);
        tr.appendChild(tdRarity);
        tr.appendChild(tdLot);
        tr.appendChild(tdPrice);
        tr.appendChild(tdAction);
        dom.search.body.appendChild(tr);
    }
}

async function refreshProfile() {
    state.user = resolveCurrentUser();
    state.character = resolveActiveCharacter();

    // Toujours initialiser le character-summary widget (persistance comme fiche/magie)
    await initCharacterSummary({ enableDropdown: true, showKaels: true });

    if (!state.user) {
        state.profile = null;
        state.character = null;
        state.inventory = [];
        dom.search.affordable.disabled = true;
        dom.search.affordable.checked = false;
        state.filters.affordableOnly = false;
        populateSellSelect();
        return;
    }

    if (!state.character) {
        state.profile = null;
        state.inventory = [];
        dom.kaelsBadge.hidden = true;
        dom.search.affordable.disabled = true;
        dom.search.affordable.checked = false;
        state.filters.affordableOnly = false;
        populateSellSelect();
        return;
    }

    try {
        const profile = await getMyProfile();
        state.profile = profile;
        state.character = mergeCharacterInventoryState(profile.character, state.character);
        await refreshInventory();
        dom.kaelsBadge.hidden = false;
        dom.kaelsBadge.textContent = `${formatKaels(state.profile.kaels)} kaels`;
        dom.search.affordable.disabled = false;
        populateSellSelect();
    } catch (err) {
        console.error(err);
        state.profile = null;
        await refreshInventory();
        dom.kaelsBadge.hidden = true;
        dom.search.affordable.disabled = true;
        populateSellSelect();
    }
}

async function refreshSearch() {
    renderChips();
    setStatus(dom.search.status, '');

    const filters = {
        q: state.filters.q,
        category: state.category,
        rarity: state.filters.rarity,
        minLevel: state.filters.minLevel,
        maxLevel: state.filters.maxLevel,
        maxTotalPrice: state.filters.affordableOnly && state.profile ? state.profile.kaels : null
    };

    try {
        const result = await searchListings(filters, state.sort, state.page, state.pageSize);
        const listings = Array.isArray(result.listings) ? result.listings : [];
        renderListings(listings);
        renderPagination(result.page, result.totalPages);
        setStatus(dom.search.status, `${result.totalCount} offres - page ${result.page}/${result.totalPages}`, 'info');
    } catch (err) {
        console.error(err);
        renderListings([]);
        renderPagination(1, 1);
        setStatus(dom.search.status, err?.message || 'Erreur lors du chargement des offres.', 'error');
    }
}

function populateSellSelect() {
    dom.mine.item.innerHTML = '';
    const sellableItems = state.inventory.filter((item) => {
        if (!item) return false;
        if (isCurrencyLikeItem(item)) return false;
        const vendableQty = Math.max(0, Math.floor(Number(item.inventoryQty ?? item.quantity) || 0));
        if (vendableQty <= 0) return false;
        return true;
    });
    const placeholder = document.createElement('option');
    placeholder.value = '';
    if (!state.user) {
        placeholder.textContent = 'Connectez-vous pour vendre';
    } else if (!state.character) {
        placeholder.textContent = 'Selectionnez un personnage';
    } else if (!sellableItems.length) {
        placeholder.textContent = 'Aucun objet vendable';
    } else {
        placeholder.textContent = '-- Selectionner un objet --';
    }
    dom.mine.item.appendChild(placeholder);

    dom.mine.item.disabled = !state.character || sellableItems.length === 0;

    for (const item of sellableItems) {
        const vendableQty = Math.max(0, Math.floor(Number(item.inventoryQty ?? item.quantity) || 0));
        const opt = document.createElement('option');
        opt.value = String(item.itemId || item.id || item.itemKey || item.name || '');
        opt.textContent = `${item.name} (x${vendableQty})`;
        opt.dataset.qty = String(vendableQty);
        if (item.itemId || item.id) {
            opt.dataset.itemId = String(item.itemId || item.id);
        }
        if (Number.isFinite(Number(item.sourceIndex))) {
            opt.dataset.idx = String(item.sourceIndex);
        }
        dom.mine.item.appendChild(opt);
    }
}

function populateScrollTypeSelect(entry, selectedKey = '') {
    if (!dom.mine.scrollTypeSelect) return;
    dom.mine.scrollTypeSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisir un type';
    dom.mine.scrollTypeSelect.appendChild(placeholder);

    const counts = entry ? getScrollTypeCounts(entry) : null;
    let availableKeys = [];
    if (counts && typeof counts === 'object') {
        availableKeys = Object.keys(counts).filter((key) => (Number(counts[key]) || 0) > 0);
    }
    if (!availableKeys.length) {
        availableKeys = getScrollTypeMetaList().map((type) => type.key);
    }

    for (const key of availableKeys) {
        const meta = getScrollTypeMeta(key);
        const opt = document.createElement('option');
        opt.value = key;
        opt.innerHTML = meta ? `${meta.emoji} ${meta.label}` : getScrollTypeLabel(key);
        dom.mine.scrollTypeSelect.appendChild(opt);
    }

    dom.mine.scrollTypeSelect.size = 1;

    if (selectedKey) {
        dom.mine.scrollTypeSelect.value = selectedKey;
    }
}

function syncSellPriceFromSelection() {
    const itemId = dom.mine.item.value;
    const entry = getInventoryEntry(itemId);
    const item = entry || getItemById(itemId);
    const basePrice = parseBasePrice(item);
    const qty = entry ? Math.max(0, Number(entry.inventoryQty ?? entry.quantity) || 0) : 0;
    dom.mine.unitPrice.value = String(basePrice);
    if (item) {
        const stockText = entry ? `Stock: ${qty}` : '';
        const priceText = `Prix par defaut: ${formatKaels(basePrice)}/u`;
        dom.mine.baseHint.textContent = stockText ? `${stockText} - ${priceText}` : priceText;
    } else {
        dom.mine.baseHint.textContent = '';
    }

    const scrollField = dom.mine.scrollTypeField;
    if (scrollField && isScrollItem(item)) {
        scrollField.hidden = false;
        populateScrollTypeSelect(entry || item, dom.mine.scrollTypeSelect?.value || '');
    } else if (scrollField) {
        scrollField.hidden = true;
        if (dom.mine.scrollTypeSelect) dom.mine.scrollTypeSelect.value = '';
    }
}

function renderMyListings(listings) {
    dom.mine.body.innerHTML = '';

    if (!listings || listings.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'hdv-empty';
        td.textContent = 'Aucune offre active.';
        tr.appendChild(td);
        dom.mine.body.appendChild(tr);
        return;
    }

    for (const listing of listings) {
        const item = resolveListingItem(listing);
        const img = resolveItemImage(item);
        const total = listing.total_price ?? (listing.quantity * listing.unit_price);

        const tr = document.createElement('tr');

        const tdItem = document.createElement('td');
        tdItem.innerHTML = `
            <div class="hdv-item-cell">
                <img class="hdv-item-icon" src="${img}" alt="">
                <div class="hdv-item-text">
                    <div class="hdv-item-name">${item.name || 'Item inconnu'}</div>
                    <div class="hdv-item-meta">${item.category ? categoryLabel(item.category) : ''}</div>
                    ${listing.scroll_type ? `<div class="hdv-item-meta hdv-item-meta--scroll">${getScrollTypeLabel(listing.scroll_type)}</div>` : ''}
                </div>
            </div>
        `;

        const tdLot = document.createElement('td');
        tdLot.textContent = `x${listing.quantity}`;

        const tdPrice = document.createElement('td');
        tdPrice.innerHTML = `
            <div class="hdv-price-cell">
                <div class="hdv-price-total">${formatKaels(total)}</div>
                <div class="hdv-price-unit">${formatKaels(listing.unit_price)}/u</div>
            </div>
        `;
        tdPrice.className = 'hdv-td-price';

        const tdAction = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';

        const needsSwitch = !state.character || listing.seller_character_id !== state.character.id;
        if (needsSwitch) {
            btn.className = 'btn-secondary hdv-action-btn';
            btn.textContent = 'Choisir perso';
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (typeof setActiveCharacter !== 'function') return;
                const res = await setActiveCharacter(listing.seller_character_id);
                if (res && res.success) {
                    window.location.reload();
                }
            });
        } else {
            btn.className = 'btn-danger hdv-action-btn';
            btn.textContent = 'Retirer';
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = window.confirm(`Retirer l'offre "${item.name}" ?`);
                if (!ok) return;

                btn.disabled = true;
                btn.textContent = '...';
                try {
                    await cancelListing(listing.id);
                    const inventoryUpdated = await applyInventoryDelta(listing.item_id, listing.quantity);
                    const restockEntry = resolveRestockEntry(listing.item_id, item);
                    const scrollUpdated = listing.scroll_type && isScrollItem(restockEntry)
                        ? await applyScrollTypeRestock(restockEntry, listing.scroll_type, listing.quantity)
                        : true;
                    populateSellSelect();
                    await refreshMine();
                    if (!inventoryUpdated || !scrollUpdated) {
                        setStatus(dom.mine.status, 'Offre retiree, inventaire non mis a jour.', 'error');
                    } else {
                        setStatus(dom.mine.status, 'Offre retiree.', 'success');
                    }
                } catch (err) {
                    console.error(err);
                    setStatus(dom.mine.status, err?.message || 'Erreur lors du retrait.', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Retirer';
                }
            });
        }

        tdAction.appendChild(btn);
        tr.appendChild(tdItem);
        tr.appendChild(tdLot);
        tr.appendChild(tdPrice);
        tr.appendChild(tdAction);
        dom.mine.body.appendChild(tr);
    }
}

async function refreshMine() {
    if (!state.user) {
        setStatus(dom.mine.status, 'Connectez-vous pour gerer vos offres.', 'info');
        dom.mine.create.disabled = true;
        return;
    }

    if (!state.character) {
        setStatus(dom.mine.status, 'Selectionnez un personnage pour vendre.', 'info');
        dom.mine.create.disabled = true;
        renderMyListings([]);
        return;
    }

    dom.mine.create.disabled = false;
    setStatus(dom.mine.status, '', 'info');

    try {
        const listings = await getMyListings();
        renderMyListings(listings);
        setStatus(dom.mine.status, `${listings.length} offres actives.`, 'info');
    } catch (err) {
        console.error(err);
        renderMyListings([]);
        setStatus(dom.mine.status, err?.message || 'Erreur lors du chargement.', 'error');
    }
}

function renderHistory(transactions) {
    dom.history.body.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'hdv-empty';
        td.textContent = 'Aucune transaction.';
        tr.appendChild(td);
        dom.history.body.appendChild(tr);
        return;
    }

    for (const tx of transactions) {
        const itemName = tx.items?.name || tx.item_id || 'Item inconnu';
        const scrollLabel = tx.scroll_type ? getScrollTypeLabel(tx.scroll_type) : '';
        const isBuy = state.character && tx.buyer_character_id === state.character.id;
        const type = isBuy ? 'Achat' : 'Vente';

        const tr = document.createElement('tr');
        const tdDate = document.createElement('td');
        tdDate.textContent = formatDate(tx.sold_at || tx.created_at);

        const tdType = document.createElement('td');
        tdType.textContent = type;

        const tdItem = document.createElement('td');
        tdItem.innerHTML = scrollLabel
            ? `${itemName} <span class="hdv-item-meta hdv-item-meta--scroll">${scrollLabel}</span>`
            : itemName;

        const tdLot = document.createElement('td');
        tdLot.textContent = `x${tx.quantity}`;

        const tdPrice = document.createElement('td');
        tdPrice.innerHTML = `
            <div class="hdv-price-cell">
                <div class="hdv-price-total">${formatKaels(tx.total_price)}</div>
                <div class="hdv-price-unit">${formatKaels(tx.unit_price)}/u</div>
            </div>
        `;
        tdPrice.className = 'hdv-td-price';

        const tdProfile = document.createElement('td');
        const profileId = isBuy ? tx.seller_character_id : tx.buyer_character_id;
        const profileName = isBuy
            ? resolveCharacterName(tx.seller_character)
            : resolveCharacterName(tx.buyer_character);
        const profileLink = formatCharacterLink(profileId, profileName || 'Profil');
        tdProfile.innerHTML = profileLink || '-';

        tr.appendChild(tdDate);
        tr.appendChild(tdType);
        tr.appendChild(tdItem);
        tr.appendChild(tdLot);
        tr.appendChild(tdPrice);
        tr.appendChild(tdProfile);
        dom.history.body.appendChild(tr);
    }
}

async function refreshHistory() {
    if (!state.user) {
        setStatus(dom.history.status, 'Connectez-vous pour consulter votre historique.', 'info');
        renderHistory([]);
        return;
    }

    if (!state.character) {
        setStatus(dom.history.status, 'Selectionnez un personnage pour consulter votre historique.', 'info');
        renderHistory([]);
        return;
    }

    setStatus(dom.history.status, '', 'info');
    try {
        const transactions = await getMyHistory();
        renderHistory(transactions);
        setStatus(dom.history.status, `${transactions.length} transactions.`, 'info');
    } catch (err) {
        console.error(err);
        renderHistory([]);
        setStatus(dom.history.status, err?.message || 'Erreur lors du chargement.', 'error');
    }
}

function wireEvents() {
    for (const tab of dom.tabs) {
        tab.addEventListener('click', async () => {
            const next = tab.dataset.tab;
            if (!next) return;
            setActiveTab(next);
            if (next === 'search') await refreshSearch();
            if (next === 'mine') await refreshMine();
            if (next === 'history') await refreshHistory();
        });
    }

    if (dom.search.root && dom.search.input && window.astoriaSearchBar) {
        window.astoriaSearchBar.bind({
            root: dom.search.root,
            input: dom.search.input,
            toggle: dom.search.toggle,
            clearButton: dom.search.clear,
            dropdown: dom.search.history,
            history: searchHistory,
            debounceWait: 250,
            onSearch: (value) => {
                state.filters.q = String(value || '').trim();
                state.page = 1;
                renderChips();
                refreshSearch();
            }
        });
    } else {
        let searchTimer = null;
        dom.search.input.addEventListener('input', () => {
            state.filters.q = dom.search.input.value.trim();
            if (dom.search.clear) {
                dom.search.clear.style.display = state.filters.q ? 'block' : 'none';
            }
            state.page = 1;
            renderChips();

            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(() => refreshSearch(), 250);
        });

        if (dom.search.clear) {
            dom.search.clear.addEventListener('click', () => {
                dom.search.input.value = '';
                state.filters.q = '';
                dom.search.clear.style.display = 'none';
                state.page = 1;
                renderChips();
                refreshSearch();
            });
        }
    }

    dom.search.minLevel.addEventListener('change', () => {
        state.filters.minLevel = dom.search.minLevel.value;
        state.page = 1;
        renderChips();
        refreshSearch();
    });

    dom.search.maxLevel.addEventListener('change', () => {
        state.filters.maxLevel = dom.search.maxLevel.value;
        state.page = 1;
        renderChips();
        refreshSearch();
    });

    dom.search.rarity.addEventListener('change', () => {
        state.filters.rarity = dom.search.rarity.value;
        state.page = 1;
        renderChips();
        refreshSearch();
    });

    dom.search.sort.addEventListener('change', () => {
        state.sort = dom.search.sort.value;
        state.page = 1;
        renderChips();
        refreshSearch();
    });
    dom.search.affordable.addEventListener('change', () => {
        state.filters.affordableOnly = dom.search.affordable.checked;
        state.page = 1;
        renderChips();
        refreshSearch();
    });

    dom.mine.item.addEventListener('change', () => syncSellPriceFromSelection());

    dom.mine.create.addEventListener('click', async () => {
        if (!state.user) {
            setStatus(dom.mine.status, 'Connectez-vous pour vendre.', 'error');
            return;
        }

        if (!state.character) {
            setStatus(dom.mine.status, 'Selectionnez un personnage pour vendre.', 'error');
            return;
        }

        const selectedValue = String(dom.mine.item.value || '').trim();
        const entry = getInventoryEntry(selectedValue);
        const itemId = String(entry?.itemId || entry?.id || selectedValue || '').trim();
        let available = entry ? Math.max(0, Number(entry.quantity) || 0) : 0;
        const quantity = asInt(dom.mine.qty.value) ?? 1;
        const unitPrice = parsePriceInput(dom.mine.unitPrice.value);
        const isScroll = isScrollItem(entry);
        const scrollType = isScroll ? String(dom.mine.scrollTypeSelect?.value || '').trim() : '';
        const scrollCounts = isScroll
            ? (scrollType ? buildScrollCountsForSale(entry, scrollType) : getScrollTypeCounts(entry))
            : null;
        if (isScroll && scrollType) {
            available = scrollCounts && typeof scrollCounts === 'object'
                ? Math.max(0, Number(scrollCounts[scrollType]) || 0)
                : 0;
        }

        if (!selectedValue) {
            setStatus(dom.mine.status, 'Selectionnez un objet.', 'error');
            return;
        }
        if (!entry) {
            setStatus(dom.mine.status, 'Objet non disponible dans votre inventaire.', 'error');
            return;
        }
        if (!itemId) {
            setStatus(dom.mine.status, 'Objet invalide pour la vente.', 'error');
            return;
        }
        if (quantity <= 0) {
            setStatus(dom.mine.status, 'Quantite invalide.', 'error');
            return;
        }
        if (quantity > available) {
            setStatus(dom.mine.status, 'Stock insuffisant.', 'error');
            return;
        }
        if (unitPrice === null || unitPrice < 0) {
            setStatus(dom.mine.status, 'Prix invalide.', 'error');
            return;
        }
        if (isScrollItem(entry) && !scrollType) {
            setStatus(dom.mine.status, 'Selectionnez un type de parchemin.', 'error');
            return;
        }

        dom.mine.create.disabled = true;
        setStatus(dom.mine.status, "Creation de l'offre...", 'info');
        try {
            await createListing({ itemId, item: entry, quantity, unitPrice, scrollType });
            const inventoryUpdated = await applyInventoryDelta(itemId, -quantity);
            if (scrollType && isScrollItem(entry)) {
                await applyScrollTypeSale(entry, scrollType, quantity);
            }
            populateSellSelect();
            setStatus(
                dom.mine.status,
                inventoryUpdated ? 'Offre creee.' : 'Offre creee, inventaire non mis a jour.',
                inventoryUpdated ? 'success' : 'error'
            );
            // Log the sale listing
            await logActivity({
                actionType: ActionTypes.ITEM_SELL,
                characterId: state.character?.id,
                actionData: {
                    item_name: entry.name,
                    item_id: itemId,
                    price: unitPrice,
                    quantity: quantity,
                    total_cost: unitPrice * quantity
                }
            });
            await refreshSearch();
            await refreshMine();
        } catch (err) {
            console.error(err);
            setStatus(dom.mine.status, err?.message || 'Erreur lors de la creation.', 'error');
        } finally {
            dom.mine.create.disabled = false;
        }
    });
}

async function loadCategories() {
    try {
        state.categories = await getCategories();
        state.categoriesMap = new Map((state.categories || []).map((cat) => [cat.slug, cat]));
        console.log(`[HDV] Loaded ${state.categories.length} categories from database`);
    } catch (error) {
        console.warn('[HDV] Failed to load categories, using fallback:', error);
        // Fallback to hardcoded categories
        state.categories = [
            { slug: 'agricole', name: 'Agricole', icon: '🌾', is_active: true, display_order: 1 },
            { slug: 'consommable', name: 'Consommable', icon: '🧪', is_active: true, display_order: 2 },
            { slug: 'equipement', name: 'Équipement', icon: '⚔️', is_active: true, display_order: 3 },
            { slug: 'materiau', name: 'Matériaux', icon: '⚒️', is_active: true, display_order: 4 },
            { slug: 'quete', name: 'Quêtes', icon: '✨', is_active: true, display_order: 5 }
        ];
        state.categoriesMap = new Map(state.categories.map(cat => [cat.slug, cat]));
    }
}

async function init() {
    console.log('[HDV] ========== INIT HDV ==========');
    console.log('[HDV] Location:', window.location.href);
    console.log('[HDV] Origin:', window.location.origin);

    await loadCategories();
    await loadItemCatalog();
    populateSellSelect();

    renderCategories();
    wireEvents();

    if (typeof refreshSessionUser === 'function') {
        try {
            console.log('[HDV] Tentative refreshSessionUser...');
            const result = await refreshSessionUser();
            console.log('[HDV] refreshSessionUser result:', result);

            // Attendre que localStorage soit écrit
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            console.error('[HDV] refreshSessionUser error:', err);
        }
    } else {
        console.warn('[HDV] refreshSessionUser non disponible');
    }

    // Log localStorage après refresh
    try {
        const hasSession = !!localStorage.getItem('astoria_session');
        const hasChar = !!localStorage.getItem('astoria_active_character');
        console.log('[HDV] Après refresh - Session:', hasSession, '| Character:', hasChar);
    } catch (err) {
        console.error('[HDV] Erreur check localStorage:', err);
    }

    await refreshProfile();
    syncFiltersToUI();
    syncSellPriceFromSelection();
    renderChips();

    const savedCategory =
        (typeof localStorage !== 'undefined' && localStorage.getItem('astoria_hdv_category')) || 'all';
    if (savedCategory && buildCategories().includes(savedCategory)) {
        state.category = savedCategory;
        renderCategories();
    }

    const savedTab =
        (typeof localStorage !== 'undefined' && localStorage.getItem('astoria_hdv_active_tab')) || 'search';
    const nextTab = ['search', 'mine', 'history'].includes(savedTab) ? savedTab : 'search';
    setActiveTab(nextTab);

    if (nextTab === 'mine') {
        await refreshMine();
    } else if (nextTab === 'history') {
        await refreshHistory();
    } else {
        await refreshSearch();
    }
}

window.addEventListener('storage', (event) => {
    if (event.key === 'astoria_session' || event.key === 'astoria_active_character') {
        void refreshProfile();
    }
    if (event.key === INVENTORY_SYNC_KEY && event.newValue) {
        try {
            const payload = JSON.parse(event.newValue);
            const characterId = String(payload?.characterId || '');
            if (state.character?.id && characterId === String(state.character.id)) {
                void refreshInventory().then(() => {
                    populateSellSelect();
                    syncSellPriceFromSelection();
                });
            }
        } catch {
            // ignore invalid payloads
        }
    }
});

init();
