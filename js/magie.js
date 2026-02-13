(function () {
    const STORAGE_KEY_BASE = "magicSheetPages";
    const body = document.body;
    const isAdmin = body.dataset.admin === "true" || !body.hasAttribute("data-admin");

    const navButtons = Array.from(document.querySelectorAll(".magic-nav-btn"));
    const sections = Array.from(document.querySelectorAll(".magic-section"));
    const saveBtn = document.getElementById("magicSaveBtn");
    const saveStatus = document.getElementById("magicSaveStatus");
    const saveRow = document.querySelector(".magic-save-row");
    const pagesOverview = document.getElementById("magicPagesOverview");
    const capacityList = document.getElementById("magicCapacityList");
    const capacityFilter = document.getElementById("magicCapacityFilter");
    const viewToggleButtons = Array.from(document.querySelectorAll(".magic-view-btn"));
    let currentView = "card"; // "card" or "list"
    const addCapacityButtons = Array.from(document.querySelectorAll("#magicAddCapacityBtn, #magicAddCapacityBtnPage4"));
    const capacityForm = document.getElementById("magicCapacityForm");
    const capNameInput = document.getElementById("magicNewCapName");
    const capSummaryInput = document.getElementById("magicNewCapSummary");
    const capTypeInput = document.getElementById("magicNewCapType");
    const capRankInput = document.getElementById("magicNewCapRank");
    const capTargetInput = document.getElementById("magicNewCapTarget");
    const capZoneInput = document.getElementById("magicNewCapZone");
    const capZoneDetailInput = document.getElementById("magicNewCapZoneDetail");
    const capDistanceInput = document.getElementById("magicNewCapDistance");
    const capActivationInput = document.getElementById("magicNewCapActivation");
    const capDurationInput = document.getElementById("magicNewCapDuration");
    const capCooldownInput = document.getElementById("magicNewCapCooldown");
    const capRpInput = document.getElementById("magicNewCapRp");
    const capPerceptionInput = document.getElementById("magicNewCapPerception");
    const capTellInput = document.getElementById("magicNewCapTell");
    const capEffectInput = document.getElementById("magicNewCapEffect");
    const capConditionsInput = document.getElementById("magicNewCapConditions");
    const capStrengthsInput = document.getElementById("magicNewCapStrengths");
    const capWeaknessesInput = document.getElementById("magicNewCapWeaknesses");
    const capCostInput = document.getElementById("magicNewCapCost");
    const capLimitsInput = document.getElementById("magicNewCapLimits");
    const capCostPreview = document.getElementById("magicNewCapCostPreview");
    const capSaveBtn = document.getElementById("magicCapacitySave");
    const capCancelBtn = document.getElementById("magicCapacityCancel");
    const adminSection = document.getElementById("magic-admin");
    const pageTabs = document.getElementById("magicPageTabs");
    const addPageBtn = document.getElementById("magicAddPageBtn");
    const pageNodes = Array.from(document.querySelectorAll(".page"));
    const pageTitleEl = document.getElementById("magicPageTitle");
    const page2El = document.getElementById("page2");
    const page3El = document.getElementById("page3");
    const page4El = document.getElementById("page4");
    const mainNavEl = page2El ? page2El.querySelector(".main-nav") : null;
    const contentBodyEl = document.getElementById("magicContentBody");
    const page2BackBtn = document.getElementById("magicPage2BackBtn");
    const page4TitleEl = document.getElementById("page4Title");
    const spellsContainer = document.getElementById("spellsContainer");
    const spellCountMineursEl = document.getElementById("spellCountMineurs");
    const spellCountSignatureEl = document.getElementById("spellCountSignature");
    const spellCountUltimesEl = document.getElementById("spellCountUltimes");
    const affinityDisplay = document.getElementById("magicAffinityDisplay");
    const scrollEveilCountEl = document.getElementById("magicEveilCount");
    const scrollAscensionCountEl = document.getElementById("magicAscensionCount");
    const aliceStatsMeterEl = document.getElementById("magicAliceStatsMeter");
    const alicePuissanceEl = document.getElementById("magicAlicePuissance");
    const alicePuissanceMinorEl = document.getElementById("magicAlicePuissanceMinor");
    const alicePuissanceUltimateEl = document.getElementById("magicAlicePuissanceUltimate");
    const aliceControleEl = document.getElementById("magicAliceControle");
    const aliceControleMinorEl = document.getElementById("magicAliceControleMinor");
    const aliceControleUltimateEl = document.getElementById("magicAliceControleUltimate");
    const meisterSoulsMeterEl = document.getElementById("magicMeisterSoulsMeter");
    const meisterProgSoulsEl = document.getElementById("magicMeisterProgSouls");
    const meisterMinorFragmentsEl = document.getElementById("magicMeisterMinorFragments");
    const meisterUltimateFragmentsEl = document.getElementById("magicMeisterUltimateFragments");
    const armeSoulsMeterEl = document.getElementById("magicArmeSoulsMeter");
    const armeProgSoulsEl = document.getElementById("magicArmeProgSouls");
    const armeMinorFragmentsEl = document.getElementById("magicArmeMinorFragments");
    const armeUltimateFragmentsEl = document.getElementById("magicArmeUltimateFragments");
    const formFields = Array.from(
        document.querySelectorAll(".magic-content input[id], .magic-content textarea[id], .magic-content select[id]")
    );

    let pages = [];
    let activePageIndex = 0;
    let activeSection = "magic-summary";
    let activeScreenPage = 1;
    let currentSpellCategory = "mineurs";
    let currentCharacterKey = "default";
    let currentCharacter = null;
    let storageKey = STORAGE_KEY_BASE;
    let authApi = null;
    let hasPendingChanges = false;
    let summaryModule = null;
    const persistState = {
        timer: null,
        inFlight: null,
        retryTimer: null,
        retryCount: 0
    };
    const SCREEN_PAGE = {
        CATEGORIES: 1,
        NAVIGATION: 2,
        SPELL_TYPES: 3,
        SPELL_LIST: 4
    };
    const SPELL_CATEGORY_CONFIG = {
        mineurs: { rank: "mineur", title: "Sorts mineurs" },
        signature: { rank: "signature", title: "Sorts signature" },
        ultimes: { rank: "ultime", title: "Sorts ultimes" }
    };
    let isSectionContentOpen = false;

    const ENABLE_PAGE_ADD = false;

    const defaultCapacities = [];

    const CAPACITY_TYPES = [
        { value: "offensif", label: "Offensif" },
        { value: "defensif", label: "Défensif" },
        { value: "soutien", label: "Soutien" },
        { value: "utilitaire", label: "Utilitaire" }
    ];

    const CAPACITY_RANKS = [
        { value: "mineur", label: "Mineur" },
        { value: "signature", label: "Signature" },
        { value: "ultime", label: "Ultime" }
    ];

    const CAPACITY_DISTANCE_LABELS = {
        cac: "Corps-a-corps",
        courte: "Courte portee",
        moyenne: "Portee moyenne",
        longue: "Longue portee"
    };

    const CAPACITY_TARGET_LABELS = {
        mono: "Mono-cible",
        zone: "Zone"
    };

    const CAPACITY_ZONE_LABELS = {
        cone: "Cone",
        cercle: "Cercle",
        ligne: "Ligne",
        autre: "Zone"
    };

    const CAPACITY_TEMPORALITY_LABELS = {
        t0: "0 Tour (Instantane)",
        t1: "1 Tour",
        t2: "2 Tours",
        t3: "3 Tours",
        t4: "4 Tours",
        t5: "5 Tours",
        t6: "6 Tours",
        t7: "7 Tours",
        combat1: "1 Utilisation par combat",
        combat2: "2 Utilisations par combat",
        combat3: "3 Utilisations par combat"
    };

    const FALLBACK_SCROLL_EMOJI = String.fromCodePoint(0x2728);
    const FALLBACK_MAGIC_AFFINITIES = [
        { key: "feu", label: "Feu", emoji: String.fromCodePoint(0x1F525) },
        { key: "eau", label: "Eau", emoji: String.fromCodePoint(0x1F4A7) },
        { key: "vent", label: "Vent", emoji: String.fromCodePoint(0x1F32C) },
        { key: "terre", label: "Terre", emoji: String.fromCodePoint(0x1FAA8) },
        { key: "nature", label: "Nature", emoji: String.fromCodePoint(0x1F331) },
        { key: "tenebres", label: "Ténèbres", emoji: String.fromCodePoint(0x1F319) }
    ];
    const FICHE_STORAGE_PREFIX = "fiche";
    const ALICE_EMOJI = String.fromCodePoint(0x1F4AB);
    const MEISTER_EMOJI = String.fromCodePoint(0x1F9EC); // 🧬
    const WEAPON_EMOJI = String.fromCodePoint(0x1F480); // 💀
    const EATER_EMOJI = WEAPON_EMOJI; // Legacy alias

    const MAGIC_ASCENSION_COSTS = {
        primary: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
        secondary: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
        hidden: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
        none: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70]
    };

    const getUltimeAscensionCost = (level) => 100 + Math.max(0, Number(level) - 1) * 50;

    const normalizeText = window.astoriaListHelpers?.normalizeText || ((value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase());

    function getMagicAffinities() {
        const base = Array.isArray(window.astoriaScrollTypes) && window.astoriaScrollTypes.length
            ? window.astoriaScrollTypes
            : FALLBACK_MAGIC_AFFINITIES;
        return base.map((entry) => ({
            key: String(entry.key || "").trim(),
            label: entry.label ? String(entry.label) : String(entry.key || ""),
            emoji: entry.emoji ? String(entry.emoji) : FALLBACK_SCROLL_EMOJI
        })).filter((entry) => entry.key);
    }

    function getAffinityLabel(key) {
        const entry = getMagicAffinities().find((item) => item.key === key);
        if (!entry) return key || "Non assignée";
        return `${entry.emoji} ${entry.label}`;
    }

    function getFicheTabData(tabName) {
        if (!currentCharacterKey) return null;

        // Pour les compétences, lire depuis profile_data.competences si disponible
        if (tabName === "competences" && currentCharacter?.profile_data?.competences) {
            const competences = currentCharacter.profile_data.competences;
            const pouvoirs = competences.allocationsByCategory?.pouvoirs || {};

            // Mapper les noms de compétences vers les clés utilisées dans magie.js
            const mapped = {
                // Alice 1
                alicePuissance: pouvoirs["Puissance Alice 1"] || 0,
                aliceControle: pouvoirs["Contrôle Alice 1"] || 0,
                // Alice 2
                alicePuissance2: pouvoirs["Puissance Alice 2"] || 0,
                aliceControle2: pouvoirs["Contrôle Alice 2"] || 0,
                // Meister
                meisterResonanceAmes: pouvoirs["Résonnance des Âmes"] || 0,
                meisterPuissanceCapacite: pouvoirs["Puissance de la capacité unique"] || 0,
                meisterMaitriseCapacite: pouvoirs["Maîtrise de la capacité unique"] || 0,
                // Weapon (Arme)
                weaponPuissanceCapacite: pouvoirs["Puissance de la capacité unique"] || 0,
                weaponMaitriseCapacite: pouvoirs["Maîtrise de la capacité unique"] || 0,
            };

            return mapped;
        }

        // Pour alice et eater, lire depuis profile_data si disponible
        if ((tabName === "alice" || tabName === "eater") && currentCharacter?.profile_data?.[tabName]) {
            return currentCharacter.profile_data[tabName];
        }

        const key = `${FICHE_STORAGE_PREFIX}-${currentCharacterKey}-${tabName}`;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
            return null;
        }
    }

    function getAliceStatus() {
        const data = getFicheTabData("alice");
        const status = data?.aliceStatus || "";
        if (status === "simple" || status === "double") return status;
        return "";
    }

    function getEaterStatus() {
        const data = getFicheTabData("eater");
        return Boolean(data?.hasEater);
    }

    function getEaterRole() {
        const data = getFicheTabData("eater");
        if (!data?.hasEater) return "";
        const role = data?.eaterRole || "";
        return role === "meister" || role === "weapon" ? role : "";
    }

    function getCapacityTerminology(specialization) {
        // Returns {singular, plural, section} based on specialization type
        if (specialization === "alice" || specialization === "alice-double") {
            return { singular: "Capacité", plural: "Capacités", section: "Capacités Alice" };
        }
        if (specialization === "meister" || specialization === "arme" || specialization === "eater") {
            return { singular: "Fragment", plural: "Fragments", section: "Fragments d'âme" };
        }
        // sorcellerie or default
        return { singular: "Sort", plural: "Sorts", section: "Sorts & techniques" };
    }

    function updateCapacityUI() {
        const currentPage = pages[activePageIndex];
        const specialization = currentPage?.fields?.magicSpecialization || "";
        const terminology = getCapacityTerminology(specialization);
        const addLabel = `+ Ajouter ${terminology.singular === "Fragment" ? "un fragment" : terminology.singular === "Sort" ? "un sort" : "une capacité"}`;

        // Update section title
        const sectionTitleEl = document.querySelector("#magic-capacities .magic-section-title");
        if (sectionTitleEl) {
            sectionTitleEl.textContent = terminology.section;
        }

        // Update add button text
        addCapacityButtons.forEach((button) => {
            if (button) button.textContent = addLabel;
        });

        // Update navigation button text
        const capacitiesNavBtn = document.querySelector('.magic-nav-btn[data-target="magic-capacities"]');
        if (capacitiesNavBtn) {
            capacitiesNavBtn.textContent = terminology.section;
        }
    }

    function normalizeSpecializationLabel(value) {
        const normalized = normalizeText(value || "").replace(/\s+/g, "");
        if (!normalized) return "";
        if (normalized.includes("sorcellerie")) return "sorcellerie";
        if (normalized.includes("alice")) return "alice";
        if (normalized.includes("arme")) return "arme";
        if (normalized.includes("meister")) return "meister";
        if (normalized.includes("eater")) return "eater";
        return "";
    }

    function getSpellCategoryConfig(category) {
        if (!category) return SPELL_CATEGORY_CONFIG.mineurs;
        if (SPELL_CATEGORY_CONFIG[category]) return SPELL_CATEGORY_CONFIG[category];
        const normalized = normalizeText(category || "");
        if (normalized.startsWith("mineur")) return SPELL_CATEGORY_CONFIG.mineurs;
        if (normalized.startsWith("signature")) return SPELL_CATEGORY_CONFIG.signature;
        if (normalized.startsWith("ultime")) return SPELL_CATEGORY_CONFIG.ultimes;
        return SPELL_CATEGORY_CONFIG.mineurs;
    }

    function getActivePageCapacities() {
        const currentPage = pages[activePageIndex];
        if (!currentPage || !Array.isArray(currentPage.capacities)) return [];
        return currentPage.capacities;
    }

    function updateSpellTypeCounts() {
        const capacities = getActivePageCapacities();
        const counts = capacities.reduce((acc, cap) => {
            const rank = cap?.rank || "mineur";
            acc[rank] = (acc[rank] || 0) + 1;
            return acc;
        }, { mineur: 0, signature: 0, ultime: 0 });

        if (spellCountMineursEl) {
            const count = counts.mineur || 0;
            spellCountMineursEl.textContent = `${count} sort${count > 1 ? "s" : ""}`;
        }
        if (spellCountSignatureEl) {
            const count = counts.signature || 0;
            spellCountSignatureEl.textContent = `${count} sort${count > 1 ? "s" : ""}`;
        }
        if (spellCountUltimesEl) {
            const count = counts.ultime || 0;
            spellCountUltimesEl.textContent = `${count} sort${count > 1 ? "s" : ""}`;
        }
    }

    function updateMagicPageTitle() {
        if (!pageTitleEl) return;
        const fields = pages[activePageIndex]?.fields || {};
        const finalLabel = getFallbackMagicName(fields, activePageIndex) || "Spécification";
        pageTitleEl.textContent = `Fiche Magie | ${finalLabel}`;
    }

    function escapeSelectorValue(value) {
        return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    function setScreenPage(pageNumber) {
        const numericPage = Number(pageNumber) || SCREEN_PAGE.CATEGORIES;
        activeScreenPage = numericPage;
        pageNodes.forEach((node) => {
            const isActive = node?.id === `page${numericPage}`;
            node.classList.toggle("active", Boolean(isActive));
        });
        updateMagicPageTitle();
    }

    function showMainNavigationOnly({ persist = true } = {}) {
        setScreenPage(SCREEN_PAGE.NAVIGATION);
        isSectionContentOpen = false;
        if (mainNavEl) {
            mainNavEl.classList.remove("main-nav--hidden");
        }
        if (contentBodyEl) {
            contentBodyEl.style.display = "none";
        }
        if (saveRow) {
            saveRow.style.display = "none";
        }
        if (persist) {
            saveToStorage();
        }
    }

    function openCapacityEditor(capId) {
        if (!capId) return;
        currentView = "list";
        viewToggleButtons.forEach((button) => {
            button.classList.toggle("magic-view-btn--active", button.dataset.view === "list");
        });
        showMagicSectionInternal("magic-capacities");
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        if (!capacityList) return;
        const row = capacityList.querySelector(`[data-cap-id="${escapeSelectorValue(capId)}"]`);
        if (!row) return;
        const header = row.querySelector(".magic-capacity-header");
        if (header && !row.classList.contains("magic-capacity-item--open")) {
            header.click();
        }
        const upgradeButton = row.querySelector(`[data-upgrade="${escapeSelectorValue(capId)}"]`);
        if (upgradeButton && !upgradeButton.disabled) {
            upgradeButton.click();
        }
        row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function renderSpellCardsForCategory(category) {
        if (!spellsContainer) return;
        const config = getSpellCategoryConfig(category);
        const rank = config.rank;
        const capacities = getActivePageCapacities().filter((cap) => (cap?.rank || "mineur") === rank);

        if (page4TitleEl) {
            page4TitleEl.textContent = config.title;
        }

        if (!capacities.length) {
            spellsContainer.innerHTML = `
                <article class="magic-card tw-surface tw-hover">
                    <h3 class="magic-card-title">${config.title}</h3>
                    <p class="magic-section-help">Aucun sort enregistré pour cette catégorie.</p>
                </article>
            `;
            return;
        }

        spellsContainer.innerHTML = "";
        capacities.forEach((cap) => {
            const card = document.createElement("article");
            card.className = "flip-card";
            card.dataset.capacityId = cap.id;

            const typeLabel = CAPACITY_TYPES.find((entry) => entry.value === cap.type)?.label || cap.type || "Inconnu";
            const rankLabel = CAPACITY_RANKS.find((entry) => entry.value === cap.rank)?.label || cap.rank || "Mineur";
            const level = Math.max(1, Number(cap.level) || 1);
            const summary = cap.summary || "Aucune description.";
            const rp = cap.rp || "Aucune description RP.";
            const effect = cap.effect || "Aucun effet défini.";

            card.innerHTML = `
                <div class="flip-card-inner">
                    <div class="flip-card-front">
                        <div class="spell-card-front-header">
                            <h3 class="spell-card-name">${cap.name || "Sans nom"}</h3>
                            <span class="spell-card-level">Niv. ${level}</span>
                        </div>
                        <div class="spell-card-badges">
                            <span class="spell-card-badge badge-offensif">${typeLabel}</span>
                            <span class="spell-card-badge badge-zone">${rankLabel}</span>
                        </div>
                        <p class="spell-card-preview">${summary}</p>
                        <div class="flip-hint">Cliquer pour détails</div>
                    </div>
                    <div class="flip-card-back">
                        <h4 class="spell-card-name">${cap.name || "Sans nom"}</h4>
                        <p><strong>RP :</strong> ${rp}</p>
                        <p><strong>Effet :</strong> ${effect}</p>
                        <p><strong>Coût :</strong> ${cap.cost || "-"}</p>
                        <p><strong>Limites :</strong> ${cap.limits || "-"}</p>
                        <button type="button" class="magic-btn magic-btn-outline tw-press" data-edit-capacity="${cap.id}" ${isAdmin ? "" : "hidden"}>
                            Modifier
                        </button>
                    </div>
                </div>
            `;

            card.addEventListener("click", (event) => {
                if (event.target.closest("button")) return;
                card.classList.toggle("flipped");
            });

            const editButton = card.querySelector(`[data-edit-capacity="${escapeSelectorValue(cap.id)}"]`);
            if (editButton) {
                editButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    openCapacityEditor(cap.id);
                });
            }

            spellsContainer.appendChild(card);
        });
    }

    function showMagicSectionInternal(sectionId, { persist = true } = {}) {
        const nextSection = sectionId || "magic-summary";
        setScreenPage(SCREEN_PAGE.NAVIGATION);
        isSectionContentOpen = true;
        setActiveSection(nextSection);
        if (mainNavEl) {
            mainNavEl.classList.add("main-nav--hidden");
        }
        if (contentBodyEl) {
            contentBodyEl.style.display = "block";
        }
        if (saveRow) {
            saveRow.style.display = nextSection === "magic-admin" ? "none" : "flex";
        }
        updateCapacityUI();
        if (nextSection === "magic-capacities") {
            renderCapacities(capacityFilter ? capacityFilter.value : "");
        }
        if (persist) {
            saveToStorage();
        }
    }

    function ensurePageForSpecialization(specializationKey, pageLabel) {
        if (!specializationKey) return activePageIndex;
        const matchIndex = pages.findIndex((page) => {
            if (isPageHidden(page)) return false;
            const pageSpec = page?.fields?.magicSpecialization || "";
            if (specializationKey === "sorcellerie") {
                return !pageSpec || pageSpec === "sorcellerie";
            }
            return pageSpec === specializationKey;
        });
        if (matchIndex >= 0) return matchIndex;

        const newPage = createDefaultPage();
        newPage.fields = {
            ...(newPage.fields || {}),
            magicSpecialization: specializationKey,
            magicName: pageLabel || specializationKey
        };
        pages.push(newPage);
        return pages.length - 1;
    }

    function goToPageInternal(pageNumber, payload, { persist = true } = {}) {
        const target = Number(pageNumber) || SCREEN_PAGE.CATEGORIES;
        if (target === SCREEN_PAGE.CATEGORIES) {
            setScreenPage(SCREEN_PAGE.CATEGORIES);
            if (persist) {
                saveToStorage();
            }
            return;
        }

        if (target === SCREEN_PAGE.NAVIGATION) {
            if (typeof payload === "string" && payload.trim()) {
                const specialization = normalizeSpecializationLabel(payload);
                if (specialization) {
                    const targetIndex = ensurePageForSpecialization(specialization, payload.trim());
                    if (targetIndex !== activePageIndex) {
                        setActivePage(targetIndex);
                    }
                    const updatedFields = {
                        ...(pages[activePageIndex]?.fields || {}),
                        magicSpecialization: specialization
                    };
                    if (!updatedFields.magicName) {
                        updatedFields.magicName = payload.trim();
                    }
                    pages[activePageIndex].fields = updatedFields;
                    applyFormFields(updatedFields);
                    updateCapacityUI();
                    markDirty();
                }
            }
            showMainNavigationOnly({ persist });
            return;
        }

        if (target === SCREEN_PAGE.SPELL_TYPES) {
            setScreenPage(SCREEN_PAGE.SPELL_TYPES);
            updateSpellTypeCounts();
            if (persist) {
                saveToStorage();
            }
            return;
        }

        if (target === SCREEN_PAGE.SPELL_LIST) {
            setScreenPage(SCREEN_PAGE.SPELL_LIST);
            const config = getSpellCategoryConfig(payload || currentSpellCategory);
            currentSpellCategory = Object.entries(SPELL_CATEGORY_CONFIG)
                .find(([, value]) => value.rank === config.rank)?.[0] || "mineurs";
            updateSpellTypeCounts();
            renderSpellCardsForCategory(currentSpellCategory);
            if (persist) {
                saveToStorage();
            }
        }
    }

    function syncSpecializationPages({ specialization, count, nameBase }) {
        if (!specialization) return;
        const matches = pages.filter((page) => page?.fields?.magicSpecialization === specialization);
        for (let i = 0; i < count; i += 1) {
            const page = matches[i] || createDefaultPage();
            page.fields = { ...(page.fields || {}) };
            page.fields.magicSpecialization = specialization;
            page.fields.magicAffinityKey = "";
            page.fields.magicName = count > 1 ? `${nameBase} ${i + 1}` : nameBase;
            page.hidden = false;
            if (!matches[i]) {
                pages.push(page);
            }
        }
        for (let i = count; i < matches.length; i += 1) {
            matches[i].hidden = true;
        }
    }

    function updateAffinityDisplay(fields) {
        if (!affinityDisplay) return;
        const key = fields?.magicAffinityKey;
        if (key) {
            affinityDisplay.textContent = getAffinityLabel(key);
            return;
        }
        const specialization = fields?.magicSpecialization;
        if (specialization) {
            const fallback = specialization === "alice"
                ? "Alice"
                : specialization === "eater" || specialization === "meister"
                    ? "Eater"
                    : "Sorcellerie";
            affinityDisplay.textContent = fields?.magicName || fallback;
            return;
        }
        affinityDisplay.textContent = "Non assignée";
    }

    const createDefaultPage = () => ({
        fields: readFormFields(),
        capacities: defaultCapacities.map((cap) => ({
            ...cap,
            stats: Array.isArray(cap.stats) ? [...cap.stats] : [],
            level: Number(cap.level) || 1,
            upgrades: Array.isArray(cap.upgrades)
                ? cap.upgrades.map((entry, index) => (entry && typeof entry === "object"
                    ? { ...entry }
                    : { level: index + 2, note: String(entry || "") }))
                : []
        }))
    });

    function buildStorageKey(key) {
        return key === "default" ? STORAGE_KEY_BASE : `${STORAGE_KEY_BASE}-${key}`;
    }

    function getMagicProgressKey() {
        return currentCharacterKey ? `magic-progress-${currentCharacterKey}` : "magic-progress-default";
    }

    function loadMagicProgress() {
        const profileProgress = currentCharacter?.profile_data?.magic_progress;
        if (profileProgress && typeof profileProgress === "object") {
            return {
                affinities: { ...(profileProgress.affinities || {}) },
                enabledAffinities: Array.isArray(profileProgress.enabledAffinities)
                    ? [...profileProgress.enabledAffinities]
                    : [],
                aliceStats: {
                    puissanceMinorUsed: Number(profileProgress.aliceStats?.puissanceMinorUsed) || 0,
                    puissanceUltimateUsed: Number(profileProgress.aliceStats?.puissanceUltimateUsed) || 0,
                    controleMinorUsed: Number(profileProgress.aliceStats?.controleMinorUsed) || 0,
                    controleUltimateUsed: Number(profileProgress.aliceStats?.controleUltimateUsed) || 0
                }
            };
        }
        try {
            const raw = localStorage.getItem(getMagicProgressKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    return {
                        affinities: { ...(parsed.affinities || {}) },
                        enabledAffinities: Array.isArray(parsed.enabledAffinities)
                            ? [...parsed.enabledAffinities]
                            : [],
                        aliceStats: {
                            puissanceMinorUsed: Number(parsed.aliceStats?.puissanceMinorUsed) || 0,
                            puissanceUltimateUsed: Number(parsed.aliceStats?.puissanceUltimateUsed) || 0,
                            controleMinorUsed: Number(parsed.aliceStats?.controleMinorUsed) || 0,
                            controleUltimateUsed: Number(parsed.aliceStats?.controleUltimateUsed) || 0
                        }
                    };
                }
            }
        } catch {}
        return {
            affinities: {},
            enabledAffinities: [],
            aliceStats: {
                puissanceMinorUsed: 0,
                puissanceUltimateUsed: 0,
                controleMinorUsed: 0,
                controleUltimateUsed: 0
            }
        };
    }

    function persistMagicProgress(progress, { persistProfile = false } = {}) {
        if (!progress) return;
        try {
            localStorage.setItem(getMagicProgressKey(), JSON.stringify(progress));
        } catch {}
        if (!persistProfile || !currentCharacter?.id || !authApi?.updateCharacter) return;
        const profileData = { ...(currentCharacter.profile_data || {}) };
        profileData.magic_progress = progress;
        authApi.updateCharacter(currentCharacter.id, { profile_data: profileData }).catch(() => {});
        currentCharacter = { ...currentCharacter, profile_data: profileData };
        try {
            localStorage.setItem("astoria_active_character", JSON.stringify(currentCharacter));
        } catch {}
    }

    function isPageHidden(page) {
        if (!page) return true;
        if (page.hidden) return true;
        if (page.fields?.magicHidden) return true;
        return false;
    }

    function ensureActivePageVisible() {
        if (!pages.length) return;
        if (!isPageHidden(pages[activePageIndex])) return;
        const nextIndex = pages.findIndex((page) => !isPageHidden(page));
        if (nextIndex >= 0) {
            activePageIndex = nextIndex;
        }
    }

    function syncPagesWithProgress() {
        const progress = loadMagicProgress();
        const enabled = Array.isArray(progress.enabledAffinities) ? progress.enabledAffinities : [];
        const affinities = getMagicAffinities();
        const aliceStatus = getAliceStatus();
        const eaterEnabled = getEaterStatus();
        const eaterRole = getEaterRole();
        const existingMap = new Map();
        pages.forEach((page, index) => {
            let key = page?.fields?.magicAffinityKey;
            if (!key && page?.fields?.magicName) {
                const normalizedName = normalizeText(page.fields.magicName);
                const match = affinities.find((entry) => normalizeText(entry.label) === normalizedName);
                if (match) {
                    key = match.key;
                    page.fields.magicAffinityKey = key;
                }
            }
            if (key) {
                existingMap.set(key, index);
                page.fields.magicSpecialization = page.fields.magicSpecialization || "sorcellerie";
            }
        });

        // Legacy migration removed - keep meister and arme as separate types

        enabled.forEach((key) => {
            const entry = progress.affinities[key] || {};
            if (!entry.unlocked) return;
            if (!existingMap.has(key)) {
                const affinityLabel = getAffinityLabel(key);
                const newPage = createDefaultPage();
                newPage.fields = { ...(newPage.fields || {}) };
                newPage.fields.magicAffinityKey = key;
                newPage.fields.magicName = affinityLabel;
                newPage.fields.magicSpecialization = "sorcellerie";
                pages.push(newPage);
                existingMap.set(key, pages.length - 1);
            }
        });

        pages.forEach((page) => {
            const key = page?.fields?.magicAffinityKey;
            if (!key) return;
            const entry = progress.affinities[key] || {};
            const enabledKey = enabled.includes(key);
            page.hidden = !(enabledKey && entry.unlocked);
        });

        syncSpecializationPages({
            specialization: "alice",
            count: aliceStatus === "double" ? 2 : aliceStatus === "simple" ? 1 : 0,
            nameBase: "Alice"
        });
        syncSpecializationPages({
            specialization: "meister",
            count: eaterEnabled && eaterRole === "meister" ? 1 : 0,
            nameBase: "Meister"
        });
        syncSpecializationPages({
            specialization: "arme",
            count: eaterEnabled && eaterRole === "weapon" ? 1 : 0,
            nameBase: "Weapon"
        });
        // Legacy: hide old "eater" pages
        syncSpecializationPages({
            specialization: "eater",
            count: 0,
            nameBase: "Eater"
        });

        const hasAssignedPages = pages.some((page) => {
            if (page.hidden) return false;
            if (page?.fields?.magicAffinityKey) return true;
            if (page?.fields?.magicSpecialization) return true;
            return false;
        });
        pages.forEach((page) => {
            if (page?.fields?.magicAffinityKey) return;
            if (page?.fields?.magicSpecialization) return;
            page.hidden = hasAssignedPages;
        });

        ensureActivePageVisible();
        saveToStorage();
    }

    function getAscensionCost(type, level) {
        const list = MAGIC_ASCENSION_COSTS[type] || MAGIC_ASCENSION_COSTS.none;
        return list[level - 1] ?? null;
    }

    function getScrollBaseItem(category) {
        const items = Array.isArray(window.inventoryData) ? window.inventoryData : [];
        const targets = category === "eveil"
            ? ["Parchemin d'Éveil", "Parchemin d'Eveil"]
            : ["Parchemin d'Ascension"];
        const normalizedTargets = targets.map((name) => normalizeText(name));
        const index = items.findIndex((item) => normalizedTargets.includes(normalizeText(item?.name)));
        if (index < 0) return null;
        return { ...items[index], sourceIndex: index };
    }

    function getScrollItemKey(item) {
        if (!item) return "unknown";
        const sourceIndex = Number(item?.sourceIndex);
        if (Number.isFinite(sourceIndex)) {
            return `idx:${sourceIndex}`;
        }
        const name = item?.name ? normalizeText(item.name) : "";
        if (name) return `name:${name}`;
        const id = Number(item?.id);
        if (Number.isFinite(id)) return `id:${id}`;
        return "unknown";
    }

    function getScrollCounts(profileData, category) {
        const baseItem = getScrollBaseItem(category);
        if (!baseItem) return {};
        const key = getScrollItemKey(baseItem);
        const scrollTypes = profileData?.inventory?.scrollTypes || {};
        const bucket = scrollTypes[category] || {};
        const entry = bucket[key];
        return entry?.counts && typeof entry.counts === "object" ? { ...entry.counts } : {};
    }

    function sumScrollCounts(counts) {
        if (!counts || typeof counts !== "object") return 0;
        return Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    }

    function getActiveAffinityKey() {
        const page = pages[activePageIndex];
        return page?.fields?.magicAffinityKey || "";
    }

    function getScrollCountForAffinity(counts, affinityKey) {
        if (!counts || typeof counts !== "object") return 0;
        if (!affinityKey) return sumScrollCounts(counts);
        return Number(counts[affinityKey]) || 0;
    }

    function getAliceStats(aliceNumber = 1) {
        const competencesData = getFicheTabData("competences");
        const puissanceKey = aliceNumber === 1 ? "alicePuissance" : "alicePuissance2";
        const controleKey = aliceNumber === 1 ? "aliceControle" : "aliceControle2";

        const puissance = Number(competencesData?.[puissanceKey]) || 0;
        const controle = Number(competencesData?.[controleKey]) || 0;

        const progress = loadMagicProgress();
        const statsKey = aliceNumber === 1 ? "aliceStats" : "alice2Stats";
        const used = progress[statsKey] || {
            puissanceMinorUsed: 0,
            puissanceUltimateUsed: 0,
            controleMinorUsed: 0,
            controleUltimateUsed: 0
        };

        const puissanceMinorTotal = Math.floor(puissance / 5);
        const puissanceUltimateTotal = Math.floor(puissance / 10);
        const controleMinorTotal = Math.floor(controle / 5);
        const controleUltimateTotal = Math.floor(controle / 10);

        const puissanceMinor = Math.max(0, puissanceMinorTotal - used.puissanceMinorUsed);
        const puissanceUltimate = Math.max(0, puissanceUltimateTotal - used.puissanceUltimateUsed);
        const controleMinor = Math.max(0, controleMinorTotal - used.controleMinorUsed);
        const controleUltimate = Math.max(0, controleUltimateTotal - used.controleUltimateUsed);

        return {
            puissance,
            controle,
            puissanceMinor,
            puissanceUltimate,
            controleMinor,
            controleUltimate,
            totalPuissanceUpgrades: puissanceMinor + puissanceUltimate,
            totalControleUpgrades: controleMinor + controleUltimate,
            aliceNumber
        };
    }

    function getWeaponFragments() {
        const competencesData = getFicheTabData("competences");
        const eaterData = getFicheTabData("eater");

        // Compétences Weapon
        const puissanceCapacite = Number(competencesData?.weaponPuissanceCapacite) || 0;
        const maitriseCapacite = Number(competencesData?.weaponMaitriseCapacite) || 0;

        // Âmes de progression
        const progSouls = Number(eaterData?.eaterAmesProgression) || 0;

        const progress = loadMagicProgress();
        const used = progress.weaponFragments || {
            puissanceUsed: 0,
            maitriseUsed: 0,
            soulsMinorUsed: 0,
            soulsUltimateUsed: 0
        };

        // Compétences: Puissance (tous les 5pts → améliorer mineur)
        const puissanceTotal = Math.floor(puissanceCapacite / 5);
        const puissanceAvailable = Math.max(0, puissanceTotal - used.puissanceUsed);

        // Compétences: Maîtrise (tous les 10pts → ajouter OU améliorer mineur)
        const maitriseTotal = Math.floor(maitriseCapacite / 10);
        const maitriseAvailable = Math.max(0, maitriseTotal - used.maitriseUsed);

        // Âmes: mineurs aux seuils 40,80,120,150,200,325,475
        const soulsMinorTotal = [40, 80, 120, 150, 200, 325, 475].filter(threshold => progSouls >= threshold).length;
        const soulsMinorAvailable = Math.max(0, soulsMinorTotal - used.soulsMinorUsed);

        // Âmes: ultimes aux seuils 100,250,400
        const soulsUltimateTotal = [100, 250, 400].filter(threshold => progSouls >= threshold).length;
        const soulsUltimateAvailable = Math.max(0, soulsUltimateTotal - used.soulsUltimateUsed);

        return {
            progSouls,
            puissanceCapacite,
            maitriseCapacite,
            puissanceAvailable,
            maitriseAvailable,
            soulsMinorAvailable,
            soulsUltimateAvailable,
            // Total fragments = compétences + âmes
            minorFragments: puissanceAvailable + maitriseAvailable + soulsMinorAvailable,
            ultimateFragments: soulsUltimateAvailable
        };
    }

    function getMeisterSkills() {
        const competencesData = getFicheTabData("competences");
        const resonanceAmes = Number(competencesData?.meisterResonanceAmes) || 0;
        const puissanceCapacite = Number(competencesData?.meisterPuissanceCapacite) || 0;
        const maitriseCapacite = Number(competencesData?.meisterMaitriseCapacite) || 0;

        const progress = loadMagicProgress();
        const used = progress.meisterSkills || {
            resonanceUsed: 0,
            puissanceUsed: 0,
            maitriseUsed: 0
        };

        // Résonnance des Âmes: tous les 10 pts = 1 amélioration ultime
        const resonanceTotal = Math.floor(resonanceAmes / 10);
        const resonanceAvailable = Math.max(0, resonanceTotal - used.resonanceUsed);

        // Puissance de la capacité unique: tous les 5 pts = 1 amélioration mineur
        const puissanceTotal = Math.floor(puissanceCapacite / 5);
        const puissanceAvailable = Math.max(0, puissanceTotal - used.puissanceUsed);

        // Maîtrise de la capacité unique: tous les 5 pts = 1 ajout OU amélioration mineur
        const maitriseTotal = Math.floor(maitriseCapacite / 5);
        const maitriseAvailable = Math.max(0, maitriseTotal - used.maitriseUsed);

        return {
            resonanceAmes,
            puissanceCapacite,
            maitriseCapacite,
            resonanceAvailable,
            puissanceAvailable,
            maitriseAvailable,
            // Pour l'affichage: minorUpgrades = puissance + maîtrise, ultimateUpgrades = résonnance
            minorFragments: puissanceAvailable + maitriseAvailable,
            ultimateFragments: resonanceAvailable
        };
    }

    function renderScrollMeter() {
        const meterContainer = document.getElementById("magicScrollMeter");
        const currentPage = pages[activePageIndex];
        const specialization = currentPage?.fields?.magicSpecialization;

        if (aliceStatsMeterEl) aliceStatsMeterEl.style.display = "none";
        if (meisterSoulsMeterEl) meisterSoulsMeterEl.style.display = "none";
        if (armeSoulsMeterEl) armeSoulsMeterEl.style.display = "none";
        if (meterContainer) meterContainer.style.display = "none";

        if (specialization === "alice" || specialization === "alice-double") {
            if (aliceStatsMeterEl) {
                aliceStatsMeterEl.style.display = "";

                if (specialization === "alice-double") {
                    // Pour Alice Double, afficher les stats de l'Alice actif (déterminé par aliceType)
                    const aliceNumber = currentPage?.fields?.aliceType === 2 ? 2 : 1;
                    const stats = getAliceStats(aliceNumber);
                    const aliceLabel = `Alice ${aliceNumber}`;

                    if (alicePuissanceEl) alicePuissanceEl.textContent = `${aliceLabel} P: ${stats.puissance}`;
                    if (alicePuissanceMinorEl) alicePuissanceMinorEl.textContent = String(stats.puissanceMinor);
                    if (alicePuissanceUltimateEl) alicePuissanceUltimateEl.textContent = String(stats.puissanceUltimate);
                    if (aliceControleEl) aliceControleEl.textContent = `${aliceLabel} C: ${stats.controle}`;
                    if (aliceControleMinorEl) aliceControleMinorEl.textContent = String(stats.controleMinor);
                    if (aliceControleUltimateEl) aliceControleUltimateEl.textContent = String(stats.controleUltimate);
                } else {
                    // Alice Simple
                    const stats = getAliceStats(1);
                    if (alicePuissanceEl) alicePuissanceEl.textContent = String(stats.puissance);
                    if (alicePuissanceMinorEl) alicePuissanceMinorEl.textContent = String(stats.puissanceMinor);
                    if (alicePuissanceUltimateEl) alicePuissanceUltimateEl.textContent = String(stats.puissanceUltimate);
                    if (aliceControleEl) aliceControleEl.textContent = String(stats.controle);
                    if (aliceControleMinorEl) aliceControleMinorEl.textContent = String(stats.controleMinor);
                    if (aliceControleUltimateEl) aliceControleUltimateEl.textContent = String(stats.controleUltimate);
                }
            }
            return;
        }

        if (specialization === "meister") {
            if (meisterSoulsMeterEl) {
                meisterSoulsMeterEl.style.display = "";
                const skills = getMeisterSkills();

                if (meisterMinorFragmentsEl) meisterMinorFragmentsEl.textContent = String(skills.minorFragments);
                if (meisterUltimateFragmentsEl) meisterUltimateFragmentsEl.textContent = String(skills.ultimateFragments);
                if (meisterProgSoulsEl) meisterProgSoulsEl.textContent = `P:${skills.puissanceCapacite} M:${skills.maitriseCapacite} R:${skills.resonanceAmes}`;
            }
            return;
        }

        if (specialization === "arme") {
            if (armeSoulsMeterEl) {
                armeSoulsMeterEl.style.display = "";
                const weapon = getWeaponFragments();

                if (armeMinorFragmentsEl) armeMinorFragmentsEl.textContent = String(weapon.minorFragments);
                if (armeUltimateFragmentsEl) armeUltimateFragmentsEl.textContent = String(weapon.ultimateFragments);
                if (armeProgSoulsEl) armeProgSoulsEl.textContent = `P:${weapon.puissanceCapacite} M:${weapon.maitriseCapacite} Â:${weapon.progSouls}`;
            }
            return;
        }

        if (!scrollEveilCountEl || !scrollAscensionCountEl) return;
        if (meterContainer) meterContainer.style.display = "";
        const profileData = currentCharacter?.profile_data || {};
        const eveilCounts = getScrollCounts(profileData, "eveil");
        const ascensionCounts = getScrollCounts(profileData, "ascension");
        const affinityKey = getActiveAffinityKey();
        scrollEveilCountEl.textContent = String(getScrollCountForAffinity(eveilCounts, affinityKey));
        scrollAscensionCountEl.textContent = String(getScrollCountForAffinity(ascensionCounts, affinityKey));
    }

    function getAscensionCostLabel(page, rank, nextLevel) {
        const specialization = page?.fields?.magicSpecialization;

        if (specialization === "alice") {
            if (rank === "ultime") {
                const requiredStat = nextLevel * 10;
                return `Requis: ${requiredStat} pts (Puissance ou Contrôle)`;
            }
            const requiredStat = nextLevel * 5;
            return `Requis: ${requiredStat} pts (Puissance ou Contrôle)`;
        }

        if (specialization === "meister") {
            if (rank === "ultime") {
                const thresholds = [150, 325, 475];
                const required = thresholds[Math.min(nextLevel - 1, 2)] || 150;
                return `Requis: ${required}% âmes de progression`;
            }
            const thresholds = [40, 80, 120, 200, 250, 375, 425];
            const required = thresholds[Math.min(nextLevel - 1, 6)] || 40;
            return `Requis: ${required}% âmes de progression`;
        }

        if (specialization && specialization !== "sorcellerie") return "Indisponible";
        if (rank === "ultime") {
            return `${getUltimeAscensionCost(nextLevel)} parchemins`;
        }
        const ascensionCost = getAscensionCostForPage(page);
        if (ascensionCost == null) return "Indisponible";
        if (ascensionCost === 0) return "Gratuit";
        return `${ascensionCost} parchemins`;
    }

    function updateNewCapCostPreview() {
        if (!capCostPreview) return;
        const page = pages[activePageIndex];
        const rank = capRankInput?.value || "mineur";
        const label = getAscensionCostLabel(page, rank, 1);
        capCostPreview.textContent = `Cout d'ascension : ${label}`;
    }

    function syncZoneControls(targetSelect, zoneSelect, zoneDetailInput) {
        if (!targetSelect || !zoneSelect) return;
        const isMono = targetSelect.value === "mono";
        zoneSelect.disabled = isMono;
        if (zoneDetailInput) {
            zoneDetailInput.disabled = isMono;
        }
        if (isMono) {
            zoneSelect.value = "";
            if (zoneDetailInput) zoneDetailInput.value = "";
        }
    }

    async function applyScrollCost({ category, affinityKey, cost }) {
        if (!currentCharacter?.id || !affinityKey || !Number.isFinite(cost)) {
            return { ok: false, reason: "missing-data" };
        }
        const baseItem = getScrollBaseItem(category);
        if (!baseItem) return { ok: false, reason: "missing-scroll-item" };

        const profileData = { ...(currentCharacter.profile_data || {}) };
        const inventory = { ...(profileData.inventory || {}) };
        const scrollTypes = { ...(inventory.scrollTypes || {}) };
        const bucket = { ...(scrollTypes[category] || {}) };
        const itemKey = getScrollItemKey(baseItem);
        const entry = bucket[itemKey] || {};
        const counts = { ...(entry.counts || {}) };
        const current = Number(counts[affinityKey]) || 0;
        if (current < cost) {
            return { ok: false, reason: "insufficient", current };
        }
        const next = Math.max(0, current - cost);
        if (next > 0) {
            counts[affinityKey] = next;
        } else {
            delete counts[affinityKey];
        }
        if (Object.keys(counts).length) {
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

        if (authApi?.updateCharacter) {
            await authApi.updateCharacter(currentCharacter.id, { profile_data: profileData }).catch(() => {});
        }
        currentCharacter = { ...currentCharacter, profile_data: profileData };
        try {
            localStorage.setItem("astoria_active_character", JSON.stringify(currentCharacter));
        } catch {}

        try {
            const inventoryApi = await import("./api/inventory-service.js");
            const rows = await inventoryApi.getInventoryRows(currentCharacter.id);
            const sourceIndex = Number(baseItem.sourceIndex);
            const targetRow = rows.find((row) =>
                Number(row?.item_index) === sourceIndex ||
                normalizeText(row?.item_key) === normalizeText(baseItem.name)
            );
            if (targetRow) {
                const nextQty = Math.max(0, Math.floor(Number(targetRow.qty) || 0) - cost);
                await inventoryApi.setInventoryItem(currentCharacter.id, targetRow.item_key, targetRow.item_index, nextQty);
            }
        } catch {}

        renderScrollMeter();
        return { ok: true };
    }

    function getAscensionCostForPage(page) {
        const specialization = page?.fields?.magicSpecialization;
        if (specialization && specialization !== "sorcellerie") return null;
        const affinityKey = page?.fields?.magicAffinityKey;
        if (!affinityKey) return null;
        const progress = loadMagicProgress();
        const entry = progress.affinities[affinityKey];
        if (!entry || !entry.unlocked) return null;
        const affinityType = entry.affinityType || "none";
        const techniquesCount = Number(entry.techniquesCount) || 0;
        const ascensionLevel = Number(entry.ascensionLevel) || 0;
        if (techniquesCount < ascensionLevel) return 0;
        return getAscensionCost(affinityType, ascensionLevel + 1);
    }

    async function consumeAscensionForTechnique(page) {
        const specialization = page?.fields?.magicSpecialization;
        if (specialization && specialization !== "sorcellerie") {
            return true;
        }
        const affinityKey = page?.fields?.magicAffinityKey;
        if (!affinityKey) return true;
        const progress = loadMagicProgress();
        const entry = progress.affinities[affinityKey];
        if (!entry || !entry.unlocked) {
            alert("Cette magie n'est pas débloquée.");
            return false;
        }
        const affinityType = entry.affinityType || "none";
        const techniquesCount = Number(entry.techniquesCount) || 0;
        const ascensionLevel = Number(entry.ascensionLevel) || 0;

        if (techniquesCount < ascensionLevel) {
            entry.techniquesCount = techniquesCount + 1;
            progress.affinities[affinityKey] = entry;
            persistMagicProgress(progress, { persistProfile: true });
            return true;
        }

        const nextLevel = ascensionLevel + 1;
        const cost = getAscensionCost(affinityType, nextLevel);
        if (!cost) {
            alert("Ascension maximale atteinte pour cette affinité.");
            return false;
        }
        const result = await applyScrollCost({ category: "ascension", affinityKey, cost });
        if (!result.ok) {
            alert("Parchemins d'ascension insuffisants.");
            return false;
        }
        entry.ascensionLevel = nextLevel;
        entry.techniquesCount = techniquesCount + 1;
        progress.affinities[affinityKey] = entry;
        persistMagicProgress(progress, { persistProfile: true });
        return true;
    }

    function checkAliceUpgradesAvailable(rank) {
        const stats = getAliceStats();
        const isMinor = rank === "mineur";
        const availableUpgrades = isMinor ? stats.puissanceMinor : stats.puissanceUltimate;
        return availableUpgrades > 0;
    }

    function checkAliceSpellsAvailable(rank) {
        const stats = getAliceStats();
        const isMinor = rank === "mineur";
        const availableSpells = isMinor ? stats.controleMinor : stats.controleUltimate;
        return availableSpells > 0;
    }

    async function consumeAscensionForRank(page, rank, nextLevel) {
        const specialization = page?.fields?.magicSpecialization;

        // Alice validation and consumption
        if (specialization === "alice" || specialization === "alice-double") {
            const isMinor = rank === "mineur";
            const isNewSpell = nextLevel === 1;

            // Pour alice-double, déterminer quel Alice utiliser (défaut: Alice 1)
            const aliceNumber = (specialization === "alice-double" && page?.fields?.aliceType === 2) ? 2 : 1;
            const stats = getAliceStats(aliceNumber);
            const progress = loadMagicProgress();

            const statsKey = aliceNumber === 1 ? "aliceStats" : "alice2Stats";
            if (!progress[statsKey]) {
                progress[statsKey] = {
                    puissanceMinorUsed: 0,
                    puissanceUltimateUsed: 0,
                    controleMinorUsed: 0,
                    controleUltimateUsed: 0
                };
            }

            if (isNewSpell) {
                // Creating new spell - consume Contrôle (rank must match)
                const availableSpells = isMinor ? stats.controleMinor : stats.controleUltimate;
                if (availableSpells <= 0) {
                    const rankLabel = isMinor ? "mineur" : "ultime";
                    const aliceLabel = specialization === "alice-double" ? ` (Alice ${aliceNumber})` : "";
                    alert(`Vous n'avez pas de sorts ${rankLabel} disponibles${aliceLabel}.\n\nAugmentez votre Contrôle Alice ${aliceNumber} dans la fiche de compétences.`);
                    return false;
                }
                // Consume spell point matching rank
                if (isMinor) {
                    progress[statsKey].controleMinorUsed = (progress[statsKey].controleMinorUsed || 0) + 1;
                } else {
                    progress[statsKey].controleUltimateUsed = (progress[statsKey].controleUltimateUsed || 0) + 1;
                }
            } else {
                // Upgrading existing spell - consume Puissance (rank must match)
                const availableUpgrades = isMinor ? stats.puissanceMinor : stats.puissanceUltimate;
                if (availableUpgrades <= 0) {
                    const rankLabel = isMinor ? "mineure" : "ultime";
                    const aliceLabel = specialization === "alice-double" ? ` (Alice ${aliceNumber})` : "";
                    alert(`Vous n'avez pas d'améliorations ${rankLabel} disponibles${aliceLabel}.\n\nAugmentez votre Puissance Alice ${aliceNumber} dans la fiche de compétences.`);
                    return false;
                }
                // Consume upgrade point matching rank
                if (isMinor) {
                    progress[statsKey].puissanceMinorUsed = (progress[statsKey].puissanceMinorUsed || 0) + 1;
                } else {
                    progress[statsKey].puissanceUltimateUsed = (progress[statsKey].puissanceUltimateUsed || 0) + 1;
                }
            }

            persistMagicProgress(progress, { persistProfile: true });
            renderScrollMeter(); // Update the display
            return true;
        }

        // Meister validation and consumption
        if (specialization === "meister") {
            const skills = getMeisterSkills();
            const isMinor = rank === "mineur";
            const isNewFragment = nextLevel === 1;
            const progress = loadMagicProgress();

            if (!progress.meisterSkills) {
                progress.meisterSkills = {
                    resonanceUsed: 0,
                    puissanceUsed: 0,
                    maitriseUsed: 0
                };
            }

            if (isMinor) {
                if (isNewFragment) {
                    // Ajouter un fragment mineur: consommer Maîtrise
                    if (skills.maitriseAvailable <= 0) {
                        alert(`Vous n'avez pas de points Maîtrise disponibles.\n\nAugmentez "Maîtrise de la capacité unique" dans les compétences.`);
                        return false;
                    }
                    progress.meisterSkills.maitriseUsed += 1;
                } else {
                    // Améliorer un fragment mineur: consommer Puissance (priorité) ou Maîtrise
                    if (skills.puissanceAvailable > 0) {
                        progress.meisterSkills.puissanceUsed += 1;
                    } else if (skills.maitriseAvailable > 0) {
                        progress.meisterSkills.maitriseUsed += 1;
                    } else {
                        alert(`Vous n'avez pas de points Puissance ou Maîtrise disponibles.\n\nAugmentez vos compétences.`);
                        return false;
                    }
                }
            } else {
                // Fragment ultime
                if (isNewFragment) {
                    alert(`Les fragments ultimes ne peuvent pas être ajoutés pour Meister.\n\nSeules les améliorations sont possibles.`);
                    return false;
                }
                // Améliorer un fragment ultime: consommer Résonnance
                if (skills.resonanceAvailable <= 0) {
                    alert(`Vous n'avez pas de points Résonnance disponibles.\n\nAugmentez "Résonnance des Âmes" dans les compétences.`);
                    return false;
                }
                progress.meisterSkills.resonanceUsed += 1;
            }

            persistMagicProgress(progress, { persistProfile: true });
            renderScrollMeter();
            return true;
        }

        // Weapon validation and consumption (compétences + âmes)
        if (specialization === "arme") {
            const weapon = getWeaponFragments();
            const isMinor = rank === "mineur";
            const isNewFragment = nextLevel === 1;
            const progress = loadMagicProgress();

            if (!progress.weaponFragments) {
                progress.weaponFragments = {
                    puissanceUsed: 0,
                    maitriseUsed: 0,
                    soulsMinorUsed: 0,
                    soulsUltimateUsed: 0
                };
            }

            if (isMinor) {
                if (isNewFragment) {
                    // Ajouter un fragment mineur: consommer Maîtrise (priorité) ou âme
                    if (weapon.maitriseAvailable > 0) {
                        progress.weaponFragments.maitriseUsed += 1;
                    } else if (weapon.soulsMinorAvailable > 0) {
                        progress.weaponFragments.soulsMinorUsed += 1;
                    } else {
                        alert(`Vous n'avez pas de fragments mineurs disponibles.\n\nAugmentez "Maîtrise de la capacité unique" ou consommez des âmes de progression.`);
                        return false;
                    }
                } else {
                    // Améliorer un fragment mineur: consommer Puissance (priorité), Maîtrise, ou âme
                    if (weapon.puissanceAvailable > 0) {
                        progress.weaponFragments.puissanceUsed += 1;
                    } else if (weapon.maitriseAvailable > 0) {
                        progress.weaponFragments.maitriseUsed += 1;
                    } else if (weapon.soulsMinorAvailable > 0) {
                        progress.weaponFragments.soulsMinorUsed += 1;
                    } else {
                        alert(`Vous n'avez pas de fragments mineurs disponibles.\n\nAugmentez vos compétences ou consommez des âmes de progression.`);
                        return false;
                    }
                }
            } else {
                // Fragment ultime: uniquement via âmes
                if (isNewFragment) {
                    if (weapon.soulsUltimateAvailable <= 0) {
                        alert(`Vous n'avez pas de fragments ultimes disponibles.\n\nConsommez des âmes de progression (seuils: 100, 250, 400).`);
                        return false;
                    }
                    progress.weaponFragments.soulsUltimateUsed += 1;
                } else {
                    // Améliorer ultime
                    if (weapon.soulsUltimateAvailable <= 0) {
                        alert(`Vous n'avez pas de fragments ultimes disponibles.\n\nConsommez des âmes de progression (seuils: 100, 250, 400).`);
                        return false;
                    }
                    progress.weaponFragments.soulsUltimateUsed += 1;
                }
            }

            persistMagicProgress(progress, { persistProfile: true });
            renderScrollMeter();
            return true;
        }

        // Sorcerer validation (scrolls)
        if (rank !== "ultime") {
            return consumeAscensionForTechnique(page);
        }
        const affinityKey = page?.fields?.magicAffinityKey;
        if (!affinityKey) {
            alert("Affinite manquante pour calculer l'ascension.");
            return false;
        }
        const cost = getUltimeAscensionCost(nextLevel || 1);
        const result = await applyScrollCost({ category: "ascension", affinityKey, cost });
        if (!result.ok) {
            alert("Parchemins d'ascension insuffisants.");
            return false;
        }
        return true;
    }

    async function initSummary() {
        try {
            summaryModule = await import("./ui/character-summary.js");
        } catch (error) {
            summaryModule = null;
        }
        const summaryState = await summaryModule?.initCharacterSummary({ includeQueryParam: false, enableDropdown: true, showKaels: true }) || null;
        currentCharacterKey = summaryState?.context?.key || "default";
        currentCharacter = summaryState?.context?.character || null;
        storageKey = buildStorageKey(currentCharacterKey);
    }

    function updateSaveStatus() {
        if (!saveStatus) return;
        saveStatus.textContent = hasPendingChanges ? "Sauvegarde en attente." : "Tout est sauvegarde.";
        saveStatus.classList.toggle("magic-save-status--dirty", hasPendingChanges);
        if (saveRow) {
            saveRow.classList.toggle("magic-save-row--dirty", hasPendingChanges);
        }
    }

    function clearPersistTimers() {
        if (persistState.timer) {
            clearTimeout(persistState.timer);
            persistState.timer = null;
        }
        if (persistState.retryTimer) {
            clearTimeout(persistState.retryTimer);
            persistState.retryTimer = null;
        }
    }

    async function flushProfilePersist() {
        if (!authApi?.updateCharacter || !currentCharacter?.id) return false;
        if (persistState.inFlight) return persistState.inFlight;
        clearPersistTimers();
        saveCurrentPage();
        const payload = saveToStorage();

        const inFlightPromise = (async () => {
            const ok = await persistToProfile(payload);
            if (ok) {
                persistState.retryCount = 0;
                markSaved();
                return true;
            }
            markDirty({ queuePersist: false });
            persistState.retryCount += 1;
            const retryDelay = Math.min(15000, 800 * (2 ** Math.min(5, persistState.retryCount)));
            persistState.retryTimer = setTimeout(() => {
                flushProfilePersist();
            }, retryDelay);
            return false;
        })();

        persistState.inFlight = inFlightPromise.finally(() => {
            persistState.inFlight = null;
        });

        return persistState.inFlight;
    }

    function queueProfilePersist(delayMs = 900) {
        if (!authApi?.updateCharacter || !currentCharacter?.id) return;
        if (persistState.timer) {
            clearTimeout(persistState.timer);
        }
        if (persistState.retryTimer) {
            clearTimeout(persistState.retryTimer);
            persistState.retryTimer = null;
        }
        persistState.timer = setTimeout(() => {
            flushProfilePersist();
        }, delayMs);
    }

    function markDirty({ queuePersist = true } = {}) {
        hasPendingChanges = true;
        updateSaveStatus();
        if (queuePersist) {
            queueProfilePersist();
        }
    }

    function markSaved() {
        hasPendingChanges = false;
        updateSaveStatus();
    }

    function readFormFields() {
        const data = {};
        formFields.forEach((field) => {
            if (!field.id) return;
            if (field.type === "checkbox") {
                data[field.id] = field.checked;
            } else {
                data[field.id] = field.value;
            }
        });
        return data;
    }

    function applyFormFields(values) {
        if (!values) return;
        formFields.forEach((field) => {
            if (!field.id || !(field.id in values)) return;
            if (field.type === "checkbox") {
                field.checked = Boolean(values[field.id]);
            } else {
                field.value = values[field.id];
            }
        });
        updateAffinityDisplay(values);
        renderScrollMeter();
        updateNewCapCostPreview();
    }

    function buildPayload() {
        return {
            pages,
            activePageIndex,
            activeSection,
            activeScreenPage,
            isSectionContentOpen,
            currentSpellCategory
        };
    }

    function saveToStorage() {
        const payload = buildPayload();
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return payload;
    }

    function loadFromStorage() {
        let stored = localStorage.getItem(storageKey);
        if (!stored && storageKey !== STORAGE_KEY_BASE) {
            stored = localStorage.getItem(STORAGE_KEY_BASE);
            if (stored) {
                localStorage.setItem(storageKey, stored);
            }
        }
        if (!stored && currentCharacter?.profile_data?.magic_sheet) {
            try {
                const profilePayload = currentCharacter.profile_data.magic_sheet;
                if (profilePayload && Array.isArray(profilePayload.pages)) {
                    pages = profilePayload.pages;
                    activePageIndex = Math.min(Math.max(profilePayload.activePageIndex || 0, 0), pages.length - 1);
                    activeSection = profilePayload.activeSection || activeSection;
                    activeScreenPage = Math.min(4, Math.max(1, Number(profilePayload.activeScreenPage) || SCREEN_PAGE.CATEGORIES));
                    isSectionContentOpen = Boolean(profilePayload.isSectionContentOpen);
                    currentSpellCategory = Object.prototype.hasOwnProperty.call(SPELL_CATEGORY_CONFIG, profilePayload.currentSpellCategory)
                        ? profilePayload.currentSpellCategory
                        : "mineurs";
                    localStorage.setItem(storageKey, JSON.stringify(profilePayload));
                    return true;
                }
            } catch {}
        }
        if (!stored) return false;
        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) return false;
            pages = parsed.pages;
            activePageIndex = Math.min(Math.max(parsed.activePageIndex || 0, 0), pages.length - 1);
            activeSection = parsed.activeSection || activeSection;
            activeScreenPage = Math.min(4, Math.max(1, Number(parsed.activeScreenPage) || SCREEN_PAGE.CATEGORIES));
            isSectionContentOpen = Boolean(parsed.isSectionContentOpen);
            currentSpellCategory = Object.prototype.hasOwnProperty.call(SPELL_CATEGORY_CONFIG, parsed.currentSpellCategory)
                ? parsed.currentSpellCategory
                : "mineurs";
            return true;
        } catch (error) {
            return false;
        }
    }

    function cloneDefaultCapacities() {
        return defaultCapacities.map((cap) => ({
            ...cap,
            stats: Array.isArray(cap.stats) ? [...cap.stats] : [],
            level: Number(cap.level) || 1,
            upgrades: Array.isArray(cap.upgrades)
                ? cap.upgrades.map((entry, index) => (entry && typeof entry === "object"
                    ? { ...entry }
                    : { level: index + 2, note: String(entry || "") }))
                : []
        }));
    }

    function sanitizeCapacityText() {
        let changed = false;

        pages.forEach((page) => {
            if (!Array.isArray(page.capacities) || page.capacities.length === 0) return;
            const hasReplacement = page.capacities.some((cap) =>
                Object.values(cap).some((value) => typeof value === "string" && value.includes("\uFFFD"))
            );
            if (hasReplacement) {
                page.capacities = cloneDefaultCapacities();
                changed = true;
            }
        });

        return changed;
    }

    function normalizeActiveSection() {
        const hasSection = sections.some((section) => section.id === activeSection);
        if (!hasSection || (!isAdmin && activeSection === "magic-admin")) {
            activeSection = "magic-summary";
        }
    }

    function setActiveSection(sectionId) {
        activeSection = sectionId;
        normalizeActiveSection();
        navButtons.forEach((btn) => {
            btn.classList.toggle("magic-nav-btn--active", btn.dataset.target === activeSection);
        });
        sections.forEach((section) => {
            section.classList.toggle("magic-section--active", section.id === activeSection);
        });
    }

    function renderPageTabs() {
        if (!pageTabs) return;
        const visiblePages = pages.filter((page) => !isPageHidden(page));
        const specializationCounts = {};
        const specializationIndexes = {};
        const numberedSpecializations = new Set(["alice", "meister", "arme"]);

        visiblePages.forEach((page) => {
            const specialization = page?.fields?.magicSpecialization;
            if (!specialization || !numberedSpecializations.has(specialization)) return;
            specializationCounts[specialization] = (specializationCounts[specialization] || 0) + 1;
        });

        pageTabs.innerHTML = "";

        pages.forEach((page, index) => {
            if (isPageHidden(page)) return;
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "magic-page-tab" + (index === activePageIndex ? " magic-page-tab--active" : "");
            const affinityKey = page?.fields?.magicAffinityKey;
            const specialization = page?.fields?.magicSpecialization;
            let label = String(index + 1);
            if (affinityKey) {
                const entry = getMagicAffinities().find((item) => item.key === affinityKey);
                label = entry?.emoji || FALLBACK_SCROLL_EMOJI;
            } else if (specialization === "alice") {
                label = ALICE_EMOJI;
            } else if (specialization === "meister") {
                label = MEISTER_EMOJI;
            } else if (specialization === "arme" || specialization === "eater") {
                label = WEAPON_EMOJI;
            }
            if (specialization && numberedSpecializations.has(specialization) && (specializationCounts[specialization] || 0) > 1) {
                specializationIndexes[specialization] = (specializationIndexes[specialization] || 0) + 1;
                label = `${label} ${specializationIndexes[specialization]}`;
            }
            tab.textContent = label;
            tab.dataset.index = String(index);
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-selected", index === activePageIndex ? "true" : "false");
            tab.addEventListener("click", () => setActivePage(index));
            pageTabs.appendChild(tab);
        });

        if (ENABLE_PAGE_ADD && addPageBtn) {
            pageTabs.appendChild(addPageBtn);
        }
    }

    const specializationLabels = {
        meister: "Meister Arme",
        sorcellerie: "Sorcellerie",
        alice: "Alice",
        eater: "Eater"
    };

    function getFallbackMagicName(fields, indexHint = null) {
        const fieldsSafe = fields || {};
        const fromName = String(fieldsSafe.magicName || "").trim();
        if (fromName) return fromName;

        const affinityKey = String(fieldsSafe.magicAffinityKey || "").trim();
        if (affinityKey) {
            return getAffinityLabel(affinityKey);
        }

        const specValue = String(fieldsSafe.magicSpecialization || "").trim();
        if (specializationLabels[specValue]) {
            return specializationLabels[specValue];
        }

        if (typeof indexHint === "number" && Number.isFinite(indexHint)) {
            return `Magie ${indexHint + 1}`;
        }
        return "Magie";
    }

    function renderPagesOverview() {
        if (!pagesOverview) return;
        pagesOverview.innerHTML = "";
        const visiblePages = pages.filter((page) => !isPageHidden(page));
        if (!visiblePages.length) {
            pagesOverview.textContent = "Aucune magie disponible.";
            return;
        }

        const progress = loadMagicProgress();

        pages.forEach((page, index) => {
            if (isPageHidden(page)) return;
            const fields = page?.fields || {};
            const name = getFallbackMagicName(fields, index);
            const specValue = String(fields.magicSpecialization || "").trim();
            const specLabel = specializationLabels[specValue] || "Sans specialisation";
            const affinityKey = fields.magicAffinityKey;
            const affinityEntry = affinityKey ? progress.affinities[affinityKey] : null;
            const levelLabel = affinityEntry ? `Niveau ${Number(affinityEntry.ascensionLevel) || 0}` : "";

            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = "magic-page-pill" + (index === activePageIndex ? " magic-page-pill--active" : "");
            pill.innerHTML = `
                <span class="magic-page-pill-title">${name}</span>
                <span class="magic-page-pill-meta">${specLabel}${levelLabel ? ` • ${levelLabel}` : ""}</span>
            `;
            pill.addEventListener("click", () => setActivePage(index));
            pagesOverview.appendChild(pill);
        });
    }

    function setActivePage(index) {
        if (index < 0 || index >= pages.length) return;
        if (isPageHidden(pages[index])) return;
        saveCurrentPage();
        activePageIndex = index;
        applyFormFields(pages[activePageIndex].fields || {});
        updateMagicPageTitle();
        setActiveSection(activeSection);
        setCapacityFormOpen(false);
        updateCapacityUI();
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        updateSpellTypeCounts();
        if (activeScreenPage === SCREEN_PAGE.SPELL_LIST) {
            renderSpellCardsForCategory(currentSpellCategory);
        }
        renderPageTabs();
        renderPagesOverview();
        saveToStorage();
    }

    function saveCurrentPage() {
        if (!pages[activePageIndex]) return;
        pages[activePageIndex].fields = readFormFields();
        renderPagesOverview();
    }

    function handleAddPage() {
        if (!pages.length) return;
        saveCurrentPage();
        const source = pages[activePageIndex];
        const newPage = {
            fields: { ...source.fields },
            capacities: Array.isArray(source.capacities)
                ? source.capacities.map((cap) => ({
                    ...cap,
                    stats: Array.isArray(cap.stats) ? [...cap.stats] : [],
                    level: Number(cap.level) || 1,
                    upgrades: Array.isArray(cap.upgrades)
                        ? cap.upgrades.map((entry, index) => (entry && typeof entry === "object"
                            ? { ...entry }
                            : { level: index + 2, note: String(entry || "") }))
                        : []
                }))
                : []
        };
        pages.push(newPage);
        activePageIndex = pages.length - 1;
        applyFormFields(newPage.fields);
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        renderPageTabs();
        renderPagesOverview();
        saveToStorage();
        markDirty();
    }

    function renderCapacities(filterType) {
        if (!capacityList) return;
        const currentPage = pages[activePageIndex];
        const capacities = currentPage && Array.isArray(currentPage.capacities) ? currentPage.capacities : [];
        updateSpellTypeCounts();
        const isSorcelleriePage = !currentPage?.fields?.magicSpecialization
            || currentPage.fields.magicSpecialization === "sorcellerie";
        const ascensionCost = isSorcelleriePage ? getAscensionCostForPage(currentPage) : null;

        capacityList.innerHTML = "";

        // Card view rendering
        if (currentView === "card") {
            const filtered = capacities.filter((cap) => !filterType || cap.type === filterType);

            // Group by rank
            const groups = { signature: [], mineur: [], ultime: [] };
            filtered.forEach(cap => {
                const rank = cap.rank || "mineur";
                if (groups[rank]) groups[rank].push(cap);
            });

            const rankLabels = {
                signature: "Sorts Signature",
                mineur: "Sorts Mineurs",
                ultime: "Sorts Ultimes"
            };

            const showUpgrades = isSorcelleriePage ||
                currentPage?.fields?.magicSpecialization === "alice" ||
                currentPage?.fields?.magicSpecialization === "meister" ||
                currentPage?.fields?.magicSpecialization === "eater";

            // Render each section
            ["signature", "mineur", "ultime"].forEach(rank => {
                const spells = groups[rank];
                if (!spells.length) return;

                const section = document.createElement("section");
                section.className = "spell-section";
                section.dataset.rank = rank;

                const title = document.createElement("h3");
                title.className = "spell-section-title";
                title.textContent = rankLabels[rank];
                section.appendChild(title);

                const grid = document.createElement("div");
                grid.className = "spell-card-grid";

                spells.forEach(cap => {
                    const level = cap.level || 1;
                    const rankLabel = cap.rank === "mineur" ? "Mineur" :
                                     cap.rank === "ultime" ? "Ultime" : "Signature";
                    const typeLabel = cap.type === "offensif" ? "Offensif" :
                                     cap.type === "defensif" ? "Défensif" :
                                     cap.type === "soutien" ? "Soutien" : "Utilitaire";

                    const tags = [];
                    if (cap.target) tags.push(`<span class="spell-pill spell-pill--target">${cap.target}</span>`);
                    if (cap.distance) tags.push(`<span class="spell-pill spell-pill--distance">${cap.distance}</span>`);
                    if (cap.cost) tags.push(`<span class="spell-pill spell-pill--cost">${cap.cost}</span>`);

                    const card = document.createElement("article");
                    card.className = "spell-card";
                    card.dataset.spellId = cap.id;
                    card.dataset.rank = cap.rank;
                    card.innerHTML = `
                        <div class="spell-card-header">
                            <div class="spell-card-title-row">
                                <h4 class="spell-card-name">${cap.name || "Sans nom"}</h4>
                                <span class="spell-card-level">Niv. ${level}</span>
                            </div>
                            <div class="spell-card-meta">
                                <span class="spell-badge spell-badge--type">${typeLabel}</span>
                                <span class="spell-badge spell-badge--rank">${rankLabel}</span>
                            </div>
                        </div>
                        <div class="spell-card-summary">${cap.summary || "Aucune description"}</div>
                        ${tags.length ? `<div class="spell-card-tags">${tags.join('')}</div>` : ''}
                    `;

                    // Make card clickable to expand details
                    card.style.cursor = "pointer";
                    card.addEventListener("click", () => {
                        // Switch to list view and expand this capacity
                        currentView = "list";
                        viewToggleButtons.forEach(b => b.classList.remove("magic-view-btn--active"));
                        viewToggleButtons.find(b => b.dataset.view === "list")?.classList.add("magic-view-btn--active");
                        renderCapacities(filterType);
                        // TODO: auto-expand the clicked capacity
                    });

                    grid.appendChild(card);
                });

                section.appendChild(grid);
                capacityList.appendChild(section);
            });

            return; // Exit early, don't run list rendering
        }

        // List view rendering (existing logic)
        capacities
            .filter((cap) => !filterType || cap.type === filterType)
            .forEach((cap) => {
                const normalizedUpgrades = Array.isArray(cap.upgrades)
                    ? cap.upgrades.map((entry, index) => {
                        if (entry && typeof entry === "object") {
                            const snapshot = entry.snapshot || entry.state || null;
                            return {
                                ...entry,
                                level: Number(entry.level) || index + 2,
                                note: entry.note ?? entry.content ?? entry.text ?? "",
                                createdAt: entry.createdAt ?? null,
                                snapshot
                            };
                        }
                        return {
                            level: index + 2,
                            note: String(entry || ""),
                            createdAt: null,
                            snapshot: null
                        };
                    })
                    : [];
                const level = Math.max(1, Number(cap.level) || normalizedUpgrades.length + 1);
                cap.level = level;
                cap.upgrades = normalizedUpgrades;
                const capTags = [];
                if (cap.target) {
                    capTags.push(CAPACITY_TARGET_LABELS[cap.target] || cap.target);
                }
                if (cap.zoneType) {
                    capTags.push(CAPACITY_ZONE_LABELS[cap.zoneType] || cap.zoneType);
                }
                if (cap.distance) {
                    capTags.push(CAPACITY_DISTANCE_LABELS[cap.distance] || cap.distance);
                }
                const historyHtml = normalizedUpgrades.length
                    ? normalizedUpgrades.map((entry) => {
                        if (entry.snapshot) {
                            const snap = entry.snapshot;
                            return `
                            <div class="magic-capacity-history-card">
                                <div class="magic-capacity-field-label">Niveau ${entry.level}</div>
                                <div class="magic-capacity-field-value">${snap.name || cap.name}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.type || cap.type} • ${snap.rank || cap.rank}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.summary || cap.summary || "-"}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.target || cap.target || "-"} ${snap.zoneType || cap.zoneType || ""} ${snap.distance || cap.distance || ""}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.rp || "-"}</div>
                                <div class="magic-capacity-field-value">${snap.effect || "-"}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.conditions || "-"}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.strengths || "-"}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.weaknesses || "-"}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.cost || "-"}</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${snap.limits || "-"}</div>
                            </div>
                            `;
                        }
                        return `
                        <div class="magic-capacity-history-card">
                            <div class="magic-capacity-field-label">Niveau ${entry.level}</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${entry.note || "Aucun détail."}</div>
                        </div>
                        `;
                    }).join("")
                    : `<div class="magic-capacity-field-value magic-capacity-field-value--dim">Aucun historique.</div>`;
                const typeOptions = CAPACITY_TYPES.map((option) =>
                    `<option value="${option.value}" ${option.value === cap.type ? "selected" : ""}>${option.label}</option>`
                ).join("");
                const rankOptions = CAPACITY_RANKS.map((option) =>
                    `<option value="${option.value}" ${option.value === cap.rank ? "selected" : ""}>${option.label}</option>`
                ).join("");
                const targetOptions = [
                    { value: "mono", label: "Mono-cible" },
                    { value: "zone", label: "Zone" }
                ].map((option) => `<option value="${option.value}" ${option.value === cap.target ? "selected" : ""}>${option.label}</option>`).join("");
                const zoneOptions = [
                    { value: "", label: "Aucune" },
                    { value: "cone", label: "Cone" },
                    { value: "cercle", label: "Cercle" },
                    { value: "ligne", label: "Ligne" },
                    { value: "autre", label: "Autre" }
                ].map((option) => `<option value="${option.value}" ${option.value === cap.zoneType ? "selected" : ""}>${option.label}</option>`).join("");
                const distanceOptions = [
                    { value: "cac", label: "Corps-a-corps (0-5m)" },
                    { value: "courte", label: "Courte (5-10m)" },
                    { value: "moyenne", label: "Moyenne (10-20m)" },
                    { value: "longue", label: "Longue (20m+)" }
                ].map((option) => `<option value="${option.value}" ${option.value === cap.distance ? "selected" : ""}>${option.label}</option>`).join("");
                const activationOptions = [
                    { value: "t0", label: "0 Tour (Instantane)" },
                    { value: "t1", label: "1 Tour" },
                    { value: "t2", label: "2 Tours" },
                    { value: "t3", label: "3 Tours" },
                    { value: "t4", label: "4 Tours" },
                    { value: "t5", label: "5 Tours" }
                ].map((option) => `<option value="${option.value}" ${option.value === cap.activationTime ? "selected" : ""}>${option.label}</option>`).join("");
                const durationOptions = [
                    { value: "t0", label: "0 Tour (Instantane)" },
                    { value: "t1", label: "1 Tour" },
                    { value: "t2", label: "2 Tours" },
                    { value: "t3", label: "3 Tours" },
                    { value: "t4", label: "4 Tours" },
                    { value: "t5", label: "5 Tours" }
                ].map((option) => `<option value="${option.value}" ${option.value === cap.duration ? "selected" : ""}>${option.label}</option>`).join("");
                const cooldownOptions = [
                    { value: "t0", label: "0 Tour (Instantane)" },
                    { value: "t1", label: "1 Tour" },
                    { value: "t2", label: "2 Tours" },
                    { value: "t3", label: "3 Tours" },
                    { value: "t4", label: "4 Tours" },
                    { value: "t5", label: "5 Tours" },
                    { value: "t6", label: "6 Tours" },
                    { value: "t7", label: "7 Tours" },
                    { value: "combat1", label: "1 Utilisation par combat" },
                    { value: "combat2", label: "2 Utilisations par combat" },
                    { value: "combat3", label: "3 Utilisations par combat" }
                ].map((option) => `<option value="${option.value}" ${option.value === cap.cooldown ? "selected" : ""}>${option.label}</option>`).join("");
                const nextLevel = level + 1;
                const costLabel = ascensionCost == null
                    ? "Indisponible"
                    : cap.rank === "ultime"
                        ? `${getUltimeAscensionCost(nextLevel)} parchemins`
                        : ascensionCost === 0
                            ? "Gratuit"
                            : `${ascensionCost} parchemins`;
                const canEditCapacity = isAdmin;
                const showUpgrades = isSorcelleriePage
                    || currentPage?.fields?.magicSpecialization === "alice"
                    || currentPage?.fields?.magicSpecialization === "meister"
                    || currentPage?.fields?.magicSpecialization === "eater";
                const upgradesSection = showUpgrades ? `
                        <div class="magic-capacity-actions">
                            <button type="button" class="magic-btn magic-btn-outline tw-press${canEditCapacity ? "" : " is-disabled"}" data-upgrade="${cap.id}" ${canEditCapacity ? "" : "disabled"}>Améliorer</button>
                        </div>
                        <div class="magic-capacity-upgrade-form" data-upgrade-form="${cap.id}" hidden>
                            <details class="magic-accordion" open>
                                <summary>Identite du sort</summary>
                                <div class="magic-accordion-body">
                                    <div class="magic-capacity-upgrade-grid">
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeName-${cap.id}">Nom
                                            <input id="magicUpgradeName-${cap.id}" class="magic-input tw-input" type="text" value="${cap.name}">
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeSummary-${cap.id}">Apercu
                                            <input id="magicUpgradeSummary-${cap.id}" class="magic-input tw-input" type="text" value="${cap.summary || ""}">
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeType-${cap.id}">Type
                                            <select id="magicUpgradeType-${cap.id}" class="magic-input tw-input">${typeOptions}</select>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeRank-${cap.id}">Rang
                                            <select id="magicUpgradeRank-${cap.id}" class="magic-input tw-input">${rankOptions}</select>
                                        </label>
                                    </div>
                                    <label class="magic-label magic-upgrade-field" for="magicUpgradeNote-${cap.id}">Note d'amélioration
                                        <textarea id="magicUpgradeNote-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2" placeholder="Ajoutez un rappel de l'amélioration (optionnel)."></textarea>
                                    </label>
                                </div>
                            </details>
                            <details class="magic-accordion">
                                <summary>Portee &amp; zone</summary>
                                <div class="magic-accordion-body">
                                    <div class="magic-capacity-upgrade-grid">
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeTarget-${cap.id}">Ciblage
                                            <select id="magicUpgradeTarget-${cap.id}" class="magic-input tw-input">${targetOptions}</select>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeZone-${cap.id}">Type de zone
                                            <select id="magicUpgradeZone-${cap.id}" class="magic-input tw-input">${zoneOptions}</select>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeDistance-${cap.id}">Distance
                                            <select id="magicUpgradeDistance-${cap.id}" class="magic-input tw-input">${distanceOptions}</select>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeZoneDetail-${cap.id}">Precision
                                            <input id="magicUpgradeZoneDetail-${cap.id}" class="magic-input tw-input" type="text" value="${cap.zoneDetail || ""}">
                                        </label>
                                    </div>
                                </div>
                            </details>
                            <details class="magic-accordion">
                                <summary>Temporalite</summary>
                                <div class="magic-accordion-body">
                                    <div class="magic-capacity-upgrade-grid">
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeActivation-${cap.id}">Activation
                                            <select id="magicUpgradeActivation-${cap.id}" class="magic-input tw-input">${activationOptions}</select>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeDuration-${cap.id}">Temps actif
                                            <select id="magicUpgradeDuration-${cap.id}" class="magic-input tw-input">${durationOptions}</select>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeCooldown-${cap.id}">Recharge
                                            <select id="magicUpgradeCooldown-${cap.id}" class="magic-input tw-input">${cooldownOptions}</select>
                                        </label>
                                    </div>
                                </div>
                            </details>
                            <details class="magic-accordion">
                                <summary>Effets &amp; equilibre</summary>
                                <div class="magic-accordion-body">
                                    <label class="magic-label magic-upgrade-field" for="magicUpgradeEffect-${cap.id}">Effet mecanique
                                        <textarea id="magicUpgradeEffect-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.effect || ""}</textarea>
                                    </label>
                                    <label class="magic-label magic-upgrade-field" for="magicUpgradeConditions-${cap.id}">Conditions
                                        <textarea id="magicUpgradeConditions-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.conditions || ""}</textarea>
                                    </label>
                                    <div class="magic-capacity-upgrade-grid">
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeStrengths-${cap.id}">Forces
                                            <textarea id="magicUpgradeStrengths-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.strengths || ""}</textarea>
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeWeaknesses-${cap.id}">Faiblesses
                                            <textarea id="magicUpgradeWeaknesses-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.weaknesses || ""}</textarea>
                                        </label>
                                    </div>
                                    <div class="magic-capacity-upgrade-grid">
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeCost-${cap.id}">Coût
                                            <input id="magicUpgradeCost-${cap.id}" class="magic-input tw-input" type="text" value="${cap.cost || ""}">
                                        </label>
                                        <label class="magic-label magic-upgrade-field" for="magicUpgradeLimits-${cap.id}">Limites
                                            <input id="magicUpgradeLimits-${cap.id}" class="magic-input tw-input" type="text" value="${cap.limits || ""}">
                                        </label>
                                    </div>
                                </div>
                            </details>
                            <details class="magic-accordion">
                                <summary>RP &amp; lisibilite adverse</summary>
                                <div class="magic-accordion-body">
                                    <label class="magic-label magic-upgrade-field" for="magicUpgradeRp-${cap.id}">Description RP
                                        <textarea id="magicUpgradeRp-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.rp || ""}</textarea>
                                    </label>
                                    <label class="magic-label magic-upgrade-field" for="magicUpgradePerception-${cap.id}">Apercu perceptif
                                        <textarea id="magicUpgradePerception-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.perception || ""}</textarea>
                                    </label>
                                    <label class="magic-label magic-upgrade-field" for="magicUpgradeTell-${cap.id}">Lisibilite adverse
                                        <textarea id="magicUpgradeTell-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.tell || ""}</textarea>
                                    </label>
                                </div>
                            </details>
                            ${isAdmin ? `
                                <label class="magic-label" for="magicUpgradeAdmin-${cap.id}">Note admin</label>
                                <textarea id="magicUpgradeAdmin-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2">${cap.adminNote || ""}</textarea>
                            ` : ""}
                            <div class="magic-capacity-form-actions">
                                <button type="button" class="magic-btn magic-btn-outline tw-press" data-upgrade-cancel="${cap.id}">Annuler</button>
                                <button type="button" class="magic-btn magic-btn-primary tw-press" data-upgrade-save="${cap.id}">Valider</button>
                            </div>
                        </div>
                        <div class="magic-capacity-history" data-history-panel="${cap.id}">
                            <div class="magic-capacity-field-label">Niveaux precedents</div>
                            ${historyHtml}
                        </div>
                    `
                    : "";
                const levelTag = showUpgrades
                    ? `<span class="magic-tag magic-tag--level" data-history="${cap.id}" role="button" tabindex="0">Niveau ${level}</span>`
                    : "";
                const li = document.createElement("li");
                li.className = "magic-capacity-item";
                li.dataset.type = cap.type;
                li.dataset.capId = cap.id;

                li.innerHTML = `
                    <button type="button" class="magic-capacity-header" aria-expanded="false">
                        <div class="magic-capacity-main">
                            <span class="magic-capacity-name">${cap.name}</span>
                            <span class="magic-capacity-meta">${cap.type.charAt(0).toUpperCase() + cap.type.slice(1)} • ${cap.rank} • Niv. ${level}</span>
                            <div class="magic-capacity-tags">
                                ${cap.stats.map((s) => `<span class="magic-tag">${s}</span>`).join("")}
                                ${capTags.map((tag) => `<span class="magic-tag">${tag}</span>`).join("")}
                                <span class="magic-tag magic-tag--rank">${cap.rank}</span>
                                ${levelTag}
                            </div>
                        </div>
                        <span class="magic-capacity-toggle">▾</span>
                    </button>
                    <div class="magic-capacity-body">
                        <div>
                            <div class="magic-capacity-field-label">Apercu</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.summary || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Portee &amp; zone</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${CAPACITY_TARGET_LABELS[cap.target] || cap.target || "-"}${cap.zoneType ? ` • ${CAPACITY_ZONE_LABELS[cap.zoneType] || cap.zoneType}` : ""}${cap.distance ? ` • ${CAPACITY_DISTANCE_LABELS[cap.distance] || cap.distance}` : ""}</div>
                            ${cap.zoneDetail ? `<div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.zoneDetail}</div>` : ""}
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Temporalite</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${CAPACITY_TEMPORALITY_LABELS[cap.activationTime] || cap.activationTime || "-"} • ${CAPACITY_TEMPORALITY_LABELS[cap.duration] || cap.duration || "-"} • ${CAPACITY_TEMPORALITY_LABELS[cap.cooldown] || cap.cooldown || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Description RP</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.rp}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Apercu perceptif</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.perception || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Lisibilite adverse</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.tell || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Effet mécanique</div>
                            <div class="magic-capacity-field-value">${cap.effect}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Conditions</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.conditions || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Forces</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.strengths || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Faiblesses</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.weaknesses || "-"}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Coût</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.cost}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Limites / conditions</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.limits || "-"}</div>
                        </div>
                        ${isAdmin ? `
                            <div>
                                <div class="magic-capacity-field-label">Note admin</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.adminNote || "Aucune note."}</div>
                            </div>
                        ` : ""}
                        ${upgradesSection}
                    </div>
                `;

                const header = li.querySelector(".magic-capacity-header");
                header.addEventListener("click", () => {
                    const isOpen = li.classList.toggle("magic-capacity-item--open");
                    header.setAttribute("aria-expanded", isOpen ? "true" : "false");
                    const toggleIcon = header.querySelector(".magic-capacity-toggle");
                    if (toggleIcon) {
                        toggleIcon.textContent = isOpen ? "▴" : "▾";
                    }
                });

                if (showUpgrades) {
                    const upgradeButton = li.querySelector(`[data-upgrade="${cap.id}"]`);
                    const upgradeForm = li.querySelector(`[data-upgrade-form="${cap.id}"]`);
                    const upgradeSave = li.querySelector(`[data-upgrade-save="${cap.id}"]`);
                    const upgradeCancel = li.querySelector(`[data-upgrade-cancel="${cap.id}"]`);
                    const historyButton = li.querySelector(`[data-history="${cap.id}"]`);
                    const historyPanel = li.querySelector(`[data-history-panel="${cap.id}"]`);

                    const upgradeName = upgradeForm?.querySelector(`#magicUpgradeName-${cap.id}`);
                    const upgradeSummary = upgradeForm?.querySelector(`#magicUpgradeSummary-${cap.id}`);
                    const upgradeType = upgradeForm?.querySelector(`#magicUpgradeType-${cap.id}`);
                    const upgradeRank = upgradeForm?.querySelector(`#magicUpgradeRank-${cap.id}`);
                    const upgradeNote = upgradeForm?.querySelector(`#magicUpgradeNote-${cap.id}`);
                    const upgradeTarget = upgradeForm?.querySelector(`#magicUpgradeTarget-${cap.id}`);
                    const upgradeZone = upgradeForm?.querySelector(`#magicUpgradeZone-${cap.id}`);
                    const upgradeZoneDetail = upgradeForm?.querySelector(`#magicUpgradeZoneDetail-${cap.id}`);
                    const upgradeDistance = upgradeForm?.querySelector(`#magicUpgradeDistance-${cap.id}`);
                    const upgradeActivation = upgradeForm?.querySelector(`#magicUpgradeActivation-${cap.id}`);
                    const upgradeDuration = upgradeForm?.querySelector(`#magicUpgradeDuration-${cap.id}`);
                    const upgradeCooldown = upgradeForm?.querySelector(`#magicUpgradeCooldown-${cap.id}`);
                    const upgradeRp = upgradeForm?.querySelector(`#magicUpgradeRp-${cap.id}`);
                    const upgradePerception = upgradeForm?.querySelector(`#magicUpgradePerception-${cap.id}`);
                    const upgradeTell = upgradeForm?.querySelector(`#magicUpgradeTell-${cap.id}`);
                    const upgradeEffect = upgradeForm?.querySelector(`#magicUpgradeEffect-${cap.id}`);
                    const upgradeConditions = upgradeForm?.querySelector(`#magicUpgradeConditions-${cap.id}`);
                    const upgradeStrengths = upgradeForm?.querySelector(`#magicUpgradeStrengths-${cap.id}`);
                    const upgradeWeaknesses = upgradeForm?.querySelector(`#magicUpgradeWeaknesses-${cap.id}`);
                    const upgradeCost = upgradeForm?.querySelector(`#magicUpgradeCost-${cap.id}`);
                    const upgradeLimits = upgradeForm?.querySelector(`#magicUpgradeLimits-${cap.id}`);
                    const upgradeAdmin = upgradeForm?.querySelector(`#magicUpgradeAdmin-${cap.id}`);

                    const toggleUpgradeForm = (open) => {
                        if (!upgradeForm) return;
                        upgradeForm.hidden = !open;
                        if (open) {
                            upgradeName?.focus();
                        }
                    };

                    if (historyButton && historyPanel) {
                        const toggleHistory = () => {
                            historyPanel.classList.toggle("is-open");
                        };
                        historyButton.addEventListener("click", (event) => {
                            event.stopPropagation();
                            if (upgradeForm && !upgradeForm.hidden) {
                                upgradeForm.hidden = true;
                            }
                            toggleHistory();
                            if (historyPanel.classList.contains("is-open")) {
                                historyPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
                            }
                        });
                        historyButton.addEventListener("keydown", (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (upgradeForm && !upgradeForm.hidden) {
                                    upgradeForm.hidden = true;
                                }
                                toggleHistory();
                                if (historyPanel.classList.contains("is-open")) {
                                    historyPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
                                }
                            }
                        });
                    }

                    if (upgradeButton) {
                        upgradeButton.addEventListener("click", (event) => {
                            event.stopPropagation();
                            if (!canEditCapacity) return;
                            toggleUpgradeForm(upgradeForm?.hidden ?? true);
                            if (upgradeForm?.hidden === false) {
                                syncZoneControls(upgradeTarget, upgradeZone, upgradeZoneDetail);
                            }
                        });
                    }
                    if (upgradeCancel) {
                        upgradeCancel.addEventListener("click", (event) => {
                            event.stopPropagation();
                            toggleUpgradeForm(false);
                        });
                    }
                    if (upgradeSave) {
                        upgradeSave.addEventListener("click", async (event) => {
                            event.stopPropagation();
                            if (!canEditCapacity) return;
                            const nextName = upgradeName?.value.trim() || cap.name;
                            const nextSummary = upgradeSummary?.value.trim() || "";
                            const nextRp = upgradeRp?.value.trim() || "";
                            const nextEffect = upgradeEffect?.value.trim() || "";
                            if (!nextName || !nextSummary || !nextRp || !nextEffect) {
                                alert("Nom, aperçu, description RP et effet mécanique sont requis.");
                                return;
                            }
                            const previousLevel = Math.max(1, Number(cap.level) || normalizedUpgrades.length + 1);
                            const snapshot = {
                                name: cap.name,
                                type: cap.type,
                                rank: cap.rank,
                                summary: cap.summary,
                                target: cap.target,
                                zoneType: cap.zoneType,
                                zoneDetail: cap.zoneDetail,
                                distance: cap.distance,
                                activationTime: cap.activationTime,
                                duration: cap.duration,
                                cooldown: cap.cooldown,
                                rp: cap.rp,
                                perception: cap.perception,
                                tell: cap.tell,
                                effect: cap.effect,
                                conditions: cap.conditions,
                                strengths: cap.strengths,
                                weaknesses: cap.weaknesses,
                                cost: cap.cost,
                                limits: cap.limits,
                                adminNote: cap.adminNote
                            };
                            
                            cap.level = previousLevel + 1;
                            cap.name = nextName;
                            cap.summary = nextSummary;
                            cap.type = upgradeType?.value || cap.type;
                            cap.rank = upgradeRank?.value || cap.rank;
                            cap.target = upgradeTarget?.value || cap.target || "mono";
                            cap.zoneType = upgradeZone?.value || cap.zoneType || "";
                            cap.zoneDetail = upgradeZoneDetail?.value.trim() || "";
                            cap.distance = upgradeDistance?.value || cap.distance || "cac";
                            cap.activationTime = upgradeActivation?.value || cap.activationTime || "t0";
                            cap.duration = upgradeDuration?.value || cap.duration || "t0";
                            cap.cooldown = upgradeCooldown?.value || cap.cooldown || "t0";
                            cap.rp = nextRp;
                            cap.perception = upgradePerception?.value.trim() || "";
                            cap.tell = upgradeTell?.value.trim() || "";
                            cap.effect = nextEffect;
                            cap.conditions = upgradeConditions?.value.trim() || "";
                            cap.strengths = upgradeStrengths?.value.trim() || "";
                            cap.weaknesses = upgradeWeaknesses?.value.trim() || "";
                            cap.cost = upgradeCost?.value.trim() || "";
                            cap.limits = upgradeLimits?.value.trim() || "";
                            if (upgradeAdmin) {
                                cap.adminNote = upgradeAdmin.value.trim();
                            }
                            cap.upgrades = [
                                ...(Array.isArray(cap.upgrades) ? cap.upgrades : []),
                                {
                                    level: previousLevel,
                                    note: upgradeNote?.value.trim() || "",
                                    snapshot,
                                    createdAt: Date.now()
                                }
                            ];
                            renderCapacities(capacityFilter ? capacityFilter.value : "");
                            saveToStorage();
                            markDirty();
                            await flushProfilePersist();
                        });
                    }

                    if (upgradeTarget) {
                        upgradeTarget.addEventListener("change", () => {
                            syncZoneControls(upgradeTarget, upgradeZone, upgradeZoneDetail);
                        });
                    }
                }

                capacityList.appendChild(li);
            });
    }

    function setCapacityFormOpen(open) {
        if (!capacityForm) return;
        capacityForm.hidden = !open;
        if (open) {
            updateNewCapCostPreview();
            syncZoneControls(capTargetInput, capZoneInput, capZoneDetailInput);
            capNameInput?.focus();
        }
    }

    function resetCapacityForm() {
        if (capNameInput) capNameInput.value = "";
        if (capSummaryInput) capSummaryInput.value = "";
        if (capTypeInput) capTypeInput.value = "offensif";
        if (capRankInput) capRankInput.value = "mineur";
        if (capTargetInput) capTargetInput.value = "mono";
        if (capZoneInput) capZoneInput.value = "";
        if (capZoneDetailInput) capZoneDetailInput.value = "";
        if (capDistanceInput) capDistanceInput.value = "cac";
        if (capActivationInput) capActivationInput.value = "t0";
        if (capDurationInput) capDurationInput.value = "t0";
        if (capCooldownInput) capCooldownInput.value = "t0";
        if (capRpInput) capRpInput.value = "";
        if (capPerceptionInput) capPerceptionInput.value = "";
        if (capTellInput) capTellInput.value = "";
        if (capEffectInput) capEffectInput.value = "";
        if (capConditionsInput) capConditionsInput.value = "";
        if (capStrengthsInput) capStrengthsInput.value = "";
        if (capWeaknessesInput) capWeaknessesInput.value = "";
        if (capCostInput) capCostInput.value = "";
        if (capLimitsInput) capLimitsInput.value = "";
        updateNewCapCostPreview();
        syncZoneControls(capTargetInput, capZoneInput, capZoneDetailInput);
    }

    function buildCapacityFromForm() {
        const name = capNameInput?.value.trim();
        const summary = capSummaryInput?.value.trim() || "";
        const rp = capRpInput?.value.trim() || "";
        const effect = capEffectInput?.value.trim() || "";
        if (!name || !summary || !rp || !effect) {
            alert("Nom, aperçu, description RP et effet mécanique sont requis.");
            return null;
        }
        return {
            id: `cap-${Date.now()}`,
            name,
            type: capTypeInput?.value || "offensif",
            rank: capRankInput?.value || "mineur",
            stats: [],
            summary,
            target: capTargetInput?.value || "mono",
            zoneType: capZoneInput?.value || "",
            zoneDetail: capZoneDetailInput?.value.trim() || "",
            distance: capDistanceInput?.value || "cac",
            activationTime: capActivationInput?.value || "t0",
            duration: capDurationInput?.value || "t0",
            cooldown: capCooldownInput?.value || "t0",
            rp,
            perception: capPerceptionInput?.value.trim() || "",
            tell: capTellInput?.value.trim() || "",
            effect,
            conditions: capConditionsInput?.value.trim() || "",
            strengths: capStrengthsInput?.value.trim() || "",
            weaknesses: capWeaknessesInput?.value.trim() || "",
            cost: capCostInput?.value.trim() || "",
            limits: capLimitsInput?.value.trim() || "",
            adminNote: "",
            level: 1,
            upgrades: [],
            locked: !isAdmin
        };
    }

    async function persistToProfile(payload) {
        if (!authApi?.updateCharacter || !currentCharacter?.id) return false;
        const profileData = currentCharacter.profile_data || {};
        const nextProfileData = {
            ...profileData,
            magic_sheet: payload
        };
        try {
            await authApi.updateCharacter(currentCharacter.id, { profile_data: nextProfileData });
            const refreshed = authApi.getActiveCharacter?.();
            if (refreshed && refreshed.id === currentCharacter.id) {
                currentCharacter = refreshed;
            } else {
                currentCharacter = { ...currentCharacter, profile_data: nextProfileData };
            }
            try {
                localStorage.setItem("astoria_active_character", JSON.stringify(currentCharacter));
            } catch {}
            return true;
        } catch (error) {
            console.warn("Magic sheet save failed.", error);
            return false;
        }
    }

    if (!isAdmin && adminSection) {
        const adminNav = document.querySelector(".magic-nav-btn--admin");
        if (adminNav) {
            adminNav.style.display = "none";
        }
        adminSection.hidden = true;
    }

    const openCapacityCreation = () => {
        if (!isAdmin) return;
        goToPageInternal(SCREEN_PAGE.NAVIGATION, null, { persist: false });
        showMagicSectionInternal("magic-capacities", { persist: false });
        if (!capacityForm) return;
        const willOpen = capacityForm.hidden;
        setCapacityFormOpen(willOpen);
        if (willOpen) {
            resetCapacityForm();
        }
        saveToStorage();
    };

    window.goToPage = (pageNumber, payload) => {
        goToPageInternal(pageNumber, payload);
    };
    window.showMagicSection = (sectionId) => {
        showMagicSectionInternal(sectionId);
    };
    window.handleMagicPage2Back = () => {
        if (isSectionContentOpen) {
            showMainNavigationOnly();
            return;
        }
        goToPageInternal(SCREEN_PAGE.CATEGORIES);
    };

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            setActiveSection(targetId);
            saveToStorage();
        });
    });

    if (page2BackBtn) {
        page2BackBtn.addEventListener("click", () => {
            window.handleMagicPage2Back();
        });
    }

    formFields.forEach((field) => {
        const handler = () => {
            saveCurrentPage();
            saveToStorage();
            markDirty();
        };
        field.addEventListener("input", handler);
        field.addEventListener("change", handler);
    });

    if (capacityFilter) {
        capacityFilter.addEventListener("change", () => {
            saveCurrentPage();
            renderCapacities(capacityFilter.value || "");
            saveToStorage();
        });
    }

    // View toggle buttons
    viewToggleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            if (view === currentView) return;

            currentView = view;
            viewToggleButtons.forEach(b => b.classList.remove("magic-view-btn--active"));
            btn.classList.add("magic-view-btn--active");

            renderCapacities(capacityFilter ? capacityFilter.value : "");
        });
    });

    // Alice Double: afficher/cacher le sélecteur Alice Type
    const magicSpecializationSelect = document.getElementById("magicSpecialization");
    const aliceTypeField = document.getElementById("aliceTypeField");
    const magicAliceTypeSelect = document.getElementById("magicAliceType");

    if (magicSpecializationSelect && aliceTypeField) {
        magicSpecializationSelect.addEventListener("change", () => {
            const isAliceDouble = magicSpecializationSelect.value === "alice-double";
            aliceTypeField.style.display = isAliceDouble ? "" : "none";
            renderScrollMeter();
        });
    }

    if (magicAliceTypeSelect) {
        magicAliceTypeSelect.addEventListener("change", () => {
            renderScrollMeter();
        });
    }

    addCapacityButtons.forEach((button) => {
        if (!button) return;
        if (!isAdmin) {
            button.hidden = true;
        }
        button.addEventListener("click", () => {
            openCapacityCreation();
        });
    });

    if (capCancelBtn) {
        capCancelBtn.addEventListener("click", () => {
            setCapacityFormOpen(false);
        });
    }

    if (capRankInput) {
        capRankInput.addEventListener("change", updateNewCapCostPreview);
    }
    if (capTargetInput) {
        capTargetInput.addEventListener("change", () => {
            syncZoneControls(capTargetInput, capZoneInput, capZoneDetailInput);
        });
    }

    if (capSaveBtn) {
        capSaveBtn.addEventListener("click", async () => {
            if (!isAdmin) return;
            const newCap = buildCapacityFromForm();
            if (!newCap) {
                alert("Ajoutez un nom pour le fragment.");
                return;
            }
            if (!pages[activePageIndex]) return;
            pages[activePageIndex].capacities = pages[activePageIndex].capacities || [];
            pages[activePageIndex].capacities.push(newCap);
            renderCapacities(capacityFilter ? capacityFilter.value : "");
            setCapacityFormOpen(false);
            saveToStorage();
            markDirty();
            await flushProfilePersist();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            saveCurrentPage();
            saveToStorage();
            const ok = await flushProfilePersist();
            saveBtn.textContent = ok ? "Sauvegarde OK" : "Échec sauvegarde";
            saveBtn.classList.remove("magic-btn--shimmer");
            void saveBtn.offsetWidth;
            saveBtn.classList.add("magic-btn--shimmer");
            setTimeout(() => {
                saveBtn.textContent = "Sauvegarder";
                saveBtn.classList.remove("magic-btn--shimmer");
            }, 1600);
        });
    }

    if (ENABLE_PAGE_ADD && addPageBtn) {
        addPageBtn.addEventListener("click", handleAddPage);
    }

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) return;
        if (!hasPendingChanges) return;
        flushProfilePersist();
    });

    window.addEventListener("beforeunload", () => {
        saveCurrentPage();
        saveToStorage();
    });

    (async () => {
        await initSummary();
        updateSaveStatus();

        try {
            authApi = await import("./auth.js");
        } catch (error) {
            authApi = null;
        }

        const restored = loadFromStorage();
        if (!restored) {
            pages = [createDefaultPage()];
            activePageIndex = 0;
        }

        syncPagesWithProgress();

        if (sanitizeCapacityText()) {
            saveToStorage();
        }

        normalizeActiveSection();
        ensureActivePageVisible();
        applyFormFields(pages[activePageIndex].fields || {});
        setActiveSection(activeSection);
        updateCapacityUI();
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        renderScrollMeter();
        renderPageTabs();
        renderPagesOverview();
        updateSpellTypeCounts();

        if (activeScreenPage === SCREEN_PAGE.NAVIGATION) {
            if (isSectionContentOpen) {
                showMagicSectionInternal(activeSection, { persist: false });
            } else {
                showMainNavigationOnly({ persist: false });
            }
        } else if (activeScreenPage === SCREEN_PAGE.SPELL_TYPES) {
            goToPageInternal(SCREEN_PAGE.SPELL_TYPES, null, { persist: false });
        } else if (activeScreenPage === SCREEN_PAGE.SPELL_LIST) {
            goToPageInternal(SCREEN_PAGE.SPELL_LIST, currentSpellCategory, { persist: false });
        } else {
            goToPageInternal(SCREEN_PAGE.CATEGORIES, null, { persist: false });
        }

        saveToStorage();
        markSaved();

        window.addEventListener("storage", (event) => {
            if (!event.key || event.key !== getMagicProgressKey()) return;
            syncPagesWithProgress();
            ensureActivePageVisible();
            applyFormFields(pages[activePageIndex]?.fields || {});
            updateCapacityUI();
            renderPageTabs();
            renderPagesOverview();
            updateSpellTypeCounts();
            renderScrollMeter();
            if (activeScreenPage === SCREEN_PAGE.SPELL_LIST) {
                renderSpellCardsForCategory(currentSpellCategory);
            }
        });
    })();
})();
