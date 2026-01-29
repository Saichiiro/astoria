(async function () {
    // Compatibilité : navigateurs modernes uniquement (ES2015+), sans polyfills ni transpilation.
    const skillsTabsContainer = document.getElementById("skillsTabs");
    const skillsTitleEl = document.getElementById("skillsCategoryTitle");
    const skillsListEl = document.getElementById("skillsList");
    const skillsPointsValueEl = document.getElementById("skillsPointsValue");
    const skillsPointsMinusEl = document.getElementById("skillsPointsMinus");
    const skillsPointsPlusEl = document.getElementById("skillsPointsPlus");
    const skillsPointsResetEl = document.getElementById("skillsPointsReset");
    const skillsConfirmEl = document.getElementById("skillsConfirmBtn");
    const skillsFeedbackEl = document.getElementById("skillsValidationFeedback");
    const skillsPagePrevEl = document.getElementById("skillsPagePrev");
    const skillsPageNextEl = document.getElementById("skillsPageNext");
    const skillsAddBtn = document.getElementById("skillsAddBtn");
    const skillsAddForm = document.getElementById("skillsAddForm");
    const skillsAddName = document.getElementById("skillsAddName");
    const skillsAddIcon = document.getElementById("skillsAddIcon");
    const skillsAddCategory = document.getElementById("skillsAddCategory");
    const skillsAddCap = document.getElementById("skillsAddCap");
    const skillsAddCancel = document.getElementById("skillsAddCancel");
    const skillsAddSubmit = document.getElementById("skillsAddSubmit");
    const skillsTotalPointsEl = document.getElementById("skillsTotalPoints");
    const skillsAllocatedPointsEl = document.getElementById("skillsAllocatedPoints");
    const skillsRemainingPointsEl = document.getElementById("skillsRemainingPoints");
    const HIGHLIGHT_LINE_CLASS = "skills-line-highlight";
    const HIGHLIGHT_CONFIRM_CLASS = "skills-confirm-btn--pending";

    // Abort initialization gracefully if core DOM nodes are missing
    if (!skillsTabsContainer || !skillsTitleEl || !skillsListEl) {
        console.warn("Skills module: required DOM elements are missing, initialization skipped.");
        return;
    }

    const baseCategories = Array.isArray(window.skillsCategories) ? window.skillsCategories : [];
    const skillsCategories = baseCategories.map((category) => ({
        ...category,
        skills: Array.isArray(category.skills) ? category.skills.map((skill) => ({ ...skill })) : []
    }));

    const MAX_SKILL_POINTS = 40;

    function getSkillCap(skill) {
        const cap = Number(skill?.cap);
        return Number.isFinite(cap) && cap > 0 ? cap : MAX_SKILL_POINTS;
    }

    const skillsStorageKey = "skillsPointsByCategory";
    const skillsAllocStorageKey = "skillsAllocationsByCategory";
    const skillsBaseValuesKey = "skillsBaseValuesByCategory";
    const skillsLocksKey = "skillsLocksByCategory";
    const skillsCustomKey = "skillsCustomByCategory";

    const DEFAULT_CATEGORY_POINTS = {
        arts: 75,
        connaissances: 75,
        combat: 25,
        pouvoirs: 5,
        social: 75,
        artisanat: 10,
        nature: 60,
        physique: 55,
        reputation: 25,
    };

    const persistState = {
        mode: "local", // 'local' | 'character'
        characterId: null,
        auth: null,
        saveTimer: null,
        inFlight: null,
    };

    function storageKey(rawKey) {
        return persistState.characterId ? `astoria_competences_${persistState.characterId}:${rawKey}` : rawKey;
    }

    const skillsState = {
        activeCategoryId: skillsCategories[0]?.id || "",
        pointsByCategory: loadFromStorage(skillsStorageKey),
        allocationsByCategory: loadFromStorage(skillsAllocStorageKey),
        baseValuesByCategory: loadFromStorage(skillsBaseValuesKey),
        locksByCategory: loadFromStorage(skillsLocksKey),
        customSkillsByCategory: loadFromStorage(skillsCustomKey),
        isAdmin: document.body.dataset.admin === "true",
    };

    await initPersistence();

    // Synchroniser l'UI admin
    function syncAdminUI() {
        document.querySelectorAll("[data-admin-only]").forEach((el) => {
            if (skillsState.isAdmin) {
                el.removeAttribute("hidden");
            } else {
                el.setAttribute("hidden", "true");
            }
        });
    }

    syncAdminUI();

    if (!skillsState.isAdmin) {
        if (skillsPointsMinusEl) skillsPointsMinusEl.hidden = true;
        if (skillsPointsPlusEl) skillsPointsPlusEl.hidden = true;
        if (skillsPointsResetEl) skillsPointsResetEl.hidden = true;
        if (skillsPointsValueEl) skillsPointsValueEl.readOnly = true;
        if (skillsAddForm) skillsAddForm.hidden = true;
    }

    if (!skillsCategories.length) {
        renderEmptyMessage("Aucune compétence disponible");
        return;
    }

    hydrateCustomSkills();
    renderSkillsTabs();
    renderSkillsCategory(getActiveCategory());
    updateSkillsPointsDisplay();
    wireTabsKeyboardNavigation();
    wirePageNavigation();
    updatePageNavigation();

    if (skillsAddCategory) {
        skillsAddCategory.innerHTML = skillsCategories
            .map((category) => `<option value="${category.id}">${category.label}</option>`)
            .join("");
    }

    const closeAddForm = () => {
        if (!skillsAddForm) return;
        skillsAddForm.hidden = true;
        if (skillsAddName) skillsAddName.value = "";
        if (skillsAddIcon) skillsAddIcon.value = "";
        if (skillsAddCap) skillsAddCap.value = String(MAX_SKILL_POINTS);
        if (skillsAddCategory) skillsAddCategory.value = skillsState.activeCategoryId;
    };

    const openAddForm = () => {
        if (!skillsAddForm) return;
        skillsAddForm.hidden = false;
        if (skillsAddCategory) {
            skillsAddCategory.value = skillsState.activeCategoryId;
        }
        if (skillsAddCap && !skillsAddCap.value) {
            skillsAddCap.value = String(MAX_SKILL_POINTS);
        }
        skillsAddName?.focus();
    };

    if (skillsAddBtn) {
        skillsAddBtn.addEventListener("click", () => {
            if (!skillsAddForm) return;
            if (skillsAddForm.hidden) {
                openAddForm();
            } else {
                closeAddForm();
            }
        });
    }

    if (skillsAddForm) {
        skillsAddForm.addEventListener("click", (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.hasAttribute("data-close-modal")) {
                closeAddForm();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (skillsAddForm && !skillsAddForm.hidden) {
            closeAddForm();
        }
    });

    if (skillsAddCancel) {
        skillsAddCancel.addEventListener("click", () => {
            closeAddForm();
        });
    }

    if (skillsAddSubmit) {
        skillsAddSubmit.addEventListener("click", () => {
            if (!skillsState.isAdmin) return;
            const name = skillsAddName?.value.trim() || "";
            const icon = skillsAddIcon?.value.trim() || "";
            const categoryId = skillsAddCategory?.value || skillsState.activeCategoryId;
            const capRaw = skillsAddCap?.value.trim() || "";
            const parsedCap = capRaw ? parseInt(capRaw, 10) : MAX_SKILL_POINTS;
            const cap = Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : MAX_SKILL_POINTS;
            if (!name) {
                updateFeedback("Ajoutez un nom de compÃ©tence.");
                return;
            }
            const ok = addCustomSkill(categoryId, { name, icon, baseValue: 0, cap });
            if (!ok) {
                updateFeedback("Cette compÃ©tence existe dÃ©jÃ .");
                return;
            }
            renderSkillsTabs();
            setActiveSkillsCategory(categoryId);
            closeAddForm();
            updateFeedback("CompÃ©tence ajoutÃ©e.");
        });
    }

    // -----------------------------------------------------------------
    // Helpers de stockage
    // -----------------------------------------------------------------
    function loadFromStorage(key) {
        try {
            const raw = localStorage.getItem(storageKey(key));
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn("Impossible de charger", key, error);
            return {};
        }
    }

    function saveToStorage(key, value) {
        try {
            localStorage.setItem(storageKey(key), JSON.stringify(value));
        } catch (error) {
            console.warn("Impossible d'enregistrer", key, error);
        }

        if (persistState.mode === "character") {
            scheduleProfileSave();
        }
    }

    function normalizeSkillName(value) {
        return String(value || "").trim().toLowerCase();
    }

    function hydrateCustomSkills() {
        const customByCategory = skillsState.customSkillsByCategory || {};
        skillsCategories.forEach((category) => {
            const customList = Array.isArray(customByCategory[category.id]) ? customByCategory[category.id] : [];
            if (!customList.length) return;
            const existing = new Set((category.skills || []).map((skill) => normalizeSkillName(skill.name)));
            customList.forEach((skill) => {
                if (!skill?.name) return;
                if (existing.has(normalizeSkillName(skill.name))) return;
                category.skills.push({
                    name: String(skill.name),
                    baseValue: Number(skill.baseValue) || 0,
                    icon: String(skill.icon || ""),
                    cap: Number(skill.cap) || MAX_SKILL_POINTS
                });
            });
        });
    }

    function addCustomSkill(categoryId, skill) {
        if (!categoryId || !skill?.name) return false;
        const category = skillsCategories.find((entry) => entry.id === categoryId);
        if (!category) return false;
        const normalizedName = normalizeSkillName(skill.name);
        const exists = (category.skills || []).some((entry) => normalizeSkillName(entry.name) === normalizedName);
        if (exists) return false;
        const capValue = Number(skill.cap) || MAX_SKILL_POINTS;
        const newSkill = {
            name: String(skill.name).trim(),
            baseValue: Number(skill.baseValue) || 0,
            icon: String(skill.icon || ""),
            cap: capValue
        };
        category.skills = Array.isArray(category.skills) ? category.skills : [];
        category.skills.push(newSkill);

        skillsState.customSkillsByCategory = skillsState.customSkillsByCategory || {};
        const list = Array.isArray(skillsState.customSkillsByCategory[categoryId])
            ? skillsState.customSkillsByCategory[categoryId]
            : [];
        list.push(newSkill);
        skillsState.customSkillsByCategory[categoryId] = list;

        skillsState.allocationsByCategory[categoryId] = skillsState.allocationsByCategory[categoryId] || {};
        skillsState.baseValuesByCategory[categoryId] = skillsState.baseValuesByCategory[categoryId] || {};
        skillsState.baseValuesByCategory[categoryId][newSkill.name] = 0;
        saveToStorage(skillsCustomKey, skillsState.customSkillsByCategory);
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
        return true;
    }

    function buildDefaultCompetences() {
        const pointsByCategory = {};
        const baseValuesByCategory = {};
        const allocationsByCategory = {};
        const locksByCategory = {};
        const customSkillsByCategory = {};

        skillsCategories.forEach((category) => {
            pointsByCategory[category.id] = DEFAULT_CATEGORY_POINTS[category.id] ?? 0;
            allocationsByCategory[category.id] = {};
            locksByCategory[category.id] = false;
            baseValuesByCategory[category.id] = {};
            customSkillsByCategory[category.id] = [];
            (category.skills || []).forEach((skill) => {
                baseValuesByCategory[category.id][skill.name] = 0;
            });
        });

        return { version: 1, pointsByCategory, allocationsByCategory, baseValuesByCategory, locksByCategory, customSkillsByCategory };
    }

    async function initPersistence() {
        persistState.mode = "local";
        persistState.characterId = null;
        persistState.auth = null;
        document.body.dataset.admin = "false";

        try {
            persistState.auth = await import("./auth.js");
            if (typeof persistState.auth.refreshSessionUser === "function") {
                await persistState.auth.refreshSessionUser();
            }
            const user = persistState.auth.getCurrentUser?.();
            const character = persistState.auth.getActiveCharacter?.();

            if (user && character && character.id) {
                persistState.mode = "character";
                persistState.characterId = character.id;
                document.body.dataset.admin = persistState.auth.isAdmin?.() ? "true" : "false";
                skillsState.isAdmin = document.body.dataset.admin === "true";

                const profileData = character.profile_data || {};
                const persisted = profileData.competences || null;
                const fallback = buildDefaultCompetences();

                const merged = {
                    version: 1,
                    pointsByCategory: persisted?.pointsByCategory || fallback.pointsByCategory,
                    allocationsByCategory: persisted?.allocationsByCategory || fallback.allocationsByCategory,
                    baseValuesByCategory: persisted?.baseValuesByCategory || fallback.baseValuesByCategory,
                    locksByCategory: persisted?.locksByCategory || fallback.locksByCategory,
                    customSkillsByCategory: persisted?.customSkillsByCategory || fallback.customSkillsByCategory,
                };

                skillsState.pointsByCategory = merged.pointsByCategory;
                skillsState.allocationsByCategory = merged.allocationsByCategory;
                skillsState.baseValuesByCategory = merged.baseValuesByCategory;
                skillsState.locksByCategory = merged.locksByCategory;
                skillsState.customSkillsByCategory = merged.customSkillsByCategory;

                saveToStorage(skillsStorageKey, skillsState.pointsByCategory);
                saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
                saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
                saveToStorage(skillsLocksKey, skillsState.locksByCategory);
                saveToStorage(skillsCustomKey, skillsState.customSkillsByCategory);

                if (!persisted) {
                    await flushProfileSave();
                }
            }
        } catch (error) {
            // Keep local mode fallback.
            persistState.mode = "local";
            persistState.characterId = null;
            persistState.auth = null;
            document.body.dataset.admin = "false";
            skillsState.isAdmin = false;
        }

        // Allow app-shell header to flush before switching character.
        window.astoriaBeforeCharacterChange = async () => {
            await flushProfileSave();
        };
    }

    function scheduleProfileSave() {
        if (persistState.mode !== "character" || !persistState.auth) return;
        if (persistState.saveTimer) {
            clearTimeout(persistState.saveTimer);
        }

        persistState.saveTimer = setTimeout(() => {
            persistState.saveTimer = null;
            void flushProfileSave();
        }, 350);
    }

    async function flushProfileSave() {
        if (persistState.mode !== "character" || !persistState.auth) return;
        if (persistState.saveTimer) {
            clearTimeout(persistState.saveTimer);
            persistState.saveTimer = null;
        }

        if (persistState.inFlight) return persistState.inFlight;

        const character = persistState.auth.getActiveCharacter?.();
        if (!character || !character.id) return;

        const profileData = character.profile_data || {};
        const nextProfileData = {
            ...profileData,
            competences: {
                version: 1,
                pointsByCategory: skillsState.pointsByCategory,
                allocationsByCategory: skillsState.allocationsByCategory,
                baseValuesByCategory: skillsState.baseValuesByCategory,
                locksByCategory: skillsState.locksByCategory,
                customSkillsByCategory: skillsState.customSkillsByCategory,
            },
        };

        persistState.inFlight = (async () => {
            try {
                await persistState.auth.updateCharacter?.(character.id, { profile_data: nextProfileData });
            } finally {
                persistState.inFlight = null;
            }
        })();

        return persistState.inFlight;
    }

    // -----------------------------------------------------------------
    // Accès aux données
    // -----------------------------------------------------------------
    function getActiveCategory() {
        return skillsCategories.find((category) => category.id === skillsState.activeCategoryId);
    }

    function getActiveCategoryIndex() {
        return skillsCategories.findIndex((category) => category.id === skillsState.activeCategoryId);
    }

    function getCategoryAllocations(categoryId) {
        if (!skillsState.allocationsByCategory[categoryId]) {
            skillsState.allocationsByCategory[categoryId] = {};
        }
        return skillsState.allocationsByCategory[categoryId];
    }

    function getCurrentCategoryPoints() {
        const id = skillsState.activeCategoryId;
        return skillsState.pointsByCategory[id] ?? 0;
    }

    function setCurrentCategoryPoints(value) {
        const numeric = Number.isFinite(value) ? value : parseInt(String(value), 10);
        const clamped = Math.max(0, Math.min(Number.isFinite(numeric) ? numeric : 0, 99));
        skillsState.pointsByCategory[skillsState.activeCategoryId] = clamped;
        if (skillsPointsValueEl) {
            skillsPointsValueEl.value = String(clamped);
        }
        saveToStorage(skillsStorageKey, skillsState.pointsByCategory);
    }

    // -----------------------------------------------------------------
    // Rendu des onglets
    // -----------------------------------------------------------------
    function renderSkillsTabs() {
        skillsTabsContainer.innerHTML = "";
        skillsTabsContainer.setAttribute("role", "tablist");

        skillsCategories.forEach((category, index) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "skills-tab-btn";
            btn.dataset.id = category.id;
            btn.title = category.label;
            btn.setAttribute("role", "tab");
            btn.setAttribute("aria-selected", category.id === skillsState.activeCategoryId ? "true" : "false");
            btn.tabIndex = category.id === skillsState.activeCategoryId ? 0 : -1;

            const circle = document.createElement("span");
            circle.className = "skills-tab-circle";
            const img = document.createElement("img");
            img.src = category.icon?.src || "";
            img.alt = category.icon?.alt || category.label;
            circle.appendChild(img);

            const label = document.createElement("span");
            label.className = "skills-tab-label";
            label.textContent = category.label;

            btn.append(circle, label);

            if (category.id === skillsState.activeCategoryId) {
                btn.classList.add("skills-active");
            }

            btn.addEventListener("click", () => setActiveSkillsCategory(category.id));

            skillsTabsContainer.appendChild(btn);
        });
    }

    function wireTabsKeyboardNavigation() {
        skillsTabsContainer.addEventListener("keydown", (event) => {
            const tabs = Array.from(skillsTabsContainer.querySelectorAll("[role='tab']"));
            const currentIndex = tabs.findIndex((tab) => tab.dataset.id === skillsState.activeCategoryId);
            if (currentIndex === -1) return;

            let nextIndex = currentIndex;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                nextIndex = (currentIndex + 1) % tabs.length;
            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            } else if (event.key === "Home") {
                nextIndex = 0;
            } else if (event.key === "End") {
                nextIndex = tabs.length - 1;
            } else if (event.key === " " || event.key === "Enter") {
                setActiveSkillsCategory(skillsState.activeCategoryId);
                return;
            } else {
                return;
            }

            event.preventDefault();
            const nextTab = tabs[nextIndex];
            setActiveSkillsCategory(nextTab.dataset.id);
            nextTab.focus();
        });
    }

    // -----------------------------------------------------------------
    // Rendu catégorie
    // -----------------------------------------------------------------
    function renderSkillsCategory(category) {
        if (!category) {
            renderEmptyMessage("Aucune compétence disponible");
            updatePageNavigation();
            return;
        }

        skillsTitleEl.textContent = category.label;
        skillsListEl.innerHTML = "";
        const allocations = getCategoryAllocations(category.id);
        const bonusBySkill = getNokorahBonuses();
        const isLocked = Boolean(skillsState.locksByCategory[category.id]);

        if (!category.skills || !category.skills.length) {
            renderEmptyMessage("Aucune compétence dans cette catégorie");
            return;
        }

        category.skills.forEach((skill) => {
            const allocation = allocations[skill.name] || 0;
            const savedBase = skillsState.baseValuesByCategory[category.id]?.[skill.name];
            const base = savedBase ?? 0;
            const bonus = bonusBySkill[skill.name] || 0;
            const totalValue = base + allocation + bonus;
            const cap = getSkillCap(skill);
            const isMaxed = base + allocation >= cap;
            const li = document.createElement("li");
            li.className = "skills-line";

            const icon = document.createElement("div");
            icon.className = "skills-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = skill.icon || "";

            const name = document.createElement("div");
            name.className = "skills-name";
            name.textContent = skill.name;

            const controls = document.createElement("div");
            controls.className = "skills-value-group";

            const decBtn = document.createElement("button");
            decBtn.type = "button";
            decBtn.className = "skill-point-btn";
            decBtn.textContent = "-";
            decBtn.setAttribute("aria-label", `Retirer un point sur ${skill.name}`);
            decBtn.disabled = allocation <= 0 || isLocked;

            const value = document.createElement("span");
            value.className = "skills-value";
            value.textContent = `${totalValue} / ${cap}`;

            const incBtn = document.createElement("button");
            incBtn.type = "button";
            incBtn.className = "skill-point-btn";
            incBtn.textContent = "+";
            incBtn.setAttribute("aria-label", `Ajouter un point sur ${skill.name}`);
            incBtn.disabled = isMaxed || getCurrentCategoryPoints() <= 0 || isLocked;

            decBtn.addEventListener("click", () => {
                adjustSkillPoints(category.id, skill, -1, value, decBtn, incBtn);
            });
            incBtn.addEventListener("click", () => {
                adjustSkillPoints(category.id, skill, 1, value, decBtn, incBtn);
            });

            controls.append(decBtn, value, incBtn);
            li.append(icon, name, controls);
            skillsListEl.appendChild(li);
        });

        updateSkillsPointsDisplay();
        updateLockState(isLocked);
        updatePendingHighlights(category.id);
        updatePageNavigation();
    }

    function adjustSkillPoints(categoryId, skill, delta, valueEl, decBtn, incBtn) {
        if (skillsState.locksByCategory[categoryId]) return;

        const allocations = getCategoryAllocations(categoryId);
        const currentAlloc = allocations[skill.name] || 0;
        const available = skillsState.pointsByCategory[categoryId] ?? 0;
        const savedBase = skillsState.baseValuesByCategory[categoryId]?.[skill.name];
        const base = savedBase ?? 0;
        const currentTotal = base + currentAlloc;
        const cap = getSkillCap(skill);

        if (delta > 0 && (available <= 0 || currentTotal >= cap)) return;
        if (delta < 0 && currentAlloc <= 0) return;

        if (delta > 0) {
            const increment = Math.min(delta, available, cap - currentTotal);
            if (increment <= 0) return;
            allocations[skill.name] = currentAlloc + increment;
            skillsState.pointsByCategory[categoryId] = Math.max(0, available - increment);
        } else if (delta < 0) {
            const decrement = Math.min(-delta, currentAlloc);
            if (decrement <= 0) return;
            allocations[skill.name] = currentAlloc - decrement;
            skillsState.pointsByCategory[categoryId] = available + decrement;
        }
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
        saveToStorage(skillsStorageKey, skillsState.pointsByCategory);

        const bonusBySkill = getNokorahBonuses();
        const nextAlloc = allocations[skill.name] || 0;
        const bonus = bonusBySkill[skill.name] || 0;
        const newTotal = base + nextAlloc + bonus;
        valueEl.textContent = `${newTotal} / ${cap}`;
        const isLocked = skillsState.locksByCategory[categoryId];
        decBtn.disabled = nextAlloc <= 0 || isLocked;
        incBtn.disabled = base + nextAlloc >= cap || (skillsState.pointsByCategory[categoryId] ?? 0) <= 0 || isLocked;

        updateSkillsPointsDisplay();
        updatePendingHighlights(categoryId);
    }

    function renderEmptyMessage(message) {
        skillsListEl.innerHTML = "";
        const li = document.createElement("li");
        li.className = "skills-line skills-placeholder";
        li.textContent = message;
        skillsListEl.appendChild(li);
    }

    function wirePageNavigation() {
        if (skillsPagePrevEl) {
            skillsPagePrevEl.addEventListener("click", () => {
                const index = getActiveCategoryIndex();
                if (index > 0) {
                    setActiveSkillsCategory(skillsCategories[index - 1].id);
                }
            });
        }

        if (skillsPageNextEl) {
            skillsPageNextEl.addEventListener("click", () => {
                const index = getActiveCategoryIndex();
                if (index > -1 && index < skillsCategories.length - 1) {
                    setActiveSkillsCategory(skillsCategories[index + 1].id);
                }
            });
        }
    }

    function updatePageNavigation() {
        if (!skillsPagePrevEl && !skillsPageNextEl) return;
        const index = getActiveCategoryIndex();
        const prevCategory = index > 0 ? skillsCategories[index - 1] : null;
        const nextCategory = index > -1 && index < skillsCategories.length - 1 ? skillsCategories[index + 1] : null;

        if (skillsPagePrevEl) {
            const hasPrev = Boolean(prevCategory);
            skillsPagePrevEl.hidden = !hasPrev;
            skillsPagePrevEl.disabled = !hasPrev;
            if (hasPrev) {
                skillsPagePrevEl.setAttribute("aria-label", `Page précédente : ${prevCategory.label}`);
                skillsPagePrevEl.title = `Précédent : ${prevCategory.label}`;
            } else {
                skillsPagePrevEl.removeAttribute("title");
            }
        }

        if (skillsPageNextEl) {
            const hasNext = Boolean(nextCategory);
            skillsPageNextEl.hidden = !hasNext;
            skillsPageNextEl.disabled = !hasNext;
            if (hasNext) {
                skillsPageNextEl.setAttribute("aria-label", `Page suivante : ${nextCategory.label}`);
                skillsPageNextEl.title = `Suivant : ${nextCategory.label}`;
            } else {
                skillsPageNextEl.removeAttribute("title");
            }
        }
    }

    function getNokorahBonuses() {
        const key = getNokorahStorageKey();
        try {
            const raw = localStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(list)) return {};
            return list.reduce((acc, bonus) => {
                const name = bonus?.name;
                const points = Number(bonus?.points) || 0;
                if (!name || points <= 0) return acc;
                acc[name] = (acc[name] || 0) + points;
                return acc;
            }, {});
        } catch {
            return {};
        }
    }

    function getNokorahStorageKey() {
        const suffix = persistState.characterId || resolveCharacterIdFallback();
        return `nokorahBonuses:${suffix}`;
    }

    function resolveCharacterIdFallback() {
        try {
            const raw = localStorage.getItem("astoria_active_character");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.id) return String(parsed.id);
            }
        } catch {
            // ignore
        }
        try {
            const raw = localStorage.getItem("astoria_character_summary");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.id) return String(parsed.id);
            }
        } catch {
            // ignore
        }
        const params = new URLSearchParams(window.location.search);
        return params.get("character") || "default";
    }

    // -----------------------------------------------------------------
    // Changement d'onglet
    // -----------------------------------------------------------------
    function setActiveSkillsCategory(categoryId) {
        if (skillsState.activeCategoryId === categoryId) return;

        skillsState.activeCategoryId = categoryId;

        document.querySelectorAll(".skills-tab-btn").forEach((btn) => {
            const isActive = btn.dataset.id === categoryId;
            btn.classList.toggle("skills-active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
            btn.tabIndex = isActive ? 0 : -1;
        });

        const category = skillsCategories.find((c) => c.id === categoryId);
        renderSkillsCategory(category);
    }

    // -----------------------------------------------------------------
    // Gestion des points à répartir
    // -----------------------------------------------------------------
    function updateSkillsPointsDisplay() {
        const currentPoints = getCurrentCategoryPoints();
        if (skillsPointsValueEl) {
            skillsPointsValueEl.value = String(currentPoints);
        }

        // Calculer les stats pour le résumé
        const activeCategory = getActiveCategory();
        if (activeCategory) {
            const allocations = getCategoryAllocations(activeCategory.id);
            const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + Number(val || 0), 0);
            const totalPoints = (DEFAULT_CATEGORY_POINTS[activeCategory.id] || 0);
            const remainingPoints = totalPoints - totalAllocated;

            // Mettre à jour l'affichage du résumé
            if (skillsTotalPointsEl) skillsTotalPointsEl.textContent = String(totalPoints);
            if (skillsAllocatedPointsEl) skillsAllocatedPointsEl.textContent = String(totalAllocated);
            if (skillsRemainingPointsEl) skillsRemainingPointsEl.textContent = String(Math.max(0, remainingPoints));
        }

        const hasPoints = currentPoints > 0;
        const isLocked = skillsState.locksByCategory[skillsState.activeCategoryId];
        const bonusBySkill = getNokorahBonuses();

        skillsPointsMinusEl.disabled = !skillsState.isAdmin || !hasPoints || isLocked;
        skillsPointsPlusEl.disabled = !skillsState.isAdmin || isLocked;

        if (!activeCategory) return;
        const allocations = getCategoryAllocations(activeCategory.id);
        const baseValues = skillsState.baseValuesByCategory[activeCategory.id] || {};
        const hasAllocations = Object.values(allocations).some((value) => Number(value) > 0);
        const hasBaseValues = Object.values(baseValues).some((value) => Number(value) > 0);
        const canReset = skillsState.isAdmin && (hasPoints || hasAllocations || hasBaseValues);
        skillsPointsResetEl.disabled = !canReset;

        skillsListEl.querySelectorAll(".skills-line").forEach((line) => {
            const nameEl = line.querySelector(".skills-name");
            const incBtn = line.querySelector(".skill-point-btn:nth-child(3)");
            const decBtn = line.querySelector(".skill-point-btn:nth-child(1)");
            const valueEl = line.querySelector(".skills-value");
            if (!nameEl || !incBtn || !decBtn) return;
            const skill = activeCategory.skills.find((item) => item.name === nameEl.textContent);
            const savedBase = skillsState.baseValuesByCategory[activeCategory.id]?.[nameEl.textContent];
            const base = savedBase ?? 0;
            const allocation = allocations[nameEl.textContent] || 0;
            const bonus = bonusBySkill[nameEl.textContent] || 0;
            const total = base + allocation + bonus;
            const cap = getSkillCap(skill);
            if (valueEl) {
                valueEl.textContent = `${total} / ${cap}`;
            }
            const atMax = base + allocation >= cap;
            decBtn.disabled = allocation <= 0 || skillsState.locksByCategory[activeCategory.id];
            incBtn.disabled = atMax || currentPoints <= 0 || skillsState.locksByCategory[activeCategory.id];
        });

        updatePendingHighlights(activeCategory.id);
    }

    skillsPointsPlusEl.addEventListener("click", () => {
        if (!skillsState.isAdmin) return;
        const nextValue = Math.min(getCurrentCategoryPoints() + 1, 99);
        setCurrentCategoryPoints(nextValue);
        updateSkillsPointsDisplay();
    });

    skillsPointsMinusEl.addEventListener("click", () => {
        if (!skillsState.isAdmin) return;
        const current = getCurrentCategoryPoints();
        if (current > 0) {
            setCurrentCategoryPoints(current - 1);
            updateSkillsPointsDisplay();
        }
    });

    if (skillsPointsValueEl) {
        skillsPointsValueEl.addEventListener("change", () => {
            if (!skillsState.isAdmin) {
                // Reset to state if non-admin tries to edit
                skillsPointsValueEl.value = String(getCurrentCategoryPoints());
                return;
            }

            const raw = skillsPointsValueEl.value.trim();
            const parsed = parseInt(raw, 10);
            if (Number.isNaN(parsed)) {
                skillsPointsValueEl.value = String(getCurrentCategoryPoints());
                return;
            }

            setCurrentCategoryPoints(parsed);
            updateSkillsPointsDisplay();
        });

        skillsPointsValueEl.addEventListener("blur", () => {
            // Keep display in sync even if user leaves empty
            skillsPointsValueEl.value = String(getCurrentCategoryPoints());
        });
    }

    skillsPointsResetEl.addEventListener("click", () => {
        if (!skillsState.isAdmin) return;

        const categoryId = skillsState.activeCategoryId;
        const allocations = getCategoryAllocations(categoryId);
        const baseValues = skillsState.baseValuesByCategory[categoryId] || {};
        const spent = Object.values(allocations).reduce((sum, value) => {
            const n = Number(value);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        const spentBase = Object.values(baseValues).reduce((sum, value) => {
            const n = Number(value);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        const restored = spent + spentBase;

        setCurrentCategoryPoints(getCurrentCategoryPoints() + restored);
        clearAllocations(categoryId);
        skillsState.baseValuesByCategory[categoryId] = {};
        skillsState.locksByCategory[categoryId] = false;
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
        saveToStorage(skillsLocksKey, skillsState.locksByCategory);
        updateLockState(false);
        renderSkillsCategory(getActiveCategory());
        announce("Points réinitialisés pour cette catégorie.");
    });

    function clearAllocations(categoryId) {
        skillsState.allocationsByCategory[categoryId] = {};
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
    }

    // -----------------------------------------------------------------
    // Validation / verrouillage
    // -----------------------------------------------------------------
    skillsConfirmEl.addEventListener("click", () => {
        const activeCategory = getActiveCategory();
        if (!activeCategory) return;

        // Initialize storage for this category if needed
        if (!skillsState.baseValuesByCategory[activeCategory.id]) {
            skillsState.baseValuesByCategory[activeCategory.id] = {};
        }

        // Commit allocations to base values before clearing
        const allocations = getCategoryAllocations(activeCategory.id);
        activeCategory.skills.forEach((skill) => {
            const allocation = allocations[skill.name] || 0;
            if (allocation > 0) {
                const savedBase = skillsState.baseValuesByCategory[activeCategory.id][skill.name];
                const currentBase = savedBase ?? 0;
                const cap = getSkillCap(skill);
                const newBase = Math.min(currentBase + allocation, cap);
                skillsState.baseValuesByCategory[activeCategory.id][skill.name] = newBase;
            }
        });

        // Save base values to localStorage
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);

        // Clear allocations now that they're committed
        clearAllocations(activeCategory.id);

        const remainingPoints = getCurrentCategoryPoints();
        const shouldLock = remainingPoints <= 0;
        skillsState.locksByCategory[activeCategory.id] = shouldLock;
        saveToStorage(skillsLocksKey, skillsState.locksByCategory);
        updateLockState(shouldLock);
        renderSkillsCategory(activeCategory);
        if (shouldLock) {
            announce(`Points verrouillés pour ${activeCategory.label}`);
        } else {
            announce(`Points enregistrés. Il reste ${remainingPoints} point(s) à répartir.`);
        }
    });

    function updateLockState(isLocked) {
        skillsConfirmEl.disabled = isLocked;
        if (isLocked) {
            skillsConfirmEl.classList.add("is-locked");
        } else {
            skillsConfirmEl.classList.remove("is-locked");
        }
        updatePendingHighlights(skillsState.activeCategoryId);
    }

    function announce(message) {
        if (!skillsFeedbackEl) return;
        skillsFeedbackEl.textContent = message;
    }

    function hasPendingChanges(categoryId) {
        if (skillsState.locksByCategory[categoryId]) return false;
        const allocations = getCategoryAllocations(categoryId);
        return Object.values(allocations).some((points) => Number(points) > 0);
    }

    function updatePendingHighlights(categoryId) {
        if (!skillsListEl) return;
        const allocations = getCategoryAllocations(categoryId);
        const isLocked = Boolean(skillsState.locksByCategory[categoryId]);

        skillsListEl.querySelectorAll(".skills-line").forEach((line) => {
            const nameEl = line.querySelector(".skills-name");
            if (!nameEl) return;
            const alloc = allocations[nameEl.textContent] || 0;
            line.classList.toggle(HIGHLIGHT_LINE_CLASS, !isLocked && alloc > 0);
        });

        if (skillsConfirmEl) {
            skillsConfirmEl.classList.toggle(HIGHLIGHT_CONFIRM_CLASS, hasPendingChanges(categoryId));
        }
    }

    window.addEventListener("storage", (event) => {
        if (!event?.key) return;
        if (event.key === getNokorahStorageKey()) {
            renderSkillsCategory(getActiveCategory());
        }
    });
})();
