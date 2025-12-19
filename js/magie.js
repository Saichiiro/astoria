(function () {
    const STORAGE_KEY = "magicSheetPages";
    const body = document.body;
    const isAdmin = body.dataset.admin === "true" || !body.hasAttribute("data-admin");

    const navButtons = Array.from(document.querySelectorAll(".magic-nav-btn"));
    const sections = Array.from(document.querySelectorAll(".magic-section"));
    const capacityList = document.getElementById("magicCapacityList");
    const capacityFilter = document.getElementById("magicCapacityFilter");
    const addCapacityBtn = document.getElementById("magicAddCapacityBtn");
    const adminSection = document.getElementById("magic-admin");
    const pageTabs = document.getElementById("magicPageTabs");
    const addPageBtn = document.getElementById("magicAddPageBtn");
    const formFields = Array.from(
        document.querySelectorAll(".magic-content input[id], .magic-content textarea[id], .magic-content select[id]")
    );

    let pages = [];
    let activePageIndex = 0;
    let activeSection = "magic-summary";

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

    function saveToStorage() {
        const payload = {
            pages,
            activePageIndex,
            activeSection
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function loadFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY);
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

    function setActivePage(index) {
        if (index < 0 || index >= pages.length) return;
        saveCurrentPage();
        activePageIndex = index;
        applyFormFields(pages[activePageIndex].fields || {});
        setActiveSection(activeSection);
        renderCapacities(capacityFilter ? capacityFilter.value : "");
        renderPageTabs();
        saveToStorage();
    }

    function saveCurrentPage() {
        if (!pages[activePageIndex]) return;
        pages[activePageIndex].fields = readFormFields();
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
        saveToStorage();
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
            alert("Ajout de capacités à venir (placeholder). Le backend définira la sauvegarde JSON.");
        });
    }

    if (addPageBtn) {
        addPageBtn.addEventListener("click", handleAddPage);
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
    saveToStorage();
})();
