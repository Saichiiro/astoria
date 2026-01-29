// ============================================================================
// Modal de sélection des récompenses - Extension pour quetes.js
// ============================================================================

// Cette fonction doit être appelée depuis quetes.js après l'initialisation du dom
export function initItemsModal(questesModule) {
    const { dom, resolveItemByName } = questesModule;

    // Éléments du modal
    const modalDom = {
        backdrop: document.getElementById("questItemsModalBackdrop"),
        modal: document.querySelector(".quest-items-modal"),
        title: document.getElementById("questItemsModalTitle"),
        close: document.getElementById("questItemsModalClose"),
        search: document.getElementById("questItemsSearch"),
        body: document.getElementById("questItemsModalBody"),
        selectedCount: document.getElementById("questItemsSelectedCount"),
        cancel: document.getElementById("questItemsModalCancel"),
        confirm: document.getElementById("questItemsModalConfirm")
    };

    // État du modal
    const state = {
        selectedItems: new Set(),
        allItems: []
    };

    // Initialiser les items depuis le codex
    function loadItems() {
        // Récupérer tous les items depuis inventoryData (codex)
        const items = window.inventoryData || [];
        state.allItems = items.map(item => ({
            name: item.name || "",
            category: item.category || "autre",
            description: item.description || "",
            image: item.image || "",
            price: item.price_kaels || item.sellPrice || item.buyPrice || 0
        }));
    }

    // Rendre un item dans le modal
    function renderItem(item) {
        const isSelected = state.selectedItems.has(item.name);
        const firstLetter = item.name ? item.name[0].toUpperCase() : "?";

        const itemEl = document.createElement("div");
        itemEl.className = `quest-items-modal-item${isSelected ? " selected" : ""}`;
        itemEl.dataset.itemName = item.name;

        const checkbox = document.createElement("div");
        checkbox.className = "quest-items-modal-item-checkbox";

        const thumb = document.createElement("div");
        thumb.className = "quest-items-modal-item-thumb";
        if (item.image) {
            const img = document.createElement("img");
            img.src = item.image;
            img.alt = item.name;
            img.loading = "lazy";
            thumb.appendChild(img);
        } else {
            const letter = document.createElement("div");
            letter.className = "quest-items-modal-item-thumb-letter";
            letter.textContent = firstLetter;
            thumb.appendChild(letter);
        }

        const info = document.createElement("div");
        info.className = "quest-items-modal-item-info";

        const name = document.createElement("div");
        name.className = "quest-items-modal-item-name";
        name.textContent = item.name;
        name.title = item.name;

        const category = document.createElement("div");
        category.className = "quest-items-modal-item-category";
        category.textContent = item.category;

        const desc = document.createElement("div");
        desc.className = "quest-items-modal-item-desc";
        desc.textContent = item.description || "Aucune description disponible";

        info.appendChild(name);
        info.appendChild(category);
        if (item.description) {
            info.appendChild(desc);
        }

        if (item.price > 0) {
            const price = document.createElement("div");
            price.className = "quest-items-modal-item-price";
            price.textContent = `${item.price} kaels`;
            info.appendChild(price);
        }

        itemEl.appendChild(checkbox);
        itemEl.appendChild(thumb);
        itemEl.appendChild(info);

        // Click pour sélectionner/désélectionner
        itemEl.addEventListener("click", () => {
            if (state.selectedItems.has(item.name)) {
                state.selectedItems.delete(item.name);
                itemEl.classList.remove("selected");
            } else {
                state.selectedItems.add(item.name);
                itemEl.classList.add("selected");
            }
            updateSelectedCount();
        });

        return itemEl;
    }

    // Mettre à jour le compteur d'items sélectionnés
    function updateSelectedCount() {
        const count = state.selectedItems.size;
        if (modalDom.selectedCount) {
            modalDom.selectedCount.textContent = `${count} objet(s) sélectionné(s)`;
        }
        if (modalDom.confirm) {
            modalDom.confirm.disabled = count === 0;
        }
    }

    // Filtrer et rendre les items
    function renderItems(searchQuery = "") {
        if (!modalDom.body) return;

        modalDom.body.innerHTML = "";
        const query = searchQuery.toLowerCase().trim();

        const filtered = query
            ? state.allItems.filter(item => {
                const name = item.name.toLowerCase();
                const category = item.category.toLowerCase();
                const desc = item.description.toLowerCase();
                return name.includes(query) || category.includes(query) || desc.includes(query);
            })
            : state.allItems;

        if (filtered.length === 0) {
            const empty = document.createElement("div");
            empty.style.gridColumn = "1 / -1";
            empty.style.textAlign = "center";
            empty.style.padding = "40px 20px";
            empty.style.color = "rgba(76, 58, 99, 0.6)";
            empty.textContent = "Aucun objet trouvé";
            modalDom.body.appendChild(empty);
            return;
        }

        filtered.forEach(item => {
            const itemEl = renderItem(item);
            modalDom.body.appendChild(itemEl);
        });
    }

    // Ouvrir le modal
    function openModal() {
        if (!modalDom.backdrop) return;

        loadItems();
        state.selectedItems.clear();
        renderItems();
        updateSelectedCount();

        if (modalDom.search) {
            modalDom.search.value = "";
        }

        modalDom.backdrop.hidden = false;
        modalDom.backdrop.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    // Fermer le modal
    function closeModal() {
        if (!modalDom.backdrop) return;

        modalDom.backdrop.hidden = true;
        modalDom.backdrop.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        state.selectedItems.clear();
    }

    // Confirmer et ajouter les récompenses
    function confirmSelection() {
        const selected = Array.from(state.selectedItems);

        // Pour chaque item sélectionné, l'ajouter comme récompense
        selected.forEach(itemName => {
            // Simuler un clic sur le bouton d'ajout de récompense
            // en remplissant d'abord le champ de sélection
            if (dom.rewardSelect) {
                dom.rewardSelect.value = itemName;
            }

            // Déclencher l'ajout de la récompense
            if (dom.addRewardBtn) {
                dom.addRewardBtn.click();
            }
        });

        closeModal();
    }

    // Event listeners
    if (modalDom.close) {
        modalDom.close.addEventListener("click", closeModal);
    }

    if (modalDom.cancel) {
        modalDom.cancel.addEventListener("click", closeModal);
    }

    if (modalDom.confirm) {
        modalDom.confirm.addEventListener("click", confirmSelection);
    }

    if (modalDom.search) {
        modalDom.search.addEventListener("input", (e) => {
            renderItems(e.target.value);
        });
    }

    if (modalDom.backdrop) {
        modalDom.backdrop.addEventListener("click", (e) => {
            if (e.target === modalDom.backdrop) {
                closeModal();
            }
        });
    }

    // Escape pour fermer
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modalDom.backdrop.hidden) {
            closeModal();
        }
    });

    // Remplacer le comportement du bouton trigger
    if (dom.rewardTrigger) {
        // Supprimer l'ancien listener
        const newTrigger = dom.rewardTrigger.cloneNode(true);
        dom.rewardTrigger.parentNode.replaceChild(newTrigger, dom.rewardTrigger);
        dom.rewardTrigger = newTrigger;

        // Ajouter le nouveau listener qui ouvre le modal
        newTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });
    }

    // Retourner l'API publique
    return {
        open: openModal,
        close: closeModal
    };
}
