// Script de la page inventaire (déplacé tel quel depuis inventaire.html).
        (function () {
        // Modules extraits (js/pages/inventaire/*.js), chargés avant ce fichier.
        const {
            safeJson,
            normalizeItemName,
            ITEM_TOMBSTONES_KEY,
            getItemTombstones,
            isLocalItemTombstoned,
            resolveItemByKey,
            mapDbItem
        } = window.astoriaInventoryCatalog;
        const {
            EQUIPMENT_SLOT_DEFS,
            SLOT_MAP,
            TWO_HANDED_SLOT,
            ONE_HANDED_WEAPONS,
            isTwoHandedWeapon,
            isOneHandedWeapon,
            getRawSlot,
            SLOT_DISPLAY_NAMES,
            getSlotDisplayName,
            normalizeSlot,
            getItemSlot,
            isItemEquippable,
            getStableItemRef,
            isSameItemRef,
            buildEquippedItem,
            normalizeEquippedSlots
        } = window.astoriaInventoryEquipment;
        const {
            getItemModifierTools,
            getItemModifiers,
            renderModifierBadges,
            renderModifierLines,
            getItemDisplayMeta,
            escapeHtml,
            parsePrice,
            sortInventoryItems
        } = window.astoriaInventoryDisplay;
        const {
            normalizeRankText,
            loadScopedJson,
            getCategoryCompetenceTotal,
            hasRankCompetenceData
        } = window.astoriaInventoryRank;



        /**



         * ========================================================================



         * INVENTORY MODULE - EMPTY BY DEFAULT WITH ADD PANEL



         * ========================================================================



         *



         * TEMPORARY IMPLEMENTATION FOR TESTING:



         * - Inventory starts EMPTY on first load



         * - Items stored in localStorage for persistence (testing only)



         * - Items are added via "+" panel which selects from existing database



         * - All item data (name, description, image) comes from data.js



         *



         * FUTURE INTEGRATION:



         * - Replace localStorage with real backend API



         * - Load inventory from server instead of localStorage



         * - Connect to global item management system



         * ========================================================================



         */



        // =================================================================



        // CONFIGURATION



        // =================================================================



        /**



         * IMAGE CONFIGURATION & PLACEHOLDER



         * Délégués au helper global image-helpers.js



         */



        const INVENTORY_IMAGE_HELPERS = window.astoriaImageHelpers || {};



        const PLACEHOLDER_IMAGE = INVENTORY_IMAGE_HELPERS.smallPlaceholder;



        const DEFAULT_SCROLL_TYPES = [
            { key: 'feu', emoji: String.fromCodePoint(0x1F525), label: 'Feu', matchers: ['feu'] },
            { key: 'eau', emoji: String.fromCodePoint(0x1F4A7), label: 'Eau', matchers: ['eau'] },
            { key: 'vent', emoji: String.fromCodePoint(0x1F32C), label: 'Vent', matchers: ['vent'] },
            { key: 'terre', emoji: String.fromCodePoint(0x1FAA8), label: 'Terre', matchers: ['terre'] },
            { key: 'nature', emoji: String.fromCodePoint(0x1F331), label: 'Nature', matchers: ['nature'] },
            { key: 'roche', emoji: String.fromCodePoint(0x1FAA8), label: 'Roche', matchers: ['roche'] },
            { key: 'metaux', emoji: String.fromCodePoint(0x1F9F2), label: 'M\u00e9taux', matchers: ['metaux', 'm\u00e9taux'] },
            { key: 'cryo', emoji: String.fromCodePoint(0x1F9CA), label: 'Cryo (glace)', matchers: ['cryo', 'glace'] },
            { key: 'foudre', emoji: String.fromCodePoint(0x26A1), label: 'Foudre', matchers: ['foudre'] },
            { key: 'lumiere', emoji: String.fromCodePoint(0x1F31F), label: 'Lumi\u00e8re', matchers: ['lumiere', 'lumi\u00e8re'] },
            { key: 'tenebres', emoji: String.fromCodePoint(0x1F319), label: 'T\u00e9n\u00e8bres', matchers: ['tenebres', 't\u00e9n\u00e8bres'] },
            { key: 'cristal', emoji: String.fromCodePoint(0x1F48E), label: 'Cristal', matchers: ['cristal'] }
        ];



        const SCROLL_TYPES = Array.isArray(window.astoriaScrollTypes) && window.astoriaScrollTypes.length



            ? window.astoriaScrollTypes



            : DEFAULT_SCROLL_TYPES;



        if (!Array.isArray(window.astoriaScrollTypes) || window.astoriaScrollTypes.length < DEFAULT_SCROLL_TYPES.length) {



            window.astoriaScrollTypes = DEFAULT_SCROLL_TYPES;



        }



        const SCROLL_TYPES_META_KEY = 'astoria_scroll_types_meta';



        const SCROLL_TYPE_FALLBACK_EMOJI = String.fromCodePoint(0x2728);



        function formatScrollTypeLabel(key) {



            const raw = String(key || '').replace(/[-_]+/g, ' ').trim();



            if (!raw) return '';



            return raw.charAt(0).toUpperCase() + raw.slice(1);



        }



        function getScrollTypeMetaByKey(key) {



            if (!key) return null;



            if (typeof window.astoriaGetScrollTypeMeta === 'function') {



                const entry = window.astoriaGetScrollTypeMeta(key);



                if (entry) return entry;



            }



            const normalized = normalizeText(key);



            const existing = SCROLL_TYPES.find((type) => normalizeText(type.key) === normalized);



            if (existing) return existing;



            return {



                key: String(key),



                label: formatScrollTypeLabel(key),



                emoji: SCROLL_TYPE_FALLBACK_EMOJI,



                matchers: []



            };



        }



        function persistScrollTypeMeta() {



            try {



                const payload = SCROLL_TYPES.map((type) => ({



                    key: type.key,



                    label: type.label,



                    emoji: type.emoji,



                    matchers: Array.isArray(type.matchers) ? type.matchers : []



                }));



                const next = JSON.stringify(payload);



                const current = localStorage.getItem(SCROLL_TYPES_META_KEY);



                if (current !== next) {



                    localStorage.setItem(SCROLL_TYPES_META_KEY, next);



                }



                window.astoriaScrollTypes = payload;



            } catch (error) {



                console.warn('Failed to persist scroll type metadata:', error);



            }



        }



        persistScrollTypeMeta();



        // =================================================================



        // =================================================================



        // STATE



        // =================================================================



        let currentCategory = 'all';
        let currentSearchQuery = '';
        let currentSort = 'default';



        let selectedItemIndex = null;
        let statsPreviewItem = null;



        let inventoryItems = []; // Starts EMPTY



        let nextItemId = 1; // Auto-increment ID for new items



        let inventoryStorageMode = 'local'; // 'local' | 'character'



        let authApi = null;
        let cachedCompetences = null;



        let inventoryApi = null;

        function applyInventoryRoleGuards() {
            if (openAddBtn) {
                openAddBtn.hidden = !inventoryAdminMode;
            }
            if (scrollPanelAddBtn) {
                scrollPanelAddBtn.hidden = !inventoryAdminMode;
                if (!inventoryAdminMode) {
                    scrollPanelAddBtn.disabled = true;
                    setScrollAddOpen(false);
                }
            }
            if (scrollRandomAddBtn) {
                scrollRandomAddBtn.hidden = !inventoryAdminMode;
                scrollRandomAddBtn.disabled = !inventoryAdminMode;
            }
        }



        let pendingProfileSaveTimer = null;
        // Character whose inventory is currently loaded in memory. Saves always target
        // this id (never "whatever character is active now") and are skipped until a
        // load succeeded, so a failed/partial load can never overwrite the database.
        let inventoryOwnerId = null;
        let pendingSaveOwnerId = null;



        let scrollPanelOpen = false;



        let scrollPanelCategory = null;



        let scrollPanelToggleBtn = null;



        let scrollAddOpen = false;



        let currentScrollItem = null;



        let selectedScrollTypeKey = null;



        let lastScrollItemId = null;



        let scrollTypeStore = {};



        let inventoryMigrated = false;
        let currentCharacterRank = 'F';
        let currentCharacterRankScore = 0;
        let currentCharacterRankSource = 'fallback';

        const INVENTORY_STORAGE_KEY = 'astoriaInventory';
        const EQUIPPED_SLOTS_STORAGE_KEY = 'astoriaInventoryEquippedSlots';
        const CHARACTER_RANK_STORAGE_KEY = 'astoriaInventoryCharacterRank';
        const COMPETENCE_STORAGE_KEYS = Object.freeze([
            'skillsPointsByCategory',
            'skillsAllocationsByCategory',
            'skillsBaseValuesByCategory',
            'skillsLocksByCategory',
            'skillsCustomByCategory'
        ]);
        const RANK_COMPETENCE_CATEGORY_IDS = Object.freeze(['combat', 'pouvoirs']);
        // Source: "Tableau Ratio Par Rang - Rang joueur.csv"
        const CHARACTER_RANK_RULES = Object.freeze([
            { rank: 'F', min: 0, max: 230, points: 230 },
            { rank: 'E', min: 231, max: 510, points: 280 },
            { rank: 'D', min: 511, max: 840, points: 330 },
            { rank: 'C', min: 841, max: 1220, points: 380 },
            { rank: 'B', min: 1221, max: 1650, points: 430 },
            { rank: 'A', min: 1651, max: 2130, points: 480 },
            { rank: 'S', min: 2131, max: 2670, points: 540 },
            { rank: 'S+', min: 2671, max: 3270, points: 600 },
            { rank: 'SS', min: 3271, max: 3920, points: 650 },
            { rank: 'SSS', min: 3921, max: 4600, points: 680 }
        ]);
        const CHARACTER_RANKS = CHARACTER_RANK_RULES.map((entry) => entry.rank);

        let equippedSlots = {};
        let equipmentSlotsBound = false;
        let draggedEquipmentItemId = null;

        let draggedEquipmentSlotKey = null;



        // DOM REFERENCES



        // =================================================================



        const grid = document.getElementById('inventoryGrid');



        const detailPanel = document.getElementById('itemDetail');



        const emptyState = document.getElementById('emptyState');



        const emptyStateMessage = emptyState ? emptyState.querySelector('.empty-state-message') : null;



        const itemCountEl = document.getElementById('itemCount');



        const categoryButtons = document.querySelectorAll('.category-btn');



        const searchRoot = document.getElementById('inventorySearch');



        const sortBtn = document.getElementById('inventorySortBtn');
        const sortDropdown = document.getElementById('inventorySortDropdown');
        const searchInput = document.getElementById('inventorySearchInput');



        const searchToggle = document.getElementById('inventorySearchToggle');



        const searchClear = document.getElementById('inventorySearchClear');



        const searchHistoryDropdown = document.getElementById('inventorySearchHistory');



        const inventoryContent = document.querySelector('.inventory-content');
        const characterRankSelect = document.getElementById('characterRankSelect');



        const scrollTypesPanel = document.getElementById('scrollTypesPanel');



        const scrollPanelTitle = document.getElementById('scrollPanelTitle');



        const scrollPanelBody = document.getElementById('scrollPanelBody');



        const scrollPanelHeader = document.querySelector('.scroll-panel-header');



        const scrollPanelAddBtn = document.getElementById('scrollPanelAddBtn');



        const scrollPanelEmpty = document.getElementById('scrollPanelEmpty');



        const scrollPanelList = document.getElementById('scrollPanelList');



        const scrollPanelAdd = document.getElementById('scrollPanelAdd');



        const scrollRandomQty = document.getElementById('scrollRandomQty');



        const scrollRandomAddBtn = document.getElementById('scrollRandomAddBtn');



        const scrollTypeSearch = document.getElementById('scrollTypeSearch');



        const scrollTypeSuggestions = document.getElementById('scrollTypeSuggestions');



        // Add button (now opens modal instead of panel)
        const openAddBtn = document.getElementById('openAddPanel');



        const inventoryWrapper = document.querySelector('.inventory-wrapper');



        let inventoryAccessAllowed = true;
        let inventoryAdminMode = document.body?.dataset?.admin === 'true';

        function syncInventoryAdminMode() {
            const datasetAdminMode = document.body?.dataset?.admin === 'true';
            let nextMode = datasetAdminMode;

            try {
                if (authApi && typeof authApi.isAdmin === 'function') {
                    nextMode = Boolean(authApi.isAdmin());
                }
            } catch (error) {
                console.warn('[Inventory] Failed to read admin mode from auth API:', error);
            }

            if (document.body) {
                document.body.dataset.admin = nextMode ? 'true' : 'false';
            }

            inventoryAdminMode = nextMode;
            applyInventoryRoleGuards();

            return inventoryAdminMode;
        }



        const listHelpers = window.astoriaListHelpers || {};

        const characterSpriteEl = document.querySelector('.character-sprite');
        const silhouetteUploadTrigger = document.getElementById('silhouetteUploadTrigger');
        const silhouetteUploadInput = document.getElementById('silhouetteUploadInput');
        const silhouetteCropperBackdrop = document.getElementById('silhouetteCropperBackdrop');
        const silhouetteCropperImage = document.getElementById('silhouetteCropperImage');
        const silhouetteCropperZoom = document.getElementById('silhouetteCropperZoom');
        const silhouetteCropperZoomIn = document.getElementById('silhouetteCropperZoomIn');
        const silhouetteCropperZoomOut = document.getElementById('silhouetteCropperZoomOut');
        const silhouetteCropperRotateLeft = document.getElementById('silhouetteCropperRotateLeft');
        const silhouetteCropperRotateRight = document.getElementById('silhouetteCropperRotateRight');
        const silhouetteCropperRotate180 = document.getElementById('silhouetteCropperRotate180');
        const silhouetteCropperFlipX = document.getElementById('silhouetteCropperFlipX');
        const silhouetteCropperFlipY = document.getElementById('silhouetteCropperFlipY');
        const silhouetteCropperReset = document.getElementById('silhouetteCropperReset');
        const silhouetteCropperClose = document.getElementById('silhouetteCropperClose');
        const silhouetteCropperCancel = document.getElementById('silhouetteCropperCancel');
        const silhouetteCropperConfirm = document.getElementById('silhouetteCropperConfirm');
        const SILHOUETTE_STORAGE_KEY = 'astoriaInventoryCharacterSilhouette';
        const DEFAULT_SILHOUETTE = 'assets/images/Silhouette.png';
        const SILHOUETTE_RATIO = 230 / 320;
        // Silhouette cropper now uses uploaderCropper wrapper



        const filterItems = listHelpers.filterItems;



        const searchFields = [



            (item) => item?.name,



            (item) => item?.description,



            (item) => item?.effect,



            (item) => {



                const tools = window.astoriaItemModifiers;



                if (!tools?.toBadgeModel || !tools?.getModifiers) return '';



                return tools.toBadgeModel(tools.getModifiers(item)).map((badge) => badge.label).join(' ');



            }



        ];



        const searchHistory = window.astoriaSearchHistory



            ? window.astoriaSearchHistory.createSearchHistory({



                storageKey: 'astoriaInventoryRecentSearches',



                maxItems: 4



            })



            : null;



        const INVENTORY_SYNC_KEY = 'astoria_inventory_sync';

        function resolveInventoryStorageScopeId() {
            const activeCharacterId = authApi?.getActiveCharacter?.()?.id;
            if (activeCharacterId) return String(activeCharacterId);

            try {
                const raw = localStorage.getItem('astoria_active_character');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.id) return String(parsed.id);
                }
            } catch {}

            try {
                const raw = localStorage.getItem('astoria_character_summary');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.id) return String(parsed.id);
                }
            } catch {}

            try {
                const params = new URLSearchParams(window.location.search);
                const queryCharacterId = params.get('character');
                if (queryCharacterId) return String(queryCharacterId);
            } catch {}

            return '';
        }

        function getScopedInventoryStorageKey(baseKey) {
            const scopeId = resolveInventoryStorageScopeId();
            return scopeId ? (baseKey + ':' + scopeId) : baseKey;
        }

        function getInventoryItemsStorageKey() {
            return getScopedInventoryStorageKey(INVENTORY_STORAGE_KEY);
        }

        function getEquippedSlotsStorageKey() {
            return getScopedInventoryStorageKey(EQUIPPED_SLOTS_STORAGE_KEY);
        }

        function getCharacterRankStorageKey() {
            return getScopedInventoryStorageKey(CHARACTER_RANK_STORAGE_KEY);
        }

        function getSilhouetteStorageKey() {
            return getScopedInventoryStorageKey(SILHOUETTE_STORAGE_KEY);
        }



        function broadcastInventorySync(reason = 'update') {



            try {



                const character = authApi?.getActiveCharacter?.();



                if (!character?.id) return;



                const payload = {



                    characterId: String(character.id),



                    reason,



                    ts: Date.now()



                };



                localStorage.setItem(INVENTORY_SYNC_KEY, JSON.stringify(payload));



            } catch (error) {



                console.warn('Inventory sync broadcast failed:', error);



            }



        }



        async function handleInventorySync(payload) {



            if (!payload) return;



            if (inventoryStorageMode !== 'character' || !authApi) return;



            const character = authApi.getActiveCharacter?.();
            if (!character?.id) {
                console.warn('[Inventory Storage] Missing active character, sync ignored');
                return;
            }



            if (!character?.id) return;



            if (String(payload.characterId) !== String(character.id)) return;



            await loadInventory();
            await refreshCharacterRankFromCompetences({ enforce: true, silent: true, persist: false });



            syncCurrencyItem();



            renderInventory();



        }



        window.addEventListener('storage', (event) => {
            if (!event.key) return;

            if (event.key === INVENTORY_SYNC_KEY && event.newValue) {
                try {
                    const payload = JSON.parse(event.newValue);
                    void handleInventorySync(payload);
                } catch {
                    // ignore invalid payloads
                }
                return;
            }

            if (!isCompetenceStorageKey(event.key)) return;
            void refreshCharacterRankFromCompetences({ enforce: true, silent: true }).then(() => {
                renderInventory();
            });
        });


        function isCompetenceStorageKey(key) {
            return COMPETENCE_STORAGE_KEYS.some((rawKey) => key === rawKey || key.endsWith(`:${rawKey}`));
        }


        function getRankCompetenceCategoryIds() {
            const categories = Array.isArray(window.skillsCategories) ? window.skillsCategories : [];
            const selected = new Set();

            categories.forEach((category) => {
                const id = String(category?.id || '').trim();
                const idNorm = normalizeRankText(id);
                const labelNorm = normalizeRankText(category?.label || '');
                if (!id) return;

                if (RANK_COMPETENCE_CATEGORY_IDS.includes(idNorm)) {
                    selected.add(id);
                    return;
                }

                const isCombat = labelNorm.includes('combat') && labelNorm.includes('defense');
                const isPowers = labelNorm.includes('pouvoirs') && labelNorm.includes('alice');
                if (isCombat || isPowers) {
                    selected.add(id);
                }
            });

            if (selected.size) return Array.from(selected);
            return Array.from(RANK_COMPETENCE_CATEGORY_IDS);
        }

        function getCompetencesSnapshot() {
            if (cachedCompetences && typeof cachedCompetences === 'object') {
                return cachedCompetences;
            }

            const character = authApi?.getActiveCharacter?.();

            const characterId = character?.id ? String(character.id) : '';
            return {
                pointsByCategory: loadScopedJson('skillsPointsByCategory', characterId),
                allocationsByCategory: loadScopedJson('skillsAllocationsByCategory', characterId),
                baseValuesByCategory: loadScopedJson('skillsBaseValuesByCategory', characterId),
                locksByCategory: loadScopedJson('skillsLocksByCategory', characterId),
                customSkillsByCategory: loadScopedJson('skillsCustomByCategory', characterId)
            };
        }


        function getRankFromScore(score) {
            const numeric = Number(score) || 0;
            const byRange = CHARACTER_RANK_RULES.find((entry) => numeric >= entry.min && numeric <= entry.max);
            if (byRange) return byRange.rank;
            if (numeric > CHARACTER_RANK_RULES[CHARACTER_RANK_RULES.length - 1].max) {
                return CHARACTER_RANK_RULES[CHARACTER_RANK_RULES.length - 1].rank;
            }
            return CHARACTER_RANK_RULES[0].rank;
        }


        function readFallbackCharacterRank() {
            let rank = '';

            if (inventoryStorageMode === 'character' && authApi?.getActiveCharacter) {
                rank = String(authApi.getActiveCharacter()?.profile_data?.inventory?.characterRank || '');
            }

            if (!rank) {
                try {
                    rank = String(localStorage.getItem(getCharacterRankStorageKey()) || '');
                } catch {}
            }
            return rank;
        }

        function normalizeCharacterRank(value) {
            const rank = String(value || '').trim().toUpperCase();
            return CHARACTER_RANKS.includes(rank) ? rank : 'F';
        }

        function applyCharacterRank(rank, options = {}) {
            currentCharacterRank = normalizeCharacterRank(rank);
            const score = Number(options.score);
            if (Number.isFinite(score)) {
                currentCharacterRankScore = Math.max(0, Math.floor(score));
            }

            if (characterRankSelect) {
                characterRankSelect.value = currentCharacterRank;
                const categoryLabel = (options.categoryLabels && options.categoryLabels.length)
                    ? options.categoryLabels.join(' + ')
                    : 'Combat + Pouvoirs';
                characterRankSelect.title = `Rang calcule depuis ${categoryLabel} (score: ${currentCharacterRankScore})`;
            }
        }

        async function persistCharacterRank() {
            const rank = normalizeCharacterRank(currentCharacterRank);
            const score = Math.max(0, Math.floor(Number(currentCharacterRankScore) || 0));
            const source = String(currentCharacterRankSource || 'fallback');

            try {
                localStorage.setItem(getCharacterRankStorageKey(), rank);
            } catch {}

            if (inventoryStorageMode !== 'character' || !authApi?.getActiveCharacter || !authApi?.updateCharacter) {
                return;
            }

            const character = authApi.getActiveCharacter();
            if (!character?.id) return;

            const result = await patchInventoryProfile(character.id, (inventory) => ({
                ...inventory,
                characterRank: rank,
                characterRankScore: score,
                characterRankSource: source
            }));
            if (!result.success) {
                console.warn('Character rank save error:', result.error);
            }
        }

        async function refreshCharacterRankFromCompetences(options = {}) {
            const categoryIds = getRankCompetenceCategoryIds();
            const categories = Array.isArray(window.skillsCategories) ? window.skillsCategories : [];
            const categoryLabels = categoryIds.map((id) => {
                const match = categories.find((entry) => String(entry?.id || '') === String(id));
                return match?.label || id;
            });
            const snapshot = getCompetencesSnapshot();
            const canCompute = hasRankCompetenceData(snapshot, categoryIds);

            let nextRank = 'F';
            let nextScore = 0;
            let source = 'fallback';
            if (canCompute) {
                nextScore = categoryIds.reduce((sum, categoryId) => {
                    return sum + getCategoryCompetenceTotal(snapshot, categoryId);
                }, 0);
                nextRank = getRankFromScore(nextScore);
                source = 'competences';
            } else {
                nextRank = readFallbackCharacterRank() || 'F';
            }

            const normalizedRank = normalizeCharacterRank(nextRank);
            const normalizedScore = Math.max(0, Math.floor(Number(nextScore) || 0));
            const didChange = normalizedRank !== currentCharacterRank || normalizedScore !== currentCharacterRankScore || source !== currentCharacterRankSource;

            currentCharacterRankSource = source;
            applyCharacterRank(normalizedRank, { score: normalizedScore, categoryLabels });

            if (didChange && options.persist !== false) {
                void persistCharacterRank();
            }
            if (options.enforce) {
                enforceRankOnEquippedSlots({ silent: options.silent === true });
            }

            return { rank: currentCharacterRank, score: currentCharacterRankScore, source: currentCharacterRankSource };
        }

        function initCharacterRankControl() {
            if (!characterRankSelect) return;

            characterRankSelect.innerHTML = CHARACTER_RANK_RULES
                .map((entry) => `<option value="${entry.rank}">${entry.rank}</option>`)
                .join('');

            characterRankSelect.disabled = true;
            characterRankSelect.setAttribute('aria-readonly', 'true');
        }

        function getRankIndex(rank) {
            return CHARACTER_RANKS.indexOf(normalizeCharacterRank(rank));
        }

        function getItemRank(item) {
            const helper = window.astoriaItemDisplayMeta;
            const rawRank = item?.rank || item?.rank_required || item?.required_rank || item?.requiredRank || '';
            const normalized = helper?.getRank ? helper.getRank(rawRank) : String(rawRank || '').trim().toUpperCase();
            return normalizeCharacterRank(normalized || 'F');
        }

        function canCharacterEquipItemByRank(item) {
            if (!item) return false;
            const charIndex = getRankIndex(currentCharacterRank);
            const itemIndex = getRankIndex(getItemRank(item));
            if (charIndex < 0 || itemIndex < 0) return true;
            return itemIndex <= charIndex;
        }

        function enforceRankOnEquippedSlots(options = {}) {
            const silent = options?.silent === true;
            const blockedSlots = [];

            Object.entries(equippedSlots || {}).forEach(([slotKey, item]) => {
                if (!item) return;
                if (!canCharacterEquipItemByRank(item)) {
                    blockedSlots.push(slotKey);
                }
            });

            if (!blockedSlots.length) return;

            blockedSlots.forEach((slotKey) => unequipSlot(slotKey, false));
            persistInventory();
            renderInventory();

            if (!silent) {
                toastManager.warning(`${blockedSlots.length} item(s) desequipé(s): rang trop élevé`);
            }
        }

        // =================================================================



        // INITIALIZATION



        // =================================================================



        /**



         * Initialize inventory - EMPTY BY DEFAULT



         * - Loads from localStorage ONLY (if present)



         * - Otherwise displays empty inventory



         * - Renders the UI



         */



        async function initInventory() {



            console.log('Initializing inventory...');



            await hydrateItemsFromDb();



            await initInventoryStorage();
            initCharacterRankControl();
            await refreshCharacterRankFromCompetences({ enforce: false, silent: true });



            initSilhouetteUploader();



            if (!inventoryAccessAllowed) {



                renderInventoryAccessDenied();



                return;



            }



            await loadInventory();
            await refreshCharacterRankFromCompetences({ enforce: true, silent: true });



            syncCurrencyItem();



            await loadCharacterSilhouette();



            initEquipmentSlots();



            // Render



            renderInventory();



            // Note: Item selector is populated when add panel opens



        }



        // =================================================================



        // ITEM DATABASE ACCESS



        // =================================================================



        /**



         * TEMPORARY FUNCTION: Get all available items from data.js



         *



         * This function accesses our existing central item database (inventoryData).



         * In production, this would query the real backend database.



         *



         * @returns {Array} All available items from the game database



         */



        function getAllItems() {



            if (typeof inventoryData === 'undefined' || !inventoryData) {



                console.warn('inventoryData not found in data.js');



                return [];



            }



            return inventoryData.filter((item) =>



                !isLocalItemTombstoned(item) && !isItemDisabled(item)



            );



        }












        let disabledItemNames = new Set();









        function isItemDisabled(item) {



            const key = normalizeItemName(item?.name || item?.nom || '');



            if (!key) return false;



            return disabledItemNames.has(key);



        }






        async function reconcileInventoryRows(characterId, rows) {



            if (!characterId || !inventoryApi?.setInventoryItem || !Array.isArray(rows)) return rows;



            const canonicalByName = new Map();



            rows.forEach((row) => {



                const key = normalizeItemName(row?.item_key);



                if (!key) return;



                if (!canonicalByName.has(key)) canonicalByName.set(key, row);



            });



            const updates = [];



            const nextRows = [];



            rows.forEach((row) => {



                const resolved = resolveItemByKey(row?.item_key, row?.item_index, row?.item_id);



                const canonicalKey = resolved?.item?.name ? String(resolved.item.name) : '';



                const canonicalNorm = normalizeItemName(canonicalKey);



                const rowNorm = normalizeItemName(row?.item_key);



                if (!canonicalKey || !canonicalNorm || !rowNorm || canonicalNorm === rowNorm) {



                    nextRows.push(row);



                    return;



                }



                const canonicalRow = canonicalByName.get(canonicalNorm);



                if (canonicalRow) {



                    // Canonical row already exists, drop the legacy key row.



                    updates.push(inventoryApi.setInventoryItem(characterId, {
                        item_key: String(row.item_key),
                        item_id: row?.item_id || null,
                        item_index: row?.item_index
                    }, 0));



                    return;



                }



                // Migrate legacy key to canonical name.



                updates.push(inventoryApi.setInventoryItem(characterId, {
                    item_key: String(row.item_key),
                    item_id: row?.item_id || null,
                    item_index: row?.item_index
                }, 0));



                updates.push(inventoryApi.setInventoryItem(characterId, {
                    item_key: canonicalKey,
                    item_id: resolved?.item?.id || null,
                    item_index: resolved.index
                }, row?.qty));



                nextRows.push({



                    ...row,



                    item_id: resolved?.item?.id || row?.item_id || null,
                    item_key: canonicalKey,



                    item_index: Number.isFinite(resolved.index) && resolved.index >= 0 ? resolved.index : row?.item_index



                });



            });



            if (updates.length) {



                try {



                    await Promise.allSettled(updates);



                } catch (error) {



                    console.warn('Inventory reconcile failed:', error);



                }



            }



            return nextRows;



        }






        async function hydrateItemsFromDb() {



            if (!Array.isArray(window.inventoryData)) {
                window.inventoryData = [];
            }



            try {



                const itemsApi = await import('../../api/items-service.js');



                if (!itemsApi?.getAllItems) return;



                const rows = await itemsApi.getAllItems();



                if (!Array.isArray(rows) || rows.length === 0) return;



                disabledItemNames = new Set(



                    rows



                        .filter((row) => row && row.enabled === false)



                        .map((row) => normalizeItemName(row.name || row.nom || ''))



                        .filter(Boolean)



                );



                const mapped = rows



                    .filter((row) => row && row.enabled !== false)



                    .map(mapDbItem);



                const nameToIndex = new Map();



                window.inventoryData.forEach((item, idx) => {



                    const key = normalizeItemName(item?.name || item?.nom || '');



                    if (key) nameToIndex.set(key, idx);



                });



                mapped.forEach((item) => {



                    if (!item || !item.name) return;



                    const key = normalizeItemName(item.name);



                    const existingIndex = nameToIndex.get(key);



                    if (existingIndex != null) {



                        window.inventoryData[existingIndex] = {



                            ...window.inventoryData[existingIndex],



                            ...item



                        };



                        return;



                    }



                    window.inventoryData.push(item);



                    nameToIndex.set(key, window.inventoryData.length - 1);



                });



            } catch (error) {



                console.warn('Inventory DB items load failed:', error);



            }



        }



        /**



         * Populate the item selector dropdown with items from database



         * Filters by selected category for clarity



         */



        function populateItemSelector() {



            const allItems = getAllItems();



            const selectedCategory = categorySelect.value;



            // Clear existing options (except the first placeholder)



            itemSelect.innerHTML = '<option value="">-- Sélectionner un objet --</option>';



            // Filter items by category if not "all"



            const filteredItems = selectedCategory === 'all'



                ? allItems



                : allItems.filter(item => item.category === selectedCategory);



            // Add filtered items as options



            filteredItems.forEach((item, index) => {



                // Use the original index from allItems for referencing



                const originalIndex = allItems.indexOf(item);



                const option = document.createElement('option');



                option.value = originalIndex; // Use original index to reference the item



                option.textContent = item.name;



                option.dataset.category = item.category;



                itemSelect.appendChild(option);



            });



        }



        // =================================================================



        // PERSISTENCE - LocalStorage (TEMPORARY)



        // =================================================================



        function hydrateInventoryFromCompact(items) {



            const allItems = getAllItems();



            inventoryItems = [];



            nextItemId = 1;



            if (!Array.isArray(items)) return;



            items.forEach((entry) => {



                const resolved = resolveItemByKey(
                    entry?.itemKey || entry?.item_key || entry?.name,
                    entry?.itemIndex ?? entry?.item_index ?? entry?.idx,
                    entry?.itemId || entry?.item_id
                );



                const idx = Number.isFinite(Number(resolved?.index))
                    ? Number(resolved.index)
                    : Number(entry?.itemIndex ?? entry?.item_index ?? entry?.idx);



                const qty = Number(entry?.qty);



                if (!Number.isFinite(idx) || !Number.isFinite(qty) || qty <= 0) return;



                const sourceItem = resolved?.item || allItems[idx];



                if (!sourceItem) return;



                inventoryItems.push({



                    id: nextItemId++,
                    item_id: sourceItem?.id || entry?.itemId || entry?.item_id || null,



                    sourceIndex: idx,



                    name: sourceItem.name,



                    category: sourceItem.category,



                    image: sourceItem.image,



                    description: sourceItem.description,



                    effect: sourceItem.effect,



                    buyPrice: sourceItem.buyPrice,



                    sellPrice: sourceItem.sellPrice,



                    quantity: Math.floor(qty)



                });



            });



        }



        function hydrateInventoryFromRows(rows) {



            const allItems = getAllItems();



            inventoryItems = [];



            nextItemId = 1;



            const missingRows = [];



            if (!Array.isArray(rows)) return;



            rows.forEach((row) => {



                const qty = Number(row?.qty);



                if (!Number.isFinite(qty) || qty <= 0) return;

                // Skip Kaels - currency is managed separately via character.kaels
                const itemKey = String(row?.item_key || '').toLowerCase();
                if (itemKey === 'kaels') return;



                const resolved = resolveItemByKey(row?.item_key, row?.item_index, row?.item_id);



                const sourceItem = resolved.item;



                if (!sourceItem) {



                    missingRows.push(row);



                    return;



                }



                inventoryItems.push({



                    id: nextItemId++,



                    sourceIndex: resolved.index,



                    ...sourceItem,

                    dbItemId: row.item_id || null,

                    quantity: Math.floor(qty)



                });



            });



            return missingRows;



        }



        function buildInventoryRows(characterId) {



            return inventoryItems



                .map((item) => {



                    if (item?.isCurrency) return null;



                    const qty = Math.floor(Number(item?.quantity) || 0);



                    if (qty <= 0) return null;



                    const resolved = resolveItemByKey(item?.name, item?.sourceIndex, item?.item_id || item?.dbItemId || item?.id);



                    const idx = resolved.index;



                    const itemKey = item?.name || resolved.item?.name;
                    const maybeUuid = String(item?.item_id || item?.dbItemId || '').trim();
                    const itemId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(maybeUuid)
                        ? maybeUuid
                        : null;



                    if (!itemKey) return null;



                    return {



                        character_id: characterId,



                        item_id: itemId,
                        item_key: String(itemKey),



                        item_index: Number.isFinite(idx) && idx >= 0 ? idx : null,



                        qty



                    };



                })



                .filter(Boolean);



        }



        function serializeInventoryItemsCompact() {

            return inventoryItems

                .map((item) => {

                    if (item?.isCurrency) return null;

                    const qty = Math.floor(Number(item?.quantity) || 0);

                    if (qty <= 0) return null;

                    const resolved = resolveItemByKey(
                        item?.name,
                        item?.sourceIndex,
                        item?.item_id || item?.dbItemId || item?.id
                    );

                    const maybeUuid = String(item?.item_id || item?.dbItemId || item?.id || resolved?.item?.id || '').trim();
                    const itemId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(maybeUuid)
                        ? maybeUuid
                        : null;

                    return {
                        itemId,
                        itemKey: String(item?.name || resolved?.item?.name || ''),
                        itemIndex: Number.isFinite(resolved?.index) && resolved.index >= 0
                            ? resolved.index
                            : (Number.isFinite(Number(item?.sourceIndex)) ? Number(item.sourceIndex) : null),
                        qty
                    };
                })

                .filter(Boolean);

        }

        function serializeInventoryForProfile() {



            const totalQty = inventoryItems.reduce((sum, item) => {



                if (item?.isCurrency) return sum;



                const qty = Math.floor(Number(item?.quantity) || 0);



                return sum + (Number.isFinite(qty) ? qty : 0);



            }, 0);



            return {



                version: 1,



                migrated: true,



                itemCount: inventoryItems.filter((item) => !item?.isCurrency).length,



                totalQty,



                characterRank: currentCharacterRank,
                characterRankScore: currentCharacterRankScore,
                characterRankSource: currentCharacterRankSource,



                items: serializeInventoryItemsCompact(),



                scrollTypes: normalizeScrollTypeStore(scrollTypeStore)
                // equippedSlots moved to character_equipped table



            };



        }



        function syncCurrencyItem() {



            if (!authApi || typeof authApi.getActiveCharacter !== 'function') return;



            const character = authApi.getActiveCharacter();



            const rawKaels = Number(character?.kaels ?? 0);



            if (!Number.isFinite(rawKaels)) return;



            const kaels = Math.max(0, Math.floor(rawKaels));



            const existing = inventoryItems.find((item) => item?.isCurrency);



            if (existing) {



                existing.quantity = kaels;



                return;



            }



            inventoryItems.unshift({



                id: 0,



                name: 'Kaels',

                // Currency artwork comes from the item catalogue (js/data.js).
                image: resolveItemByKey('Kaels').item?.image || '',



                category: 'consommable',



                description: "Monnaie officielle d'Astoria.",



                effect: 'Utilisee pour acheter et vendre.',



                quantity: kaels,



                isCurrency: true



            });



        }



        function applyCharacterSilhouette(src) {



            if (!characterSpriteEl) return;



            const safeSrc = src && String(src).trim() ? String(src).trim() : DEFAULT_SILHOUETTE;



            characterSpriteEl.style.backgroundImage = `url('${safeSrc}')`;



            // Hide + button when a custom silhouette is loaded
            const uploadBtn = document.getElementById('silhouetteUploadTrigger');
            if (uploadBtn) {
                const isCustom = safeSrc !== DEFAULT_SILHOUETTE;
                uploadBtn.style.display = isCustom ? 'none' : '';
            }



        }



        function readStoredSilhouette() {



            try {



                const raw = localStorage.getItem(getSilhouetteStorageKey());



                return raw ? String(raw) : '';



            } catch {



                return '';



            }



        }



        async function persistSilhouette(src) {



            const safeSrc = src && String(src).trim() ? String(src).trim() : '';



            try {



                if (safeSrc) {



                    localStorage.setItem(getSilhouetteStorageKey(), safeSrc);



                } else {



                    localStorage.removeItem(getSilhouetteStorageKey());



                }



            } catch {}



            if (inventoryStorageMode !== 'character' || !authApi?.getActiveCharacter || !authApi?.updateCharacter) {



                return;



            }



            const character = authApi.getActiveCharacter();



            if (!character?.id) return;



            const result = await patchInventoryProfile(character.id, (inventory) => {
                const next = { ...inventory };
                if (safeSrc) {
                    next.characterSilhouette = safeSrc;
                } else {
                    delete next.characterSilhouette;
                }
                return next;
            });
            if (!result.success) {
                console.warn('Silhouette save error:', result.error);
            }



        }



        async function loadCharacterSilhouette() {



            let nextSrc = '';



            if (inventoryStorageMode === 'character' && authApi?.getActiveCharacter) {



                const character = authApi.getActiveCharacter();



                nextSrc = String(character?.profile_data?.inventory?.characterSilhouette || '');



            }



            if (!nextSrc) {



                nextSrc = readStoredSilhouette();



            }



            applyCharacterSilhouette(nextSrc || DEFAULT_SILHOUETTE);



        }



        function closeSilhouetteCropper() {
            if (silhouetteCropperBackdrop) {
                modalManager.close(silhouetteCropperBackdrop);
            }
            uploaderCropper.destroy();
            if (silhouetteUploadInput) silhouetteUploadInput.value = '';
        }



        function openSilhouetteCropper(file) {
            if (!file || !silhouetteCropperBackdrop || !silhouetteCropperImage || !window.Cropper) {
                toastManager.warning('Recadrage indisponible');
                return;
            }

            // Use uploaderCropper wrapper for consistency
            const success = uploaderCropper.open(file, {
                imageElement: silhouetteCropperImage,
                aspectRatio: SILHOUETTE_RATIO, // 230:320
                outputWidth: 460,
                outputHeight: 640,
                quality: 0.95,
                enableRotate: true,
                enableZoom: true
            });

            if (!success) {
                toastManager.error('Impossible d\'ouvrir le recadrage');
                return;
            }

            // Show modal
            modalManager.open(silhouetteCropperBackdrop, {
                closeOnBackdropClick: false,
                closeOnEsc: true,
                openClass: 'open'
            });

            // Wire up cropper controls
            if (silhouetteCropperZoom) {
                silhouetteCropperZoom.oninput = () => {
                    if (uploaderCropper.cropper) {
                        uploaderCropper.cropper.zoomTo(Number(silhouetteCropperZoom.value));
                    }
                };
            }

            if (silhouetteCropperZoomIn) {
                silhouetteCropperZoomIn.onclick = () => uploaderCropper.zoomIn();
            }

            if (silhouetteCropperZoomOut) {
                silhouetteCropperZoomOut.onclick = () => uploaderCropper.zoomOut();
            }

            if (silhouetteCropperRotateLeft) {
                silhouetteCropperRotateLeft.onclick = () => uploaderCropper.rotate(-90);
            }

            if (silhouetteCropperRotateRight) {
                silhouetteCropperRotateRight.onclick = () => uploaderCropper.rotate(90);
            }

            if (silhouetteCropperRotate180) {
                silhouetteCropperRotate180.onclick = () => uploaderCropper.rotate(180);
            }

            if (silhouetteCropperFlipX) {
                silhouetteCropperFlipX.onclick = () => uploaderCropper.flipX();
            }

            if (silhouetteCropperFlipY) {
                silhouetteCropperFlipY.onclick = () => uploaderCropper.flipY();
            }

            if (silhouetteCropperReset) {
                silhouetteCropperReset.onclick = () => uploaderCropper.reset();
            }

            // Wire up aspect ratio buttons
            const aspectButtons = silhouetteCropperBackdrop?.querySelectorAll('.cropper-aspect-btn');
            aspectButtons?.forEach(btn => {
                btn.onclick = () => {
                    const ratio = parseFloat(btn.dataset.ratio);
                    if (uploaderCropper.cropper && Number.isFinite(ratio)) {
                        uploaderCropper.cropper.setAspectRatio(ratio);
                        // Update active state
                        aspectButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    }
                };
            });
        }



        function initSilhouetteUploader() {



            if (!characterSpriteEl || !silhouetteUploadInput) return;
            if (silhouetteCropperBackdrop && silhouetteCropperBackdrop.parentElement !== document.body) {
                document.body.appendChild(silhouetteCropperBackdrop);
            }



            characterSpriteEl.title = "Cliquer pour importer une silhouette (cropper).";



            characterSpriteEl.setAttribute('aria-label', 'Importer une silhouette de personnage');
            characterSpriteEl.setAttribute('role', 'button');
            characterSpriteEl.setAttribute('tabindex', '0');
            if (silhouetteUploadTrigger) {
                silhouetteUploadTrigger.title = "Importer une silhouette";
            }

            const triggerSilhouetteUpload = () => {
                silhouetteUploadInput.click();
            };



            characterSpriteEl.addEventListener('click', () => {



                triggerSilhouetteUpload();



            });

            characterSpriteEl.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                triggerSilhouetteUpload();
            });

            silhouetteUploadTrigger?.addEventListener('click', () => {
                triggerSilhouetteUpload();
            });



            silhouetteUploadInput.addEventListener('change', () => {



                const file = silhouetteUploadInput.files?.[0];



                if (!file) return;



                if (!window.Cropper) {



                    alert('Cropper indisponible pour le moment.');



                    silhouetteUploadInput.value = '';



                    return;



                }



                openSilhouetteCropper(file);



                silhouetteUploadInput.value = '';



            });



            silhouetteCropperClose?.addEventListener('click', closeSilhouetteCropper);



            silhouetteCropperCancel?.addEventListener('click', closeSilhouetteCropper);



            silhouetteCropperBackdrop?.addEventListener('click', (event) => {



                if (event.target === silhouetteCropperBackdrop) closeSilhouetteCropper();



            });

            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                if (!silhouetteCropperBackdrop?.classList.contains('open')) return;
                event.preventDefault();
                closeSilhouetteCropper();
            });



            // Zoom handled in openSilhouetteCropper via uploaderCropper

            silhouetteCropperConfirm?.addEventListener('click', async () => {
                if (!uploaderCropper.cropper) return;

                const result = await uploaderCropper.confirm();
                if (!result || !result.blob) {
                    toastManager.error('Recadrage impossible');
                    return;
                }

                // Convert blob to data URL
                const reader = new FileReader();
                reader.onload = async () => {
                    const dataUrl = String(reader.result || '');
                    if (dataUrl) {
                        applyCharacterSilhouette(dataUrl);
                        await persistSilhouette(dataUrl);
                        toastManager.success('Silhouette mise à jour');
                    }
                };
                reader.readAsDataURL(result.blob);

                closeSilhouetteCropper();
            });



        }



        function renderInventoryAccessDenied() {



            if (!inventoryWrapper) return;



            inventoryWrapper.innerHTML = `



                <div class="empty-state">



                    <div class="empty-state-icon">LOCK</div>



                    <div class="empty-state-title">Acces restreint</div>



                    <div class="empty-state-message">



                        Seul le proprietaire du personnage ou un administrateur peut consulter cet inventaire.



                    </div>



                </div>



            `;



        }



        async function initInventoryStorage() {



            inventoryStorageMode = 'local';
            inventoryAccessAllowed = true;
            cachedCompetences = null;



            authApi = null;



            inventoryApi = null;



            try {



                authApi = await import('../../auth.js');



                inventoryApi = await import('../../api/inventory-service.js');

                try {
                    await authApi.refreshSessionUser?.();
                } catch (refreshError) {
                    console.warn('[Inventory Storage] Session refresh skipped:', refreshError);
                }



                const user = authApi.getCurrentUser?.();



                let character = authApi.getActiveCharacter?.();



                const isAdmin = authApi.isAdmin?.() || false;
                if (character?.id && user?.id && !isAdmin && character.user_id && character.user_id !== user.id) {
                    authApi.clearActiveCharacter?.();
                    character = null;
                }
                inventoryAdminMode = Boolean(isAdmin);
                applyInventoryRoleGuards();
                syncInventoryAdminMode();



                console.log('[Inventory Storage] Init:', { user: !!user, character: !!character, characterId: character?.id, isAdmin });

                if (character && character.id) {

                    // Load competences from dedicated table — awaited so getCompetencesSnapshot()
                    // always has data on first call.
                    try {
                        const { getCharacterCompetences } = await import('../../api/competences-service.js');
                        cachedCompetences = await getCharacterCompetences(character.id);
                    } catch {}

                    inventoryStorageMode = 'character';



                    console.log('[Inventory Storage] Mode set to CHARACTER - items will save to database');



                    if (user && character.user_id && !isAdmin && character.user_id !== user.id) {



                        inventoryAccessAllowed = false;



                    }



                } else {



                    console.warn('[Inventory Storage] Mode remains LOCAL - items will only save to localStorage', {
                        reason: !character ? 'No active character' : 'No character ID'
                    });



                }



            } catch (error) {



                // No server / module blocked / auth module unavailable => stay in local mode



                console.error('[Inventory Storage] Failed to initialize - staying in LOCAL mode:', error);



                inventoryStorageMode = 'local';



                authApi = null;



                inventoryApi = null;
                inventoryAdminMode = document.body?.dataset?.admin === 'true';
                applyInventoryRoleGuards();
                syncInventoryAdminMode();

            }

        }

        async function loadInventory() {
            await flushPendingInventorySave();
            inventoryOwnerId = null;
            if (inventoryStorageMode !== 'character' || !authApi || !inventoryApi) {
                inventoryItems = [];
                syncCurrencyItem();
                renderInventory();
                return;
            }
            const character = authApi.getActiveCharacter?.();
            if (!character?.id) return;

            // Always read inventory metadata (scroll types, rank, silhouette) from the
            // database: the cached character may be stale or stripped by session-store.
            let payload = null;
            let rows = null;
            try {
                const [freshChar, inventoryRows] = await Promise.all([
                    authApi.getCharacterById?.(character.id),
                    inventoryApi.getInventoryRows?.(character.id)
                ]);
                if (!freshChar) throw new Error('Character profile unavailable');
                payload = freshChar.profile_data?.inventory || null;
                rows = Array.isArray(inventoryRows) ? inventoryRows : [];
            } catch (error) {
                const msg = String(error?.message || '').toLowerCase();
                const isAbort = error?.name === 'AbortError' || msg.includes('signal is aborted') || msg.includes('aborted');
                if (!isAbort) {
                    console.warn('Inventory load error:', error);
                    window.toastManager?.error?.("Inventaire non chargé (connexion). Recharge la page avant de modifier quoi que ce soit.");
                }
                // Keep the owner unset: nothing will be written until a load succeeds.
                inventoryItems = [];
                scrollTypeStore = {};
                return;
            }
            if (authApi.getActiveCharacter?.()?.id !== character.id) return; // switched meanwhile

            inventoryMigrated = payload?.migrated === true;
            scrollTypeStore = payload?.scrollTypes && typeof payload.scrollTypes === 'object'
                ? payload.scrollTypes
                : {};
            // equippedSlots are now in character_equipped table — loaded below after rows
            equippedSlots = {};

            if (rows.length === 0) {
                try {
                    localStorage.removeItem(getInventoryItemsStorageKey());
                } catch {
                    // ignore cleanup failures
                }
                hydrateInventoryFromRows([]);
                inventoryOwnerId = character.id;
                if (reconcileAllScrollTypeStores()) {
                    persistInventory();
                }
                return;
            }

            const normalizedRows = await reconcileInventoryRows(character.id, rows);
            const missingRows = hydrateInventoryFromRows(normalizedRows) || [];
            inventoryOwnerId = character.id;
            const scrollStoreChanged = reconcileAllScrollTypeStores();
            if (scrollStoreChanged) {
                persistInventory();
            } else if (!Array.isArray(payload?.items) || payload.items.length !== inventoryItems.length) {
                await saveInventoryToCharacterProfile(character.id);
            }

            try {
                const equippedRows = await inventoryApi.getEquippedSlots?.(character.id);
                if (Array.isArray(equippedRows) && equippedRows.length > 0) {
                    const fromDb = {};
                    equippedRows.forEach((row) => {
                        const built = buildEquippedItem(row.item_key, row.item_index, row.item_id);
                        if (built && isItemEquippable(built)) {
                            fromDb[row.slot_key] = built;
                        }
                    });
                    equippedSlots = fromDb;
                }
            } catch (eqErr) {
                console.warn('[Inventory] Could not load equipped slots from DB:', eqErr);
            }

            if (missingRows.length) {
                await cleanupMissingInventoryRows(character.id, missingRows);
            }
        }

        async function cleanupMissingInventoryRows(characterId, rows) {



            if (!characterId || !inventoryApi?.setInventoryItem) return;



            const deletions = rows.map((row) => {



                const key = row?.item_key ?? row?.item_index;



                if (key == null) return null;



                return inventoryApi.setInventoryItem(characterId, {
                    item_key: String(key),
                    item_id: row?.item_id || null,
                    item_index: row?.item_index
                }, 0);



            }).filter(Boolean);



            if (!deletions.length) return;



            try {



                await Promise.allSettled(deletions);



                console.log(`Removed ${deletions.length} missing inventory items.`);



            } catch (error) {



                console.warn('Failed to cleanup missing inventory items:', error);



            }



        }



        async function patchInventoryProfile(characterId, mutateInventory) {
            if (!characterId || !authApi?.patchCharacterProfile) {
                return { success: false, error: new Error('Profile patch unavailable') };
            }
            return authApi.patchCharacterProfile(characterId, (profileData) => {
                const inventory = mutateInventory({ ...(profileData.inventory || {}) });
                return inventory ? { ...profileData, inventory } : null;
            });
        }

        // Per scroll item, keep the most recently updated distribution between the
        // database copy and the in-memory one (another page may have changed it).
        function mergeScrollTypeStores(remoteStore, localStore) {
            const store = window.astoriaScrollStore;
            let merged = {};
            inventoryItems.forEach((item) => {
                const category = getScrollCategory(item);
                if (!category) return;
                const qty = Math.floor(Number(item?.quantity) || 0);
                const remote = store.findEntry(remoteStore?.[category], item, qty);
                const local = store.findEntry(localStore?.[category], item, qty);
                let pick = remote || local;
                if (remote && local) {
                    pick = (Number(remote.entry.updatedAt) || 0) > (Number(local.entry.updatedAt) || 0) ? remote : local;
                }
                if (!pick) return;
                merged = store.setCounts(merged, category, item, pick.entry.counts);
                const entry = merged[category]?.[store.getCanonicalKey(item)];
                if (entry) entry.updatedAt = Number(pick.entry.updatedAt) || 0;
            });
            return merged;
        }

        async function saveInventoryToCharacterProfile(ownerId) {
            if (inventoryStorageMode !== 'character' || !ownerId) return;
            const localInventory = serializeInventoryForProfile();
            const result = await patchInventoryProfile(ownerId, (inventory) => ({
                ...inventory,
                ...localInventory,
                scrollTypes: mergeScrollTypeStores(inventory.scrollTypes, scrollTypeStore)
            }));
            if (!result.success) {
                console.warn('Inventory save error (profile_data):', result.error);
                return;
            }
            if (ownerId === inventoryOwnerId) {
                scrollTypeStore = result.profileData?.inventory?.scrollTypes || {};
            }
        }

        async function saveInventoryToBackend(ownerId) {
            if (inventoryStorageMode !== 'character' || !authApi || !inventoryApi || !ownerId) {
                return;
            }
            // The in-memory inventory now belongs to another character: never write it.
            if (ownerId !== inventoryOwnerId) {
                console.warn('[Inventory Storage] Save skipped: inventory owner changed before save.');
                return;
            }
            const rows = buildInventoryRows(ownerId);
            let saved = false;
            try {
                await inventoryApi.replaceInventoryRows?.(ownerId, rows);
                saved = true;
            } catch (error) {
                console.warn('Inventory save error (character_inventory):', error);
                window.toastManager?.error?.("Sauvegarde de l'inventaire impossible. Réessaie dans un instant.");
            }
            const character = authApi.getActiveCharacter?.();
            const currencyItem = inventoryItems.find(item => item?.isCurrency);
            if (character?.id === ownerId && currencyItem && Number.isFinite(currencyItem.quantity)) {
                const kaels = Math.max(0, Math.floor(currencyItem.quantity));
                const currentKaels = Number(character?.kaels ?? 0);
                if (kaels !== currentKaels) {
                    try {
                        await authApi.updateCharacter?.(ownerId, { kaels });
                    } catch (error) {
                        console.warn('Kaels save error:', error);
                    }
                }
            }
            await saveInventoryToCharacterProfile(ownerId);
            if (saved) {
                broadcastInventorySync('save');
            }
        }

        function persistInventory() {
            // Always keep local backup (handy for offline testing)
            saveToLocalStorage();
            if (inventoryStorageMode !== 'character') return;
            if (!inventoryOwnerId) return;
            if (pendingProfileSaveTimer) {
                clearTimeout(pendingProfileSaveTimer);
            }
            pendingSaveOwnerId = inventoryOwnerId;
            pendingProfileSaveTimer = setTimeout(() => {
                const ownerId = pendingSaveOwnerId;
                pendingProfileSaveTimer = null;
                pendingSaveOwnerId = null;
                void saveInventoryToBackend(ownerId);
            }, 500);
        }

        // Runs a pending debounced save now (before switching character / leaving).
        async function flushPendingInventorySave() {
            if (!pendingProfileSaveTimer) return;
            clearTimeout(pendingProfileSaveTimer);
            const ownerId = pendingSaveOwnerId;
            pendingProfileSaveTimer = null;
            pendingSaveOwnerId = null;
            await saveInventoryToBackend(ownerId);
        }

        /**



         * TEMPORARY: Load inventory from localStorage



         *



         * For testing purposes only. In production, this will be replaced



         * with a proper API call to load the user's inventory from the server.



         *



         * Storage key: 'astoriaInventory'



         * Format: JSON array of inventory items with quantities



         */



        function loadFromLocalStorage() {



            equippedSlots = loadEquippedSlotsFromLocalStorage();



            try {



                const stored = localStorage.getItem(getInventoryItemsStorageKey());



                if (stored) {



                    const parsed = JSON.parse(stored);



                    if (Array.isArray(parsed)) {



                        inventoryItems = parsed;



                    } else if (parsed && Array.isArray(parsed.items)) {



                        // Allow reading compact format if we ever store it locally too



                        hydrateInventoryFromCompact(parsed.items);



                        if (parsed.equippedSlots || parsed.equipped) {



                            equippedSlots = normalizeEquippedSlots(parsed.equippedSlots || parsed.equipped);



                        }



                    } else {



                        inventoryItems = [];



                    }



                    nextItemId = Math.max(...inventoryItems.map(i => i.id), 0) + 1;

                    if (reconcileAllScrollTypeStores()) {
                        saveToLocalStorage();
                    }



                    console.log(`Loaded ${inventoryItems.length} items from localStorage`);



                } else {



                    inventoryItems = [];



                    console.log('No inventory found in localStorage - starting empty');



                }



            } catch (error) {



                console.error('Error loading from localStorage:', error);



                inventoryItems = [];



            }



        }



        /**



         * TEMPORARY: Save inventory to localStorage



         *



         * For testing purposes only. In production, this will be replaced



         * with API calls to persist changes to the server.



         */



        function saveToLocalStorage() {



            try {



                localStorage.setItem(getInventoryItemsStorageKey(), JSON.stringify(inventoryItems));



                localStorage.setItem(getEquippedSlotsStorageKey(), JSON.stringify(serializeEquippedSlots()));



                console.log('Inventory saved to localStorage');



            } catch (error) {



                console.error('Error saving to localStorage:', error);



            }



        }



        // =================================================================
        // ITEMS MODAL (replaces old add panel)
        // =================================================================

        // Attach event listener to open items modal
        openAddBtn.addEventListener('click', () => {
            if (!syncInventoryAdminMode()) {
                toastManager?.error?.('Action reservee aux administrateurs.');
                return;
            }
            if (window.astoriaItemsModal) {
                window.astoriaItemsModal.open();
            } else {
                console.warn('[Inventory] Items modal not ready yet');
            }
        });



        if (scrollPanelAddBtn) {



            scrollPanelAddBtn.addEventListener('click', () => {



                if (scrollPanelAddBtn.disabled) return;
                if (!syncInventoryAdminMode()) return;



                setScrollAddOpen(!scrollAddOpen);



                renderScrollSuggestions(scrollTypeSearch?.value || '');



                syncScrollPanelHeights();



            });



        }



        if (scrollTypeSearch) {



            scrollTypeSearch.addEventListener('input', (event) => {



                renderScrollSuggestions(event.target.value);



                syncScrollPanelHeights();



            });



        }



        if (scrollTypeSuggestions) {



            scrollTypeSuggestions.addEventListener('click', (event) => {

                if (!syncInventoryAdminMode()) return;



                const addButton = event.target.closest('.scroll-suggestion-add');



                if (!addButton) return;



                const row = addButton.closest('.scroll-suggestion-row');



                if (!row) return;



                const qtyInput = row.querySelector('.scroll-suggestion-qty');



                addScrollTypeCount(row.dataset.typeKey, qtyInput?.value);



                if (qtyInput) qtyInput.value = 1;



            });



        }



        if (scrollRandomAddBtn) {



            scrollRandomAddBtn.addEventListener('click', () => {

                if (!syncInventoryAdminMode()) return;

                addRandomScrollTypeCounts(scrollRandomQty?.value);

                if (scrollRandomQty) scrollRandomQty.value = 1;

            });



        }



        if (scrollPanelList) {



            scrollPanelList.addEventListener('click', (event) => {



                const addButton = event.target.closest('.scroll-type-add');



                const removeButton = event.target.closest('.scroll-type-remove');



                const qtyButton = event.target.closest('.scroll-type-qty-btn');



                const item = event.target.closest('.scroll-type-item');



                if (!item) return;



                const typeKey = item.dataset.typeKey;



                if (addButton) {

                    if (!syncInventoryAdminMode()) return;



                    const qtyInput = item.querySelector('.scroll-type-qty-input');



                    addScrollTypeCount(typeKey, qtyInput?.value);



                    if (qtyInput) qtyInput.value = 1;



                    return;



                }



                if (removeButton) {

                    if (!syncInventoryAdminMode()) return;



                    const qtyInput = item.querySelector('.scroll-type-qty-input');



                    removeScrollTypeCount(typeKey, qtyInput?.value);



                    if (qtyInput) qtyInput.value = 1;



                    return;



                }



                if (qtyButton) {

                    if (!syncInventoryAdminMode()) return;



                    const qtyInput = item.querySelector('.scroll-type-qty-input');



                    if (!qtyInput) return;



                    const current = parseInt(qtyInput.value, 10) || 1;



                    const action = qtyButton.dataset.action;



                    qtyInput.value = Math.max(1, action === 'minus' ? current - 1 : current + 1);



                    return;



                }



                const row = event.target.closest('.scroll-type-row');



                if (row) {



                    selectedScrollTypeKey = typeKey;



                    if (currentScrollItem && scrollPanelCategory) {



                        const { counts } = loadScrollCounts(scrollPanelCategory, currentScrollItem);



                        renderScrollPanelList(scrollPanelCategory, counts);



                    }



                }



            });



            scrollPanelList.addEventListener('keydown', (event) => {

                if (!syncInventoryAdminMode()) return;



                if (event.key !== 'Enter') return;



                const input = event.target.closest('.scroll-type-qty-input');



                if (!input) return;



                const item = input.closest('.scroll-type-item');



                if (!item) return;



                addScrollTypeCount(item.dataset.typeKey, input.value);



                input.value = 1;



            });



        }



        window.addEventListener('resize', syncScrollPanelHeights);



        // =================================================================



        // CATEGORY FILTERING



        // =================================================================



        /**



         * Filter inventory by category



         * - Updates active button



         * - Clears selection



         * - Re-renders grid



         */



        function filterByCategory(category) {



            currentCategory = category;



            selectedItemIndex = null;



            // Update active button



            categoryButtons.forEach(btn => {



                if (btn.dataset.category === category) {



                    btn.classList.add('active');



                } else {



                    btn.classList.remove('active');



                }



            });



            renderInventory();



        }



        // Attach click handlers to category buttons



        categoryButtons.forEach(btn => {



            btn.addEventListener('click', () => {



                filterByCategory(btn.dataset.category);



            });



        });



        if (searchRoot && searchInput && window.astoriaSearchBar) {



            window.astoriaSearchBar.bind({



                root: searchRoot,



                input: searchInput,



                toggle: searchToggle,



                clearButton: searchClear,



                dropdown: searchHistoryDropdown,



                history: searchHistory,



                hotkey: ' ',



                debounceWait: 200,



                onSearch: (value) => {



                    currentSearchQuery = String(value || '').trim().toLowerCase();



                    renderInventory();



                }



            });



        }



        // Sort dropdown
        if (sortBtn && sortDropdown) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = !sortDropdown.hidden;
                sortDropdown.hidden = open;
                sortBtn.setAttribute('aria-expanded', String(!open));
            });

            sortDropdown.addEventListener('click', (e) => {
                const opt = e.target.closest('.sort-option');
                if (!opt) return;
                currentSort = opt.dataset.sort;
                sortDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                sortDropdown.hidden = true;
                sortBtn.setAttribute('aria-expanded', 'false');
                renderInventory();
            });

            document.addEventListener('click', () => {
                if (!sortDropdown.hidden) {
                    sortDropdown.hidden = true;
                    sortBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // =================================================================

        // IMAGE RESOLUTION



        // =================================================================



        /**



         * Resolve image path from item data



         * - Checks IMAGE_CONFIG mappings



         * - Supports direct URLs



         * - Falls back to placeholder



         */



        function resolveImage(item) {



            const helpers = window.astoriaImageHelpers || {};



            if (helpers.resolveItemImages) {



                const resolved = helpers.resolveItemImages(item);



                if (resolved && resolved.primary) {



                    return resolved.primary;



                }



            }



            // Fallback local (au cas où le helper n'est pas disponible)



            if (item) {



                const raw = item.image || item.img || item?.images?.primary || item?.images?.url || '';



                if (typeof raw === 'string' && raw.trim()) {



                    return raw;



                }



                const name = String(item.name || '').trim().toLowerCase();



                if (name === 'lucky soul' || name === 'ames chances') {



                    return 'assets/nokorah/lucky-soul.svg';



                }



            }



            // No match found, use placeholder



            return PLACEHOLDER_IMAGE;



        }



        // =================================================================



        // SCROLL TYPES PANEL



        // =================================================================



        const normalizeText = window.astoriaListHelpers.normalizeText;



        function getScrollCategory(item) {



            const helper = window.astoriaItemTags;



            if (helper?.getScrollCategory) {



                return helper.getScrollCategory(item);



            }



            if (!item || !item.name) return null;



            const name = normalizeText(item.name);



            if (!name.includes('parchemin') && !name.includes('scroll')) return null;



            if (name.includes('eveil') || name.includes('eveille') || (name.includes('veil') && name.includes('parchemin'))) return 'eveil';



            if (name.includes('ascension')) return 'ascension';



            return null;



        }



        function getScrollTypeKey(item) {



            const taggedKey = window.astoriaItemTags?.getScrollTypeKeyFromTags?.(item);



            if (taggedKey) return taggedKey;



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



        const SCROLL_STORAGE_PREFIX = 'astoriaScrollTypes:v1';



        function getEmptyScrollCounts() {



            const counts = {};



            SCROLL_TYPES.forEach((type) => {



                counts[type.key] = 0;



            });



            return counts;



        }



        function getScrollItemKey(item) {
            // Shared canonical key (js/scroll-store.js) so every page reads/writes the same entry.
            return window.astoriaScrollStore.getCanonicalKey(item);
        }

        function getScrollStorageKey(category, item, useLegacy = false) {

            const characterScope = !useLegacy && inventoryStorageMode === 'character'
                ? (authApi?.getActiveCharacter?.()?.id || 'character')
                : 'shared';



            const idPart = useLegacy ? (item?.id ?? item?.name ?? 'unknown') : getScrollItemKey(item);



            return `${SCROLL_STORAGE_PREFIX}:${characterScope}:${category}:${idPart}`;



        }



        function clearScrollCountsForItem(item) {



            const category = getScrollCategory(item);



            if (!category || !item) return;



            scrollTypeStore = window.astoriaScrollStore.setCounts(scrollTypeStore, category, item, {});

            const key = getScrollStorageKey(category, item, false);



            const legacyKey = getScrollStorageKey(category, item, true);

            const unscopedKey = `${SCROLL_STORAGE_PREFIX}:${category}:${getScrollItemKey(item)}`;

            const legacyUnscopedKey = `${SCROLL_STORAGE_PREFIX}:${category}:${item?.id ?? item?.name ?? 'unknown'}`;



            try {



                localStorage.removeItem(key);

                if (unscopedKey !== key) {

                    localStorage.removeItem(unscopedKey);

                }



                if (legacyKey !== key) {



                    localStorage.removeItem(legacyKey);



                }

                if (legacyUnscopedKey !== legacyKey && legacyUnscopedKey !== key) {

                    localStorage.removeItem(legacyUnscopedKey);

                }



            } catch {



                // ignore storage cleanup failures



            }



        }



        function resetScrollCountsAfterQtyChange(item) {



            const category = getScrollCategory(item);



            if (!category) return;



            const nextQty = Math.max(0, Math.floor(Number(item?.quantity) || 0));



            const seededTypeKey = getScrollTypeKey(item);



            if (seededTypeKey) {
                // Fixed element: clear and rewrite with exact qty
                clearScrollCountsForItem(item);

                if (nextQty > 0) {
                    const counts = getEmptyScrollCounts();
                    if (counts[seededTypeKey] === undefined) {
                        counts[seededTypeKey] = 0;
                    }
                    counts[seededTypeKey] = nextQty;
                    saveScrollCounts(category, item, counts);
                } else {
                    persistInventory();
                }
            } else {
                // Random element (e.g. Parchemin d'Éveil): preserve existing element assignment
                persistInventory();
            }



        }



        function normalizeScrollCounts(rawCounts) {



            const counts = getEmptyScrollCounts();



            if (!rawCounts) return counts;



            Object.keys(rawCounts).forEach((typeKey) => {



                if (counts[typeKey] === undefined) {



                    counts[typeKey] = 0;



                }



            });



            Object.keys(counts).forEach((typeKey) => {



                const value = Number(rawCounts[typeKey]);



                counts[typeKey] = Number.isFinite(value) && value > 0 ? value : 0;



            });



            return counts;



        }



        function normalizeScrollTypeStore(rawStore) {
            if (!rawStore || typeof rawStore !== 'object') return {};
            // One entry per scroll item still in the inventory, under its canonical
            // key (legacy alias keys are migrated), positive counts only.
            return mergeScrollTypeStores(rawStore, null);
        }

        function getScrollStoreEntry(category, item) {
            if (!scrollTypeStore || typeof scrollTypeStore !== 'object') return null;
            return window.astoriaScrollStore.findEntry(scrollTypeStore[category], item)?.entry || null;
        }

        function setScrollStoreEntry(category, item, counts) {
            scrollTypeStore = window.astoriaScrollStore.setCounts(scrollTypeStore, category, item, counts);
        }

        function loadScrollCountsFromLocalStorage(category, item, { scopedOnly = false } = {}) {



            const counts = getEmptyScrollCounts();



            const key = getScrollStorageKey(category, item, false);



            const legacyKey = getScrollStorageKey(category, item, true);

            const unscopedKey = `${SCROLL_STORAGE_PREFIX}:${category}:${getScrollItemKey(item)}`;

            const legacyUnscopedKey = `${SCROLL_STORAGE_PREFIX}:${category}:${item?.id ?? item?.name ?? 'unknown'}`;



            // Unscoped/legacy keys are shared by every character of the browser:
            // never use them for a character inventory (cross-character contamination).
            const raw = scopedOnly
                ? localStorage.getItem(key)
                : localStorage.getItem(key)
                || localStorage.getItem(unscopedKey)
                || (legacyKey !== key ? localStorage.getItem(legacyKey) : null)
                || (legacyUnscopedKey !== legacyKey ? localStorage.getItem(legacyUnscopedKey) : null);



            if (raw) {



                try {



                    const parsed = JSON.parse(raw);



                    if (parsed && typeof parsed === 'object' && parsed.counts) {



                        return { counts: normalizeScrollCounts(parsed.counts), hasStored: true };



                    }



                } catch (error) {



                    console.warn('Scroll counts parse failed:', error);



                }



            }



            return { counts, hasStored: false };



        }



        function loadScrollCountsFromProfile(category, item) {



            const entry = getScrollStoreEntry(category, item);



            if (entry && entry.counts) {



                return { counts: normalizeScrollCounts(entry.counts), hasStored: true };



            }



            return { counts: getEmptyScrollCounts(), hasStored: false };



        }



        function loadScrollCounts(category, item) {



            if (!category || !item) {



                return { counts: getEmptyScrollCounts(), hasStored: false };



            }



            if (inventoryStorageMode === 'character' && authApi) {



                const fromProfile = loadScrollCountsFromProfile(category, item);



                if (fromProfile.hasStored) return reconcileScrollCountsWithInventoryQuantity(category, item, fromProfile.counts);



                // Only migrate localStorage → DB if the character has NO scrollTypes data at all in their profile.
                // If scrollTypeStore has any data (DB was already set), skip localStorage entirely to avoid
                // overwriting manually-assigned or admin-rerolled elements with stale localStorage values.
                const hasAnyProfileScrollData = scrollTypeStore && Object.keys(scrollTypeStore).length > 0;

                if (!inventoryMigrated && !hasAnyProfileScrollData) {



                    const legacy = loadScrollCountsFromLocalStorage(category, item, { scopedOnly: true });



                    if (legacy.hasStored) {



                        setScrollStoreEntry(category, item, legacy.counts);



                        return reconcileScrollCountsWithInventoryQuantity(category, item, legacy.counts);



                    }



                }

                // Character mode: never fall through to localStorage.
                // If the item wasn't found in scrollTypeStore (key mismatch or new item),
                // return empty counts so the caller assigns a random element fresh from DB data,
                // NOT from stale localStorage eau/feu values.
                return { counts: getEmptyScrollCounts(), hasStored: false };

            }



            const local = loadScrollCountsFromLocalStorage(category, item);



            if (local.hasStored) return reconcileScrollCountsWithInventoryQuantity(category, item, local.counts);



            const seededTypeKey = getScrollTypeKey(item);



            const seededQty = Math.max(0, Number(item.quantity) || 0);



            if (seededTypeKey && seededQty > 0) {



                const counts = getEmptyScrollCounts();



                if (counts[seededTypeKey] === undefined) {



                    counts[seededTypeKey] = 0;



                }



                counts[seededTypeKey] = seededQty;



                saveScrollCounts(category, item, counts);



                return { counts, hasStored: true };



            }



            return { counts: getEmptyScrollCounts(), hasStored: false };



        }



        function saveScrollCounts(category, item, counts) {



            if (!category || !item) return;



            const payload = {



                counts: normalizeScrollCounts(counts),



                updatedAt: Date.now()



            };



            if (inventoryStorageMode !== 'character' || !authApi) {
                try {
                    localStorage.setItem(getScrollStorageKey(category, item, false), JSON.stringify(payload));
                } catch {}
            }



            if (inventoryStorageMode === 'character' && authApi) {



                setScrollStoreEntry(category, item, payload.counts);



                persistInventory();



            }



        }



        function reconcileScrollCountsWithInventoryQuantity(category, item, counts) {

            const normalizedCounts = normalizeScrollCounts(counts);
            const targetQty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
            const currentTotal = sumScrollCounts(normalizedCounts);

            if (targetQty === currentTotal) {
                return { counts: normalizedCounts, hasStored: currentTotal > 0 };
            }

            if (targetQty <= 0) {
                clearScrollCountsForItem(item);
                return { counts: getEmptyScrollCounts(), hasStored: false };
            }

            const nextCounts = getEmptyScrollCounts();
            const nonZeroKeys = Object.keys(normalizedCounts).filter((key) => (normalizedCounts[key] || 0) > 0);
            const seededTypeKey = getScrollTypeKey(item);

            if (nonZeroKeys.length === 1) {
                nextCounts[nonZeroKeys[0]] = targetQty;
            } else if (seededTypeKey) {
                if (nextCounts[seededTypeKey] === undefined) {
                    nextCounts[seededTypeKey] = 0;
                }
                nextCounts[seededTypeKey] = targetQty;
            } else if (nonZeroKeys.length > 1 && currentTotal > 0) {
                let remaining = targetQty;
                nonZeroKeys.forEach((key, index) => {
                    if (index === nonZeroKeys.length - 1) {
                        nextCounts[key] = remaining;
                        return;
                    }
                    const share = Number(normalizedCounts[key]) || 0;
                    const proportional = Math.max(0, Math.min(remaining, Math.round((share / currentTotal) * targetQty)));
                    nextCounts[key] = proportional;
                    remaining -= proportional;
                });
            } else {
                const fallbackKey = nonZeroKeys[0] || seededTypeKey;
                if (fallbackKey) {
                    if (nextCounts[fallbackKey] === undefined) {
                        nextCounts[fallbackKey] = 0;
                    }
                    nextCounts[fallbackKey] = targetQty;
                }
            }

            saveScrollCounts(category, item, nextCounts);
            return { counts: nextCounts, hasStored: true };

        }

        function reconcileAllScrollTypeStores() {
            const before = JSON.stringify(normalizeScrollTypeStore(scrollTypeStore));

            scrollTypeStore = normalizeScrollTypeStore(scrollTypeStore);

            inventoryItems.forEach((item) => {
                const category = getScrollCategory(item);
                if (!category) return;
                loadScrollCounts(category, item);
            });

            const after = JSON.stringify(normalizeScrollTypeStore(scrollTypeStore));
            scrollTypeStore = normalizeScrollTypeStore(scrollTypeStore);

            return before !== after;
        }

        function sumScrollCounts(counts) {



            return Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);



        }



        function syncScrollPanelHeights() {



            if (!scrollTypesPanel || !detailPanel || !scrollPanelHeader || !scrollPanelBody) return;



            const detailHeight = detailPanel.offsetHeight;



            if (!detailHeight) return;



            scrollTypesPanel.style.maxHeight = `${detailHeight}px`;



            const panelStyles = window.getComputedStyle(scrollTypesPanel);



            const paddingTop = parseFloat(panelStyles.paddingTop) || 0;



            const paddingBottom = parseFloat(panelStyles.paddingBottom) || 0;



            const headerHeight = scrollPanelHeader.offsetHeight;



            const maxBodyHeight = Math.max(160, detailHeight - headerHeight - paddingTop - paddingBottom);



            scrollPanelBody.style.maxHeight = `${maxBodyHeight}px`;



        }



        function setScrollPanelOpen(isOpen) {



            scrollPanelOpen = isOpen;



            if (inventoryContent) {



                inventoryContent.classList.toggle('scroll-panel-open', isOpen);



            }



            if (scrollTypesPanel) {



                scrollTypesPanel.classList.toggle('open', isOpen);



                scrollTypesPanel.setAttribute('aria-hidden', String(!isOpen));



            }



            if (scrollPanelToggleBtn) {



                scrollPanelToggleBtn.setAttribute('aria-expanded', String(isOpen));



            }



            if (!isOpen) {



                setScrollAddOpen(false);



            }



            syncScrollPanelHeights();



        }



        function setScrollPanelEmpty(message) {



            if (!scrollPanelTitle || !scrollPanelEmpty || !scrollPanelList) return;



            scrollPanelTitle.textContent = 'Types de parchemins';



            scrollPanelEmpty.textContent = message;



            scrollPanelEmpty.style.display = 'block';



            scrollPanelList.innerHTML = '';



            scrollPanelList.style.display = 'none';



        }



        function renderScrollPanelList(category, counts) {



            if (!scrollPanelTitle || !scrollPanelList || !scrollPanelEmpty) return;



            const titleText = category === 'eveil' ? '\u00c9veil' : 'Ascension';



            const visibleKeys = Object.keys(counts).filter((key) => (counts[key] || 0) > 0);



            const visibleTypes = visibleKeys



                .map((key) => getScrollTypeMetaByKey(key))



                .filter(Boolean);



            scrollPanelTitle.textContent = titleText;



            if (visibleTypes.length === 0) {



                scrollPanelEmpty.textContent = 'Aucun type enregistré pour ce parchemin.';



                scrollPanelEmpty.style.display = 'block';



                scrollPanelList.innerHTML = '';



                scrollPanelList.style.display = 'none';



                return;



            }



            scrollPanelEmpty.style.display = 'none';



            scrollPanelList.style.display = 'grid';



            const canManageInventory = syncInventoryAdminMode();

            const rows = visibleTypes.map((type) => {



                const count = counts[type.key] || 0;



                const isSelected = type.key === selectedScrollTypeKey;



                return `



                    <div class="scroll-type-item${isSelected ? ' selected' : ''}" data-type-key="${type.key}">



                        <div class="scroll-type-row">



                            <span class="scroll-type-label">${escapeHtml(type.emoji)} ${escapeHtml(type.label)}</span>



                            <span class="scroll-type-count">x${count}</span>



                        </div>



                        ${isSelected && canManageInventory ? `



                        <div class="scroll-type-controls">



                            <button type="button" class="scroll-type-qty-btn tw-press" data-action="minus">-</button>



                            <input type="number" min="1" value="1" class="scroll-type-qty-input">



                            <button type="button" class="scroll-type-qty-btn tw-press" data-action="plus">+</button>



                            <button type="button" class="scroll-type-add tw-press">Ajouter</button>



                            <button type="button" class="scroll-type-remove tw-press">Retirer</button>



                        </div>



                        ` : ''}



                    </div>



                `;



            }).join('');



            scrollPanelList.innerHTML = rows;



        }



        function setScrollAddOpen(isOpen) {



            scrollAddOpen = isOpen;



            if (!scrollPanelAdd || !scrollPanelAddBtn) return;



            scrollPanelAdd.classList.toggle('open', isOpen);



            scrollPanelAdd.setAttribute('aria-hidden', String(!isOpen));



            scrollPanelAddBtn.setAttribute('aria-expanded', String(isOpen));



            if (!isOpen && scrollTypeSearch) {



                scrollTypeSearch.value = '';



            }



        }



        function renderScrollSuggestions(filterText) {



            if (!scrollTypeSuggestions) return;



            const term = normalizeText(filterText);



            const filtered = SCROLL_TYPES.filter((type) => {



                if (!term) return true;



                if (normalizeText(type.label).includes(term)) return true;



                if (normalizeText(type.key).includes(term)) return true;



                return type.matchers?.some((matcher) => normalizeText(matcher).includes(term));



            });



            if (filtered.length === 0) {



                scrollTypeSuggestions.innerHTML = '<div class="scroll-suggestion-empty">Aucun type trouvé.</div>';



                return;



            }



            scrollTypeSuggestions.innerHTML = filtered.map((type) => {



                return `



                    <div class="scroll-suggestion-row" data-type-key="${type.key}">



                        <span class="scroll-suggestion-label">${escapeHtml(type.emoji)} ${escapeHtml(type.label)}</span>



                        <div class="scroll-suggestion-controls">



                            <input type="number" min="1" value="1" class="scroll-suggestion-qty">



                            <button type="button" class="scroll-suggestion-add tw-press">Ajouter</button>



                        </div>



                    </div>



                `;



            }).join('');



        }



        function addScrollTypeCount(typeKey, qty) {

            if (!syncInventoryAdminMode()) return;



            if (!currentScrollItem || !scrollPanelCategory) return;



            const safeQty = Math.max(0, Math.floor(Number(qty) || 0));



            if (safeQty < 1) return;



            const { counts } = loadScrollCounts(scrollPanelCategory, currentScrollItem);



            if (counts[typeKey] === undefined) counts[typeKey] = 0;



            counts[typeKey] = (counts[typeKey] || 0) + safeQty;



            saveScrollCounts(scrollPanelCategory, currentScrollItem, counts);



            const total = sumScrollCounts(counts);



            currentScrollItem.quantity = total;



            persistInventory();



            renderInventory();



            showItemDetail(currentScrollItem);



        }



        function addRandomScrollTypeCounts(qty) {

            if (!syncInventoryAdminMode()) return;



            if (!currentScrollItem || !scrollPanelCategory) return;



            const safeQty = Math.max(0, Math.floor(Number(qty) || 0));



            if (safeQty < 1) return;



            const availableTypes = Array.isArray(SCROLL_TYPES) ? SCROLL_TYPES.filter((type) => String(type?.key || '').trim()) : [];



            if (!availableTypes.length) return;



            const { counts } = loadScrollCounts(scrollPanelCategory, currentScrollItem);



            for (let index = 0; index < safeQty; index += 1) {

                const picked = availableTypes[Math.floor(Math.random() * availableTypes.length)];

                const typeKey = String(picked?.key || '').trim();

                if (!typeKey) continue;

                if (counts[typeKey] === undefined) counts[typeKey] = 0;

                counts[typeKey] = (counts[typeKey] || 0) + 1;

            }



            saveScrollCounts(scrollPanelCategory, currentScrollItem, counts);



            const total = sumScrollCounts(counts);



            currentScrollItem.quantity = total;



            persistInventory();



            renderInventory();



            showItemDetail(currentScrollItem);



        }



        function removeScrollTypeCount(typeKey, qty) {

            if (!syncInventoryAdminMode()) return;



            if (!currentScrollItem || !scrollPanelCategory) return;



            const safeQty = Math.max(0, Math.floor(Number(qty) || 0));



            if (safeQty < 1) return;



            const { counts } = loadScrollCounts(scrollPanelCategory, currentScrollItem);



            if (counts[typeKey] === undefined) counts[typeKey] = 0;



            const current = Number(counts[typeKey]) || 0;



            const next = Math.max(0, current - safeQty);



            counts[typeKey] = next;



            const total = sumScrollCounts(counts);



            if (total <= 0) {



                clearScrollCountsForItem(currentScrollItem);



                currentScrollItem.quantity = 0;



                const index = inventoryItems.findIndex((entry) => entry?.id === currentScrollItem?.id);



                if (index >= 0) {



                    inventoryItems.splice(index, 1);



                    if (selectedItemIndex === currentScrollItem?.id) {



                        selectedItemIndex = null;



                        showDetailPlaceholder();



                    }



                }



            } else {



                saveScrollCounts(scrollPanelCategory, currentScrollItem, counts);



                currentScrollItem.quantity = total;



            }



            persistInventory();



            renderInventory();



            if (selectedItemIndex === currentScrollItem?.id && total > 0) {



                showItemDetail(currentScrollItem);



            }



        }



        function updateScrollPanelForItem(item) {



            const category = getScrollCategory(item);



            scrollPanelCategory = category;



            currentScrollItem = item || null;



            const nextItemId = item?.id ?? null;



            if (nextItemId !== lastScrollItemId) {



                selectedScrollTypeKey = null;



                scrollAddOpen = true;



                lastScrollItemId = nextItemId;



            }



            if (!category) {



                if (scrollPanelToggleBtn) {



                    scrollPanelToggleBtn.disabled = true;



                    scrollPanelToggleBtn.setAttribute('aria-expanded', 'false');



                }



                if (scrollPanelAddBtn) {



                    scrollPanelAddBtn.disabled = true;



                }



                setScrollPanelOpen(false);



                setScrollPanelEmpty('Aucun type de parchemin disponible.');



                return;



            }



            if (scrollPanelToggleBtn) {



                scrollPanelToggleBtn.disabled = false;



            }



            if (scrollPanelAddBtn) {



                scrollPanelAddBtn.disabled = false;



            }



            const { counts, hasStored } = loadScrollCounts(category, item);



            if (hasStored) {



                const total = sumScrollCounts(counts);



                if (Number.isFinite(total) && item.quantity !== total) {



                    item.quantity = total;



                    persistInventory();



                }



            }



            renderScrollPanelList(category, counts);



            setScrollAddOpen(scrollAddOpen);



            renderScrollSuggestions(scrollTypeSearch?.value || '');



            syncScrollPanelHeights();



        }



        // =================================================================



        // RENDERING



        // =================================================================
















        function getEquippedItemsForStats() {
            return Object.values(equippedSlots || {}).filter((item) => item);
        }

        function refreshCharacterStatsPanel(previewItem = statsPreviewItem) {
            if (!window.InventoryStats) return;
            const equippedItems = getEquippedItemsForStats();
            const equippedStats = window.InventoryStats.calculateTotalStats(equippedItems);
            window.InventoryStats.updateStatsDisplay(equippedStats);
        }

        function setStatsPreviewItem(item) {
            statsPreviewItem = item || null;
            refreshCharacterStatsPanel(statsPreviewItem);
        }










        /**
         * Check if offhand should be highlighted as available for dual-wielding
         * Highlights when weapon slot has a one-handed weapon
         */
        function shouldHighlightOffhand() {
            const weaponItem = equippedSlots['weapon'];
            if (!weaponItem) return false;
            const rawSlot = getRawSlot(weaponItem);
            return isOneHandedWeapon(rawSlot);
        }

        /**
         * Check if weapon should be highlighted as available for dual-wielding
         * Highlights when offhand slot has a one-handed weapon
         */
        function shouldHighlightWeapon() {
            const offhandItem = equippedSlots['offhand'];
            if (!offhandItem) return false;
            const rawSlot = getRawSlot(offhandItem);
            return isOneHandedWeapon(rawSlot);
        }






        /**
         * Check if offhand slot is blocked by a two-handed weapon in weapon slot
         */
        function isOffhandBlocked() {
            const weaponItem = equippedSlots['weapon'];
            if (!weaponItem) return false;
            const rawSlot = getRawSlot(weaponItem);
            return isTwoHandedWeapon(rawSlot);
        }

        /**
         * Check if an item's equipment slot is compatible with target slot
         * Handles special cases:
         * - rings (anneau -> ring1 or ring2)
         * - one-handed weapons (arme -> weapon OR offhand, player's choice)
         * - two-handed weapons (arme-deux-mains -> weapon only, blocks offhand)
         * STRICT: items without equipmentSlot cannot be equipped
         */
        function isSlotCompatible(itemSlot, targetSlot) {
            const normalized = normalizeSlot(itemSlot);
            if (!normalized) return false; // STRICT: items must have equipmentSlot defined

            // Direct match
            if (normalized === targetSlot) return true;

            // Ring slots: "anneau" can go to ring1 or ring2
            if (normalized === 'anneau' && (targetSlot === 'ring1' || targetSlot === 'ring2')) {
                return true;
            }

            // One-handed weapons can go in weapon OR offhand (dual-wield)
            if (isOneHandedWeapon(itemSlot) && targetSlot === 'offhand') {
                // But not if offhand is blocked by a two-handed weapon
                if (isOffhandBlocked()) return false;
                return true;
            }

            // Two-handed weapons cannot go in offhand
            if (isTwoHandedWeapon(itemSlot) && targetSlot === 'offhand') {
                return false;
            }

            return false;
        }



        /**
         * Find first available slot for an item
         * Returns slot key or null if no slot available
         */
        function findAvailableSlot(item) {
            if (!canCharacterEquipItemByRank(item)) return null;
            const slot = getItemSlot(item);
            const rawSlot = getRawSlot(item);
            if (!slot) return null;

            // For rings, find first available ring slot
            if (slot === 'anneau') {
                if (!equippedSlots['ring1']) return 'ring1';
                if (!equippedSlots['ring2']) return 'ring2';
                return 'ring1'; // Replace first ring if both occupied
            }

            // For one-handed weapons, prefer weapon slot, fallback to offhand
            if (isOneHandedWeapon(rawSlot)) {
                if (!equippedSlots['weapon']) return 'weapon';
                if (!equippedSlots['offhand'] && !isOffhandBlocked()) return 'offhand';
                return 'weapon'; // Replace main weapon if both occupied
            }

            // For two-handed weapons, only weapon slot (will clear offhand on equip)
            if (isTwoHandedWeapon(rawSlot)) {
                return 'weapon';
            }

            // For other items, return the direct slot
            return slot;
        }









        function serializeEquippedSlots() {



            const serialized = {};



            Object.entries(equippedSlots || {}).forEach(([slotKey, item]) => {



                if (!item?.name) return;



                serialized[slotKey] = {



                    item_id: item.item_id || item.dbItemId || null,
                    item_key: item.name,



                    item_index: Number.isFinite(Number(item.sourceIndex)) ? Number(item.sourceIndex) : null



                };



            });



            return serialized;



        }



        function loadEquippedSlotsFromLocalStorage() {



            try {



                const raw = localStorage.getItem(getEquippedSlotsStorageKey());



                if (!raw) return {};



                return normalizeEquippedSlots(JSON.parse(raw));



            } catch (error) {



                console.warn('Failed to load equipped slots from localStorage:', error);



                return {};



            }



        }



        function ensureInventoryCopy(item, quantity = 1) {



            if (!item?.name) return;



            const sourceIndex = Number.isFinite(Number(item.sourceIndex)) ? Number(item.sourceIndex) : null;



            const existing = inventoryItems.find((entry) => {



                if (entry?.isCurrency) return false;



                if (sourceIndex != null && Number(entry.sourceIndex) === sourceIndex) return true;



                return normalizeItemName(entry?.name) === normalizeItemName(item.name);



            });



            if (existing) {
                existing.quantity = Math.max(0, Math.floor(Number(existing.quantity) || 0)) + quantity;
                if (!Number.isFinite(Number(existing.sourceIndex)) && sourceIndex != null) {
                    existing.sourceIndex = sourceIndex;
                }
                // Restore equipment_slot if it was lost
                if (!existing.equipment_slot && item.equipment_slot) {
                    existing.equipment_slot = item.equipment_slot;
                }
                return;
            }



            const resolved = buildEquippedItem(item.name, sourceIndex);



            if (!resolved) return;



            inventoryItems.push({



                id: nextItemId++,



                ...resolved,



                quantity



            });



        }



        function unequipSlot(slotKey, shouldPersist = true) {



            const equippedItem = equippedSlots?.[slotKey];



            if (!equippedItem) return false;



            ensureInventoryCopy(equippedItem, 1);



            delete equippedSlots[slotKey];

            // Persist to character_equipped table
            if (inventoryStorageMode === 'character' && inventoryApi?.clearEquippedSlot) {
                const char = authApi?.getActiveCharacter?.();
                if (char?.id) {
                    inventoryApi.clearEquippedSlot(char.id, slotKey)
                        .catch((err) => console.warn('[Inventory] Failed to clear equip from DB:', err));
                }
            }

            if (shouldPersist) {
                persistInventory();
                selectedItemIndex = null;
                showDetailPlaceholder();
                renderInventory();

                // Log unequip activity
                if (window.astoriaActivityLogger) {
                    const currentChar = authApi?.getActiveCharacter?.();
                    const characterId = currentChar?.id;
                    if (characterId) {
                        window.astoriaActivityLogger.logActivity({
                            actionType: window.astoriaActivityLogger.ActionTypes.INVENTORY_UNEQUIP,
                            characterId: characterId,
                        actionData: {
                            item_name: equippedItem.name,
                            item_id: equippedItem.item_id || equippedItem.sourceIndex,
                            slot: slotKey
                        }
                        }).catch(err => console.warn('[Inventory] Failed to log unequip:', err));
                    }
                }

                // Trigger unequip poof animation
                requestAnimationFrame(() => {
                    const slotEl = document.querySelector(`.character-slot[data-slot-key="${slotKey}"]`);
                    if (slotEl) {
                        slotEl.classList.remove('unequip-poof');
                        void slotEl.offsetWidth;
                        slotEl.classList.add('unequip-poof');
                        slotEl.addEventListener('animationend', () => slotEl.classList.remove('unequip-poof'), { once: true });
                    }
                });
            }

            return true;
        }



        function equipItemToSlot(itemId, slotKey) {



            const inventoryIndex = inventoryItems.findIndex((entry) => entry.id === itemId);



            if (inventoryIndex < 0) return;



            const item = inventoryItems[inventoryIndex];



            if (!isItemEquippable(item)) return;

            if (!canCharacterEquipItemByRank(item)) {
                const neededRank = getItemRank(item);
                toastManager.error(`Rang insuffisant: ${currentCharacterRank} ne permet pas d'equiper un item ${neededRank}`);
                return;
            }



            // Validate slot compatibility - STRICT: items must have equipmentSlot
            const rawSlot = getRawSlot(item);
            if (!rawSlot) {
                toastManager.error(`Cet objet n'a pas de slot d'équipement défini`);
                return;
            }

            if (!isSlotCompatible(rawSlot, slotKey)) {
                const slotDef = EQUIPMENT_SLOT_DEFS.find(s => s.key === slotKey);
                const slotLabel = slotDef ? slotDef.label : slotKey;
                toastManager.error(`Cet objet ne peut pas être équipé dans le slot ${slotLabel}`);
                return;
            }

            // Two-handed weapon clears offhand when equipped to weapon slot
            if (isTwoHandedWeapon(rawSlot) && slotKey === 'weapon' && equippedSlots['offhand']) {
                unequipSlot('offhand', false);
            }

            const occupied = equippedSlots?.[slotKey];



            if (occupied) {



                unequipSlot(slotKey, false);



            }



            item.quantity = Math.max(0, Math.floor(Number(item.quantity) || 0) - 1);



            if (item.quantity <= 0) {



                inventoryItems.splice(inventoryIndex, 1);



                if (selectedItemIndex === item.id) {



                    selectedItemIndex = null;



                    showDetailPlaceholder();



                }



            }



            equippedSlots[slotKey] = {
                sourceIndex: Number.isFinite(Number(item.sourceIndex)) ? Number(item.sourceIndex) : null,
                item_id: item.item_id || item.dbItemId || null,
                name: item.name,
                category: item.category,
                image: item.image,
                images: item.images,
                description: item.description,
                effect: item.effect,
                rarity: item.rarity || item.rarete || '',
                rank: item.rank || item.rank_required || item.required_rank || '',
                modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
                buyPrice: item.buyPrice,
                sellPrice: item.sellPrice,
                equipment_slot: item.equipment_slot || '',
                quantity: 1
            };

            // Persist to character_equipped table
            if (inventoryStorageMode === 'character' && inventoryApi?.setEquippedSlot) {
                const char = authApi?.getActiveCharacter?.();
                if (char?.id) {
                    inventoryApi.setEquippedSlot(char.id, slotKey, {
                        item_id: item.item_id || item.dbItemId || null,
                        item_key: item.name,
                        item_index: Number.isFinite(Number(item.sourceIndex)) ? Number(item.sourceIndex) : null
                    }).catch((err) => console.warn('[Inventory] Failed to persist equip to DB:', err));
                }
            }

            persistInventory();
            renderInventory();

            // Log equip activity
            if (window.astoriaActivityLogger) {
                const currentChar = authApi?.getActiveCharacter?.();
                const characterId = currentChar?.id;
                if (characterId) {
                    window.astoriaActivityLogger.logActivity({
                        actionType: window.astoriaActivityLogger.ActionTypes.INVENTORY_EQUIP,
                        characterId: characterId,
                        actionData: {
                            item_name: item.name,
                            item_id: item.item_id || item.dbItemId || item.sourceIndex,
                            slot: slotKey
                        }
                    }).catch(err => console.warn('[Inventory] Failed to log equip:', err));
                }
            }

            // Trigger equip flash animation
            requestAnimationFrame(() => {
                const slotEl = document.querySelector(`.character-slot[data-slot-key="${slotKey}"]`);
                if (slotEl) {
                    slotEl.classList.remove('equip-flash');
                    void slotEl.offsetWidth; // force reflow
                    slotEl.classList.add('equip-flash');
                    slotEl.addEventListener('animationend', () => slotEl.classList.remove('equip-flash'), { once: true });
                }
            });
        }

        function clearSlotDropTargets() {



            document.querySelectorAll('.character-slot.is-drop-target').forEach((slotEl) => {



                slotEl.classList.remove('is-drop-target');



            });



        }



        /**
         * Highlight valid target slots for a dragged item
         */
        function highlightValidSlots(item) {
            if (!canCharacterEquipItemByRank(item)) return;
            const rawSlot = getRawSlot(item);
            if (!rawSlot) return;

            // Find all compatible slots
            EQUIPMENT_SLOT_DEFS.forEach((slot) => {
                if (isSlotCompatible(rawSlot, slot.key)) {
                    const slotEl = document.querySelector(`.character-slot[data-slot-key="${slot.key}"]`);
                    if (slotEl) {
                        slotEl.classList.add('is-drop-target');
                    }
                }
            });
        }



        function renderEquipmentSlots() {



            EQUIPMENT_SLOT_DEFS.forEach((slot) => {



                const slotEl = document.querySelector(`.character-slot[data-slot-key="${slot.key}"]`);



                if (!slotEl) return;



                const equippedItem = equippedSlots?.[slot.key];

                slotEl.classList.toggle('has-item', Boolean(equippedItem));

                // Mark offhand as blocked if two-handed weapon is equipped
                const offhandBlocked = slot.key === 'offhand' && isOffhandBlocked();
                slotEl.classList.toggle('is-blocked', offhandBlocked);

                // Highlight complementary weapon slots
                const shouldHighlight = (slot.key === 'offhand' && shouldHighlightOffhand()) ||
                                      (slot.key === 'weapon' && shouldHighlightWeapon());
                slotEl.classList.toggle('is-available', shouldHighlight && !equippedItem && !offhandBlocked);

                slotEl.innerHTML = '';



                if (equippedItem) {



                    const img = document.createElement('img');



                    img.className = 'character-slot-item-image';



                    img.src = resolveImage(equippedItem);



                    img.alt = equippedItem.name;



                    img.decoding = 'async';



                    img.onerror = () => {



                        img.src = PLACEHOLDER_IMAGE;



                    };



                    slotEl.appendChild(img);



                    slotEl.draggable = true;



                    slotEl.ondragstart = (event) => {



                        draggedEquipmentSlotKey = slot.key;



                        slotEl.classList.add('is-dragging');



                        if (event.dataTransfer) {



                            event.dataTransfer.effectAllowed = 'move';



                            event.dataTransfer.setData('text/plain', `slot:${slot.key}`);



                        }



                    };



                    slotEl.ondragend = () => {



                        draggedEquipmentSlotKey = null;



                        slotEl.classList.remove('is-dragging');



                        const container = document.querySelector('.inventory-grid-container');



                        if (container) container.classList.remove('is-slot-drop-target');



                    };



                    slotEl.title = `${slot.label}: ${equippedItem.name} (double-clic pour déséquiper)`;
                    slotEl.setAttribute('aria-label', `${slot.label}: ${equippedItem.name}. Double-clic pour déséquiper.`);



                    return;



                }



                slotEl.draggable = false;



                slotEl.ondragstart = null;



                slotEl.ondragend = null;



                if (offhandBlocked) {
                    const label = document.createElement('span');
                    label.className = 'character-slot-label';
                    label.textContent = 'Bloqué';
                    slotEl.appendChild(label);
                    slotEl.title = `${slot.label}: bloqué par une arme à deux mains`;
                    slotEl.setAttribute('aria-label', `${slot.label}: bloqué par une arme à deux mains.`);
                } else {
                    // Show shadowed emoji icon as placeholder
                    const iconEl = document.createElement('span');
                    iconEl.className = 'character-slot-icon';
                    iconEl.textContent = slot.icon;
                    iconEl.setAttribute('aria-hidden', 'true');
                    slotEl.appendChild(iconEl);
                    slotEl.title = `${slot.label}: vide (dépose un équipement)`;
                    slotEl.setAttribute('aria-label', `${slot.label}: vide. Dépose un équipement ici.`);
                }



            });



        }



        function initEquipmentSlots() {



            if (equipmentSlotsBound) {



                renderEquipmentSlots();



                return;



            }



            const slotElements = document.querySelectorAll('.character-slot[data-slot-key]');



            slotElements.forEach((slotEl) => {



                const slotKey = slotEl.dataset.slotKey;



                if (!slotKey) return;



                slotEl.addEventListener('dragover', (event) => {
                    if (!draggedEquipmentItemId) return;

                    // Don't allow drops on blocked offhand slot
                    if (slotKey === 'offhand' && isOffhandBlocked()) {
                        if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
                        return;
                    }

                    event.preventDefault();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
                    slotEl.classList.add('is-drop-target');
                });



                slotEl.addEventListener('dragleave', () => {



                    slotEl.classList.remove('is-drop-target');



                });



                slotEl.addEventListener('drop', (event) => {



                    event.preventDefault();



                    const transferId = Number(event.dataTransfer?.getData('text/plain'));



                    const itemId = Number.isFinite(transferId) ? transferId : draggedEquipmentItemId;



                    slotEl.classList.remove('is-drop-target');



                    if (!Number.isFinite(itemId) || itemId <= 0) return;



                    equipItemToSlot(itemId, slotKey);



                });



                slotEl.addEventListener('click', () => {
                    const equipped = equippedSlots?.[slotKey];
                    if (equipped) {
                        setStatsPreviewItem(equipped);
                        showItemDetail(equipped);
                    }
                });

                slotEl.addEventListener('dblclick', () => {
                    if (equippedSlots?.[slotKey]) {
                        unequipSlot(slotKey);
                    }
                });



                slotEl.addEventListener('keydown', (event) => {



                    if (event.key !== 'Enter' && event.key !== ' ') return;



                    event.preventDefault();



                    if (equippedSlots?.[slotKey]) {



                        unequipSlot(slotKey);



                    }



                });



            });



            if (grid && grid.dataset.slotDropBound !== '1') {



                grid.dataset.slotDropBound = '1';



                const gridContainer = document.querySelector('.inventory-grid-container');



                const getDropContainer = () => gridContainer || grid;



                grid.addEventListener('dragover', (event) => {



                    if (!draggedEquipmentSlotKey) return;



                    event.preventDefault();



                    if (event.dataTransfer) {



                        event.dataTransfer.dropEffect = 'move';



                    }



                    getDropContainer()?.classList.add('is-slot-drop-target');



                });



                grid.addEventListener('dragleave', () => {



                    getDropContainer()?.classList.remove('is-slot-drop-target');



                });



                grid.addEventListener('drop', (event) => {



                    if (!draggedEquipmentSlotKey) return;



                    event.preventDefault();



                    getDropContainer()?.classList.remove('is-slot-drop-target');



                    unequipSlot(draggedEquipmentSlotKey);



                    draggedEquipmentSlotKey = null;



                });



            }



            equipmentSlotsBound = true;



            renderEquipmentSlots();



        }



        /**



         * Render the entire inventory grid



         * - Filters by current category



         * - Updates item count



         * - Shows empty state if needed



         * - Creates item cards



         */





        function renderInventory() {
            renderEquipmentSlots();



            // Filter items by category + search



            let filtered = inventoryItems;



            const activeCategory = currentCategory === 'all' ? '' : currentCategory;



            if (filterItems) {



                filtered = filterItems(inventoryItems, {



                    category: activeCategory,



                    getCategory: (item) => item?.category,



                    query: currentSearchQuery,



                    fields: searchFields



                });



            } else {



                if (activeCategory) {



                    filtered = inventoryItems.filter(item => item.category === activeCategory);



                }



                if (currentSearchQuery) {



                    filtered = filtered.filter(item => {



                        const display = getItemDisplayMeta(item);
                        const name = String(display.name || item?.name || '').toLowerCase();



                        const description = String(display.description || item?.description || '').toLowerCase();



                        const effect = String(display.effectText || item?.effect || '').toLowerCase();



                        return name.includes(currentSearchQuery) || description.includes(currentSearchQuery) || effect.includes(currentSearchQuery);



                    });



                }



            }



            if (selectedItemIndex !== null && !filtered.some(item => item.id === selectedItemIndex)) {



                selectedItemIndex = null;



                showDetailPlaceholder();



            }



            // Update count (shows currently filtered count)



                        const totalVisibleItems = inventoryItems.filter((item) => !item?.isCurrency).length;
            const activeCategoryLabel = currentCategory === 'all'
                ? 'Tout'
                : (document.querySelector(`.category-btn[data-category="${currentCategory}"] .category-label`)?.textContent?.trim() || currentCategory);
            const searchLabel = String(searchInput?.value || '').trim();
            itemCountEl.textContent = `${filtered.length}/${Math.max(filtered.length, totalVisibleItems)} objet${filtered.length > 1 ? 's' : ''} | ${activeCategoryLabel}${searchLabel ? ` | "${searchLabel}"` : ''}`;
            itemCountEl.title = `Vue ${activeCategoryLabel}${searchLabel ? ` | Recherche: ${searchLabel}` : ''}`;
            itemCountEl.dataset.state = filtered.length === 0 ? 'empty' : 'ready';



            // Sort filtered items
            if (currentSort !== 'default') {
                filtered = sortInventoryItems(filtered, currentSort);
            }

            // Clear grid
            grid.innerHTML = '';



            // Show empty state if no items



            if (filtered.length === 0) {



                if (emptyStateMessage) {



                                        emptyStateMessage.textContent = currentSearchQuery

                        ? 'Aucun objet pour cette recherche. Essaie un autre mot-cle ou une autre categorie.'

                        : `Aucun objet dans ${activeCategoryLabel.toLowerCase()} pour le moment.`;



                }



                grid.style.display = 'none';



                emptyState.style.display = 'flex';



                showDetailPlaceholder();



                return;



            }



            // Show grid



            grid.style.display = 'grid';



            emptyState.style.display = 'none';



            // Render each item



            filtered.forEach((item) => {



                const card = createItemCard(item);



                grid.appendChild(card);



            });

            refreshCharacterStatsPanel(statsPreviewItem);

        }



        /**



         * Create an item card element



         * - Resolves image



         * - Shows quantity if > 1



         * - Attaches click handler



         */



        function createItemCard(item) {



            const card = document.createElement('div');



            card.className = 'inventory-item';



            card.dataset.itemId = item.id;



            if (item.id === selectedItemIndex) {



                card.classList.add('selected');



            }



            const canEquipByRank = canCharacterEquipItemByRank(item);

            if (isItemEquippable(item) && canEquipByRank) {



                card.classList.add('inventory-item--draggable');



                card.draggable = true;



                card.addEventListener('dragstart', (event) => {



                    draggedEquipmentItemId = item.id;



                    card.classList.add('is-dragging');



                    // Highlight valid target slots
                    highlightValidSlots(item);



                    if (event.dataTransfer) {



                        event.dataTransfer.effectAllowed = 'move';



                        event.dataTransfer.setData('text/plain', String(item.id));



                    }



                });



                card.addEventListener('dragend', () => {



                    draggedEquipmentItemId = null;



                    card.classList.remove('is-dragging');



                    clearSlotDropTargets();



                });



                // Double-click/tap to auto-equip
                let lastTap = 0;
                card.addEventListener('dblclick', () => {
                    const targetSlot = findAvailableSlot(item);
                    if (targetSlot) {
                        equipItemToSlot(item.id, targetSlot);
                    }
                });

                // Mobile: detect double-tap (300ms threshold)
                card.addEventListener('touchend', (event) => {
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTap;
                    if (tapLength < 300 && tapLength > 0) {
                        event.preventDefault();
                        const targetSlot = findAvailableSlot(item);
                        if (targetSlot) {
                            equipItemToSlot(item.id, targetSlot);
                        }
                    }
                    lastTap = currentTime;
                });



            }

            if (isItemEquippable(item) && !canEquipByRank) {
                const requiredRank = getItemRank(item);
                card.classList.add('inventory-item--rank-locked');
                card.title = `Rang requis: ${requiredRank} (rang actuel: ${currentCharacterRank})`;
            }



            // Resolve image



            const imageSrc = resolveImage(item);
            const modifiersHtml = renderModifierBadges(getItemModifiers(item), 2);
            const displayMeta = getItemDisplayMeta(item);
            const displayName = displayMeta.name || String(item?.name || '');
            const rankLabel = displayMeta.rankLabel;
            const rankToken = rankLabel ? String(rankLabel).trim().slice(0, 2).toUpperCase() : '';
            const rarityBadge = displayMeta.rarity
                ? `<div class="item-rarity-badge" style="--rarity-color:${escapeHtml(displayMeta.rarity.color)}">${escapeHtml(displayMeta.rarity.label)}</div>`
                : '';



            const isCurrency = item?.isCurrency === true;
            if (displayMeta.rarity?.color) {
                card.classList.add('has-rarity');
                card.style.setProperty('--item-rarity-color', displayMeta.rarity.color);
            } else {
                card.classList.remove('has-rarity');
                card.style.removeProperty('--item-rarity-color');
            }



            const actionHtml = isCurrency



                ? ''



                : `



                    <div class="detail-actions">



                        <button class="item-action-use tw-press"



                                onclick="useItem(${item.id})"



                                title="Utiliser l'objet"



                                ${item.quantity < 1 ? 'disabled' : ''}



                                aria-label="Utiliser l'objet">



                            &#x2728;



                        </button>



                        <div class="action-stack">



                            <button class="item-action-delete tw-press"



                                    onclick="openDeleteModal(${item.id})"



                                    title="Supprimer l'objet"



                                    aria-label="Supprimer l'objet">



                                &#x1F5D1;&#xFE0F;



                            </button>



                            <button class="item-action-scroll-toggle tw-press"



                                    type="button"



                                    id="scrollTypesToggle"



                                    title="Types de parchemins"



                                    aria-label="Afficher les types de parchemins"



                                    aria-expanded="false"



                                    aria-controls="scrollTypesPanel">



                                &#x25BE;



                            </button>



                        </div>



                    </div>



                `;



            card.innerHTML = `



                ${rankToken ? `<div class="item-rank-corner" title="Rang ${escapeHtml(rankLabel)}">${escapeHtml(rankToken)}</div>` : ''}
                <div class="item-image">



                    <img src="${escapeHtml(imageSrc)}"



                         alt="${escapeHtml(displayName)}"



                         decoding="async"



                         onerror="this.src='${PLACEHOLDER_IMAGE}'">



                </div>



                <div class="item-info">
                    <div class="item-name">${escapeHtml(displayName)}</div>
                    ${rarityBadge}
                    ${isCurrency ? `<div class="item-currency-badge">${item.quantity} &#x1FA99;</div>` : ''}
                    ${!isCurrency && item.quantity > 1 ? `<div class="item-quantity">x${item.quantity}</div>` : ''}
                    ${modifiersHtml}
                </div>



            `;



            // Click to select



            card.addEventListener('click', () => selectItem(item, card));

            return card;



        }



        // =================================================================

        // ITEM SELECTION & DETAILS



        // =================================================================



        /**



         * Select an item and show its details



         * - Removes previous selection



         * - Marks new selection



         * - Updates detail panel



         */



        function selectItem(item, cardElement) {



            // Remove previous selection



            document.querySelectorAll('.inventory-item').forEach(el => {



                el.classList.remove('selected');



            });



            // Mark as selected



            cardElement.classList.add('selected');



            selectedItemIndex = item.id;
            setStatsPreviewItem(item);



            // Show details



            showItemDetail(item);



        }



        /**



         * Show item details in right panel



         * - Resolves image



         * - Shows all item properties



         */



        function showItemDetail(item) {

            if (item) {
                statsPreviewItem = item;
                refreshCharacterStatsPanel(statsPreviewItem);
            }



            const categoryLabels = {



                equipement: '&#x2694;&#xFE0F; &Eacute;quipement',



                consommable: '&#x1F9EA; Consommable',



                agricole: '&#x1F33E; Agricole'



            };



            const scrollCategory = getScrollCategory(item);



            const isCurrency = item?.isCurrency === true;



            if (scrollCategory) {



                const { counts, hasStored } = loadScrollCounts(scrollCategory, item);



                if (hasStored) {
                    // Scroll-type counts are secondary metadata; the actual inventory quantity stays authoritative.
                    void sumScrollCounts(counts);
                }



            }



            const actionHtml = isCurrency



                ? ''



                : `



                    <div class="detail-actions">



                        <button class="item-action-use tw-press"



                                onclick="useItem(${item.id})"



                                title="Utiliser l'objet"



                                ${item.quantity < 1 ? 'disabled' : ''}



                                aria-label="Utiliser l'objet">



                            &#x2728;



                        </button>



                        <div class="action-stack">



                            <button class="item-action-delete tw-press"



                                    onclick="openDeleteModal(${item.id})"



                                    title="Supprimer l'objet"



                                    aria-label="Supprimer l'objet">



                                &#x1F5D1;&#xFE0F;



                            </button>



                            <button class="item-action-scroll-toggle tw-press"



                                    type="button"



                                    id="scrollTypesToggle"



                                    title="Types de parchemins"



                                    aria-label="Afficher les types de parchemins"



                                    aria-expanded="false"



                                    aria-controls="scrollTypesPanel">



                                &#x25BE;



                            </button>



                        </div>



                    </div>



                `;



            const modifiersSectionHtml = renderModifierLines(getItemModifiers(item));
            const displayMeta = getItemDisplayMeta(item);
            const displayName = displayMeta.name || String(item?.name || '');
            const rankLabel = displayMeta.rankLabel;
            const effectEntries = Array.isArray(displayMeta.effectEntries) && displayMeta.effectEntries.length
                ? displayMeta.effectEntries
                : (displayMeta.effectText ? [displayMeta.effectText] : []);
            const effectSectionHtml = effectEntries.length
                ? `<div class="detail-section"><span class="detail-label">${effectEntries.length > 1 ? 'Effets' : 'Effet'}</span>${effectEntries.length > 1
                    ? `<ul class="item-modifiers-list">${effectEntries.map((entry) => `<li class="item-modifier-line">${escapeHtml(entry)}</li>`).join('')}</ul>`
                    : `<p class="detail-text detail-effect">${escapeHtml(effectEntries[0])}</p>`}</div>`
                : '';
            const rarityHeader = displayMeta.rarity
                ? `<span class="detail-rarity-badge" style="--rarity-color:${escapeHtml(displayMeta.rarity.color)}">${escapeHtml(displayMeta.rarity.label)}</span>`
                : '';
            const attrsSectionHtml = displayMeta.attrs.length
                ? `<div class="detail-section"><span class="detail-label">Attributs</span><div class="detail-attrs">${displayMeta.attrs.map((line) => `<span class="detail-attr-chip">${escapeHtml(line)}</span>`).join('')}</div></div>`
                : '';
            const priceInfo = [];
            if (displayMeta.buy) priceInfo.push(`Achat: ${displayMeta.buy}`);
            if (displayMeta.sell) priceInfo.push(`Vente: ${displayMeta.sell}`);
            const priceText = priceInfo.length > 0 ? priceInfo.join(' | ') : 'Prix non défini';



            // Resolve image



            const imageSrc = resolveImage(item);



            detailPanel.innerHTML = `



                <div class="detail-header">



                    <div class="detail-title-wrapper">



                        <h2 class="detail-title">${escapeHtml(displayName)}</h2>



                        <span class="detail-category">${categoryLabels[displayMeta.category] || 'Autre'}</span>
                        ${rarityHeader}
                        ${rankLabel ? `<span class="detail-rank-badge">Rang ${escapeHtml(rankLabel)}</span>` : ''}
                        ${displayMeta.equipmentSlot ? `<span class="detail-slot-badge">${escapeHtml(getSlotDisplayName(displayMeta.equipmentSlot))}</span>` : ''}



                    </div>



                    ${actionHtml}



                </div>



                <div class="detail-image">



                    <img src="${escapeHtml(imageSrc)}"



                         alt="${escapeHtml(displayName)}"



                         decoding="async"



                         onerror="this.src='${PLACEHOLDER_IMAGE}'">



                </div>



                <div class="detail-body">



                    <div class="detail-section">



                        <span class="detail-label">Description</span>



                        <p class="detail-text">${escapeHtml(displayMeta.description || 'Aucune description disponible.')}</p>



                    </div>



                    ${attrsSectionHtml}

                    ${effectSectionHtml}
                    ${modifiersSectionHtml}

                    <div class="detail-section">
                        <span class="detail-label">Commerce</span>



                        <p class="detail-text">${escapeHtml(priceText)}</p>



                    </div>



                    ${(item.quantity > 1 || isCurrency) ? `



                    <div class="detail-section">



                        <span class="detail-label">Quantité</span>



                        <p class="detail-text">x${item.quantity}</p>



                    </div>



                    ` : ''}



                </div>



            `;



            scrollPanelToggleBtn = detailPanel.querySelector("#scrollTypesToggle");



            if (scrollPanelToggleBtn) {



                scrollPanelToggleBtn.addEventListener("click", () => {



                    if (scrollPanelToggleBtn.disabled) return;



                    setScrollPanelOpen(!scrollPanelOpen);



                    if (scrollPanelOpen && scrollPanelCategory && currentScrollItem) {



                        const { counts } = loadScrollCounts(scrollPanelCategory, currentScrollItem);



                        renderScrollPanelList(scrollPanelCategory, counts);



                    }



                });



            }



            setScrollPanelOpen(scrollPanelOpen);



            updateScrollPanelForItem(item);



        }



        function showDetailPlaceholder() {



            detailPanel.innerHTML = `



                <div class="detail-placeholder">

                    <div class="placeholder-icon">&#x1F446;</div>

                    <p>S&eacute;lectionnez un objet pour voir ses d&eacute;tails.</p>

                    <p class="detail-placeholder-tip">Astuce : clique un objet pour lire ses bonus, puis glisse un &eacute;quipement sur la silhouette pour l'&eacute;quiper.</p>

                </div>



            `;



            scrollPanelToggleBtn = null;



            scrollPanelCategory = null;



            selectedScrollTypeKey = null;



            lastScrollItemId = null;



            currentScrollItem = null;
            setStatsPreviewItem(null);



            scrollAddOpen = false;



            if (scrollPanelAddBtn) {



                scrollPanelAddBtn.disabled = true;



            }



            setScrollAddOpen(false);



            setScrollPanelOpen(false);



            setScrollPanelEmpty("Aucun type de parchemin disponible.");



        }



        // =================================================================



        // ITEM ACTIONS (USE & DELETE)



        // =================================================================



        // Delete modal elements



        const deleteModal = document.getElementById('deleteModal');



        const deleteItemNameEl = document.getElementById('deleteItemName');



        const deleteQuantityInput = document.getElementById('deleteQuantityInput');



        const deleteQtyMinusBtn = document.getElementById('deleteQtyMinus');



        const deleteQtyPlusBtn = document.getElementById('deleteQtyPlus');



        const cancelDeleteBtn = document.getElementById('cancelDelete');



        const confirmDeleteBtn = document.getElementById('confirmDelete');



        let currentDeleteItemId = null;



        let currentDeleteItemMaxQty = 0;



        /**



         * Use an item - decreases quantity by 1



         * - Finds item by ID



         * - Decreases quantity by 1



         * - If quantity reaches 0, removes item



         * - Saves to localStorage



         * - Re-renders grid and details



         */



        function useItem(itemId) {



            const itemIndex = inventoryItems.findIndex(i => i.id === itemId);



            if (itemIndex === -1) return;



            const item = inventoryItems[itemIndex];



            if (item?.isCurrency) return;



            if (item.quantity < 1) {



                alert('Quantité insuffisante pour utiliser cet objet');



                return;



            }



            // Decrease quantity



            item.quantity -= 1;



            console.log(`Used ${item.name}. Quantity now: ${item.quantity}`);



            // If quantity reaches 0, remove item



            if (item.quantity <= 0) {



                resetScrollCountsAfterQtyChange(item);



                inventoryItems.splice(itemIndex, 1);



                selectedItemIndex = null;



                showDetailPlaceholder();



            } else {



                resetScrollCountsAfterQtyChange(item);



                // Refresh the detail view to update quantity display



                showItemDetail(item);



            }



            // Save to localStorage



            persistInventory();



            // Re-render grid



            renderInventory();



        }



        /**



         * Open delete confirmation modal



         * - Sets current item ID



         * - Shows item name



         * - Resets quantity input to 1



         * - Sets max quantity



         * - Opens modal



         */



        function openDeleteModal(itemId) {



            const item = inventoryItems.find(i => i.id === itemId);



            if (!item) return;



            if (item.isCurrency) return;



            currentDeleteItemId = itemId;



            currentDeleteItemMaxQty = item.quantity;



            // Update modal content



            deleteItemNameEl.textContent = item.name;



            deleteQuantityInput.value = 1;



            deleteQuantityInput.max = item.quantity;



            // Open modal



            if (typeof modalManager !== 'undefined' && modalManager?.open) {
                modalManager.open(deleteModal, {
                    closeOnBackdropClick: true,
                    closeOnEsc: true,
                    openClass: 'open'
                });
            } else {
                deleteModal.classList.add('open');
            }



        }



        /**



         * Close delete modal



         */



        function closeDeleteModal() {



            if (typeof modalManager !== 'undefined' && modalManager?.isOpen?.(deleteModal)) {
                modalManager.close(deleteModal);
            } else {
                deleteModal.classList.remove('open');
            }



            currentDeleteItemId = null;



            currentDeleteItemMaxQty = 0;



        }



        /**



         * Confirm deletion from modal



         * - Gets quantity to delete



         * - Updates item quantity or removes item



         * - Saves to localStorage



         * - Re-renders grid



         */



        function confirmDeletion() {



            if (!currentDeleteItemId) return;



            const qtyToDelete = parseInt(deleteQuantityInput.value) || 1;



            if (qtyToDelete < 1) {



                alert('La quantité doit être au moins 1');



                return;



            }



            if (qtyToDelete > currentDeleteItemMaxQty) {



                alert(`La quantité maximum est ${currentDeleteItemMaxQty}`);



                return;



            }



            const itemIndex = inventoryItems.findIndex(i => i.id === currentDeleteItemId);



            if (itemIndex === -1) return;



            const item = inventoryItems[itemIndex];



            // Update quantity or remove item



            if (qtyToDelete >= item.quantity) {



                // Remove item entirely



                resetScrollCountsAfterQtyChange(item);



                inventoryItems.splice(itemIndex, 1);



                selectedItemIndex = null;



                showDetailPlaceholder();



                console.log(`Deleted ${item.name} completely`);



            } else {



                // Decrease quantity



                item.quantity -= qtyToDelete;



                resetScrollCountsAfterQtyChange(item);



                showItemDetail(item);



                console.log(`Deleted ${qtyToDelete} of ${item.name}. Remaining: ${item.quantity}`);



            }



            // Save to localStorage



            persistInventory();



            // Close modal and re-render



            closeDeleteModal();



            renderInventory();



        }



        /**



         * Decrease delete quantity



         */



        function decreaseDeleteQuantity() {



            const current = parseInt(deleteQuantityInput.value) || 1;



            deleteQuantityInput.value = Math.max(1, current - 1);



        }



        /**



         * Increase delete quantity



         */



        function increaseDeleteQuantity() {



            const current = parseInt(deleteQuantityInput.value) || 1;



            const max = currentDeleteItemMaxQty;



            deleteQuantityInput.value = Math.min(max, current + 1);



        }



        // Attach event listeners for delete modal



        deleteQtyMinusBtn.addEventListener('click', decreaseDeleteQuantity);



        deleteQtyPlusBtn.addEventListener('click', increaseDeleteQuantity);



        cancelDeleteBtn.addEventListener('click', closeDeleteModal);



        confirmDeleteBtn.addEventListener('click', confirmDeletion);



        // Close modal when clicking outside



        deleteModal.addEventListener('click', (e) => {



            if (e.target === deleteModal) {



                closeDeleteModal();



            }



        });



        // Make functions globally accessible for onclick handlers



        window.useItem = useItem;



        window.openDeleteModal = openDeleteModal;



        // =================================================================



        // ITEM DELETION (OLD - KEPT FOR COMPATIBILITY)



        // =================================================================



        /**



         * Delete an item from inventory



         * - Removes from array



         * - Saves to localStorage



         * - Clears selection



         * - Re-renders grid



         */



        function deleteItem(itemId) {



            const itemIndex = inventoryItems.findIndex(i => i.id === itemId);



            if (itemIndex === -1) return;



            const itemName = inventoryItems[itemIndex].name;



            if (inventoryItems[itemIndex].isCurrency) return;



            // Confirm deletion



            if (!confirm(`Supprimer "${itemName}" de l'inventaire ?`)) {



                return;



            }



            // Remove from array



            resetScrollCountsAfterQtyChange(inventoryItems[itemIndex]);



            inventoryItems.splice(itemIndex, 1);



            // Save to localStorage



            persistInventory();



            // Clear selection



            selectedItemIndex = null;



            showDetailPlaceholder();



            // Re-render



            renderInventory();



        }



        // Make deleteItem globally accessible for onclick



        window.deleteItem = deleteItem;



        // =================================================================



        // UTILITIES



        // =================================================================



        /**



         * Escape HTML to prevent XSS



         */






        // =================================================================



        // ENTRY POINT



        // =================================================================



        /**



         * Initialize on page load



         */



        window.addEventListener('DOMContentLoaded', initInventory);

        window.addEventListener('astoria:character-changed', async () => {
            // Save the previous character's pending edits before anything is reset.
            await flushPendingInventorySave();
            await initInventoryStorage();
            await loadInventory();
            await refreshCharacterRankFromCompetences({ enforce: true, silent: true });
            syncCurrencyItem();
            await loadCharacterSilhouette();
            renderInventory();
        });

        window.addEventListener('pagehide', () => {
            void flushPendingInventorySave();
        });



        window.addEventListener('astoria:character-updated', async (event) => {



            const detail = event?.detail || {};



            if (detail?.profile_data) {



                await loadCharacterSilhouette();
                await refreshCharacterRankFromCompetences({ enforce: true, silent: true });



            }



            const next = Number(detail?.kaels);



            if (!Number.isFinite(next)) return;



            const currency = inventoryItems.find((item) => item?.isCurrency);



            if (!currency) return;



            currency.quantity = Math.max(0, Math.floor(next));



            // Persist kaels changes to database
            persistInventory();



            renderInventory();



            if (selectedItemIndex === currency.id) {



                showItemDetail(currency);



            }



        });



        /**



         * Expose API for external use



         * - Can be called from codex.html or other pages



         */



        window.InventoryModule = {



            // Current state



            items: () => inventoryItems,



            // Core functions



            renderInventory,



            filterByCategory,



            // Add item from external page (e.g., codex.html)



            addItemFromExternal: (itemName, quantity = 1) => {



                const allItems = getAllItems();



                const sourceItem = allItems.find(i => i.name === itemName);



                const sourceIndex = allItems.indexOf(sourceItem);



                if (!sourceItem) {



                    console.error(`Item not found: ${itemName}`);



                    return false;



                }



                const existingItem = inventoryItems.find(i => i.sourceIndex === sourceIndex || i.name === itemName);



                if (existingItem) {



                    existingItem.quantity += quantity;



                    if (!Number.isFinite(Number(existingItem.sourceIndex)) && Number.isFinite(sourceIndex)) {



                        existingItem.sourceIndex = sourceIndex;



                    }



                } else {



                    inventoryItems.push({



                        id: nextItemId++,



                        sourceIndex,



                        ...sourceItem,



                        quantity: quantity



                    });



                }



                persistInventory();



                renderInventory();



                return true;



            },



            // Clear entire inventory (for testing)



            clearAll: () => {



                if (confirm('Effacer tout l\'inventaire ?')) {



                    inventoryItems = [];



                    equippedSlots = {};



                    nextItemId = 1;



                    persistInventory();



                    renderInventory();



                    console.log('Inventory cleared');



                }



            }



        };

        // Add alias for compatibility with ItemsModal component
        window.astoriaInventory = window.InventoryModule;

        })();
