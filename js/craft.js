import {
    getAllItems,
    getCurrentUser,
    getActiveCharacter,
    isAdmin,
    refreshSessionUser
} from './auth.js';
import { initCharacterSummary } from './ui/character-summary.js';
import { getInventoryRows } from './api/inventory-service.js';
import { getAllCharacters } from './api/characters-service.js';
import {
    createCraftRecipe,
    updateCraftRecipe,
    deleteCraftRecipe,
    executeCraftRecipe,
    getCraftRecipes,
    buildInventoryIndex,
    canCraftRecipe,
    getInventoryQty
} from './api/craft-service.js';

const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'SS', 'SSS'];

const dom = {
    searchInput: document.getElementById('craftSearchInput'),
    rankFilter: document.getElementById('craftRankFilter'),
    rankMode: document.getElementById('craftRankMode'),
    possibleOnly: document.getElementById('craftPossibleOnly'),
    categoryList: document.getElementById('craftCategoryList'),
    recipeList: document.getElementById('craftRecipeList'),
    pagination: document.getElementById('craftPagination'),
    addBtn: document.getElementById('craftAddRecipeBtn'),
    adminStats: document.getElementById('craftAdminStats'),
    adminStatsCards: document.getElementById('craftAdminStatsCards'),
    adminStatsCategory: document.getElementById('craftAdminStatsCategory'),
    adminStatsRarity: document.getElementById('craftAdminStatsRarity'),
    adminStatsRank: document.getElementById('craftAdminStatsRank'),
    adminControl: document.getElementById('craftAdminControl'),
    adminCharacterSelect: document.getElementById('craftAdminCharacterSelect'),
    adminRefreshBtn: document.getElementById('craftAdminRefreshBtn'),
    adminSummary: document.getElementById('craftAdminSummary'),
    adminEquipments: document.getElementById('craftAdminEquipments'),
    adminAttributes: document.getElementById('craftAdminAttributes'),
    adminInventoryRows: document.getElementById('craftAdminInventoryRows'),

    modal: document.getElementById('craftRecipeModal'),
    modalClose: document.getElementById('craftModalClose'),
    modalSave: document.getElementById('craftRecipeSaveBtn'),
    modalDelete: document.getElementById('craftRecipeDeleteBtn'),
    modalCancel: document.getElementById('craftRecipeCancelBtn'),
    modalBackdrop: document.querySelector('[data-craft-modal-close]'),

    recipeTitle: document.getElementById('craftRecipeTitle'),
    recipeCategory: document.getElementById('craftRecipeCategory'),
    recipeRarity: document.getElementById('craftRecipeRarity'),
    recipeRank: document.getElementById('craftRecipeRank'),
    outputItemSelect: document.getElementById('craftRecipeOutputItem'),
    outputItemLabel: document.getElementById('craftRecipeOutputItemLabel'),
    outputQty: document.getElementById('craftRecipeOutputQty'),
    pickOutputBtn: document.getElementById('craftPickOutputBtn'),

    addIngredientBtn: document.getElementById('craftAddIngredientBtn'),
    ingredientRows: document.getElementById('craftIngredientRows'),

    pickerModal: document.getElementById('craftItemPickerModal'),
    pickerClose: document.getElementById('craftItemPickerClose'),
    pickerBackdrop: document.querySelector('[data-craft-picker-close]'),
    pickerSearch: document.getElementById('craftItemPickerSearch'),
    pickerList: document.getElementById('craftItemPickerList')
};

const state = {
    user: null,
    character: null,
    admin: false,

    recipes: [],
    items: [],
    itemById: new Map(),
    itemByKey: new Map(),

    inventoryRows: [],
    inventoryIndex: { byItemId: new Map(), byItemKey: new Map() },
    allCharacters: [],
    adminTargetCharacterId: '',

    category: 'Tous',
    search: '',
    rank: 'Tous',
    rankMode: 'exact',
    onlyPossible: false,

    page: 1,
    pageSize: 10,
    expanded: new Set(),

    ingredientDraftRows: [],
    editingRecipeId: null,

    picker: {
        target: null,
        ingredientIndex: -1,
        query: ''
    }
};

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function safeJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }
    return {};
}

function resolveItemImage(item) {
    const helper = window.astoriaImageHelpers;
    if (helper?.resolveItemImages) {
        const resolved = helper.resolveItemImages(item);
        if (resolved?.primary) return resolved.primary;
    }

    const images = safeJson(item?.images);
    return images.main || images.primary || images.url || item?.image || item?.image_url || '';
}

function rankIndex(rank) {
    return RANK_ORDER.indexOf(String(rank || '').trim());
}

function rankPasses(recipeRank) {
    if (state.rank === 'Tous') return true;

    const recipeIdx = rankIndex(recipeRank);
    const filterIdx = rankIndex(state.rank);
    if (recipeIdx < 0 || filterIdx < 0) return false;

    if (state.rankMode === 'min') {
        return recipeIdx >= filterIdx;
    }
    return recipeIdx === filterIdx;
}

function toastSuccess(message) {
    window.toastManager?.success?.(message);
}

function toastError(message) {
    window.toastManager?.error?.(message);
}

function getRarityClass(value) {
    const normalized = normalizeText(value);
    if (normalized === 'rare') return 'craft-rarity-rare';
    if (normalized === 'epique') return 'craft-rarity-epique';
    if (normalized === 'mythique') return 'craft-rarity-mythique';
    if (normalized === 'legendaire') return 'craft-rarity-legendaire';
    return 'craft-rarity-commun';
}

function getRecipeOutputItem(recipe) {
    const id = String(recipe?.output_item_id || '').trim();
    if (id && state.itemById.has(id)) return state.itemById.get(id);

    const key = normalizeText(recipe?.output_item_key || '');
    if (key && state.itemByKey.has(key)) return state.itemByKey.get(key);

    return null;
}

function getItemDisplayImage(item) {
    if (!item) return '';
    return item.resolvedImage || resolveItemImage(item);
}

function getIngredientItem(ingredient) {
    const id = String(ingredient?.item_id || '').trim();
    if (id && state.itemById.has(id)) return state.itemById.get(id);

    const key = normalizeText(ingredient?.item_key || '');
    if (key && state.itemByKey.has(key)) return state.itemByKey.get(key);

    return null;
}

function normalizeItemKey(value) {
    return normalizeText(value);
}

function getFilteredRecipes() {
    const query = normalizeText(state.search);

    const list = state.recipes.filter((recipe) => {
        if (state.category !== 'Tous' && recipe.category !== state.category) return false;
        if (!rankPasses(recipe.rank)) return false;

        if (query) {
            const haystack = normalizeText(`${recipe.title || ''} ${recipe.output_item_key || ''}`);
            if (!haystack.includes(query)) return false;
        }

        if (state.onlyPossible && !canCraftRecipe(recipe, state.inventoryIndex)) return false;
        return true;
    });

    list.sort((a, b) => {
        const aOk = canCraftRecipe(a, state.inventoryIndex) ? 0 : 1;
        const bOk = canCraftRecipe(b, state.inventoryIndex) ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
        return String(a.title || '').localeCompare(String(b.title || ''), 'fr');
    });

    return list;
}

function renderPagination(filtered) {
    if (!dom.pagination) return;

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    const currentPage = Math.min(Math.max(1, state.page), totalPages);
    state.page = currentPage;

    dom.pagination.innerHTML = '';

    const meta = document.createElement('div');
    meta.className = 'craft-pagination-meta';
    meta.textContent = `Page ${currentPage} / ${totalPages} - ${filtered.length} recette(s)`;

    const actions = document.createElement('div');
    actions.className = 'craft-pagination-actions';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'craft-secondary-btn';
    prev.textContent = 'Precedent';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', () => {
        state.page = Math.max(1, state.page - 1);
        renderRecipes();
    });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'craft-secondary-btn';
    next.textContent = 'Suivant';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', () => {
        state.page = Math.min(totalPages, state.page + 1);
        renderRecipes();
    });

    actions.append(prev, next);
    dom.pagination.append(meta, actions);
}

function createStatCard(label, value) {
    const card = document.createElement('div');
    card.className = 'craft-admin-stat-card';

    const labelNode = document.createElement('div');
    labelNode.className = 'craft-admin-stat-label';
    labelNode.textContent = label;

    const valueNode = document.createElement('div');
    valueNode.className = 'craft-admin-stat-value';
    valueNode.textContent = String(value);

    card.append(labelNode, valueNode);
    return card;
}

function renderAdminChipList(container, entries, valueClass = '') {
    if (!container) return;
    container.innerHTML = '';

    if (!entries.length) {
        const empty = document.createElement('span');
        empty.className = 'craft-admin-chip';
        empty.textContent = 'Aucune donnee';
        container.appendChild(empty);
        return;
    }

    entries.forEach(([label, value]) => {
        const chip = document.createElement('span');
        chip.className = 'craft-admin-chip';

        const text = document.createElement('span');
        text.className = typeof valueClass === 'function' ? valueClass(label) : valueClass;
        text.textContent = label;

        const count = document.createElement('span');
        count.className = 'craft-admin-chip-value';
        count.textContent = String(value);

        chip.append(text, count);
        container.appendChild(chip);
    });
}

function renderAdminStats() {
    if (!dom.adminStats) return;

    if (!state.admin) {
        dom.adminStats.hidden = true;
        return;
    }
    dom.adminStats.hidden = false;

    const recipes = Array.isArray(state.recipes) ? state.recipes : [];
    const total = recipes.length;
    const craftable = recipes.filter((recipe) => canCraftRecipe(recipe, state.inventoryIndex)).length;
    const blocked = Math.max(0, total - craftable);
    const visible = getFilteredRecipes().length;
    const withCharacter = state.character?.id ? total : 0;

    if (dom.adminStatsCards) {
        dom.adminStatsCards.innerHTML = '';
        dom.adminStatsCards.append(
            createStatCard('Recettes totales', total),
            createStatCard('Creation possible', craftable),
            createStatCard('Creation bloquee', blocked),
            createStatCard('Selon filtres', visible),
            createStatCard('Avec perso actif', withCharacter)
        );
    }

    const categoryCounts = new Map();
    const rarityCounts = new Map();
    const rankCounts = new Map();

    recipes.forEach((recipe) => {
        const category = String(recipe?.category || 'Autre');
        const rarity = String(recipe?.rarity || 'Commun');
        const rank = String(recipe?.rank || 'F');

        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        rarityCounts.set(rarity, (rarityCounts.get(rarity) || 0) + 1);
        rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    });

    const categoryEntries = [...categoryCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
    const rarityEntries = [...rarityCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
    const rankEntries = [...rankCounts.entries()].sort((a, b) => rankIndex(a[0]) - rankIndex(b[0]));

    renderAdminChipList(dom.adminStatsCategory, categoryEntries);
    renderAdminChipList(dom.adminStatsRarity, rarityEntries, getRarityClass);
    renderAdminChipList(dom.adminStatsRank, rankEntries);
}

function createAdminPill(label, value) {
    const chip = document.createElement('span');
    chip.className = 'craft-admin-pill';
    const labelNode = document.createElement('strong');
    labelNode.textContent = label;
    chip.append(labelNode, document.createTextNode(` ${value}`));
    return chip;
}

function getAdminItemLookups() {
    const byId = new Map();
    const byKey = new Map();

    state.items.forEach((item) => {
        const id = String(item?.id || '').trim();
        const key = normalizeItemKey(item?.name || '');
        if (id && !byId.has(id)) byId.set(id, item);
        if (key && !byKey.has(key)) byKey.set(key, item);
    });
    return { byId, byKey };
}

function renderAdminInventoryRows(rows) {
    if (!dom.adminInventoryRows) return;
    dom.adminInventoryRows.innerHTML = '';

    if (!Array.isArray(rows) || rows.length === 0) {
        dom.adminInventoryRows.innerHTML = `
            <tr>
                <td colspan="4" class="craft-admin-table-empty">Inventaire vide.</td>
            </tr>
        `;
        return;
    }

    const { byId, byKey } = getAdminItemLookups();

    rows.forEach((row) => {
        const tr = document.createElement('tr');
        const itemId = String(row?.item_id || '').trim();
        const itemKey = String(row?.item_key || '').trim();
        const item = (itemId && byId.get(itemId)) || byKey.get(normalizeItemKey(itemKey)) || null;
        const itemName = item?.name || itemKey || 'Item inconnu';
        const category = item?.category || '-';
        const qty = Math.max(0, Math.floor(Number(row?.qty) || 0));

        const itemTd = document.createElement('td');
        const itemCell = document.createElement('div');
        itemCell.className = 'craft-admin-item-cell';
        const thumb = document.createElement('div');
        thumb.className = 'craft-admin-item-thumb';
        const imgSrc = getItemDisplayImage(item);
        if (imgSrc) {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = itemName;
            thumb.appendChild(img);
        } else {
            thumb.textContent = 'ITEM';
        }
        const text = document.createElement('div');
        text.className = 'craft-admin-item-meta';
        text.textContent = itemName;
        itemCell.append(thumb, text);
        itemTd.appendChild(itemCell);

        const catTd = document.createElement('td');
        catTd.className = 'craft-admin-muted';
        catTd.textContent = category;

        const qtyTd = document.createElement('td');
        qtyTd.textContent = String(qty);

        const idTd = document.createElement('td');
        idTd.className = 'craft-admin-muted';
        idTd.textContent = itemId || '-';

        tr.append(itemTd, catTd, qtyTd, idTd);
        dom.adminInventoryRows.appendChild(tr);
    });
}

function renderAdminEquipments(character) {
    if (!dom.adminEquipments) return;
    dom.adminEquipments.innerHTML = '';

    const slotLabels = {
        head: 'Tete',
        neck: 'Cou',
        shoulders: 'Epaules',
        chest: 'Torse',
        cloak: 'Cape',
        gloves: 'Gants',
        ring1: 'Anneau G',
        ring2: 'Anneau D',
        boots: 'Bottes',
        artifact: 'Artefact',
        pet: 'Familier',
        weapon: 'Arme',
        offhand: 'Main G',
        mount: 'Monture'
    };

    const equipped = character?.profile_data?.inventory?.equippedSlots || {};
    const entries = Object.entries(equipped).filter(([, item]) => Boolean(item?.item_key || item?.name));
    if (!entries.length) {
        dom.adminEquipments.appendChild(createAdminPill('Info', 'Aucun equipement'));
        return;
    }

    entries.forEach(([slot, item]) => {
        const name = item?.item_key || item?.name || 'Inconnu';
        dom.adminEquipments.appendChild(createAdminPill(slotLabels[slot] || slot, name));
    });
}

function getCompetenceSummary(profileData) {
    const comp = profileData?.competences;
    const pointsByCategory = comp?.pointsByCategory || {};
    const keys = Object.keys(pointsByCategory);
    if (!keys.length) return 0;
    return keys.reduce((sum, key) => sum + Math.max(0, Number(pointsByCategory[key]) || 0), 0);
}

function renderAdminAttributes(character, inventoryRows) {
    if (!dom.adminAttributes) return;
    dom.adminAttributes.innerHTML = '';

    if (!character) {
        dom.adminAttributes.appendChild(createAdminPill('Info', 'Aucune cible'));
        return;
    }

    const profileData = character.profile_data || {};
    const totalUnits = (inventoryRows || []).reduce((sum, row) => sum + Math.max(0, Number(row?.qty) || 0), 0);
    const competencePoints = getCompetenceSummary(profileData);

    dom.adminAttributes.append(
        createAdminPill('Nom', character.name || 'Sans nom'),
        createAdminPill('Race', character.race || '-'),
        createAdminPill('Classe', character.class || '-'),
        createAdminPill('Kaels', Number(character.kaels || 0).toLocaleString('fr-FR')),
        createAdminPill('Items', String(totalUnits)),
        createAdminPill('Pts competences', String(competencePoints))
    );
}

function populateAdminCharacterSelect() {
    if (!dom.adminCharacterSelect) return;
    const previous = dom.adminCharacterSelect.value;
    dom.adminCharacterSelect.innerHTML = '<option value="">Selectionner un personnage...</option>';

    state.allCharacters.forEach((character) => {
        const option = document.createElement('option');
        option.value = character.id;
        option.textContent = `${character.name || 'Sans nom'} (${Number(character.kaels || 0).toLocaleString('fr-FR')} K)`;
        dom.adminCharacterSelect.appendChild(option);
    });

    const nextValue = state.adminTargetCharacterId || previous;
    if (nextValue && state.allCharacters.some((entry) => entry.id === nextValue)) {
        dom.adminCharacterSelect.value = nextValue;
    }
}

async function loadAdminControlTarget(characterId) {
    if (!state.admin) return;
    const targetId = String(characterId || '').trim();
    state.adminTargetCharacterId = targetId;

    if (!targetId) {
        if (dom.adminSummary) dom.adminSummary.textContent = 'Selectionne un personnage pour voir sa vue detaillee.';
        renderAdminInventoryRows([]);
        renderAdminEquipments(null);
        renderAdminAttributes(null, []);
        return;
    }

    const character = state.allCharacters.find((entry) => entry.id === targetId);
    if (!character) {
        if (dom.adminSummary) dom.adminSummary.textContent = 'Personnage introuvable.';
        renderAdminInventoryRows([]);
        renderAdminEquipments(null);
        renderAdminAttributes(null, []);
        return;
    }

    if (dom.adminCharacterSelect && dom.adminCharacterSelect.value !== targetId) {
        dom.adminCharacterSelect.value = targetId;
    }
    if (dom.adminSummary) dom.adminSummary.textContent = `Chargement de ${character.name || 'ce personnage'}...`;

    try {
        const rows = await getInventoryRows(targetId);
        renderAdminInventoryRows(rows);
        renderAdminEquipments(character);
        renderAdminAttributes(character, rows);

        const totalUnits = rows.reduce((sum, row) => sum + Math.max(0, Number(row?.qty) || 0), 0);
        if (dom.adminSummary) {
            dom.adminSummary.textContent = `${character.name || 'Personnage'}: ${rows.length} type(s), ${totalUnits} unite(s), ${Number(character.kaels || 0).toLocaleString('fr-FR')} kaels.`;
        }
    } catch (error) {
        console.error('[Craft] admin control inventory load error:', error);
        if (dom.adminSummary) dom.adminSummary.textContent = 'Erreur de chargement de la vue inventaire.';
        renderAdminInventoryRows([]);
        renderAdminEquipments(character);
        renderAdminAttributes(character, []);
    }
}

async function loadAdminCharacters() {
    if (!state.admin) return;
    try {
        state.allCharacters = await getAllCharacters();
    } catch (error) {
        console.error('[Craft] admin characters load error:', error);
        state.allCharacters = [];
    }
    populateAdminCharacterSelect();

    const fallbackId = state.character?.id && state.allCharacters.some((entry) => entry.id === state.character.id)
        ? state.character.id
        : state.allCharacters[0]?.id || '';
    await loadAdminControlTarget(state.adminTargetCharacterId || fallbackId);
}

async function handleCraft(recipe) {
    if (!state.character?.id) {
        toastError('Aucun personnage actif pour craft.');
        return;
    }

    try {
        const result = await executeCraftRecipe(state.character.id, recipe.id, 1);
        if (!result?.ok) {
            toastError('Creation impossible, materiaux manquants.');
            return;
        }
        toastSuccess('Felicitations, objet cree !');
        await loadInventory();
        renderRecipes();
    } catch (error) {
        console.error('[Craft] craft error:', error);
        toastError('Erreur pendant la creation.');
    }
}

function renderRecipe(recipe) {
    const outputItem = getRecipeOutputItem(recipe);
    const canCraft = canCraftRecipe(recipe, state.inventoryIndex);
    const rarityClass = getRarityClass(recipe.rarity);

    const card = document.createElement('article');
    card.className = 'craft-recipe';
    card.classList.add(canCraft ? 'craft-recipe--craftable' : 'craft-recipe--missing');
    if (state.expanded.has(recipe.id)) card.classList.add('is-open');

    const summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'craft-recipe-summary';
    summary.addEventListener('click', () => {
        if (state.expanded.has(recipe.id)) state.expanded.delete(recipe.id);
        else state.expanded.add(recipe.id);
        renderRecipes();
    });

    const thumb = document.createElement('div');
    thumb.className = 'craft-recipe-thumb';
    const outputImage = getItemDisplayImage(outputItem);
    if (outputImage) {
        const img = document.createElement('img');
        img.src = outputImage;
        img.alt = outputItem.name || recipe.title || 'Item';
        thumb.appendChild(img);
    } else {
        thumb.textContent = 'ITEM';
    }

    const textWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.className = `craft-recipe-title ${rarityClass}`;
    title.textContent = recipe.title || outputItem?.name || 'Recette';

    const meta = document.createElement('div');
    meta.className = 'craft-recipe-meta';
    const categoryPill = document.createElement('span');
    categoryPill.className = 'craft-pill craft-pill--category';
    categoryPill.textContent = recipe.category || 'Autre';

    const rankPill = document.createElement('span');
    rankPill.className = 'craft-pill craft-pill--rank';
    rankPill.textContent = `Rang ${recipe.rank || '-'}`;

    const rarityPill = document.createElement('span');
    rarityPill.className = `craft-pill craft-pill--rarity ${rarityClass}`;
    rarityPill.textContent = recipe.rarity || 'Commun';

    meta.append(categoryPill, rankPill, rarityPill);

    textWrap.append(title, meta);

    const status = document.createElement('div');
    status.className = `craft-status ${canCraft ? 'ok' : 'ko'}`;
    status.textContent = canCraft ? 'V' : 'X';

    summary.append(thumb, textWrap, status);

    const details = document.createElement('section');
    details.className = 'craft-recipe-details';

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    let missingLines = 0;
    ingredients.forEach((line) => {
        const item = getIngredientItem(line);
        const have = getInventoryQty(state.inventoryIndex, line);
        const need = Math.max(1, Math.floor(Number(line.qty) || 1));
        if (have < need) missingLines += 1;

        const row = document.createElement('div');
        row.className = 'craft-ingredient-row';

        const label = document.createElement('div');
        label.textContent = `${item?.name || line.item_key || 'Item'} x${need}`;

        const count = document.createElement('div');
        count.className = `craft-ingredient-have ${have >= need ? 'ok' : 'ko'}`;
        count.textContent = `${have}/${need}`;

        row.append(label, count);
        details.appendChild(row);
    });

    const actions = document.createElement('div');
    actions.className = 'craft-detail-actions';

    if (state.admin) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'craft-secondary-btn';
        editBtn.textContent = 'Modifier';
        editBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openRecipeModal(recipe);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'craft-secondary-btn';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const ok = window.confirm(`Supprimer la recette "${recipe.title || 'Recette'}" ?`);
            if (!ok) return;
            try {
                await deleteCraftRecipe(recipe.id);
                toastSuccess('Recette supprimée.');
                await loadRecipes();
                renderRecipes();
            } catch (error) {
                console.error('[Craft] delete recipe error:', error);
                toastError('Suppression impossible.');
            }
        });

        actions.append(editBtn, deleteBtn);
    }

    const craftBtn = document.createElement('button');
    craftBtn.type = 'button';
    craftBtn.className = 'craft-primary-btn';
    craftBtn.textContent = 'Forger';
    craftBtn.disabled = !canCraft || !state.character?.id;
    craftBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        void handleCraft(recipe);
    });

    actions.appendChild(craftBtn);
    details.appendChild(actions);

    if (!canCraft && missingLines > 0) {
        const missingHint = document.createElement('div');
        missingHint.className = 'craft-missing-hint';
        missingHint.textContent = `${missingLines} ingredient(s) manquant(s)`;
        details.appendChild(missingHint);
    }

    card.append(summary, details);
    return card;
}

function renderRecipes() {
    if (!dom.recipeList) return;

    const filtered = getFilteredRecipes();
    renderPagination(filtered);

    const start = (state.page - 1) * state.pageSize;
    const paged = filtered.slice(start, start + state.pageSize);

    dom.recipeList.innerHTML = '';

    if (!paged.length) {
        const empty = document.createElement('div');
        empty.className = 'craft-empty';
        empty.textContent = 'Aucune recette ne correspond aux filtres.';
        dom.recipeList.appendChild(empty);
        renderAdminStats();
        return;
    }

    paged.forEach((recipe) => dom.recipeList.appendChild(renderRecipe(recipe)));
    renderAdminStats();
}

function resetPageAndRender() {
    state.page = 1;
    renderRecipes();
}

function setCategory(category) {
    state.category = category;
    dom.categoryList?.querySelectorAll('.craft-category-btn').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.category === category);
    });
    resetPageAndRender();
}

function updateOutputLabel() {
    if (!dom.outputItemLabel) return;
    const outputId = String(dom.outputItemSelect?.value || '').trim();
    const output = state.itemById.get(outputId);
    dom.outputItemLabel.value = output ? output.name : '';
}

function openItemPicker(target, ingredientIndex = -1) {
    state.picker.target = target;
    state.picker.ingredientIndex = ingredientIndex;
    state.picker.query = '';
    if (dom.pickerSearch) dom.pickerSearch.value = '';
    renderPickerList();

    if (window.modalManager?.open) {
        window.modalManager.open(dom.pickerModal, {
            closeOnBackdropClick: true,
            closeOnEsc: true,
            openClass: 'open',
            focusElement: dom.pickerSearch
        });
    } else if (dom.pickerModal) {
        dom.pickerModal.hidden = false;
        dom.pickerModal.classList.add('open');
        dom.pickerModal.setAttribute('aria-hidden', 'false');
        dom.pickerSearch?.focus();
    }
}

function closeItemPicker() {
    if (!dom.pickerModal) return;
    if (window.modalManager?.isOpen?.(dom.pickerModal)) {
        window.modalManager.close(dom.pickerModal);
    } else {
        dom.pickerModal.hidden = true;
        dom.pickerModal.classList.remove('open');
        dom.pickerModal.setAttribute('aria-hidden', 'true');
    }
}

function applyPickedItem(itemId) {
    const item = state.itemById.get(String(itemId || '').trim());
    if (!item) return;

    if (state.picker.target === 'output') {
        if (dom.outputItemSelect) dom.outputItemSelect.value = item.id;
        updateOutputLabel();
    } else if (state.picker.target === 'ingredient') {
        const idx = state.picker.ingredientIndex;
        if (idx >= 0 && idx < state.ingredientDraftRows.length) {
            state.ingredientDraftRows[idx].itemId = item.id;
            renderIngredientDraftRows();
        }
    }

    closeItemPicker();
}

function renderPickerList() {
    if (!dom.pickerList) return;

    const query = normalizeText(state.picker.query);
    const list = state.items.filter((item) => {
        if (!query) return true;
        return normalizeText(item.name).includes(query);
    });

    dom.pickerList.innerHTML = '';

    if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'craft-empty';
        empty.textContent = 'Aucun item trouve.';
        dom.pickerList.appendChild(empty);
        return;
    }

    list.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'craft-picker-item';
        button.addEventListener('click', () => applyPickedItem(item.id));

        const thumb = document.createElement('div');
        thumb.className = 'craft-recipe-thumb';
        const imageSrc = getItemDisplayImage(item);
        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = item.name || 'Item';
            thumb.appendChild(img);
        } else {
            thumb.textContent = 'ITEM';
        }

        const text = document.createElement('div');
        text.className = 'craft-picker-text';
        text.textContent = item.name || 'Item';

        button.append(thumb, text);
        dom.pickerList.appendChild(button);
    });
}

function renderIngredientDraftRows() {
    if (!dom.ingredientRows) return;
    dom.ingredientRows.innerHTML = '';

    state.ingredientDraftRows.forEach((line, index) => {
        const row = document.createElement('div');
        row.className = 'craft-ingredient-edit';

        const labelInput = document.createElement('input');
        labelInput.className = 'tw-input';
        labelInput.type = 'text';
        labelInput.readOnly = true;
        labelInput.setAttribute('aria-label', 'Selectionner un item necessaire');
        const selected = state.itemById.get(String(line.itemId || '').trim());
        labelInput.value = selected?.name || '';
        labelInput.placeholder = 'Selectionner un item';
        labelInput.addEventListener('click', () => openItemPicker('ingredient', index));
        labelInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openItemPicker('ingredient', index);
            }
        });

        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'craft-secondary-btn';
        pickBtn.textContent = 'Choisir';
        pickBtn.addEventListener('click', () => openItemPicker('ingredient', index));

        const qtyInput = document.createElement('input');
        qtyInput.className = 'tw-input';
        qtyInput.type = 'number';
        qtyInput.min = '1';
        qtyInput.value = String(line.qty || 1);
        qtyInput.addEventListener('input', () => {
            const safeQty = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
            state.ingredientDraftRows[index].qty = safeQty;
            qtyInput.value = String(safeQty);
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'craft-secondary-btn';
        removeBtn.textContent = 'Suppr.';
        removeBtn.disabled = state.ingredientDraftRows.length <= 1;
        removeBtn.addEventListener('click', () => {
            state.ingredientDraftRows.splice(index, 1);
            renderIngredientDraftRows();
        });

        row.append(labelInput, pickBtn, qtyInput, removeBtn);
        dom.ingredientRows.appendChild(row);
    });
}

function resetRecipeForm() {
    state.editingRecipeId = null;
    if (dom.modalSave) dom.modalSave.textContent = 'Enregistrer';
    if (dom.modalDelete) dom.modalDelete.hidden = true;
    const titleEl = document.getElementById('craftModalTitle');
    if (titleEl) titleEl.textContent = 'Creer une recette';

    if (dom.recipeCategory) dom.recipeCategory.value = 'Forge';
    if (dom.recipeRarity) dom.recipeRarity.value = 'Commun';
    if (dom.recipeRank) dom.recipeRank.value = 'F';
    if (dom.outputItemSelect) dom.outputItemSelect.value = '';
    if (dom.outputQty) dom.outputQty.value = '1';
    updateOutputLabel();

    state.ingredientDraftRows = [{ itemId: '', qty: 1 }];
    renderIngredientDraftRows();
}

function prefillRecipeForm(recipe) {
    if (!recipe) return;
    state.editingRecipeId = recipe.id;

    const titleEl = document.getElementById('craftModalTitle');
    if (titleEl) titleEl.textContent = 'Modifier une recette';
    if (dom.modalSave) dom.modalSave.textContent = 'Mettre a jour';
    if (dom.modalDelete) dom.modalDelete.hidden = false;
    if (dom.recipeCategory) dom.recipeCategory.value = recipe.category || 'Autre';
    if (dom.recipeRarity) dom.recipeRarity.value = recipe.rarity || 'Commun';
    if (dom.recipeRank) dom.recipeRank.value = recipe.rank || 'F';
    if (dom.outputQty) dom.outputQty.value = String(Math.max(1, Number(recipe.output_qty) || 1));

    const output = getRecipeOutputItem(recipe);
    if (dom.outputItemSelect) dom.outputItemSelect.value = String(output?.id || '');
    updateOutputLabel();

    const lines = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    state.ingredientDraftRows = lines.length
        ? lines.map((line) => {
            const item = getIngredientItem(line);
            return {
                itemId: String(item?.id || ''),
                qty: Math.max(1, Math.floor(Number(line.qty) || 1))
            };
        })
        : [{ itemId: '', qty: 1 }];
    renderIngredientDraftRows();
}

function openRecipeModal(recipe = null) {
    if (!dom.modal) return;
    resetRecipeForm();
    if (recipe) prefillRecipeForm(recipe);

    if (window.modalManager?.open) {
        window.modalManager.open(dom.modal, {
            closeOnBackdropClick: true,
            closeOnEsc: true,
            openClass: 'open',
            focusElement: dom.outputItemLabel || dom.recipeCategory
        });
    } else {
        dom.modal.hidden = false;
        dom.modal.classList.add('open');
        dom.modal.setAttribute('aria-hidden', 'false');
        (dom.outputItemLabel || dom.recipeCategory)?.focus?.();
    }
}

function closeRecipeModal() {
    if (!dom.modal) return;

    if (window.modalManager?.isOpen?.(dom.modal)) {
        window.modalManager.close(dom.modal);
    } else {
        dom.modal.hidden = true;
        dom.modal.classList.remove('open');
        dom.modal.setAttribute('aria-hidden', 'true');
    }
}

async function saveRecipeFromModal() {
    if (!state.admin) return;

    const outputId = String(dom.outputItemSelect?.value || '').trim();
    const outputItem = state.itemById.get(outputId);
    const outputQty = Math.max(1, Math.floor(Number(dom.outputQty?.value) || 1));

    if (!outputItem) {
        toastError('Selectionne un item obtenu.');
        return;
    }

    const ingredients = state.ingredientDraftRows
        .map((line) => {
            const item = state.itemById.get(String(line.itemId || '').trim());
            return {
                item_id: item?.id || null,
                item_key: item?.name || '',
                qty: Math.max(1, Math.floor(Number(line.qty) || 1))
            };
        })
        .filter((line) => line.item_key);

    if (!ingredients.length) {
        toastError('Ajoute au moins un item necessaire.');
        return;
    }

    try {
        const computedTitle = String(outputItem.name || outputItem.item_key || 'Recette').trim();
        const payload = {
            title: computedTitle,
            category: dom.recipeCategory?.value || 'Autre',
            rarity: dom.recipeRarity?.value || 'Commun',
            rank: dom.recipeRank?.value || 'F',
            output_item_id: outputItem.id,
            output_item_key: outputItem.name,
            output_qty: outputQty,
            ingredients
        };

        if (state.editingRecipeId) {
            await updateCraftRecipe(state.editingRecipeId, payload);
        } else {
            await createCraftRecipe(payload);
        }

        closeRecipeModal();
        toastSuccess(state.editingRecipeId ? 'Recette mise a jour.' : 'La recette a bien ete enregistree.');
        await loadRecipes();
        renderRecipes();
    } catch (error) {
        console.error('[Craft] create recipe error:', error);
        if (error?.code === '42501') {
            toastError('Creation refusee par la base (RLS). Applique la migration craft RLS transition.');
            return;
        }
        toastError('Impossible d\'enregistrer la recette.');
    }
}

async function loadItems() {
    const items = await getAllItems();
    state.items = (Array.isArray(items) ? items : []).map((item) => {
        const normalized = { ...item };
        normalized.images = safeJson(item?.images);
        normalized.resolvedImage = resolveItemImage(normalized);
        return normalized;
    });
    state.itemById = new Map();
    state.itemByKey = new Map();

    state.items.forEach((item) => {
        const id = String(item?.id || '').trim();
        const key = normalizeText(item?.name || '');
        if (id) state.itemById.set(id, item);
        if (key && !state.itemByKey.has(key)) state.itemByKey.set(key, item);
    });
    updateOutputLabel();
}

async function loadInventory() {
    if (!state.character?.id) {
        state.inventoryRows = [];
        state.inventoryIndex = buildInventoryIndex([]);
        return;
    }

    const rows = await getInventoryRows(state.character.id);
    state.inventoryRows = Array.isArray(rows) ? rows : [];
    state.inventoryIndex = buildInventoryIndex(state.inventoryRows);
}

async function loadRecipes() {
    try {
        const recipes = await getCraftRecipes();
        state.recipes = Array.isArray(recipes) ? recipes : [];
    } catch (error) {
        console.error('[Craft] recipe load error:', error);
        state.recipes = [];
        toastError('Les recettes sont indisponibles (verifie la migration SQL).');
    }
}

function bindEvents() {
    dom.searchInput?.addEventListener('input', () => {
        state.search = dom.searchInput.value || '';
        resetPageAndRender();
    });

    dom.rankFilter?.addEventListener('change', () => {
        state.rank = dom.rankFilter.value || 'Tous';
        resetPageAndRender();
    });

    dom.rankMode?.addEventListener('change', () => {
        state.rankMode = dom.rankMode.value || 'exact';
        resetPageAndRender();
    });

    dom.possibleOnly?.addEventListener('change', () => {
        state.onlyPossible = Boolean(dom.possibleOnly.checked);
        resetPageAndRender();
    });

    dom.categoryList?.addEventListener('click', (event) => {
        const button = event.target.closest('.craft-category-btn');
        if (!button) return;
        setCategory(button.dataset.category || 'Tous');
    });

    dom.addBtn?.addEventListener('click', () => openRecipeModal());
    dom.modalClose?.addEventListener('click', closeRecipeModal);
    dom.modalCancel?.addEventListener('click', closeRecipeModal);
    dom.modalBackdrop?.addEventListener('click', closeRecipeModal);
    dom.modalSave?.addEventListener('click', () => void saveRecipeFromModal());
    dom.modalDelete?.addEventListener('click', async () => {
        if (!state.editingRecipeId) return;
        const recipe = state.recipes.find((entry) => entry.id === state.editingRecipeId);
        const ok = window.confirm(`Supprimer la recette "${recipe?.title || 'Recette'}" ?`);
        if (!ok) return;
        try {
            await deleteCraftRecipe(state.editingRecipeId);
            closeRecipeModal();
            toastSuccess('Recette supprimée.');
            await loadRecipes();
            renderRecipes();
        } catch (error) {
            console.error('[Craft] modal delete recipe error:', error);
            toastError('Suppression impossible.');
        }
    });

    dom.pickOutputBtn?.addEventListener('click', () => openItemPicker('output'));
    dom.outputItemSelect?.addEventListener('change', updateOutputLabel);
    dom.outputItemLabel?.addEventListener('click', () => openItemPicker('output'));
    dom.outputItemLabel?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openItemPicker('output');
        }
    });

    dom.addIngredientBtn?.addEventListener('click', () => {
        state.ingredientDraftRows.push({ itemId: '', qty: 1 });
        renderIngredientDraftRows();
    });

    dom.pickerClose?.addEventListener('click', closeItemPicker);
    dom.pickerBackdrop?.addEventListener('click', closeItemPicker);
    dom.pickerSearch?.addEventListener('input', () => {
        state.picker.query = dom.pickerSearch.value || '';
        renderPickerList();
    });

    dom.adminCharacterSelect?.addEventListener('change', () => {
        void loadAdminControlTarget(dom.adminCharacterSelect.value);
    });
    dom.adminRefreshBtn?.addEventListener('click', () => {
        if (!state.adminTargetCharacterId) return;
        void loadAdminControlTarget(state.adminTargetCharacterId);
    });

    window.addEventListener('astoria:character-changed', () => {
        void refreshCharacterContext();
    });
}

async function refreshCharacterContext() {
    state.character = getActiveCharacter() || null;
    await loadInventory();
    renderRecipes();
    if (state.admin && !state.adminTargetCharacterId && state.character?.id) {
        await loadAdminControlTarget(state.character.id);
    }
}

async function initAuthContext() {
    try {
        await refreshSessionUser?.();
    } catch {}

    state.user = getCurrentUser?.() || null;
    state.admin = Boolean(isAdmin?.());
    document.body.dataset.admin = state.admin ? 'true' : 'false';

    if (dom.addBtn) dom.addBtn.hidden = !state.admin;
    if (dom.adminStats) dom.adminStats.hidden = true;
    if (dom.adminControl) dom.adminControl.hidden = true;
}

async function init() {
    bindEvents();

    await initCharacterSummary({ includeQueryParam: false, enableDropdown: true, showKaels: true });
    await initAuthContext();

    state.character = getActiveCharacter() || null;

    await Promise.all([
        loadItems(),
        loadRecipes(),
        loadInventory()
    ]);

    renderRecipes();
}

void init().catch((error) => {
    console.error('[Craft] init failed:', error);
    toastError('Erreur de chargement de la page craft.');
});
