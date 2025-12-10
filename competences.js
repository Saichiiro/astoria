(function () {
    const skillsTabsContainer = document.getElementById("skillsTabs");
    const skillsTitleEl = document.getElementById("skillsCategoryTitle");
    const skillsListEl = document.getElementById("skillsList");
    const skillsPointsValueEl = document.getElementById("skillsPointsValue");
    const skillsPointsMinusEl = document.getElementById("skillsPointsMinus");
    const skillsPointsPlusEl = document.getElementById("skillsPointsPlus");
    const skillsPointsResetEl = document.getElementById("skillsPointsReset");
    const skillsConfirmEl = document.getElementById("skillsConfirmBtn");
    const skillsFeedbackEl = document.getElementById("skillsValidationFeedback");

    const skillsCategories = Array.isArray(window.skillsCategories)
        ? window.skillsCategories
        : [];

    const skillsStorageKey = "skillsPointsByCategory";
    const skillsAllocStorageKey = "skillsAllocationsByCategory";

    const skillsState = {
        activeCategoryId: skillsCategories[0]?.id || "",
        pointsByCategory: loadFromStorage(skillsStorageKey),
        allocationsByCategory: loadFromStorage(skillsAllocStorageKey),
        locksByCategory: {},
        isAdmin: document.body.dataset.admin === "true" || !document.body.hasAttribute("data-admin")
    };

    // Placeholder minimal pour l'état de chargement
    addLoadingPlaceholder();

    if (!skillsCategories.length) {
        renderEmptyMessage("Aucune compétence disponible");
        return;
    }

    renderSkillsTabs();
    renderSkillsCategory(getActiveCategory());
    updateSkillsPointsDisplay();
    wireTabsKeyboardNavigation();

    // -----------------------------------------------------------------
    // Helpers de stockage
    // -----------------------------------------------------------------
    function loadFromStorage(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn("Impossible de charger", key, error);
            return {};
        }
    }

    function saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn("Impossible d'enregistrer", key, error);
        }
    }

    // -----------------------------------------------------------------
    // Accès aux données
    // -----------------------------------------------------------------
    function getActiveCategory() {
        return skillsCategories.find((category) => category.id === skillsState.activeCategoryId);
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
        skillsState.pointsByCategory[skillsState.activeCategoryId] = Math.max(0, value);
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
            return;
        }

        skillsTitleEl.textContent = category.label;
        skillsListEl.innerHTML = "";
        const allocations = getCategoryAllocations(category.id);
        const isLocked = Boolean(skillsState.locksByCategory[category.id]);

        if (!category.skills || !category.skills.length) {
            renderEmptyMessage("Aucune compétence dans cette catégorie");
            return;
        }

        category.skills.forEach((skill) => {
            const allocation = allocations[skill.name] || 0;
            const totalValue = (skill.baseValue ?? skill.value ?? 0) + allocation;
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
            decBtn.textContent = "−";
            decBtn.setAttribute("aria-label", `Retirer un point sur ${skill.name}`);
            decBtn.disabled = allocation <= 0 || isLocked;

            const value = document.createElement("span");
            value.className = "skills-value";
            value.textContent = totalValue;

            const incBtn = document.createElement("button");
            incBtn.type = "button";
            incBtn.className = "skill-point-btn";
            incBtn.textContent = "+";
            incBtn.setAttribute("aria-label", `Ajouter un point sur ${skill.name}`);
            incBtn.disabled = getCurrentCategoryPoints() <= 0 || isLocked;

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
    }

    function adjustSkillPoints(categoryId, skill, delta, valueEl, decBtn, incBtn) {
        if (skillsState.locksByCategory[categoryId]) return;

        const allocations = getCategoryAllocations(categoryId);
        const currentAlloc = allocations[skill.name] || 0;
        const available = skillsState.pointsByCategory[categoryId] ?? 0;

        if (delta > 0 && available <= 0) return;
        if (delta < 0 && currentAlloc <= 0) return;

        const nextAlloc = Math.max(0, currentAlloc + delta);
        const base = skill.baseValue ?? skill.value ?? 0;

        allocations[skill.name] = nextAlloc;
        skillsState.pointsByCategory[categoryId] = Math.max(0, available - delta);
        saveToStorage(skillsAllocStorageKey, skillsState.allocationsByCategory);
        saveToStorage(skillsStorageKey, skillsState.pointsByCategory);

        valueEl.textContent = base + nextAlloc;
        decBtn.disabled = nextAlloc <= 0 || skillsState.locksByCategory[categoryId];
        incBtn.disabled = (skillsState.pointsByCategory[categoryId] ?? 0) <= 0 || skillsState.locksByCategory[categoryId];

        updateSkillsPointsDisplay();
    }

    function renderEmptyMessage(message) {
        skillsListEl.innerHTML = "";
        const li = document.createElement("li");
        li.className = "skills-line skills-placeholder";
        li.textContent = message;
        skillsListEl.appendChild(li);
    }

    function addLoadingPlaceholder() {
        if (!skillsListEl) return;
        const li = document.createElement("li");
        li.className = "skills-line skills-placeholder";
        li.textContent = "Chargement...";
        skillsListEl.appendChild(li);
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
        skillsPointsValueEl.textContent = currentPoints;
        const hasPoints = currentPoints > 0;
        const isLocked = skillsState.locksByCategory[skillsState.activeCategoryId];

        skillsPointsMinusEl.disabled = !skillsState.isAdmin || !hasPoints || isLocked;
        skillsPointsPlusEl.disabled = !skillsState.isAdmin || isLocked;
        skillsPointsResetEl.disabled = !hasPoints || isLocked;

        const activeCategory = getActiveCategory();
        if (!activeCategory) return;
        const allocations = getCategoryAllocations(activeCategory.id);

        skillsListEl.querySelectorAll(".skills-line").forEach((line) => {
            const nameEl = line.querySelector(".skills-name");
            const incBtn = line.querySelector(".skill-point-btn:nth-child(3)");
            const decBtn = line.querySelector(".skill-point-btn:nth-child(1)");
            if (!nameEl || !incBtn || !decBtn) return;
            const allocation = allocations[nameEl.textContent] || 0;
            decBtn.disabled = allocation <= 0 || skillsState.locksByCategory[activeCategory.id];
            incBtn.disabled = currentPoints <= 0 || skillsState.locksByCategory[activeCategory.id];
        });
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

    skillsPointsResetEl.addEventListener("click", () => {
        if (skillsState.locksByCategory[skillsState.activeCategoryId]) return;
        setCurrentCategoryPoints(0);
        clearAllocations(skillsState.activeCategoryId);
        renderSkillsCategory(getActiveCategory());
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
        skillsState.locksByCategory[activeCategory.id] = true;
        updateLockState(true);
        renderSkillsCategory(activeCategory);
        announce(`Points verrouillés pour ${activeCategory.label}`);
    });

    function updateLockState(isLocked) {
        skillsConfirmEl.disabled = isLocked;
        if (isLocked) {
            skillsConfirmEl.classList.add("is-locked");
        } else {
            skillsConfirmEl.classList.remove("is-locked");
        }
    }

    function announce(message) {
        if (!skillsFeedbackEl) return;
        skillsFeedbackEl.textContent = message;
    }
})();
