import {
    getSupabaseClient,
    getCurrentUser,
    isAdmin,
    refreshSessionUser
} from './auth.js';

const ITEMS_BUCKET = 'items';
const IMAGE_SIZE = 256;

const dom = {
    addBtn: document.getElementById('adminAddItemBtn'),
    modalActions: document.getElementById('modalAdminActions'),
    editBtn: document.getElementById('adminEditBtn'),
    backdrop: document.getElementById('adminItemBackdrop'),
    modalTitle: document.getElementById('adminItemTitle'),
    closeBtn: document.getElementById('adminItemClose'),
    form: document.getElementById('adminItemForm'),
    error: document.getElementById('adminItemError'),
    nameInput: document.getElementById('adminItemName'),
    categoryInput: document.getElementById('adminItemCategory'),
    rarityInput: document.getElementById('adminItemRarity'),
    rankInput: document.getElementById('adminItemRank'),
    buyInput: document.getElementById('adminItemBuy'),
    sellInput: document.getElementById('adminItemSell'),
    descriptionInput: document.getElementById('adminItemDescription'),
    effectInput: document.getElementById('adminItemEffect'),
    modifiersList: document.getElementById('adminItemModifiersList'),
    modifierStatInput: document.getElementById('modifierStatInput'),
    modifierValueInput: document.getElementById('modifierValueInput'),
    modifierTypeInput: document.getElementById('modifierTypeInput'),
    addModifierBtn: document.getElementById('addModifierBtn'),
    modifierQuickPicks: document.getElementById('modifierQuickPicks'),
    modifierStatSuggestions: document.getElementById('modifierStatSuggestions'),
    openModifierSkillsPickerBtn: document.getElementById('openModifierSkillsPicker'),
    skillsPickerBackdrop: document.getElementById('codexSkillsPickerBackdrop'),
    skillsPickerClose: document.getElementById('codexSkillsPickerClose'),
    skillsPickerCancel: document.getElementById('codexSkillsPickerCancel'),
    skillsPickerSearch: document.getElementById('codexSkillsPickerSearch'),
    skillsPickerCategories: document.getElementById('codexSkillsPickerCategories'),
    skillsPickerList: document.getElementById('codexSkillsPickerList'),
    skillsPickerCustomName: document.getElementById('codexSkillsPickerCustomName'),
    skillsPickerCustomType: document.getElementById('codexSkillsPickerCustomType'),
    skillsPickerCustomApply: document.getElementById('codexSkillsPickerCustomApply'),
    imageBtn: document.getElementById('adminItemImageBtn'),
    imageInput: document.getElementById('adminItemImageInput'),
    imagePreview: document.getElementById('adminItemImagePreview'),
    imageTag: document.getElementById('adminItemImage'),
    imagePlaceholder: document.querySelector('#adminItemImagePreview .codex-admin-image-placeholder'),
    imageMeta: document.getElementById('adminItemImageMeta'),
    note: document.getElementById('adminItemNote'),
    cancelBtn: document.getElementById('adminItemCancel'),
    saveBtn: document.getElementById('adminItemSave'),
    deleteBtn: document.getElementById('adminItemDelete'),
    cropperBackdrop: document.getElementById('itemCropperBackdrop'),
    cropperImage: document.getElementById('itemCropperImage'),
    cropperZoom: document.getElementById('itemCropperZoom'),
    cropperZoomIn: document.getElementById('itemCropperZoomIn'),
    cropperZoomOut: document.getElementById('itemCropperZoomOut'),
    cropperRotateLeft: document.getElementById('itemCropperRotateLeft'),
    cropperRotateRight: document.getElementById('itemCropperRotateRight'),
    cropperRotate180: document.getElementById('itemCropperRotate180'),
    cropperFlipX: document.getElementById('itemCropperFlipX'),
    cropperFlipY: document.getElementById('itemCropperFlipY'),
    cropperReset: document.getElementById('itemCropperReset'),
    cropperClose: document.getElementById('itemCropperClose'),
    cropperCancel: document.getElementById('itemCropperCancel'),
    cropperConfirm: document.getElementById('itemCropperConfirm'),
    deleteBackdrop: document.getElementById('deleteItemBackdrop'),
    deleteItemName: document.getElementById('deleteItemName'),
    deleteCancel: document.getElementById('deleteItemCancel'),
    deleteConfirm: document.getElementById('deleteItemConfirm')
};

let supabase = null;
let adminMode = false;
let editingItem = null;
let imageBlob = null;
let imagePreviewUrl = '';
let cropper = null;
let syncZoom = false;
let imageMeta = null;
const knownCategories = new Set();
const ITEM_TOMBSTONES_KEY = "astoriaItemTombstones";
let dbItemsByKey = new Map();
let currentModifiers = [];
let modifierSkillsCatalog = [];
let modifierSkillCategories = [];
const modifierSkillsState = { query: '', category: 'all' };
const DEFAULT_MODIFIER_STATS = Object.freeze([
    'Force', 'Agilite', 'Defense', 'Attaque', 'Magie', 'Vitesse', 'Critique',
    'Endurance', 'Resistance', 'Perception', 'Intelligence', 'Puissance',
    'Precision', 'Maitrise d\'arme', 'Leadership', 'Raffinement', 'Intimidation',
    'Durance', 'Charme', 'Prestance'
]);

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSkillsCategories() {
    return Array.isArray(window.skillsCategories) ? window.skillsCategories : [];
}

function isSkillsPickerOpen() {
    return Boolean(dom.skillsPickerBackdrop?.classList.contains('open'));
}

// Modifier management functions
function addModifier(stat, value, type = 'flat') {
    if (!stat || !stat.trim() || value === 0 || isNaN(value)) return;
    const normalizedStat = String(stat).trim();

    const modifier = {
        stat: normalizedStat,
        value: parseFloat(value),
        type: type
    };

    currentModifiers.push(modifier);
    renderModifiers();
    clearModifierInputs();
}

function removeModifier(index) {
    currentModifiers.splice(index, 1);
    renderModifiers();
}

function renderModifiers() {
    if (!dom.modifiersList) return;

    if (currentModifiers.length === 0) {
        dom.modifiersList.innerHTML = '';
        return;
    }

    dom.modifiersList.innerHTML = currentModifiers.map((mod, index) => {
        const sign = mod.value > 0 ? '+' : '';
        const suffix = mod.type === 'percent' ? '%' : '';
        const label = `${sign}${mod.value}${suffix} ${mod.stat}`;
        const className = mod.value >= 0 ? 'codex-modifier-pill' : 'codex-modifier-pill negative';

        return `
            <div class="${className}">
                <span>${label}</span>
                <button type="button" class="codex-modifier-pill-remove" data-index="${index}">&times;</button>
            </div>
        `;
    }).join('');

    // Add click handlers for remove buttons
    dom.modifiersList.querySelectorAll('.codex-modifier-pill-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index, 10);
            removeModifier(index);
        });
    });
}

function clearModifierInputs() {
    if (dom.modifierStatInput) dom.modifierStatInput.value = '';
    if (dom.modifierValueInput) dom.modifierValueInput.value = '';
    if (dom.modifierTypeInput) dom.modifierTypeInput.value = 'flat';
}

function buildModifierStatCatalog(items = []) {
    const set = new Set(DEFAULT_MODIFIER_STATS);
    getSkillsCategories().forEach((category) => {
        (Array.isArray(category?.skills) ? category.skills : []).forEach((skill) => {
            const skillName = String(skill?.name || '').trim();
            if (skillName) set.add(skillName);
        });
    });
    (items || []).forEach((item) => {
        const mods = Array.isArray(item?.modifiers) ? item.modifiers : [];
        mods.forEach((mod) => {
            const stat = String(mod?.stat || '').trim();
            if (stat) set.add(stat);
        });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
}

function buildModifierSkillsCatalog(items = []) {
    const categories = [];
    const entries = [];
    const seenStats = new Set();
    const categoryById = new Map();

    getSkillsCategories().forEach((category) => {
        const categoryId = String(category?.id || '').trim() || `cat-${categories.length}`;
        const categoryLabel = String(category?.label || categoryId).trim();
        const iconText = String(category?.icon || '').trim();
        const icon = (iconText && iconText.length <= 3) ? iconText : (categoryLabel.charAt(0).toUpperCase() || '*');
        const categoryEntry = { id: categoryId, label: categoryLabel, icon };
        categories.push(categoryEntry);
        categoryById.set(categoryId, categoryEntry);

        (Array.isArray(category?.skills) ? category.skills : []).forEach((skill) => {
            const stat = String(skill?.name || '').trim();
            if (!stat) return;
            const normalized = normalizeSearchText(stat);
            if (seenStats.has(normalized)) return;
            seenStats.add(normalized);
            entries.push({
                stat,
                categoryId,
                categoryLabel,
                icon
            });
        });
    });

    buildModifierStatCatalog(items).forEach((stat) => {
        const normalized = normalizeSearchText(stat);
        if (seenStats.has(normalized)) return;
        seenStats.add(normalized);
        entries.push({
            stat,
            categoryId: 'other',
            categoryLabel: 'Autres',
            icon: '*'
        });
    });

    if (!categoryById.has('other') && entries.some((entry) => entry.categoryId === 'other')) {
        categories.push({ id: 'other', label: 'Autres', icon: '*' });
    }

    modifierSkillCategories = categories.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    modifierSkillsCatalog = entries.sort((a, b) => {
        const byCategory = a.categoryLabel.localeCompare(b.categoryLabel, 'fr');
        if (byCategory !== 0) return byCategory;
        return a.stat.localeCompare(b.stat, 'fr');
    });
}

function applySkillToModifierInput(stat, type = 'flat') {
    if (dom.modifierStatInput) {
        dom.modifierStatInput.value = String(stat || '').trim();
    }
    if (dom.modifierTypeInput) {
        dom.modifierTypeInput.value = type === 'percent' ? 'percent' : 'flat';
    }
    dom.modifierValueInput?.focus();
}

function getFilteredModifierSkills() {
    const query = normalizeSearchText(modifierSkillsState.query);
    return modifierSkillsCatalog.filter((entry) => {
        if (modifierSkillsState.category !== 'all' && entry.categoryId !== modifierSkillsState.category) {
            return false;
        }
        if (!query) return true;
        return normalizeSearchText(`${entry.stat} ${entry.categoryLabel}`).includes(query);
    });
}

function renderModifierSkillsCategories() {
    if (!dom.skillsPickerCategories) return;

    const categories = [{ id: 'all', label: 'Toutes', icon: 'T' }, ...modifierSkillCategories];
    dom.skillsPickerCategories.innerHTML = categories
        .map((category) => `
            <button
                type="button"
                class="codex-skills-picker-chip${modifierSkillsState.category === category.id ? ' active' : ''}"
                data-category="${escapeHtml(category.id)}">
                <span class="codex-skills-picker-chip-icon">${escapeHtml(category.icon)}</span>
                <span>${escapeHtml(category.label)}</span>
            </button>
        `)
        .join('');

    dom.skillsPickerCategories.querySelectorAll('.codex-skills-picker-chip').forEach((button) => {
        button.addEventListener('click', () => {
            modifierSkillsState.category = button.dataset.category || 'all';
            renderModifierSkillsCategories();
            renderModifierSkillsList();
        });
    });
}

function renderModifierSkillsList() {
    if (!dom.skillsPickerList) return;
    const rows = getFilteredModifierSkills();

    if (!rows.length) {
        dom.skillsPickerList.innerHTML = '<div class="codex-skills-picker-empty">Aucune competence trouvee.</div>';
        return;
    }

    dom.skillsPickerList.innerHTML = rows
        .map((entry) => `
            <div class="codex-skills-picker-item" data-stat="${escapeHtml(entry.stat)}">
                <div class="codex-skills-picker-item-main">
                    <div class="codex-skills-picker-item-icon">${escapeHtml(entry.icon)}</div>
                    <div class="codex-skills-picker-item-info">
                        <div class="codex-skills-picker-item-name">${escapeHtml(entry.stat)}</div>
                        <div class="codex-skills-picker-item-category">${escapeHtml(entry.categoryLabel)}</div>
                    </div>
                </div>
                <div class="codex-skills-picker-item-actions">
                    <button type="button" class="codex-skills-picker-item-btn" data-action="pick-flat" data-stat="${escapeHtml(entry.stat)}">Points</button>
                    <button type="button" class="codex-skills-picker-item-btn alt" data-action="pick-percent" data-stat="${escapeHtml(entry.stat)}">%</button>
                </div>
            </div>
        `)
        .join('');

    dom.skillsPickerList.querySelectorAll('.codex-skills-picker-item').forEach((row) => {
        row.addEventListener('click', (event) => {
            const actionButton = event.target.closest('.codex-skills-picker-item-btn');
            const stat = actionButton?.dataset.stat || row.dataset.stat || '';
            if (!stat) return;

            if (actionButton) {
                const type = actionButton.dataset.action === 'pick-percent' ? 'percent' : 'flat';
                applySkillToModifierInput(stat, type);
                closeModifierSkillsPicker();
                return;
            }

            applySkillToModifierInput(stat, 'flat');
            closeModifierSkillsPicker();
        });
    });
}

function openModifierSkillsPicker() {
    buildModifierSkillsCatalog(Array.from(dbItemsByKey.values()));
    modifierSkillsState.query = '';
    modifierSkillsState.category = 'all';
    if (dom.skillsPickerSearch) dom.skillsPickerSearch.value = '';
    renderModifierSkillsCategories();
    renderModifierSkillsList();
    openBackdrop(dom.skillsPickerBackdrop);
    dom.skillsPickerSearch?.focus();
}

function closeModifierSkillsPicker() {
    closeBackdrop(dom.skillsPickerBackdrop);
}

function renderModifierPickers(items = []) {
    const stats = buildModifierStatCatalog(items);
    buildModifierSkillsCatalog(items);

    if (dom.modifierStatSuggestions) {
        dom.modifierStatSuggestions.innerHTML = stats
            .map((stat) => `<option value="${escapeHtml(stat)}"></option>`)
            .join('');
    }

    if (dom.modifierQuickPicks) {
        const quick = stats.slice(0, 12);
        dom.modifierQuickPicks.innerHTML = quick
            .map((stat) => `<button type="button" class="codex-modifier-quick-btn" data-stat="${escapeHtml(stat)}">${escapeHtml(stat)}</button>`)
            .join('');

        dom.modifierQuickPicks.querySelectorAll('.codex-modifier-quick-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!dom.modifierStatInput) return;
                applySkillToModifierInput(btn.dataset.stat || '', dom.modifierTypeInput?.value || 'flat');
            });
        });
    }
}

function loadModifiersFromItem(item) {
    currentModifiers = [];
    if (item && item.modifiers && Array.isArray(item.modifiers)) {
        currentModifiers = item.modifiers.map(mod => ({
            stat: mod.stat || '',
            value: parseFloat(mod.value) || 0,
            type: mod.type || 'flat'
        }));
    }
    renderModifiers();
}

function normalizeItemName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "")
        .toLowerCase();
}

function getDbMatch(item) {
    if (!item) return null;
    const key = normalizeItemName(item.name || item.nom || '');
    if (!key) return null;
    return dbItemsByKey.get(key) || null;
}


async function getItemTombstones() {
    try {
        // Using StorageManager instead of localStorage
        const data = await storageManager.get(ITEM_TOMBSTONES_KEY);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn('[CodexAdmin] getItemTombstones error:', error);
        return [];
    }
}

async function addItemTombstone(name) {
    const key = normalizeItemName(name);
    if (!key) return;
    const tombstones = new Set(await getItemTombstones());
    tombstones.add(key);
    await storageManager.set(ITEM_TOMBSTONES_KEY, Array.from(tombstones));
}

function setError(message) {
    if (!dom.error) return;
    if (!message) {
        dom.error.textContent = '';
        dom.error.classList.remove('visible');
        return;
    }
    dom.error.textContent = message;
    dom.error.classList.add('visible');
}

function formatBytes(bytes) {
    const size = Number(bytes) || 0;
    if (size <= 0) return '0 Ko';
    if (size < 1024) return `${size} o`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function setImageMetaText(text) {
    if (!dom.imageMeta) return;
    dom.imageMeta.textContent = text || 'Aucun fichier';
}

function updateImageControls(hasImage) {
    if (dom.imageBtn) {
        dom.imageBtn.textContent = hasImage ? "Changer l'image" : "Importer l'image";
    }
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

function mapDbItem(row) {
    const images = safeJson(row.images);
    const primary = images.primary || images.url || '';
    const priceText = row.price_kaels ? `${row.price_kaels} kaels` : '';

    // Parse modifiers if it's a string (JSONB from DB)
    let modifiers = row.modifiers;
    if (typeof modifiers === 'string') {
        try {
            modifiers = JSON.parse(modifiers);
        } catch (e) {
            modifiers = null;
        }
    }

    return {
        id: row.id,
        _dbId: row.id,
        source: 'db',
        name: row.name || '',
        description: row.description || '',
        effect: row.effect || '',
        category: row.category || '',
        equipment_slot: row.equipment_slot || '',
        buyPrice: priceText,
        sellPrice: priceText,
        image: primary,
        images: images,
        modifiers: modifiers || null,
        rarity: normalizeRarity(row.rarity) || null,
        rank: normalizeRank(row.rank) || null
    };
}

function normalizeCategory(value) {
    return String(value || '').trim();
}

function collectCategories(items) {
    // Toujours inclure les catégories standards
    knownCategories.add('agricole');
    knownCategories.add('consommable');
    knownCategories.add('equipement');
    knownCategories.add('materiau');
    knownCategories.add('quete');

    // Ajouter les catégories des items existants
    (items || []).forEach((item) => {
        const category = normalizeCategory(item?.category);
        if (category) knownCategories.add(category);
    });
}

function renderCategoryOptions(selectedValue) {
    if (!dom.categoryInput) return;
    const currentValue = normalizeCategory(selectedValue);
    const options = Array.from(knownCategories).sort((a, b) => a.localeCompare(b, 'fr'));

    dom.categoryInput.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisir une categorie';
    dom.categoryInput.appendChild(placeholder);

    options.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        dom.categoryInput.appendChild(option);
    });

    if (currentValue) {
        if (!options.includes(currentValue)) {
            const option = document.createElement('option');
            option.value = currentValue;
            option.textContent = currentValue;
            dom.categoryInput.appendChild(option);
        }
        dom.categoryInput.value = currentValue;
    }
}

function parsePrice(raw) {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

const RARITY_CANONICAL_MAP = Object.freeze({
    commun: 'commun',
    common: 'commun',
    rare: 'rare',
    epique: 'epique',
    epic: 'epique',
    mythique: 'mythique',
    mythic: 'mythique',
    legendaire: 'legendaire',
    legendary: 'legendaire'
});

const RARITY_ALT_MAP = Object.freeze({
    commun: 'common',
    rare: 'rare',
    epique: 'epic',
    mythique: 'mythic',
    legendaire: 'legendary'
});

function normalizeRarity(value) {
    const key = String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    return RARITY_CANONICAL_MAP[key] || '';
}

function toAlternateRarity(value) {
    const canonical = normalizeRarity(value);
    return canonical ? (RARITY_ALT_MAP[canonical] || canonical) : '';
}

function normalizeRank(value) {
    const rank = String(value || '').trim().toUpperCase();
    const allowed = new Set(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'SS', 'SSS']);
    return allowed.has(rank) ? rank : '';
}

async function saveItemRow(payload, isUpdate, targetId) {
    if (isUpdate) {
        const { data, error } = await supabase
            .from('items')
            .update(payload)
            .eq('id', targetId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
    const { data, error } = await supabase
        .from('items')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
}

function openBackdrop(backdrop) {
    if (!backdrop) return;
    if (backdrop.parentElement !== document.body) {
        document.body.appendChild(backdrop);
    }
    backdrop.removeAttribute('aria-hidden');
    backdrop.classList.add('open');
}

function closeBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
}

function resetImagePreview() {
    // IMPORTANT: Clear image src FIRST, then revoke URL
    if (dom.imageTag) {
        dom.imageTag.src = '';
        dom.imageTag.hidden = true;
    }
    if (dom.imagePlaceholder) {
        dom.imagePlaceholder.hidden = false;
    }
    setImageMetaText('Aucun fichier');
    updateImageControls(false);

    // Now safe to revoke blob URL
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
    }
    imagePreviewUrl = '';
    imageBlob = null;
}

function setImagePreview(url) {
    if (!dom.imageTag || !dom.imagePlaceholder) return;

    // Store old URL to revoke AFTER new image loads
    const oldUrl = imagePreviewUrl;

    // Set new URL immediately
    imagePreviewUrl = url;
    dom.imageTag.hidden = !url;
    dom.imagePlaceholder.hidden = !!url;
    updateImageControls(!!url);

    if (!url) {
        dom.imageTag.src = '';
        // Revoke old blob if clearing preview
        if (oldUrl && oldUrl.startsWith('blob:')) {
            URL.revokeObjectURL(oldUrl);
        }
        return;
    }

    // Wait for image to load before revoking old blob
    dom.imageTag.onload = () => {
        // Only revoke old blob after new image successfully loaded
        if (oldUrl && oldUrl !== url && oldUrl.startsWith('blob:')) {
            URL.revokeObjectURL(oldUrl);
        }
    };

    dom.imageTag.onerror = () => {
        console.error('Failed to load image preview:', url);
        // Don't revoke if load failed - might need to retry
    };

    dom.imageTag.src = url;
}

async function openAdminModal(item) {
    const dbMatch = getDbMatch(item);
    let editingItemData = dbMatch || item || null;

    // If item exists in database, fetch fresh data to get modifiers
    if (editingItemData && editingItemData._dbId && supabase) {
        try {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', editingItemData._dbId)
                .single();

            if (!error && data) {
                editingItemData = data;
                editingItemData._dbId = data.id; // Preserve _dbId
            }
        } catch (err) {
            console.warn('[CodexAdmin] Failed to fetch item:', err);
            // Continue with cached data if fetch fails
        }
    }

    editingItem = editingItemData;
    imageMeta = null;
    setError('');
    if (dom.note) dom.note.textContent = '';
    renderCategoryOptions(editingItem?.category);
    if (dom.modalTitle) {
        const isDbItem = editingItem && editingItem._dbId;
        dom.modalTitle.textContent = isDbItem ? 'Modifier un objet' : 'Ajouter un objet';
        if (item && dbMatch && dom.note) {
            dom.note.textContent = "Objet deja en base: modification directe.";
        } else if (editingItem && !isDbItem && dom.note) {
            dom.note.textContent = "Objet sans ID base: enregistrement direct dans la base.";
        }
    }
    if (dom.form) dom.form.reset();
    resetImagePreview();

    // Show/hide delete button
    if (dom.deleteBtn) {
        const isDbItem = editingItem && editingItem._dbId;
        dom.deleteBtn.hidden = !isDbItem;
    }

    if (editingItem) {
        dom.nameInput.value = editingItem.name || '';
        renderCategoryOptions(editingItem.category);
        dom.buyInput.value = editingItem.buyPrice || '';
        dom.sellInput.value = editingItem.sellPrice || '';
        dom.descriptionInput.value = editingItem.description || '';
        dom.effectInput.value = editingItem.effect || '';
        if (dom.rarityInput) {
            dom.rarityInput.value = normalizeRarity(editingItem.rarity) || '';
        }
        if (dom.rankInput) {
            dom.rankInput.value = normalizeRank(editingItem.rank) || '';
        }
        // Show/hide equipment slot field based on category
        const eqSlotField = document.getElementById('adminItemEquipmentSlotField');
        const eqSlotEl = document.getElementById('adminItemEquipmentSlot');
        const isEquipment = (editingItem.category || '').toLowerCase() === 'equipement';
        if (eqSlotField) {
            eqSlotField.style.display = isEquipment ? '' : 'none';
        }
        if (eqSlotEl) {
            eqSlotEl.value = editingItem.equipment_slot || editingItem.equipmentSlot || '';
        }
        if (editingItem.image) {
            setImagePreview(editingItem.image);
            setImageMetaText('Image actuelle');
        }
        // Load modifiers from item
        loadModifiersFromItem(editingItem);
    } else {
        // New item - hide equipment slot field by default
        const eqSlotField = document.getElementById('adminItemEquipmentSlotField');
        if (eqSlotField) eqSlotField.style.display = 'none';
        // Clear modifiers for new item
        loadModifiersFromItem(null);
    }

    openBackdrop(dom.backdrop);
    dom.form?.scrollTo({ top: 0, behavior: 'auto' });
    dom.nameInput?.focus();
}

function closeAdminModal() {
    closeModifierSkillsPicker();
    closeBackdrop(dom.backdrop);
    resetImagePreview();
    imageBlob = null;
    imageMeta = null;
    editingItem = null;
    currentModifiers = [];
    renderModifiers();
}

function openDeleteModal() {
    if (!editingItem || !editingItem._dbId) return;
    if (dom.deleteItemName) {
        dom.deleteItemName.textContent = editingItem.name || 'cet objet';
    }
    openBackdrop(dom.deleteBackdrop);
}

function closeDeleteModal() {
    closeBackdrop(dom.deleteBackdrop);
}

async function confirmDelete() {
    if (!editingItem || !editingItem._dbId || !supabase) {
        console.error('[DELETE] Cannot delete:', { editingItem, hasDbId: !!editingItem?._dbId, hasSupabase: !!supabase });
        return;
    }

    console.log('[DELETE] Deleting item:', editingItem.name, 'ID:', editingItem._dbId);

    try {
        const { data, error } = await supabase
            .from('items')
            .delete()
            .eq('id', editingItem._dbId);

        if (error) {
            console.error('[DELETE] Delete error:', error);
            setError('Impossible de supprimer l\'objet.');
            toastManager.error('Impossible de supprimer l\'objet.');
            closeDeleteModal();
            return;
        }

        console.log('[DELETE] Successfully deleted from DB:', data);

        await addItemTombstone(editingItem?.name || "");
        // Remove from UI
        window.astoriaCodex?.removeItemByRef(editingItem);
        console.log('[DELETE] Removed from UI');
        await loadDbItems();

        toastManager.success(`"${editingItem.name}" supprimé avec succès`);

        // Close modals
        closeDeleteModal();
        closeAdminModal();
    } catch (error) {
        console.error('[DELETE] Exception:', error);
        setError('Erreur lors de la suppression.');
        toastManager.error('Erreur lors de la suppression.');
        closeDeleteModal();
    }
}

// Global function for edit button in table rows
window.openEditModal = async function(globalIndex) {
    const item = window.astoriaCodex?.getItemByIndex(globalIndex);
    if (!item) return;
    await openAdminModal(item);
};

function destroyCropper(keepPreview = false) {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (!keepPreview && imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        imagePreviewUrl = '';
    }
}

function closeCropper() {
    closeBackdrop(dom.cropperBackdrop);
    destroyCropper();
    if (dom.imageInput) dom.imageInput.value = '';
}

function openCropper(file) {
    imageMeta = {
        name: file?.name || 'image.png',
        size: file?.size || 0
    };
    setImageMetaText(`${imageMeta.name} • ${formatBytes(imageMeta.size)}`);

    if (!dom.cropperBackdrop || !dom.cropperImage) {
        imageBlob = file;
        imagePreviewUrl = URL.createObjectURL(file);
        setImagePreview(imagePreviewUrl);
        return;
    }

    if (!window.Cropper) {
        imageBlob = file;
        imagePreviewUrl = URL.createObjectURL(file);
        setImagePreview(imagePreviewUrl);
        return;
    }

    destroyCropper();
    imagePreviewUrl = URL.createObjectURL(file);
    dom.cropperImage.src = imagePreviewUrl;
    openBackdrop(dom.cropperBackdrop);

    cropper = new Cropper(dom.cropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        background: false,
        autoCropArea: 1,
        ready() {
            if (dom.cropperZoom) dom.cropperZoom.value = 1;
        },
        zoom(event) {
            if (!dom.cropperZoom) return;
            if (syncZoom) return;
            syncZoom = true;
            dom.cropperZoom.value = event.detail.ratio.toFixed(2);
            syncZoom = false;
        }
    });
}

async function applyCropper() {
    if (!cropper) {
        closeCropper();
        return;
    }

    const canvas = cropper.getCroppedCanvas({
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        imageSmoothingQuality: 'high'
    });

    if (!canvas) {
        closeCropper();
        return;
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
    if (!blob) {
        closeCropper();
        return;
    }

    imageBlob = blob;
    if (imageMeta) {
        imageMeta = { ...imageMeta, size: blob.size };
        setImageMetaText(`${imageMeta.name} • ${formatBytes(imageMeta.size)}`);
    }
    // Don't revoke here - setImagePreview will handle it after image loads
    const newBlobUrl = URL.createObjectURL(blob);
    setImagePreview(newBlobUrl);
    closeBackdrop(dom.cropperBackdrop);
    destroyCropper(true);
    if (dom.imageInput) dom.imageInput.value = '';
}

async function uploadImage(dbId, nameHint) {
    if (!imageBlob || !supabase) {
        console.warn('Upload skipped: no imageBlob or no supabase');
        return null;
    }

    // Upload to Supabase Storage bucket 'items'
    const safeName = String(nameHint || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '_');
    const filePath = `${dbId}/${Date.now()}_${safeName}.png`;

    console.log('[UPLOAD] Uploading image:', filePath, 'Size:', imageBlob.size);

    const { error: uploadError } = await supabase.storage
        .from(ITEMS_BUCKET)
        .upload(filePath, imageBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/png'
        });

    if (uploadError) {
        console.error('[UPLOAD] Upload error:', uploadError);
        const errorMsg = `Upload impossible: ${uploadError.message || 'Verifie le bucket items'}`;
        setError(errorMsg);
        toastManager.error('Échec de l\'upload de l\'image');
        return null;
    }

    const { data } = supabase.storage.from(ITEMS_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || null;
    console.log('[UPLOAD] Image uploaded successfully:', publicUrl);
    return publicUrl;
}

async function saveItem(event) {
    event.preventDefault();
    if (!supabase) return;
    setError('');

    const name = dom.nameInput.value.trim();
    if (!name) {
        setError('Nom obligatoire.');
        dom.nameInput.focus();
        return;
    }

    const equipmentSlotEl = document.getElementById('adminItemEquipmentSlot');
    const equipmentSlotVal = equipmentSlotEl ? equipmentSlotEl.value.trim() : '';

    const rarityVal = dom.rarityInput ? normalizeRarity(dom.rarityInput.value) : '';
    const rankVal = dom.rankInput ? normalizeRank(dom.rankInput.value) : '';
    const normalizedEffect = dom.effectInput.value
        .trim()
        .replace(/^(?:effets?\s*:\s*)+/i, '')
        .trim();

    const payload = {
        name,
        description: dom.descriptionInput.value.trim(),
        effect: normalizedEffect,
        category: dom.categoryInput.value.trim().toLowerCase(),
        price_kaels: parsePrice(dom.sellInput.value),
        equipment_slot: equipmentSlotVal || null,
        rarity: rarityVal || null,
        rank: rankVal || null,
        modifiers: currentModifiers.length > 0 ? currentModifiers : null
    };

    dom.saveBtn.disabled = true;

    try {
        let row = null;
        const isUpdate = editingItem && editingItem._dbId;

        try {
            row = await saveItemRow(payload, isUpdate, editingItem?._dbId);
        } catch (error) {
            const isRarityError = String(error?.message || '').includes('items_rarity_check');
            if (!isRarityError || !payload.rarity) throw error;

            const altRarity = toAlternateRarity(payload.rarity);
            if (!altRarity || altRarity === payload.rarity) throw error;
            row = await saveItemRow({ ...payload, rarity: altRarity }, isUpdate, editingItem?._dbId);
        }

        // Upload image if present
        let imageUrl = null;
        if (imageBlob && row?.id) {
            imageUrl = await uploadImage(row.id, name);
            if (imageUrl) {
                const images = { primary: imageUrl };
                const { data, error } = await supabase
                    .from('items')
                    .update({ images })
                    .eq('id', row.id)
                    .select()
                    .single();
                if (!error && data) {
                    row = data;
                } else {
                    console.warn('Failed to update item with image URL:', error);
                }
            }
        } else if (isUpdate && editingItem.images) {
            // Preserve existing images when updating without new image
            if (!row.images) {
                row.images = editingItem.images;
            }
        }

        const mapped = mapDbItem(row);

        if (isUpdate) {
            window.astoriaCodex?.updateItemById(editingItem._dbId, mapped);
        } else {
            if (editingItem) {
                window.astoriaCodex?.removeItemByRef(editingItem);
            }
            window.astoriaCodex?.addItems([mapped]);
        }

        // Reset image state
        imageBlob = null;
        imageMeta = null;

        toastManager.success(isUpdate ? `"${name}" mis à jour` : `"${name}" ajouté au codex`);
        closeAdminModal();
    } catch (error) {
        console.error('Save error:', error);
        const errorMsg = `Impossible de sauvegarder: ${error.message || 'Erreur inconnue'}`;
        setError(errorMsg);
        toastManager.error('Échec de la sauvegarde');
    } finally {
        dom.saveBtn.disabled = false;
    }
}

async function loadDbItems() {
    if (!supabase || !window.astoriaCodex) return;
    console.log('[LOAD] Loading items from database...');
    const { data, error } = await supabase
        .from('items')
        .select('id, name, description, effect, category, price_kaels, images, enabled, created_at, equipment_slot, rarity, rank, modifiers')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[LOAD] Items load error:', error);
        return;
    }

    console.log('[LOAD] Loaded', data?.length || 0, 'items from DB');
    console.log('[LOAD] Items:', data?.map(item => ({ id: item.id, name: item.name })));

    // Check for duplicate names (normalized)
    const nameCounts = new Map();
    (data || []).forEach(item => {
        const key = normalizeItemName(item?.name || '');
        if (!key) return;
        if (!nameCounts.has(key)) {
            nameCounts.set(key, []);
        }
        nameCounts.get(key).push(item);
    });

    const duplicates = Array.from(nameCounts.entries())
        .filter(([, items]) => items.length > 1);
    let idsToDelete = [];

    if (duplicates.length > 0) {
        console.warn('[LOAD] DUPLICATE ITEMS DETECTED:');
        duplicates.forEach(([key, items]) => {
            console.warn(`  - "${key}": ${items.length} copies`, items.map((row) => row.id));
        });
        console.warn('[LOAD] Delete duplicates manually in Supabase or use DELETE FROM items WHERE id IN (...ids)');

        duplicates.forEach(([, rows]) => {
            const sorted = rows.slice().sort((a, b) => {
                const aTime = new Date(a.created_at || 0).getTime();
                const bTime = new Date(b.created_at || 0).getTime();
                return bTime - aTime;
            });
            sorted.slice(1).forEach((row) => {
                if (row?.id) idsToDelete.push(row.id);
            });
        });

        if (idsToDelete.length) {
            const { error: deleteError } = await supabase
                .from('items')
                .delete()
                .in('id', idsToDelete);
            if (deleteError) {
                console.error('[LOAD] Failed to delete duplicates:', deleteError);
                idsToDelete = [];
            } else {
                console.warn('[LOAD] Removed duplicate items:', idsToDelete.length);
            }
        }
    }

    const filtered = (data || []).filter((row) =>
        row &&
        row.enabled !== false &&
        !idsToDelete?.includes(row.id)
    );
    const mapped = filtered.map(mapDbItem);
    dbItemsByKey = new Map(
        mapped
            .map((item) => [normalizeItemName(item?.name || ''), item])
            .filter(([key]) => key)
    );
    collectCategories(mapped);
    renderModifierPickers(mapped);
    renderCategoryOptions();
    if (typeof window.astoriaCodex.setDbItems === 'function') {
        window.astoriaCodex.setDbItems(mapped);
    } else if (typeof window.astoriaCodex.setItems === 'function') {
        window.astoriaCodex.setItems(mapped);
    } else {
        window.astoriaCodex.addItems(mapped);
    }
}

function updateEditButton(detail) {
    if (!dom.editBtn || !dom.modalActions) return;
    const item = detail?.item || null;
    const dbMatch = getDbMatch(item);
    if (adminMode && item) {
        dom.modalActions.hidden = false;
        dom.editBtn.hidden = false;
        dom.editBtn.textContent = (item._dbId || dbMatch) ? 'Modifier' : 'Importer pour modifier';
        dom.editBtn.onclick = async () => {
            if (typeof window.closeItemModal === 'function') {
                window.closeItemModal();
            }
            await openAdminModal(item);
        };
    } else {
        dom.modalActions.hidden = true;
        dom.editBtn.hidden = true;
    }
}

async function init() {
    try {
        await refreshSessionUser?.();
    } catch {}

    const user = getCurrentUser();
    if (!user) return;

    adminMode = isAdmin();
    if (!adminMode) return;

    supabase = await getSupabaseClient();
    dom.addBtn.hidden = false;

    renderCategoryOptions();
    renderModifierPickers();

    dom.addBtn.addEventListener('click', async () => await openAdminModal(null));
    dom.closeBtn?.addEventListener('click', closeAdminModal);
    dom.cancelBtn?.addEventListener('click', closeAdminModal);
    dom.form?.addEventListener('submit', saveItem);
    dom.deleteBtn?.addEventListener('click', openDeleteModal);
    dom.deleteCancel?.addEventListener('click', closeDeleteModal);
    dom.deleteConfirm?.addEventListener('click', confirmDelete);

    // Close modals on backdrop click
    dom.backdrop?.addEventListener('click', (e) => {
        if (e.target === dom.backdrop) closeAdminModal();
    });
    dom.deleteBackdrop?.addEventListener('click', (e) => {
        if (e.target === dom.deleteBackdrop) closeDeleteModal();
    });
    dom.cropperBackdrop?.addEventListener('click', (e) => {
        if (e.target === dom.cropperBackdrop) closeCropper();
    });
    dom.skillsPickerBackdrop?.addEventListener('click', (e) => {
        if (e.target === dom.skillsPickerBackdrop) closeModifierSkillsPicker();
    });

    dom.openModifierSkillsPickerBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        openModifierSkillsPicker();
    });
    dom.modifierStatInput?.addEventListener('click', () => openModifierSkillsPicker());
    dom.modifierStatInput?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openModifierSkillsPicker();
    });
    dom.skillsPickerClose?.addEventListener('click', closeModifierSkillsPicker);
    dom.skillsPickerCancel?.addEventListener('click', closeModifierSkillsPicker);
    dom.skillsPickerSearch?.addEventListener('input', (event) => {
        modifierSkillsState.query = String(event.target?.value || '');
        renderModifierSkillsList();
    });
    dom.skillsPickerCustomApply?.addEventListener('click', () => {
        const customStat = String(dom.skillsPickerCustomName?.value || '').trim();
        if (!customStat) {
            dom.skillsPickerCustomName?.focus();
            return;
        }
        const customType = dom.skillsPickerCustomType?.value === 'percent' ? 'percent' : 'flat';
        applySkillToModifierInput(customStat, customType);
        if (dom.skillsPickerCustomName) dom.skillsPickerCustomName.value = '';
        closeModifierSkillsPicker();
    });
    dom.skillsPickerCustomName?.addEventListener('keypress', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        dom.skillsPickerCustomApply?.click();
    });

    // Modifier management
    dom.addModifierBtn?.addEventListener('click', () => {
        const stat = dom.modifierStatInput?.value.trim();
        const value = parseFloat(dom.modifierValueInput?.value);
        const type = dom.modifierTypeInput?.value;
        addModifier(stat, value, type);
    });

    // Allow Enter key in modifier inputs to add
    [dom.modifierStatInput, dom.modifierValueInput].forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                dom.addModifierBtn?.click();
            }
        });
    });

    dom.imageBtn?.addEventListener('click', () => dom.imageInput?.click());
    dom.imagePreview?.addEventListener('click', () => dom.imageInput?.click());
    dom.imageInput?.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Fichier image invalide.');
            return;
        }
        openCropper(file);
    });

    dom.cropperClose?.addEventListener('click', closeCropper);
    dom.cropperCancel?.addEventListener('click', closeCropper);
    dom.cropperConfirm?.addEventListener('click', applyCropper);
    dom.cropperZoom?.addEventListener('input', () => {
        if (!cropper) return;
        if (syncZoom) return;
        const value = parseFloat(dom.cropperZoom.value);
        if (Number.isFinite(value)) {
            syncZoom = true;
            cropper.zoomTo(value);
            syncZoom = false;
        }
    });

    // Aspect ratio buttons
    document.querySelectorAll('.cropper-aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!cropper) return;
            const ratio = parseFloat(btn.dataset.ratio);
            if (Number.isFinite(ratio)) {
                cropper.setAspectRatio(ratio);
                // Update active state
                document.querySelectorAll('.cropper-aspect-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Wire up cropper controls
    dom.cropperZoomIn?.addEventListener('click', () => {
        if (cropper) cropper.zoom(0.1);
    });

    dom.cropperZoomOut?.addEventListener('click', () => {
        if (cropper) cropper.zoom(-0.1);
    });

    dom.cropperRotateLeft?.addEventListener('click', () => {
        if (cropper) cropper.rotate(-90);
    });

    dom.cropperRotateRight?.addEventListener('click', () => {
        if (cropper) cropper.rotate(90);
    });

    dom.cropperRotate180?.addEventListener('click', () => {
        if (cropper) cropper.rotate(180);
    });

    let scaleX = 1, scaleY = 1;
    dom.cropperFlipX?.addEventListener('click', () => {
        if (cropper) {
            scaleX = -scaleX;
            cropper.scaleX(scaleX);
        }
    });

    dom.cropperFlipY?.addEventListener('click', () => {
        if (cropper) {
            scaleY = -scaleY;
            cropper.scaleY(scaleY);
        }
    });

    dom.cropperReset?.addEventListener('click', () => {
        if (cropper) {
            cropper.reset();
            scaleX = 1;
            scaleY = 1;
        }
    });

    // Wire up aspect ratio buttons
    const aspectButtons = dom.cropperBackdrop?.querySelectorAll('.cropper-aspect-btn');
    aspectButtons?.forEach(btn => {
        btn.addEventListener('click', () => {
            const ratio = parseFloat(btn.dataset.ratio);
            if (cropper && Number.isFinite(ratio)) {
                cropper.setAspectRatio(ratio);
                // Update active state
                aspectButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    window.addEventListener('astoria:codex-modal-open', (event) => updateEditButton(event.detail));
    window.addEventListener('astoria:codex-modal-close', () => updateEditButton(null));

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (isSkillsPickerOpen()) {
            closeModifierSkillsPicker();
        } else if (dom.deleteBackdrop?.classList.contains('open')) {
            closeDeleteModal();
        } else if (dom.cropperBackdrop?.classList.contains('open')) {
            closeCropper();
        } else if (dom.backdrop?.classList.contains('open')) {
            closeAdminModal();
        }
    });

    await loadDbItems();
}

init();

