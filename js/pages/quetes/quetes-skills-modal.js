/**
 * Quest competence rewards modal
 * Select category counters and assign +X points for quest completion.
 */

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function toArrayCategories() {
    return Array.isArray(window.skillsCategories) ? window.skillsCategories : [];
}

export function initSkillsRewardsModal(questesModule) {
    const { addCompetenceReward } = questesModule || {};

    const dom = {
        backdrop: document.getElementById("questSkillsModalBackdrop"),
        close: document.getElementById("questSkillsModalClose"),
        cancel: document.getElementById("questSkillsModalCancel"),
        confirm: document.getElementById("questSkillsModalConfirm"),
        search: document.getElementById("questSkillsSearch"),
        body: document.getElementById("questSkillsModalBody"),
        selectedCount: document.getElementById("questSkillsSelectedCount"),
        openBtn: document.getElementById("questOpenSkillsModalBtn"),
    };

    if (!dom.backdrop || !dom.body || !dom.openBtn || typeof addCompetenceReward !== "function") {
        console.warn("[Skills Rewards Modal] Missing DOM nodes or addCompetenceReward callback.");
        return { open: () => {}, close: () => {} };
    }

    const state = {
        categories: [],
        selected: new Map(), // categoryId -> { categoryId, categoryLabel, qty }
        query: "",
    };

    function buildCatalog() {
        state.categories = toArrayCategories()
            .map((category) => ({
                categoryId: String(category?.id || "").trim(),
                categoryLabel: String(category?.label || category?.id || "Autre").trim(),
                icon: String(category?.icon || "").trim(),
            }))
            .filter((entry) => entry.categoryId);
    }

    function updateSelectedCount() {
        const selectedCount = state.selected.size;
        if (dom.selectedCount) {
            dom.selectedCount.textContent = `${selectedCount} categorie(s) selectionnee(s)`;
        }
        if (dom.confirm) {
            dom.confirm.disabled = selectedCount === 0;
        }
    }

    function setQty(entry, qty) {
        const safeQty = Math.max(0, Math.min(999, Math.floor(Number(qty) || 0)));
        if (safeQty <= 0) {
            state.selected.delete(entry.categoryId);
        } else {
            state.selected.set(entry.categoryId, {
                categoryId: entry.categoryId,
                categoryLabel: entry.categoryLabel,
                qty: safeQty,
            });
        }
        updateSelectedCount();
    }

    function getFilteredCategories() {
        const q = normalizeText(state.query);
        return state.categories.filter((entry) => {
            if (!q) return true;
            return normalizeText(entry.categoryLabel).includes(q);
        });
    }

    function renderCategories() {
        const rows = getFilteredCategories();
        dom.body.innerHTML = "";

        if (!rows.length) {
            const empty = document.createElement("div");
            empty.className = "modal-empty-state";
            empty.textContent = "Aucune categorie trouvee";
            dom.body.appendChild(empty);
            return;
        }

        rows.forEach((entry) => {
            const selected = state.selected.get(entry.categoryId);
            const qty = Math.max(0, Math.floor(Number(selected?.qty) || 0));

            const row = document.createElement("div");
            row.className = `quest-items-modal-item${qty > 0 ? " selected" : ""}`;

            const thumb = document.createElement("div");
            thumb.className = "quest-items-modal-item-thumb";
            const letter = document.createElement("div");
            letter.className = "quest-items-modal-item-thumb-letter";
            letter.textContent = entry.icon || entry.categoryLabel.charAt(0).toUpperCase();
            thumb.appendChild(letter);

            const info = document.createElement("div");
            info.className = "quest-items-modal-item-info";
            const name = document.createElement("div");
            name.className = "quest-items-modal-item-name";
            name.textContent = entry.categoryLabel;
            const category = document.createElement("div");
            category.className = "quest-items-modal-item-category";
            category.textContent = "Points a repartir";
            const desc = document.createElement("div");
            desc.className = "quest-items-modal-item-desc";
            desc.textContent = "Ajoute des points libres a la validation de quete.";
            info.appendChild(name);
            info.appendChild(category);
            info.appendChild(desc);

            const controls = document.createElement("div");
            controls.className = "quest-items-modal-item-qty";
            const minus = document.createElement("button");
            minus.type = "button";
            minus.className = "quest-items-modal-qty-btn";
            minus.textContent = "-";
            minus.disabled = qty <= 0;
            const input = document.createElement("input");
            input.type = "number";
            input.className = "quest-items-modal-qty-input";
            input.min = "0";
            input.max = "999";
            input.value = String(qty);
            const plus = document.createElement("button");
            plus.type = "button";
            plus.className = "quest-items-modal-qty-btn";
            plus.textContent = "+";

            const applyQty = (next) => {
                setQty(entry, next);
                const value = state.selected.get(entry.categoryId)?.qty || 0;
                input.value = String(value);
                minus.disabled = value <= 0;
                row.classList.toggle("selected", value > 0);
            };

            minus.addEventListener("click", (event) => {
                event.preventDefault();
                applyQty((Number(input.value) || 0) - 1);
            });
            plus.addEventListener("click", (event) => {
                event.preventDefault();
                applyQty((Number(input.value) || 0) + 1);
            });
            input.addEventListener("input", () => applyQty(Number(input.value) || 0));
            input.addEventListener("change", () => applyQty(Number(input.value) || 0));

            controls.append(minus, input, plus);
            row.append(thumb, info, controls);
            dom.body.appendChild(row);
        });
    }

    function open() {
        buildCatalog();
        state.selected.clear();
        state.query = "";
        renderCategories();
        updateSelectedCount();
        if (dom.search) dom.search.value = "";

        if (typeof modalManager !== "undefined") {
            modalManager.open(dom.backdrop, {
                closeOnBackdropClick: true,
                closeOnEsc: true,
                focusElement: dom.search,
                openClass: "open",
            });
        } else {
            dom.backdrop.classList.add("open");
            dom.backdrop.removeAttribute("hidden");
        }
    }

    function close() {
        if (typeof modalManager !== "undefined") {
            modalManager.close(dom.backdrop);
        } else {
            dom.backdrop.classList.remove("open");
            dom.backdrop.setAttribute("hidden", "");
        }
    }

    dom.openBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        open();
    });

    dom.close?.addEventListener("click", close);
    dom.cancel?.addEventListener("click", close);
    dom.search?.addEventListener("input", (event) => {
        state.query = String(event.target?.value || "");
        renderCategories();
    });
    dom.confirm?.addEventListener("click", () => {
        state.selected.forEach((entry) => {
            addCompetenceReward(entry.categoryId, entry.qty, entry.categoryLabel);
        });
        state.selected.clear();
        updateSelectedCount();
        close();
    });

    return { open, close };
}
