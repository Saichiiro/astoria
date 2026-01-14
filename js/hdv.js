import {
    getCurrentUser,
    getActiveCharacter,
    refreshSessionUser,
    getUserCharacters,
    setActiveCharacter,
    getAllItems
} from './auth.js';
import {
    buyListing,
    cancelListing,
    createListing,
    getMyHistory,
    getMyListings,
    getMyProfile,
    searchListings
} from './market.js';
import { getInventoryRows, setInventoryItem } from './api/inventory-service.js';
import { initCharacterSummary } from './ui/character-summary.js';

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
        qty: document.getElementById('hdvSellQty'),
        unitPrice: document.getElementById('hdvSellUnitPrice'),
        baseHint: document.getElementById('hdvBasePriceHint'),
        scrollToggle: document.getElementById('hdvScrollTypesToggle'),
        scrollPanel: document.getElementById('hdvScrollTypesPanel'),
        scrollList: document.getElementById('hdvScrollTypesList'),
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
    inventory: []
};

const searchHistory = window.astoriaSearchHistory
    ? window.astoriaSearchHistory.createSearchHistory({
        storageKey: 'astoriaHdvRecentSearches',
        maxItems: 4
    })
    : null;

const normalizeText = window.astoriaListHelpers?.normalizeText || ((value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase());

const SCROLL_TYPES = [
    { key: 'feu', emoji: String.fromCodePoint(0x1F525), label: 'Feu', matchers: ['feu'] },
    { key: 'eau', emoji: String.fromCodePoint(0x1F4A7), label: 'Eau', matchers: ['eau'] },
    { key: 'glace', emoji: String.fromCodePoint(0x1F9CA), label: 'Glace', matchers: ['glace', 'cryo'] },
    { key: 'vent', emoji: String.fromCodePoint(0x1F32C), label: 'Vent', matchers: ['vent'] },
    { key: 'terre', emoji: String.fromCodePoint(0x1FAA8), label: 'Terre', matchers: ['terre'] },
    { key: 'nature', emoji: String.fromCodePoint(0x1F331), label: 'Nature', matchers: ['nature'] },
    { key: 'roche', emoji: String.fromCodePoint(0x1FAA8), label: 'Roche', matchers: ['roche'] },
    { key: 'metaux', emoji: String.fromCodePoint(0x1F529), label: 'Metaux', matchers: ['metaux', 'metal'] },
    { key: 'bois', emoji: String.fromCodePoint(0x1FAB5), label: 'Bois', matchers: ['bois'] },
    { key: 'foudre', emoji: String.fromCodePoint(0x26A1), label: 'Foudre', matchers: ['foudre'] },
    { key: 'lumiere', emoji: String.fromCodePoint(0x1F31F), label: 'Lumiere', matchers: ['lumiere'] },
    { key: 'tenebres', emoji: String.fromCodePoint(0x1F319), label: 'Tenebres', matchers: ['tenebres'] }
];

const SCROLL_TYPE_MAP = new Map(SCROLL_TYPES.map((type) => [type.key, type]));

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

function getScrollCategory(item) {
    if (!item || !item.name) return null;
    const name = normalizeText(item.name);
    if (!name.includes('parchemin') && !name.includes('scroll')) return null;
    if (name.includes('eveil') || name.includes('eveille') || (name.includes('veil') && name.includes('parchemin'))) return 'eveil';
    if (name.includes('ascension')) return 'ascension';
    return 'parchemin';
}

function getScrollTypeKey(item) {
    const haystack = normalizeText(
        [item?.name, item?.description, item?.effect]
            .filter(Boolean)
            .join(' ')
    );

    for (const type of SCROLL_TYPES) {
        for (const matcher of type.matchers) {
            if (haystack.includes(normalizeText(matcher))) {
                return type.key;
            }
        }
    }

    return null;
}

function getScrollTypeLabel(key) {
    const info = SCROLL_TYPE_MAP.get(key);
    if (!info) return null;
    return `${info.emoji} ${info.label}`;
}

function resolveListingItem(listing) {
    return getItemById(listing.item_id) || {
        name: listing.item_name || listing.item_id,
        category: listing.item_category,
        description: listing.item_description,
        effect: listing.item_effect
    };
}

function getItemById(itemId) {
    return state.items.find((item) => item && (item.id || item.name) === itemId) || state.items.find((item) => item && item.name === itemId) || null;
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


function mapInventoryRows(rows) {
    const items = [];
    if (!Array.isArray(rows)) return items;

    for (const row of rows) {
        const idx = Number(row?.item_index ?? row?.item_key);
        const qty = Math.floor(Number(row?.qty) || 0);
        if (!Number.isFinite(idx) || idx < 0 || qty <= 0) continue;
        const item = state.items[idx] || { name: row?.item_key || String(idx) };
        items.push({
            ...item,
            sourceIndex: idx,
            itemKey: row?.item_key ? String(row.item_key) : String(idx),
            quantity: qty
        });
    }

    return items;
}



async function refreshInventory() {
    if (!state.character || !state.character.id) {
        state.inventory = [];
        return;
    }

    try {
        const rows = await getInventoryRows(state.character.id);
        state.inventory = mapInventoryRows(Array.isArray(rows) ? rows : []);
    } catch (error) {
        console.error('Inventory load error:', error);
        state.inventory = [];
    }
}



function getInventoryEntry(itemId) {
    return state.inventory.find((item) => item && (item.id || item.name) === itemId) ||
        state.inventory.find((item) => item && item.name === itemId) ||
        null;
}


async function applyInventoryDelta(itemId, delta) {
    if (!state.character || !Number.isFinite(delta) || delta == 0) return false;
    const entry = getInventoryEntry(itemId);
    const baseItem = entry || getItemById(itemId) || { name: itemId };
    const sourceIndex = resolveSourceIndex(baseItem);
    if (!Number.isFinite(sourceIndex)) return false;

    const currentQty = entry ? Math.floor(Number(entry.quantity) || 0) : 0;
    const nextQty = currentQty + delta;
    if (nextQty < 0) return false;

    const itemKey = entry?.itemKey ? String(entry.itemKey) : String(sourceIndex);

    try {
        await setInventoryItem(state.character.id, itemKey, sourceIndex, nextQty);
    } catch (error) {
        console.error('Inventory update error:', error);
        return false;
    }

    if (nextQty == 0) {
        state.inventory = state.inventory.filter((item) => item !== entry);
    } else if (entry) {
        entry.quantity = nextQty;
    } else {
        state.inventory.push({
            ...baseItem,
            sourceIndex,
            itemKey,
            quantity: nextQty
        });
    }

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
                buyPrice: row.price_po,
                sellPrice: row.price_pa,
                images: row.images
            }));
            return;
        }
        const byName = new Map(
            rows
                .filter((row) => row && row.name)
                .map((row) => [String(row.name).toLowerCase(), row])
        );
        state.items = state.items.map((item) => {
            const key = String(item?.name || '').toLowerCase();
            const match = byName.get(key);
            if (!match) return item;
            return {
                ...item,
                rarity: item.rarity ?? match.rarity,
                description: item.description ?? match.description,
                effect: item.effect ?? match.effect,
                buyPrice: item.buyPrice ?? match.price_po,
                sellPrice: item.sellPrice ?? match.price_pa,
                images: item.images ?? match.images
            };
        });
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
    const categories = new Set();

    for (const item of state.items) {
        if (!item) continue;

        const raw =
            item.category ??
            item.type ??
            item.kind ??
            item.item_category ??
            null;

        if (raw) categories.add(String(raw).trim());
        else if (Array.isArray(item.tags) && item.tags.length) {
            categories.add(String(item.tags[0]).trim());
        }
    }

    return ['all', ...Array.from(categories).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'fr'))];
}

function categoryLabel(category) {
    if (category === 'all') return 'Toutes';
    if (category === 'equipement') return '\u00c9quipement';
    if (category === 'consommable') return 'Consommable';
    if (category === 'agricole') return 'Agricole';
    return String(category)
        .replace(/[_-]+/g, ' ')
        .replace(/^\w/, (m) => m.toUpperCase());
}

function renderCategories() {
    const categories = buildCategories();
    dom.categories.innerHTML = '';

    for (const category of categories) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hdv-category-btn' + (state.category === category ? ' active' : '');
        btn.textContent = categoryLabel(category);
        btn.addEventListener('click', () => {
            state.category = category;
            state.page = 1;
            try {
                localStorage.setItem('astoria_hdv_category', category);
            } catch {
                // ignore
            }
            renderCategories();
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
                const ok = window.confirm(`Acheter "${item.name}" pour ${formatKaels(total)} kaels ?`);
                if (!ok) return;

                btn.disabled = true;
                btn.textContent = '...';
                try {
                    await buyListing(listing.id);
                    await refreshProfile();
                    await applyInventoryDelta(listing.item_id, listing.quantity);
                    populateSellSelect();
                    await refreshSearch();
                    setStatus(dom.search.status, 'Achat effectue.', 'success');
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
        state.character = profile.character || state.character;
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


function updateSellScrollPanel(item) {
    if (!dom.mine.scrollPanel || !dom.mine.scrollToggle || !dom.mine.scrollList) return;
    const category = getScrollCategory(item);
    const typeKey = category ? getScrollTypeKey(item) : null;
    dom.mine.scrollList.innerHTML = '';
    if (!category || !typeKey) {
        dom.mine.scrollToggle.disabled = true;
        dom.mine.scrollToggle.setAttribute('aria-expanded', 'false');
        dom.mine.scrollPanel.classList.remove('open');
        dom.mine.scrollPanel.setAttribute('aria-hidden', 'true');
        dom.mine.scrollList.innerHTML = '<div class="hdv-empty">Aucun type disponible.</div>';
        return;
    }
    dom.mine.scrollToggle.disabled = false;
    const label = getScrollTypeLabel(typeKey) || typeKey;
    const btn = document.createElement('div');
    btn.className = 'hdv-scroll-type-btn active';
    btn.textContent = label;
    dom.mine.scrollList.appendChild(btn);
}
function populateSellSelect() {
    dom.mine.item.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    if (!state.user) {
        placeholder.textContent = 'Connectez-vous pour vendre';
    } else if (!state.character) {
        placeholder.textContent = 'Selectionnez un personnage';
    } else if (!state.inventory.length) {
        placeholder.textContent = 'Inventaire vide';
    } else {
        placeholder.textContent = '-- Selectionner un objet --';
    }
    dom.mine.item.appendChild(placeholder);

    dom.mine.item.disabled = !state.character || state.inventory.length === 0;

    for (const item of state.inventory) {
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.textContent = `${item.name} (x${item.quantity})`;
        opt.dataset.qty = String(item.quantity);
        if (Number.isFinite(Number(item.sourceIndex))) {
            opt.dataset.idx = String(item.sourceIndex);
        }
        dom.mine.item.appendChild(opt);
    }
}

function syncSellPriceFromSelection() {
    const itemId = dom.mine.item.value;
    const entry = getInventoryEntry(itemId);
    const item = entry || getItemById(itemId);
    const basePrice = parseBasePrice(item);
    const qty = entry ? Math.max(0, Number(entry.quantity) || 0) : 0;
    dom.mine.unitPrice.value = String(basePrice);
    if (item) {
        const stockText = entry ? `Stock: ${qty}` : '';
        const priceText = `Prix par defaut: ${formatKaels(basePrice)}/u`;
        dom.mine.baseHint.textContent = stockText ? `${stockText} - ${priceText}` : priceText;
    } else {
        dom.mine.baseHint.textContent = '';
    }
    updateSellScrollPanel(item);
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
                    await applyInventoryDelta(listing.item_id, listing.quantity);
                    populateSellSelect();
                    await refreshMine();
                    setStatus(dom.mine.status, 'Offre retiree.', 'success');
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
        const itemName = tx.item_name || tx.item_id || 'Item inconnu';
        const isBuy = state.character && tx.buyer_character_id === state.character.id;
        const type = isBuy ? 'Achat' : 'Vente';

        const tr = document.createElement('tr');
        const tdDate = document.createElement('td');
        tdDate.textContent = formatDate(tx.sold_at || tx.created_at);

        const tdType = document.createElement('td');
        tdType.textContent = type;

        const tdItem = document.createElement('td');
        tdItem.textContent = itemName;

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
    if (dom.mine.scrollToggle && dom.mine.scrollPanel) {
        dom.mine.scrollToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            if (dom.mine.scrollToggle.disabled) return;
            const isOpen = dom.mine.scrollPanel.classList.contains('open');
            dom.mine.scrollPanel.classList.toggle('open', !isOpen);
            dom.mine.scrollPanel.setAttribute('aria-hidden', String(isOpen));
            dom.mine.scrollToggle.setAttribute('aria-expanded', String(!isOpen));
        });
        document.addEventListener('click', (event) => {
            if (!dom.mine.scrollPanel.classList.contains('open')) return;
            if (dom.mine.scrollPanel.contains(event.target)) return;
            if (dom.mine.scrollToggle.contains(event.target)) return;
            dom.mine.scrollPanel.classList.remove('open');
            dom.mine.scrollPanel.setAttribute('aria-hidden', 'true');
            dom.mine.scrollToggle.setAttribute('aria-expanded', 'false');
        });
    }

    dom.mine.create.addEventListener('click', async () => {
        if (!state.user) {
            setStatus(dom.mine.status, 'Connectez-vous pour vendre.', 'error');
            return;
        }

        if (!state.character) {
            setStatus(dom.mine.status, 'Selectionnez un personnage pour vendre.', 'error');
            return;
        }

        const itemId = dom.mine.item.value;
        const entry = getInventoryEntry(itemId);
        const available = entry ? Math.max(0, Number(entry.quantity) || 0) : 0;
        const quantity = asInt(dom.mine.qty.value) ?? 1;
        const unitPrice = parsePriceInput(dom.mine.unitPrice.value);

        if (!itemId) {
            setStatus(dom.mine.status, 'Selectionnez un objet.', 'error');
            return;
        }
        if (!entry) {
            setStatus(dom.mine.status, 'Objet non disponible dans votre inventaire.', 'error');
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

        dom.mine.create.disabled = true;
        setStatus(dom.mine.status, "Creation de l'offre...", 'info');
        try {
            await createListing({ itemId, item: entry, quantity, unitPrice });
            await applyInventoryDelta(itemId, -quantity);
            populateSellSelect();
            setStatus(dom.mine.status, 'Offre creee.', 'success');
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

async function init() {
    console.log('[HDV] ========== INIT HDV ==========');
    console.log('[HDV] Location:', window.location.href);
    console.log('[HDV] Origin:', window.location.origin);

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
});

init();
