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
    const addCapacityBtn = document.getElementById("magicAddCapacityBtn");
    const capacityForm = document.getElementById("magicCapacityForm");
    const capNameInput = document.getElementById("magicNewCapName");
    const capTypeInput = document.getElementById("magicNewCapType");
    const capRankInput = document.getElementById("magicNewCapRank");
    const capRpInput = document.getElementById("magicNewCapRp");
    const capEffectInput = document.getElementById("magicNewCapEffect");
    const capCostInput = document.getElementById("magicNewCapCost");
    const capLimitsInput = document.getElementById("magicNewCapLimits");
    const capSaveBtn = document.getElementById("magicCapacitySave");
    const capCancelBtn = document.getElementById("magicCapacityCancel");
    const adminSection = document.getElementById("magic-admin");
    const pageTabs = document.getElementById("magicPageTabs");
    const addPageBtn = document.getElementById("magicAddPageBtn");
    const affinityDisplay = document.getElementById("magicAffinityDisplay");
    const formFields = Array.from(
        document.querySelectorAll(".magic-content input[id], .magic-content textarea[id], .magic-content select[id]")
    );

    let pages = [];
    let activePageIndex = 0;
    let activeSection = "magic-summary";
    let currentCharacterKey = "default";
    let currentCharacter = null;
    let storageKey = STORAGE_KEY_BASE;
    let authApi = null;
    let hasPendingChanges = false;
    let summaryModule = null;

    const defaultCapacities = [
        {
            id: "cap-signature",
            name: "Lame astrale résonante",
            type: "offensif",
            rank: "signature",
            stats: ["Combat", "Pouvoirs"],
            rp: "Le meister fait vibrer son arme et libère une onde astrale qui déchire l'air.",
            effect: "Attaque de zone en cône, dégâts moyens, peut déséquilibrer les adversaires proches.",
            cost: "Consomme une grande partie de la réserve magique, utilisable 1 à 2 fois par scène.",
            limits: "Inefficace contre les protections mentales ou purement spirituelles.",
            adminNote: "Capacité signature à surveiller selon le niveau global du personnage.",
            level: 1,
            upgrades: [],
            locked: false
        },
        {
            id: "cap-support",
            name: "Chant de synchronisation",
            type: "soutien",
            rank: "mineur",
            stats: ["Social", "Pouvoirs"],
            rp: "Une mélodie résonne entre meister et arme, renforçant leur lien.",
            effect: "Octroie un bonus temporaire aux actions coordonnées meister/arme.",
            cost: "Nécessite concentration et temps de préparation.",
            limits: "Interrompu si le lanceur subit des dégâts importants.",
            adminNote: "",
            level: 1,
            upgrades: [],
            locked: false
        }
    ];

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
    const EATER_EMOJI = String.fromCodePoint(0x1F480);

    const MAGIC_ASCENSION_COSTS = {
        primary: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
        secondary: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
        hidden: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
        none: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70]
    };

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
                    : []
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
                            : []
                    };
                }
            }
        } catch {}
        return { affinities: {}, enabledAffinities: [] };
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

        pages.forEach((page) => {
            if (page?.fields?.magicSpecialization === "meister") {
                page.fields.magicSpecialization = "eater";
            }
        });

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
            specialization: "eater",
            count: eaterEnabled ? 1 : 0,
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

        return { ok: true };
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

    function markDirty() {
        hasPendingChanges = true;
        updateSaveStatus();
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
    }

    function buildPayload() {
        return {
            pages,
            activePageIndex,
            activeSection
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
        const addBtn = addPageBtn || document.createElement("button");
        const visiblePages = pages.filter((page) => !isPageHidden(page));
        const specializationCounts = {};
        const specializationIndexes = {};
        const numberedSpecializations = new Set(["alice", "eater"]);

        visiblePages.forEach((page) => {
            const specialization = page?.fields?.magicSpecialization;
            if (!specialization || !numberedSpecializations.has(specialization)) return;
            specializationCounts[specialization] = (specializationCounts[specialization] || 0) + 1;
        });

        if (!addPageBtn) {
            addBtn.type = "button";
            addBtn.id = "magicAddPageBtn";
            addBtn.className = "magic-page-tab magic-page-tab--add";
            addBtn.textContent = "+";
            addBtn.setAttribute("aria-label", "Ajouter une page");
            addBtn.addEventListener("click", handleAddPage);
        }

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
            } else if (specialization === "eater" || specialization === "meister") {
                label = EATER_EMOJI;
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

        pageTabs.appendChild(addBtn);
    }

    const specializationLabels = {
        meister: "Meister Arme",
        sorcellerie: "Sorcellerie",
        alice: "Alice",
        eater: "Eater"
    };

    function renderPagesOverview() {
        if (!pagesOverview) return;
        pagesOverview.innerHTML = "";
        const visiblePages = pages.filter((page) => !isPageHidden(page));
        if (!visiblePages.length) {
            pagesOverview.textContent = "Aucune magie disponible.";
            return;
        }

        pages.forEach((page, index) => {
            if (isPageHidden(page)) return;
            const fields = page?.fields || {};
            const name = String(fields.magicName || "").trim() || `Magie ${index + 1}`;
            const specValue = String(fields.magicSpecialization || "").trim();
            const specLabel = specializationLabels[specValue] || "Sans specialisation";

            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = "magic-page-pill" + (index === activePageIndex ? " magic-page-pill--active" : "");
            pill.innerHTML = `
                <span class="magic-page-pill-title">${name}</span>
                <span class="magic-page-pill-meta">${specLabel}</span>
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
        setActiveSection(activeSection);
        setCapacityFormOpen(false);
        renderCapacities(capacityFilter ? capacityFilter.value : "");
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
        const isSorcelleriePage = !currentPage?.fields?.magicSpecialization
            || currentPage.fields.magicSpecialization === "sorcellerie";

        capacityList.innerHTML = "";

        capacities
            .filter((cap) => !filterType || cap.type === filterType)
            .forEach((cap) => {
                const normalizedUpgrades = Array.isArray(cap.upgrades)
                    ? cap.upgrades.map((entry, index) => {
                        if (entry && typeof entry === "object") {
                            return {
                                ...entry,
                                level: Number(entry.level) || index + 2,
                                note: entry.note ?? entry.content ?? entry.text ?? "",
                                createdAt: entry.createdAt ?? null
                            };
                        }
                        return {
                            level: index + 2,
                            note: String(entry || ""),
                            createdAt: null
                        };
                    })
                    : [];
                const level = Math.max(1, Number(cap.level) || normalizedUpgrades.length + 1);
                cap.level = level;
                cap.upgrades = normalizedUpgrades;
                const upgradesHtml = normalizedUpgrades.length
                    ? normalizedUpgrades.map((entry) => `
                        <div class="magic-capacity-upgrade-item">
                            <div class="magic-capacity-upgrade-level">Niveau ${entry.level}</div>
                            <div class="magic-capacity-upgrade-note">${entry.note || "-"}</div>
                        </div>
                    `).join("")
                    : `<div class="magic-capacity-field-value magic-capacity-field-value--dim">Aucune amélioration.</div>`;
                const upgradesSection = isSorcelleriePage ? `
                        <div class="magic-capacity-upgrades">
                            <div class="magic-capacity-field-label">Améliorations</div>
                            <div class="magic-capacity-upgrade-list">
                                ${upgradesHtml}
                            </div>
                        </div>
                        <div class="magic-capacity-actions">
                            <button type="button" class="magic-btn magic-btn-outline tw-press" data-upgrade="${cap.id}">Améliorer</button>
                        </div>
                        <div class="magic-capacity-upgrade-form" data-upgrade-form="${cap.id}" hidden>
                            <label class="magic-label" for="magicUpgradeNote-${cap.id}">Nouveau contenu</label>
                            <textarea id="magicUpgradeNote-${cap.id}" class="magic-input tw-input--textarea tw-input" rows="2" placeholder="Ajoutez le nouveau contenu obtenu via l'amélioration..."></textarea>
                            <div class="magic-capacity-form-actions">
                                <button type="button" class="magic-btn magic-btn-outline tw-press" data-upgrade-cancel="${cap.id}">Annuler</button>
                                <button type="button" class="magic-btn magic-btn-primary tw-press" data-upgrade-save="${cap.id}">Valider</button>
                            </div>
                        </div>
                    `
                    : "";
                const levelTag = isSorcelleriePage
                    ? `<span class="magic-tag magic-tag--level">Niveau ${level}</span>`
                    : "";
                const li = document.createElement("li");
                li.className = "magic-capacity-item";
                li.dataset.type = cap.type;

                li.innerHTML = `
                    <button type="button" class="magic-capacity-header" aria-expanded="false">
                        <div class="magic-capacity-main">
                            <span class="magic-capacity-name">${cap.name}</span>
                            <span class="magic-capacity-meta">${cap.type.charAt(0).toUpperCase() + cap.type.slice(1)} • ${cap.rank}</span>
                            <div class="magic-capacity-tags">
                                ${cap.stats.map((s) => `<span class="magic-tag">${s}</span>`).join("")}
                                <span class="magic-tag magic-tag--rank">${cap.rank}</span>
                                ${levelTag}
                            </div>
                        </div>
                        <span class="magic-capacity-toggle">▾</span>
                    </button>
                    <div class="magic-capacity-body">
                        <div>
                            <div class="magic-capacity-field-label">Description RP</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.rp}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Effet mécanique</div>
                            <div class="magic-capacity-field-value">${cap.effect}</div>
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

                if (isSorcelleriePage) {
                    const upgradeButton = li.querySelector(`[data-upgrade="${cap.id}"]`);
                    const upgradeForm = li.querySelector(`[data-upgrade-form="${cap.id}"]`);
                    const upgradeSave = li.querySelector(`[data-upgrade-save="${cap.id}"]`);
                    const upgradeCancel = li.querySelector(`[data-upgrade-cancel="${cap.id}"]`);
                    const upgradeNote = upgradeForm?.querySelector("textarea");

                    const toggleUpgradeForm = (open) => {
                        if (!upgradeForm) return;
                        upgradeForm.hidden = !open;
                        if (open && upgradeNote) {
                            upgradeNote.value = "";
                            upgradeNote.focus();
                        }
                    };

                    if (upgradeButton) {
                        upgradeButton.addEventListener("click", (event) => {
                            event.stopPropagation();
                            toggleUpgradeForm(upgradeForm?.hidden ?? true);
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
                            const note = upgradeNote?.value.trim() || "";
                            if (!note) {
                                alert("Ajoutez le contenu de l'amélioration.");
                                return;
                            }
                            const ok = await consumeAscensionForTechnique(pages[activePageIndex]);
                            if (!ok) return;
                            const nextLevel = Math.max(1, Number(cap.level) || normalizedUpgrades.length + 1) + 1;
                            cap.level = nextLevel;
                            cap.upgrades = [
                                ...(Array.isArray(cap.upgrades) ? cap.upgrades : []),
                                { level: nextLevel, note, createdAt: Date.now() }
                            ];
                            renderCapacities(capacityFilter ? capacityFilter.value : "");
                            saveToStorage();
                            markDirty();
                        });
                    }
                }

                capacityList.appendChild(li);
            });
    }

    function setCapacityFormOpen(open) {
        if (!capacityForm) return;
        capacityForm.hidden = !open;
        if (open && capNameInput) capNameInput.focus();
    }

    function resetCapacityForm() {
        if (capNameInput) capNameInput.value = "";
        if (capTypeInput) capTypeInput.value = "offensif";
        if (capRankInput) capRankInput.value = "mineur";
        if (capRpInput) capRpInput.value = "";
        if (capEffectInput) capEffectInput.value = "";
        if (capCostInput) capCostInput.value = "";
        if (capLimitsInput) capLimitsInput.value = "";
    }

    function buildCapacityFromForm() {
        const name = capNameInput?.value.trim();
        if (!name) return null;
        return {
            id: `cap-${Date.now()}`,
            name,
            type: capTypeInput?.value || "offensif",
            rank: capRankInput?.value || "mineur",
            stats: [],
            rp: capRpInput?.value.trim() || "",
            effect: capEffectInput?.value.trim() || "",
            cost: capCostInput?.value.trim() || "",
            limits: capLimitsInput?.value.trim() || "",
            adminNote: "",
            level: 1,
            upgrades: [],
            locked: false
        };
    }

    async function persistToProfile(payload) {
        if (!authApi?.updateCharacter || !currentCharacter?.id) return;
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
            }
        } catch (error) {
            console.warn("Magic sheet save failed.", error);
        }
    }

    if (!isAdmin && adminSection) {
        const adminNav = document.querySelector(".magic-nav-btn--admin");
        if (adminNav) {
            adminNav.style.display = "none";
        }
        adminSection.hidden = true;
    }

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            setActiveSection(targetId);
            saveToStorage();
        });
    });

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

    if (addCapacityBtn) {
        addCapacityBtn.addEventListener("click", () => {
            if (!capacityForm) return;
            const willOpen = capacityForm.hidden;
            setCapacityFormOpen(willOpen);
            if (willOpen) {
                resetCapacityForm();
            }
        });
    }

    if (capCancelBtn) {
        capCancelBtn.addEventListener("click", () => {
            setCapacityFormOpen(false);
        });
    }

    if (capSaveBtn) {
        capSaveBtn.addEventListener("click", async () => {
            const newCap = buildCapacityFromForm();
            if (!newCap) {
                alert("Ajoutez un nom pour la capacité.");
                return;
            }
            if (!pages[activePageIndex]) return;
            const ok = await consumeAscensionForTechnique(pages[activePageIndex]);
            if (!ok) return;
            pages[activePageIndex].capacities = pages[activePageIndex].capacities || [];
            pages[activePageIndex].capacities.push(newCap);
            renderCapacities(capacityFilter ? capacityFilter.value : "");
            setCapacityFormOpen(false);
            saveToStorage();
            markDirty();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            saveCurrentPage();
            const payload = saveToStorage();
            await persistToProfile(payload);
            markSaved();
            saveBtn.textContent = "Sauvegarde OK";
            setTimeout(() => {
                saveBtn.textContent = "Sauvegarder";
            }, 1600);
        });
    }

    if (addPageBtn) {
        addPageBtn.addEventListener("click", handleAddPage);
    }

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
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        renderPageTabs();
        renderPagesOverview();
        saveToStorage();
        markSaved();

        window.addEventListener("storage", (event) => {
            if (!event.key || event.key !== getMagicProgressKey()) return;
            syncPagesWithProgress();
            ensureActivePageVisible();
            applyFormFields(pages[activePageIndex]?.fields || {});
            renderPageTabs();
            renderPagesOverview();
        });
    })();
})();
