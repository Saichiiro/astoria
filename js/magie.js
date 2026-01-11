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
            locked: false
        },
        {
            id: "cap-support",
            name: "Chant de synchronisation",
            type: "soutien",
            rank: "majeur",
            stats: ["Social", "Pouvoirs"],
            rp: "Une mélodie résonne entre meister et arme, renforçant leur lien.",
            effect: "Octroie un bonus temporaire aux actions coordonnées meister/arme.",
            cost: "Nécessite concentration et temps de préparation.",
            limits: "Interrompu si le lanceur subit des dégâts importants.",
            adminNote: "",
            locked: false
        }
    ];

    const createDefaultPage = () => ({
        fields: readFormFields(),
        capacities: defaultCapacities.map((cap) => ({
            ...cap,
            stats: Array.isArray(cap.stats) ? [...cap.stats] : []
        }))
    });

    function buildStorageKey(key) {
        return key === "default" ? STORAGE_KEY_BASE : `${STORAGE_KEY_BASE}-${key}`;
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
            stats: Array.isArray(cap.stats) ? [...cap.stats] : []
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
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "magic-page-tab" + (index === activePageIndex ? " magic-page-tab--active" : "");
            tab.textContent = String(index + 1);
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
        alice: "Alice"
    };

    function renderPagesOverview() {
        if (!pagesOverview) return;
        pagesOverview.innerHTML = "";
        if (!pages.length) {
            pagesOverview.textContent = "Aucune magie disponible.";
            return;
        }

        pages.forEach((page, index) => {
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
                    stats: Array.isArray(cap.stats) ? [...cap.stats] : []
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

        capacityList.innerHTML = "";

        capacities
            .filter((cap) => !filterType || cap.type === filterType)
            .forEach((cap) => {
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
        capSaveBtn.addEventListener("click", () => {
            const newCap = buildCapacityFromForm();
            if (!newCap) {
                alert("Ajoutez un nom pour la capacite.");
                return;
            }
            if (!pages[activePageIndex]) return;
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

        if (sanitizeCapacityText()) {
            saveToStorage();
        }

        normalizeActiveSection();
        applyFormFields(pages[activePageIndex].fields || {});
        setActiveSection(activeSection);
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        renderPageTabs();
        renderPagesOverview();
        saveToStorage();
        markSaved();
    })();
})();
