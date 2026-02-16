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
    const skillsEditModeBtn = document.getElementById("skillsEditModeBtn");
    const skillsAddForm = document.getElementById("skillsAddForm");
    const skillsAddName = document.getElementById("skillsAddName");
    const skillsAddIcon = document.getElementById("skillsAddIcon");
    const skillsAddCategory = document.getElementById("skillsAddCategory");
    const skillsAddCap = document.getElementById("skillsAddCap");
    const skillsAddCancel = document.getElementById("skillsAddCancel");
    const skillsAddSubmit = document.getElementById("skillsAddSubmit");
    const HIGHLIGHT_LINE_CLASS = "skills-line-highlight";
    const HIGHLIGHT_CONFIRM_CLASS = "skills-confirm-btn--pending";
    const ADD_MODAL_OPEN_CLASS = "skills-add-open";
    let bonusTooltipEl = null;
    let bonusTooltipTimer = null;
    const itemCatalog = {
        byName: new Map(),
        byIndex: []
    };

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
    const baseSkillNameSetsByCategory = new Map(
        baseCategories.map((category) => {
            const names = new Set(
                (Array.isArray(category?.skills) ? category.skills : [])
                    .map((skill) => String(skill?.name || "").trim().toLowerCase())
                    .filter(Boolean)
            );
            return [String(category?.id || ""), names];
        })
    );

    const MAX_SKILL_POINTS = 40;
    const SHIFT_STEP_POINTS = 10;

    function getSkillCap(skill) {
        const cap = Number(skill?.cap);
        return Number.isFinite(cap) && cap > 0 ? cap : MAX_SKILL_POINTS;
    }

    function resolveStepFromClick(event) {
        return event?.shiftKey ? SHIFT_STEP_POINTS : 1;
    }

    const skillsStorageKey = "skillsPointsByCategory";
    const skillsAllocStorageKey = "skillsAllocationsByCategory";
    const skillsBaseValuesKey = "skillsBaseValuesByCategory";
    const skillsLocksKey = "skillsLocksByCategory";
    const skillsCustomKey = "skillsCustomByCategory";
    const skillsMetaKey = "skillsMetaByCategory";
    const skillsEditModeKey = "skillsEditModeByCategory";

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
        retryTimer: null,
        retryCount: 0,
        dirty: false,
        lastErrorToastAt: 0,
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
        metaByCategory: loadFromStorage(skillsMetaKey),
        editModeByCategory: loadFromStorage(skillsEditModeKey),
        isAdmin: document.body.dataset.admin === "true",
        adminEditor: { categoryId: "", skillName: "" },
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
        refreshEditModeButton();
    }

    function isCategoryEditMode(categoryId) {
        return Boolean(skillsState.editModeByCategory?.[categoryId]);
    }

    function setCategoryEditMode(categoryId, enabled) {
        if (!categoryId) return;
        skillsState.editModeByCategory = skillsState.editModeByCategory || {};
        skillsState.editModeByCategory[categoryId] = Boolean(enabled);
        saveToStorage(skillsEditModeKey, skillsState.editModeByCategory);
        refreshEditModeButton();
    }

    function refreshEditModeButton() {
        if (!skillsEditModeBtn) return;
        if (!skillsState.isAdmin) {
            skillsEditModeBtn.hidden = true;
            return;
        }
        skillsEditModeBtn.hidden = false;
        const enabled = isCategoryEditMode(skillsState.activeCategoryId);
        skillsEditModeBtn.classList.toggle("is-active", enabled);
        skillsEditModeBtn.textContent = enabled ? "Edition active" : "Mode édition";
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
    await hydrateItemCatalog();
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
        if (typeof modalManager !== "undefined" && modalManager?.isOpen?.(skillsAddForm)) {
            modalManager.close(skillsAddForm);
        } else {
            skillsAddForm.hidden = true;
        }
        document.body.classList.remove(ADD_MODAL_OPEN_CLASS);
        if (skillsAddName) skillsAddName.value = "";
        if (skillsAddIcon) skillsAddIcon.value = "";
        if (skillsAddCap) skillsAddCap.value = String(MAX_SKILL_POINTS);
        if (skillsAddCategory) skillsAddCategory.value = skillsState.activeCategoryId;
    };

    const openAddForm = () => {
        if (!skillsAddForm) return;
        if (typeof modalManager !== "undefined" && modalManager?.open) {
            modalManager.open(skillsAddForm, {
                closeOnBackdropClick: false,
                closeOnEsc: false,
                openClass: "skills-add-modal-open",
                focusElement: skillsAddName || null
            });
        } else {
            skillsAddForm.hidden = false;
        }
        document.body.classList.add(ADD_MODAL_OPEN_CLASS);
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

    if (skillsEditModeBtn) {
        skillsEditModeBtn.addEventListener("click", () => {
            if (!skillsState.isAdmin) return;
            const categoryId = skillsState.activeCategoryId;
            setCategoryEditMode(categoryId, !isCategoryEditMode(categoryId));
            renderSkillsCategory(getActiveCategory());
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
                updateFeedback("Ajoutez un nom de competence.");
                return;
            }
            const ok = addCustomSkill(categoryId, { name, icon, baseValue: 0, cap });
            if (!ok) {
                updateFeedback("Cette competence existe deja.");
                return;
            }
            renderSkillsTabs();
            setActiveSkillsCategory(categoryId);
            closeAddForm();
            updateFeedback("Competence ajoutee.");
            void persistProfileNow();
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
            persistState.dirty = true;
            scheduleProfileSave();
            void persistProfileNow();
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

        const metaByCategory = skillsState.metaByCategory || {};
        skillsCategories.forEach((category) => {
            const categoryMeta = metaByCategory[category.id] || {};
            category.skills = (category.skills || []).filter((skill) => {
                const meta = categoryMeta[normalizeSkillName(skill?.name)];
                return !Boolean(meta?.deleted);
            });
            (category.skills || []).forEach((skill) => {
                const meta = categoryMeta[normalizeSkillName(skill?.name)];
                if (!meta) return;
                if (typeof meta.icon === "string") {
                    skill.icon = meta.icon;
                }
                if (Number.isFinite(Number(meta.cap)) && Number(meta.cap) > 0) {
                    skill.cap = Number(meta.cap);
                }
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
        if (skillsState.isAdmin) {
            skillsState.locksByCategory[categoryId] = false;
            saveToStorage(skillsLocksKey, skillsState.locksByCategory);
        }
        saveToStorage(skillsCustomKey, skillsState.customSkillsByCategory);
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
        return true;
    }

    function isBaseSkill(categoryId, skillName) {
        const set = baseSkillNameSetsByCategory.get(String(categoryId || ""));
        if (!set) return false;
        return set.has(String(skillName || "").trim().toLowerCase());
    }

    function syncCustomSkillRecord(categoryId, skillName, patch = null) {
        skillsState.customSkillsByCategory = skillsState.customSkillsByCategory || {};
        const list = Array.isArray(skillsState.customSkillsByCategory[categoryId])
            ? skillsState.customSkillsByCategory[categoryId]
            : [];
        const idx = list.findIndex((entry) => normalizeSkillName(entry?.name) === normalizeSkillName(skillName));
        if (idx < 0) return false;

        if (patch === null) {
            list.splice(idx, 1);
        } else {
            list[idx] = { ...list[idx], ...patch };
        }
        skillsState.customSkillsByCategory[categoryId] = list;
        saveToStorage(skillsCustomKey, skillsState.customSkillsByCategory);
        return true;
    }

    function moveSkillStateKeys(categoryId, fromName, toName) {
        if (!categoryId || !fromName || !toName || fromName === toName) return;
        const allocations = getCategoryAllocations(categoryId);
        const baseValues = skillsState.baseValuesByCategory[categoryId] || {};
        if (Object.prototype.hasOwnProperty.call(allocations, fromName)) {
            allocations[toName] = allocations[fromName];
            delete allocations[fromName];
        }
        if (Object.prototype.hasOwnProperty.call(baseValues, fromName)) {
            baseValues[toName] = baseValues[fromName];
            delete baseValues[fromName];
        }
        skillsState.baseValuesByCategory[categoryId] = baseValues;
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
        moveSkillMetaKey(categoryId, fromName, toName);
    }

    function deleteSkillState(categoryId, skillName) {
        const allocations = getCategoryAllocations(categoryId);
        const baseValues = skillsState.baseValuesByCategory[categoryId] || {};
        delete allocations[skillName];
        delete baseValues[skillName];
        skillsState.baseValuesByCategory[categoryId] = baseValues;
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
        deleteSkillMetaKey(categoryId, skillName);
    }

    function getSkillMetaMap(categoryId) {
        skillsState.metaByCategory = skillsState.metaByCategory || {};
        if (!skillsState.metaByCategory[categoryId]) {
            skillsState.metaByCategory[categoryId] = {};
        }
        return skillsState.metaByCategory[categoryId];
    }

    function setSkillMeta(categoryId, skillName, patch) {
        if (!categoryId || !skillName) return;
        const categoryMeta = getSkillMetaMap(categoryId);
        const key = normalizeSkillName(skillName);
        categoryMeta[key] = { ...(categoryMeta[key] || {}), ...patch };
        saveToStorage(skillsMetaKey, skillsState.metaByCategory);
    }

    function markSkillDeleted(categoryId, skillName) {
        if (!categoryId || !skillName) return;
        setSkillMeta(categoryId, skillName, { deleted: true });
    }

    function moveSkillMetaKey(categoryId, fromName, toName) {
        const categoryMeta = getSkillMetaMap(categoryId);
        const fromKey = normalizeSkillName(fromName);
        const toKey = normalizeSkillName(toName);
        if (!categoryMeta[fromKey] || fromKey === toKey) return;
        categoryMeta[toKey] = categoryMeta[fromKey];
        delete categoryMeta[fromKey];
        saveToStorage(skillsMetaKey, skillsState.metaByCategory);
    }

    function deleteSkillMetaKey(categoryId, skillName) {
        const categoryMeta = getSkillMetaMap(categoryId);
        const key = normalizeSkillName(skillName);
        if (!categoryMeta[key]) return;
        delete categoryMeta[key];
        saveToStorage(skillsMetaKey, skillsState.metaByCategory);
    }

    function isEditingSkill(categoryId, skillName) {
        return normalizeSkillName(skillsState.adminEditor?.categoryId) === normalizeSkillName(categoryId)
            && normalizeSkillName(skillsState.adminEditor?.skillName) === normalizeSkillName(skillName);
    }

    function openAdminSkillEditor(category, skill) {
        if (!skillsState.isAdmin || !category || !skill?.name) return;
        const alreadyOpen = isEditingSkill(category.id, skill.name);
        skillsState.adminEditor = alreadyOpen
            ? { categoryId: "", skillName: "" }
            : { categoryId: category.id, skillName: skill.name };
        renderSkillsCategory(getActiveCategory());
    }

    function applySkillAdminEdits(category, skill, draft) {
        if (!category || !skill || !draft) return { ok: false };
        const categoryId = category.id;
        const originalName = String(skill.name || "").trim();
        const isCore = isBaseSkill(categoryId, originalName);
        const nextName = String(draft.name || "").trim();
        const nextIcon = String(draft.icon || "").trim();
        const nextBaseRaw = Number(draft.base);
        const nextCapRaw = Number(draft.cap);

        if (!nextName) {
            updateFeedback("Nom invalide.");
            return { ok: false };
        }
        if (!Number.isFinite(nextBaseRaw) || nextBaseRaw < 0) {
            updateFeedback("Base invalide.");
            return { ok: false };
        }
        if (!Number.isFinite(nextCapRaw) || nextCapRaw <= 0) {
            updateFeedback("Cap invalide.");
            return { ok: false };
        }

        let finalName = originalName;
        if (normalizeSkillName(nextName) !== normalizeSkillName(originalName)) {
            if (isCore) {
                updateFeedback("Nom natif conserve, autres champs mis a jour.");
                finalName = originalName;
            } else {
                const duplicate = (category.skills || []).some((entry) => entry !== skill
                    && normalizeSkillName(entry?.name) === normalizeSkillName(nextName));
                if (duplicate) {
                    updateFeedback("Nom deja utilise.");
                    return { ok: false };
                }
                moveSkillStateKeys(categoryId, originalName, nextName);
                syncCustomSkillRecord(categoryId, originalName, { name: nextName });
                skill.name = nextName;
                finalName = nextName;
            }
        }

        const nextCap = Math.floor(nextCapRaw);
        const nextBase = Math.min(Math.floor(nextBaseRaw), nextCap);
        skill.cap = nextCap;
        skill.icon = nextIcon || "";
        skillsState.baseValuesByCategory[categoryId] = skillsState.baseValuesByCategory[categoryId] || {};
        skillsState.baseValuesByCategory[categoryId][finalName] = nextBase;
        saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
        syncCustomSkillRecord(categoryId, finalName, { cap: nextCap });
        setSkillMeta(categoryId, finalName, { icon: skill.icon, cap: nextCap });
        return { ok: true, finalName };
    }

    function saveInlineSkillEditor(category, skill, panel) {
        if (!category || !skill || !panel) return;

        const nameInput = panel.querySelector("[data-field='name']");
        const baseInput = panel.querySelector("[data-field='base']");
        const capInput = panel.querySelector("[data-field='cap']");
        const iconInput = panel.querySelector("[data-field='icon']");
        const result = applySkillAdminEdits(category, skill, {
            name: String(nameInput?.value || ""),
            icon: String(iconInput?.value || ""),
            base: Number(baseInput?.value),
            cap: Number(capInput?.value)
        });
        if (!result.ok) return;
        skillsState.adminEditor = { categoryId: category.id, skillName: result.finalName };
        renderSkillsCategory(getActiveCategory());
        updateFeedback(`Competence mise a jour: ${result.finalName}.`);
        void persistProfileNow();
    }

    function deleteInlineSkillEditor(category, skill) {
        if (!category || !skill) return;
        const categoryId = category.id;
        const skillName = String(skill.name || "").trim();
        const list = Array.isArray(category.skills) ? category.skills : [];
        category.skills = list.filter((entry) => normalizeSkillName(entry?.name) !== normalizeSkillName(skillName));
        if (isBaseSkill(categoryId, skillName)) {
            const allocations = getCategoryAllocations(categoryId);
            const baseValues = skillsState.baseValuesByCategory[categoryId] || {};
            delete allocations[skillName];
            delete baseValues[skillName];
            skillsState.baseValuesByCategory[categoryId] = baseValues;
            saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
            saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
            markSkillDeleted(categoryId, skillName);
        } else {
            deleteSkillState(categoryId, skillName);
            syncCustomSkillRecord(categoryId, skillName, null);
        }
        skillsState.adminEditor = { categoryId: "", skillName: "" };
        renderSkillsTabs();
        renderSkillsCategory(getActiveCategory());
        updateFeedback(`Competence supprimee: ${skillName}.`);
        void persistProfileNow();
    }

    function buildDefaultCompetences() {
        const pointsByCategory = {};
        const baseValuesByCategory = {};
        const allocationsByCategory = {};
        const locksByCategory = {};
        const customSkillsByCategory = {};
        const metaByCategory = {};

        skillsCategories.forEach((category) => {
            pointsByCategory[category.id] = DEFAULT_CATEGORY_POINTS[category.id] ?? 0;
            allocationsByCategory[category.id] = {};
            locksByCategory[category.id] = false;
            baseValuesByCategory[category.id] = {};
            customSkillsByCategory[category.id] = [];
            metaByCategory[category.id] = {};
            (category.skills || []).forEach((skill) => {
                baseValuesByCategory[category.id][skill.name] = 0;
            });
        });

        return { version: 1, pointsByCategory, allocationsByCategory, baseValuesByCategory, locksByCategory, customSkillsByCategory, metaByCategory };
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
                    metaByCategory: persisted?.metaByCategory || fallback.metaByCategory,
                };

                skillsState.pointsByCategory = merged.pointsByCategory;
                skillsState.allocationsByCategory = merged.allocationsByCategory;
                skillsState.baseValuesByCategory = merged.baseValuesByCategory;
                skillsState.locksByCategory = merged.locksByCategory;
                skillsState.customSkillsByCategory = merged.customSkillsByCategory;
                skillsState.metaByCategory = merged.metaByCategory;

                saveToStorage(skillsStorageKey, skillsState.pointsByCategory);
                saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
                saveToStorage(skillsBaseValuesKey, skillsState.baseValuesByCategory);
                saveToStorage(skillsLocksKey, skillsState.locksByCategory);
                saveToStorage(skillsCustomKey, skillsState.customSkillsByCategory);
                saveToStorage(skillsMetaKey, skillsState.metaByCategory);

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

        // Force save before page unload to prevent data loss
        window.addEventListener('beforeunload', (event) => {
            if (persistState.mode === 'character' && persistState.auth) {
                // Flush any pending save immediately
                void flushProfileSave();
            }
        });

        window.addEventListener("online", () => {
            if (persistState.mode !== "character") return;
            if (!persistState.dirty) return;
            if (persistState.retryTimer) {
                clearTimeout(persistState.retryTimer);
                persistState.retryTimer = null;
            }
            void flushProfileSave();
        });
    }

    function scheduleProfileSave() {
        if (persistState.mode !== "character" || !persistState.auth) return;
        if (persistState.saveTimer) {
            clearTimeout(persistState.saveTimer);
        }

        persistState.saveTimer = setTimeout(() => {
            persistState.saveTimer = null;
            void flushProfileSave();
        }, 150);
    }

    function scheduleProfileRetry() {
        if (persistState.mode !== "character" || !persistState.auth) return;
        if (persistState.retryTimer) return;
        const backoffMs = Math.min(10000, 600 * (2 ** Math.min(persistState.retryCount, 4)));
        persistState.retryTimer = setTimeout(() => {
            persistState.retryTimer = null;
            void flushProfileSave();
        }, backoffMs);
    }

    async function flushProfileSave() {
        if (persistState.mode !== "character" || !persistState.auth) return;
        if (persistState.saveTimer) {
            clearTimeout(persistState.saveTimer);
            persistState.saveTimer = null;
        }
        if (!persistState.dirty) return;

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
                metaByCategory: skillsState.metaByCategory,
            },
        };

        persistState.inFlight = (async () => {
            try {
                const result = await persistState.auth.updateCharacter?.(character.id, { profile_data: nextProfileData });
                if (!result || result.success !== true) {
                    throw new Error("updateCharacter returned success=false");
                }
                persistState.dirty = false;
                persistState.retryCount = 0;
                if (persistState.retryTimer) {
                    clearTimeout(persistState.retryTimer);
                    persistState.retryTimer = null;
                }
            } catch (error) {
                persistState.dirty = true;
                persistState.retryCount += 1;
                scheduleProfileRetry();
                const now = Date.now();
                if (now - persistState.lastErrorToastAt > 2000) {
                    persistState.lastErrorToastAt = now;
                    updateFeedback("Sync backend en attente (reseau).");
                }
                throw error;
            } finally {
                persistState.inFlight = null;
            }
        })();

        return persistState.inFlight;
    }

    async function persistProfileNow() {
        if (persistState.mode !== "character" || !persistState.auth) return;
        try {
            await flushProfileSave();
        } catch (error) {
            console.error("[Competences] Failed to flush profile save:", error);
            updateFeedback("Erreur sync backend: reessayez.");
        }
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
        const bonusBySkill = getBonusBreakdownBySkill();
        const isLocked = Boolean(skillsState.locksByCategory[category.id]);

        if (!category.skills || !category.skills.length) {
            renderEmptyMessage("Aucune compétence dans cette catégorie");
            return;
        }

        category.skills.forEach((skill) => {
            const allocation = allocations[skill.name] || 0;
            const savedBase = skillsState.baseValuesByCategory[category.id]?.[skill.name];
            const base = savedBase ?? 0;
            const bonusEntry = bonusBySkill[skill.name] || { total: 0, items: 0, nokorah: 0 };
            const bonus = bonusEntry.total || 0;
            const totalValue = base + allocation + bonus;
            const cap = getSkillCap(skill);
            const isMaxed = base + allocation >= cap;
            const isAdminEditMode = skillsState.isAdmin && isCategoryEditMode(category.id);
            const li = document.createElement("li");
            li.className = "skills-line";
            const mainRow = document.createElement("div");
            mainRow.className = "skills-line-main";

            const icon = document.createElement("div");
            icon.className = "skills-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = skill.icon || "";

            const nameWrap = document.createElement("div");
            nameWrap.className = "skills-name-wrap";
            const name = document.createElement("div");
            name.className = "skills-name";
            name.textContent = skill.name;
            nameWrap.append(name);

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

            decBtn.addEventListener("click", (event) => {
                const step = resolveStepFromClick(event);
                adjustSkillPoints(category.id, skill, -step, value, decBtn, incBtn);
            });
            incBtn.addEventListener("click", (event) => {
                const step = resolveStepFromClick(event);
                adjustSkillPoints(category.id, skill, step, value, decBtn, incBtn);
            });

            if (isAdminEditMode) {
                const inline = document.createElement("div");
                inline.className = "skills-admin-inline";

                const nameInput = document.createElement("input");
                nameInput.type = "text";
                nameInput.className = "admin-name";
                nameInput.value = skill.name || "";
                nameInput.placeholder = "Nom";

                const iconInput = document.createElement("input");
                iconInput.type = "text";
                iconInput.className = "admin-icon";
                iconInput.maxLength = 8;
                iconInput.value = String(skill.icon || "");
                iconInput.placeholder = "Icone";

                const baseInput = document.createElement("input");
                baseInput.type = "number";
                baseInput.className = "admin-base";
                baseInput.min = "0";
                baseInput.max = "999";
                baseInput.value = String(base);
                baseInput.placeholder = "Base";

                const capInput = document.createElement("input");
                capInput.type = "number";
                capInput.className = "admin-cap";
                capInput.min = "1";
                capInput.max = "999";
                capInput.value = String(cap);
                capInput.placeholder = "Cap";

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "skills-admin-inline-delete";
                deleteBtn.textContent = "Suppr.";
                deleteBtn.title = "Supprimer la competence";
                deleteBtn.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteInlineSkillEditor(category, skill);
                });

                const commitLine = () => {
                    const draft = {
                        name: nameInput.value,
                        icon: iconInput.value,
                        base: Number(baseInput.value),
                        cap: Number(capInput.value)
                    };
                    const current = {
                        name: String(skill.name || ""),
                        icon: String(skill.icon || ""),
                        base: Number(skillsState.baseValuesByCategory?.[category.id]?.[skill.name] || 0),
                        cap: Number(getSkillCap(skill))
                    };
                    const changed = normalizeSkillName(draft.name) !== normalizeSkillName(current.name)
                        || String(draft.icon).trim() !== String(current.icon).trim()
                        || Number(draft.base) !== Number(current.base)
                        || Number(draft.cap) !== Number(current.cap);
                    if (!changed) return;
                    const result = applySkillAdminEdits(category, skill, draft);
                    if (!result.ok) {
                        renderSkillsCategory(getActiveCategory());
                        return;
                    }
                    renderSkillsCategory(getActiveCategory());
                    updateFeedback(`Competence mise a jour: ${result.finalName}.`);
                    void persistProfileNow();
                };

                [nameInput, iconInput, baseInput, capInput].forEach((input) => {
                    input.addEventListener("keydown", (event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            input.blur();
                        }
                    });
                    input.addEventListener("blur", commitLine);
                });

                inline.append(nameInput, iconInput, baseInput, capInput, deleteBtn);
                nameWrap.replaceChildren(inline);
            }

            controls.append(decBtn, value, incBtn);
            mainRow.append(icon, nameWrap, controls);
            li.append(mainRow);

            bindBonusTooltip(li, {
                natif: base + allocation,
                objets: bonusEntry.items || 0,
                nokorah: bonusEntry.nokorah || 0,
                itemDetails: bonusEntry.itemDetails || [],
                nokorahDetails: bonusEntry.nokorahDetails || []
            });
            li.style.cursor = "help";
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

        const bonusBySkill = getBonusBreakdownBySkill();
        const nextAlloc = allocations[skill.name] || 0;
        const bonus = bonusBySkill[skill.name]?.total || 0;
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
        return getNokorahBonusBreakdown().totals;
    }

    function getNokorahBonusesFromProfile() {
        const character = persistState.auth?.getActiveCharacter?.();
        const list = character?.profile_data?.nokorahBonuses;
        return Array.isArray(list) ? list : [];
    }

    function getNokorahBonusesRawList() {
        const fromProfile = getNokorahBonusesFromProfile();
        if (fromProfile.length) return fromProfile;
        const key = getNokorahStorageKey();
        try {
            const raw = localStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    function getNokorahBonusBreakdown() {
        const totals = {};
        const details = {};
        getNokorahBonusesRawList().forEach((bonus) => {
            const name = bonus?.name;
            const points = Number(bonus?.points) || 0;
            if (!name || points <= 0) return;
            totals[name] = (totals[name] || 0) + points;
            const sourceLabel = String(bonus?.source || bonus?.label || bonus?.origin || "Nokorah").trim() || "Nokorah";
            if (!details[name]) details[name] = [];
            const existing = details[name].find((entry) => entry.label === sourceLabel);
            if (existing) {
                existing.value += points;
            } else {
                details[name].push({ label: sourceLabel, value: points });
            }
        });
        return { totals, details };
    }

    function normalizeStatKey(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
    }

    function safeJson(value) {
        if (!value) return {};
        if (typeof value === "object") return value;
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return {};
            }
        }
        return {};
    }

    function normalizeCatalogItem(item, sourceIndex = null) {
        if (!item) return null;
        const images = safeJson(item.images);
        const primary = images.primary || images.url || item.image || item.image_url || "";
        const modifiers = safeJson(item.modifiers);
        return {
            sourceIndex: Number.isFinite(Number(sourceIndex))
                ? Number(sourceIndex)
                : (Number.isFinite(Number(item.sourceIndex)) ? Number(item.sourceIndex) : null),
            name: item.name || item.nom || "",
            category: item.category || item.categorie || "",
            image: primary || item.image || "",
            images: images,
            effect: item.effect || item.effet || "",
            modifiers: Array.isArray(modifiers) ? modifiers : (Array.isArray(item.modifiers) ? item.modifiers : [])
        };
    }

    async function hydrateItemCatalog() {
        itemCatalog.byName = new Map();
        itemCatalog.byIndex = [];

        const localItems = Array.isArray(window.inventoryData) ? window.inventoryData : [];
        localItems.forEach((entry, index) => {
            const normalized = normalizeCatalogItem(entry, index);
            if (!normalized?.name) return;
            const key = normalizeStatKey(normalized.name);
            itemCatalog.byIndex[index] = normalized;
            if (!itemCatalog.byName.has(key)) {
                itemCatalog.byName.set(key, normalized);
            }
        });

        try {
            const itemsApi = await import("./api/items-service.js");
            const rows = await itemsApi.getAllItems?.();
            if (!Array.isArray(rows)) return;
            rows.forEach((row) => {
                const normalized = normalizeCatalogItem(row, null);
                if (!normalized?.name) return;
                const key = normalizeStatKey(normalized.name);
                const existing = itemCatalog.byName.get(key);
                if (existing) {
                    itemCatalog.byName.set(key, { ...existing, ...normalized });
                    return;
                }
                itemCatalog.byName.set(key, normalized);
            });
        } catch {
            // Optional DB hydration only; local catalog remains available.
        }
    }

    function resolveCatalogItem(itemKey, itemIndex) {
        const numericIndex = Number.isFinite(Number(itemIndex)) ? Number(itemIndex) : null;
        if (numericIndex != null && numericIndex >= 0 && itemCatalog.byIndex[numericIndex]) {
            return itemCatalog.byIndex[numericIndex];
        }
        const targetKey = normalizeStatKey(itemKey);
        if (!targetKey) return null;
        return itemCatalog.byName.get(targetKey) || null;
    }

    function readInventorySnapshotFromLocalStorage() {
        const snapshot = {};
        try {
            const raw = localStorage.getItem("astoriaInventory");
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                if (parsed.equippedSlots || parsed.equipped) {
                    snapshot.equippedSlots = parsed.equippedSlots || parsed.equipped;
                }
                if (Array.isArray(parsed.activeConsumableEffects)) {
                    snapshot.activeConsumableEffects = parsed.activeConsumableEffects;
                }
                if (Array.isArray(parsed.activeEffects)) {
                    snapshot.activeEffects = parsed.activeEffects;
                }
            }
        } catch {
            // ignore fallback parse errors
        }

        if (!snapshot.equippedSlots) {
            try {
                const rawEquipped = localStorage.getItem("astoriaInventoryEquippedSlots");
                if (rawEquipped) {
                    snapshot.equippedSlots = JSON.parse(rawEquipped);
                }
            } catch {
                // ignore fallback parse errors
            }
        }

        return snapshot;
    }

    function getItemBonuses() {
        const tools = window.astoriaItemModifiers;
        if (!tools?.getModifiers) return { totals: {}, details: {} };
        const character = persistState.auth?.getActiveCharacter?.();
        const profileInventory = character?.profile_data?.inventory;
        const fallbackInventory = readInventorySnapshotFromLocalStorage();
        const inventory = profileInventory && typeof profileInventory === "object" ? profileInventory : fallbackInventory;
        const equippedSlots = inventory?.equippedSlots && typeof inventory.equippedSlots === "object"
            ? inventory.equippedSlots
            : {};
        const legacyEquipped = inventory?.equipped && typeof inventory.equipped === "object"
            ? inventory.equipped
            : {};
        const activeConsumables = Array.isArray(inventory?.activeConsumableEffects)
            ? inventory.activeConsumableEffects
            : [];
        const legacyConsumables = Array.isArray(inventory?.activeEffects)
            ? inventory.activeEffects
            : [];

        const skillNameMap = new Map();
        skillsCategories.forEach((category) => {
            (category?.skills || []).forEach((skill) => {
                const key = normalizeStatKey(skill?.name);
                if (!key) return;
                if (!skillNameMap.has(key)) {
                    skillNameMap.set(key, new Set());
                }
                skillNameMap.get(key).add(skill.name);
            });
        });

        const aliases = {
            force: ["force"],
            endurance: ["endurance"],
            agilite: ["agilite"],
            vitesse: ["vitesse"],
            precision: ["precision"],
            resistance: ["resistance"],
            observation: ["observation"],
            charisme: ["charisme"],
            strategie: ["strategiemilitaireavancee"]
        };

        const acc = {};
        const details = {};
        const addDetail = (skillName, label, value) => {
            if (!details[skillName]) details[skillName] = [];
            const sourceLabel = String(label || "Objet").trim() || "Objet";
            const existing = details[skillName].find((entry) => entry.label === sourceLabel);
            if (existing) {
                existing.value += value;
            } else {
                details[skillName].push({ label: sourceLabel, value });
            }
        };

        const applyModifiers = (modifiers, sourceLabel) => {
            (Array.isArray(modifiers) ? modifiers : []).forEach((modifier) => {
                if (!modifier || modifier.type === "percent") return;
                const statKey = normalizeStatKey(modifier.stat);
                const value = Number(modifier.value);
                if (!statKey || !Number.isFinite(value) || value === 0) return;
                const candidateKeys = aliases[statKey] || [statKey];
                const touched = new Set();
                candidateKeys.forEach((candidate) => {
                    const skills = skillNameMap.get(candidate);
                    if (!skills) return;
                    skills.forEach((skillName) => touched.add(skillName));
                });
                touched.forEach((skillName) => {
                    acc[skillName] = (acc[skillName] || 0) + value;
                    addDetail(skillName, sourceLabel, value);
                });
            });
        };

        Object.values({ ...legacyEquipped, ...equippedSlots }).forEach((entry) => {
            if (!entry) return;
            const item = resolveCatalogItem(entry.item_key || entry.name, entry.item_index ?? entry.sourceIndex);
            const sourceLabel = item?.name || entry?.item_key || entry?.name || "Equipement";
            if (!item) return;
            applyModifiers(tools.getModifiers(item), sourceLabel);
        });

        [...legacyConsumables, ...activeConsumables].forEach((entry) => {
            if (!entry) return;
            const sourceLabel = entry?.name || entry?.item_key || "Consommable";
            if (Array.isArray(entry.modifiers)) {
                applyModifiers(entry.modifiers, sourceLabel);
                return;
            }
            const item = resolveCatalogItem(entry.item_key || entry.name, entry.item_index ?? entry.sourceIndex);
            if (!item) return;
            applyModifiers(tools.getModifiers(item), item?.name || sourceLabel);
        });

        return { totals: acc, details };
    }

    function getBonusBreakdownBySkill() {
        const nokorah = getNokorahBonusBreakdown();
        const items = getItemBonuses();
        const keys = new Set([...Object.keys(nokorah.totals), ...Object.keys(items.totals)]);
        const map = {};
        keys.forEach((skill) => {
            const nokorahValue = Number(nokorah.totals[skill]) || 0;
            const itemValue = Number(items.totals[skill]) || 0;
            map[skill] = {
                nokorah: nokorahValue,
                items: itemValue,
                itemDetails: Array.isArray(items.details[skill]) ? items.details[skill] : [],
                nokorahDetails: Array.isArray(nokorah.details[skill]) ? nokorah.details[skill] : [],
                total: nokorahValue + itemValue
            };
        });
        return map;
    }

    function getTotalBonuses() {
        const breakdown = getBonusBreakdownBySkill();
        return Object.keys(breakdown).reduce((acc, skill) => {
            acc[skill] = breakdown[skill].total;
            return acc;
        }, {});
    }

    function ensureBonusTooltip() {
        if (bonusTooltipEl) return bonusTooltipEl;
        bonusTooltipEl = document.createElement("div");
        bonusTooltipEl.className = "skills-bonus-tooltip";
        bonusTooltipEl.hidden = true;
        document.body.appendChild(bonusTooltipEl);
        return bonusTooltipEl;
    }

    function hideBonusTooltip() {
        if (bonusTooltipTimer) {
            clearTimeout(bonusTooltipTimer);
            bonusTooltipTimer = null;
        }
        if (bonusTooltipEl) {
            bonusTooltipEl.hidden = true;
        }
    }

    function escapeTooltipHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatSignedBonus(value) {
        const numeric = Number(value) || 0;
        return `${numeric >= 0 ? "+" : ""}${numeric}`;
    }

    function renderTooltipDetails(entries, emptyLabel) {
        if (!Array.isArray(entries) || !entries.length) {
            return `<li class="skills-bonus-tooltip-empty">${escapeTooltipHtml(emptyLabel)}</li>`;
        }
        return entries
            .map((entry) => `<li><span>${escapeTooltipHtml(entry.label)}</span><strong>${formatSignedBonus(entry.value)}</strong></li>`)
            .join("");
    }

    function showBonusTooltip(mouseX, mouseY, payload) {
        const tooltip = ensureBonusTooltip();
        const natif = Number(payload?.natif) || 0;
        const objets = Number(payload?.objets) || 0;
        const nokorah = Number(payload?.nokorah) || 0;
        const total = natif + objets + nokorah;
        const itemDetails = Array.isArray(payload?.itemDetails) ? payload.itemDetails : [];
        const nokorahDetails = Array.isArray(payload?.nokorahDetails) ? payload.nokorahDetails : [];
        tooltip.innerHTML = `
            <div class="skills-bonus-tooltip-row"><strong>Total bonus</strong><span>${formatSignedBonus(total)}</span></div>
            <div class="skills-bonus-tooltip-row"><strong>Natif</strong><span>${formatSignedBonus(natif)}</span></div>
            <div class="skills-bonus-tooltip-row"><strong>Objets</strong><span>${formatSignedBonus(objets)}</span></div>
            <ul class="skills-bonus-tooltip-list">${renderTooltipDetails(itemDetails, "Aucun bonus objet actif.")}</ul>
            <div class="skills-bonus-tooltip-row"><strong>Nokorah</strong><span>${formatSignedBonus(nokorah)}</span></div>
            <ul class="skills-bonus-tooltip-list">${renderTooltipDetails(nokorahDetails, "Aucun bonus Nokorah actif.")}</ul>
        `;
        // Position tooltip near mouse cursor with offset
        const offset = 15;
        const tooltipWidth = 240;
        const tooltipHeight = tooltip.offsetHeight || 200;

        // Keep tooltip within viewport bounds
        let left = mouseX + offset;
        let top = mouseY + offset;

        if (left + tooltipWidth > window.innerWidth) {
            left = mouseX - tooltipWidth - offset;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = mouseY - tooltipHeight - offset;
        }

        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
        tooltip.style.transform = "none";
        tooltip.hidden = false;
    }

    function bindBonusTooltip(element, payload) {
        if (!element) return;
        let mouseMoveHandler = null;

        element.onmouseenter = (e) => {
            hideBonusTooltip();
            bonusTooltipTimer = setTimeout(() => {
                showBonusTooltip(e.clientX, e.clientY, payload);

                // Track mouse movement to update tooltip position
                mouseMoveHandler = (moveEvent) => {
                    const tooltip = bonusTooltipEl;
                    if (tooltip && !tooltip.hidden) {
                        const offset = 15;
                        const tooltipWidth = 240;
                        const tooltipHeight = tooltip.offsetHeight || 200;

                        let left = moveEvent.clientX + offset;
                        let top = moveEvent.clientY + offset;

                        if (left + tooltipWidth > window.innerWidth) {
                            left = moveEvent.clientX - tooltipWidth - offset;
                        }
                        if (top + tooltipHeight > window.innerHeight) {
                            top = moveEvent.clientY - tooltipHeight - offset;
                        }

                        tooltip.style.left = `${Math.max(8, left)}px`;
                        tooltip.style.top = `${Math.max(8, top)}px`;
                    }
                };
                element.addEventListener('mousemove', mouseMoveHandler);
            }, 1000);
        };
        element.onmouseleave = () => {
            hideBonusTooltip();
            if (mouseMoveHandler) {
                element.removeEventListener('mousemove', mouseMoveHandler);
                mouseMoveHandler = null;
            }
        };
        element.onfocusin = () => {
            hideBonusTooltip();
            bonusTooltipTimer = setTimeout(() => showBonusTooltip(element, payload), 1000);
        };
        element.onfocusout = hideBonusTooltip;
    }

    window.addEventListener("scroll", hideBonusTooltip, true);

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
        refreshEditModeButton();
    }

    // -----------------------------------------------------------------
    // Gestion des points à répartir
    // -----------------------------------------------------------------
    function updateSkillsPointsDisplay() {
        const activeCategory = getActiveCategory();
        if (!activeCategory) return;

        const currentPoints = getCurrentCategoryPoints();
        if (skillsPointsValueEl) {
            skillsPointsValueEl.value = String(currentPoints);
        }
        const hasPoints = currentPoints > 0;
        const isLocked = skillsState.locksByCategory[skillsState.activeCategoryId];
        const bonusBySkill = getBonusBreakdownBySkill();

        if (skillsPointsMinusEl) {
            skillsPointsMinusEl.disabled = !skillsState.isAdmin || !hasPoints || isLocked;
        }
        if (skillsPointsPlusEl) {
            skillsPointsPlusEl.disabled = !skillsState.isAdmin || isLocked;
        }
        const allocations = getCategoryAllocations(activeCategory.id);
        const baseValues = skillsState.baseValuesByCategory[activeCategory.id] || {};
        const hasAllocations = Object.values(allocations).some((value) => Number(value) > 0);
        const hasBaseValues = Object.values(baseValues).some((value) => Number(value) > 0);
        const canReset = skillsState.isAdmin && (hasPoints || hasAllocations || hasBaseValues);
        if (skillsPointsResetEl) {
            skillsPointsResetEl.disabled = !canReset;
        }

        skillsListEl.querySelectorAll(".skills-line").forEach((line) => {
            const nameEl = line.querySelector(".skills-name");
            const adminNameInput = line.querySelector(".skills-admin-inline .admin-name");
            const incBtn = line.querySelector(".skill-point-btn:nth-child(3)");
            const decBtn = line.querySelector(".skill-point-btn:nth-child(1)");
            const valueEl = line.querySelector(".skills-value");
            if (!incBtn || !decBtn) return;
            const skillName = String(nameEl?.textContent || adminNameInput?.value || "").trim();
            if (!skillName) return;
            const skill = activeCategory.skills.find((item) => item.name === skillName);
            if (!skill) return;
            const savedBase = skillsState.baseValuesByCategory[activeCategory.id]?.[skillName];
            const base = savedBase ?? 0;
            const allocation = allocations[skillName] || 0;
            const bonusEntry = bonusBySkill[skillName] || { total: 0, items: 0, nokorah: 0 };
            const bonus = bonusEntry.total || 0;
            const total = base + allocation + bonus;
            const cap = getSkillCap(skill);
            if (valueEl) {
                valueEl.textContent = `${total} / ${cap}`;
            }
            bindBonusTooltip(line, {
                natif: base + allocation,
                objets: bonusEntry.items || 0,
                nokorah: bonusEntry.nokorah || 0,
                itemDetails: bonusEntry.itemDetails || [],
                nokorahDetails: bonusEntry.nokorahDetails || []
            });
            const atMax = base + allocation >= cap;
            decBtn.disabled = allocation <= 0 || skillsState.locksByCategory[activeCategory.id];
            incBtn.disabled = atMax || currentPoints <= 0 || skillsState.locksByCategory[activeCategory.id];
        });

        updatePendingHighlights(activeCategory.id);
    }

    skillsPointsPlusEl.addEventListener("click", (event) => {
        if (!skillsState.isAdmin) return;
        const step = resolveStepFromClick(event);
        const nextValue = Math.min(getCurrentCategoryPoints() + step, 99);
        setCurrentCategoryPoints(nextValue);
        updateSkillsPointsDisplay();
    });

    skillsPointsMinusEl.addEventListener("click", (event) => {
        if (!skillsState.isAdmin) return;
        const current = getCurrentCategoryPoints();
        const step = resolveStepFromClick(event);
        const next = Math.max(0, current - step);
        if (next !== current) {
            setCurrentCategoryPoints(next);
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

        // Force immediate save to database when confirming
        void flushProfileSave();
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

    function updateFeedback(message) {
        announce(message);
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
