// ============================================================================
// Modal de sélection des récompenses - Extension pour quetes.js
// ============================================================================

import { getSupabaseClient } from "./api/supabase-client.js";

// Cette fonction doit être appelée depuis quetes.js après l'initialisation du dom
export function initItemsModal(questesModule) {
    console.log("[Items Modal] Initializing items modal...");
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

    // Charger les items depuis Supabase
    async function loadItems() {
        try {
            const supabase = await getSupabaseClient();

            // Récupérer tous les items de la DB
            const { data: dbItems, error } = await supabase
                .from('items')
                .select('id, name, description, effect, category, price_kaels, price_po, images, enabled')
                .eq('enabled', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('[Items Modal] Error loading items from DB:', error);
                // Fallback sur les items locaux
                const items = window.inventoryData || [];
                state.allItems = items.map(item => ({
                    name: item.name || "",
                    category: item.category || "autre",
                    description: item.description || "",
                    image: item.image || "",
                    price: item.price_kaels || item.price_po || item.sellPrice || item.buyPrice || 0
                }));
                return;
            }

            // Mapper les items de la DB
            state.allItems = (dbItems || []).map(item => {
                const images = item.images || {};
                const image = images.primary || images.url || "";
                return {
                    name: item.name || "",
                    category: item.category || "autre",
                    description: item.description || item.effect || "",
                    image: image,
                    price: item.price_kaels || item.price_po || 0
                };
            });

            // Fusionner avec les items locaux (ceux qui ne sont pas dans la DB)
            const localItems = window.inventoryData || [];
            const dbItemNames = new Set(state.allItems.map(i => i.name.toLowerCase()));

            localItems.forEach(item => {
                const nameKey = (item.name || "").toLowerCase();
                if (nameKey && !dbItemNames.has(nameKey)) {
                    state.allItems.push({
                        name: item.name || "",
                        category: item.category || "autre",
                        description: item.description || "",
                        image: item.image || "",
                        price: item.price_kaels || item.price_po || item.sellPrice || item.buyPrice || 0
                    });
                }
            });

            console.log(`[Items Modal] Loaded ${state.allItems.length} items (${dbItems?.length || 0} from DB, ${state.allItems.length - (dbItems?.length || 0)} from local)`);

        } catch (err) {
            console.error('[Items Modal] Exception loading items:', err);
            // Fallback sur les items locaux
            const items = window.inventoryData || [];
            state.allItems = items.map(item => ({
                name: item.name || "",
                category: item.category || "autre",
                description: item.description || "",
                image: item.image || "",
                price: item.price_kaels || item.price_po || item.sellPrice || item.buyPrice || 0
            }));
        }
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
    async function openModal() {
        console.log("[Items Modal] openModal called");
        if (!modalDom.backdrop) {
            console.error("[Items Modal] Backdrop not found!");
            return;
        }

        console.log("[Items Modal] Loading items...");
        await loadItems();
        console.log("[Items Modal] Items loaded:", state.allItems.length);
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
        console.log("[Items Modal] Initializing trigger button");

        // Supprimer l'ancien listener en clonant
        const newTrigger = dom.rewardTrigger.cloneNode(true);
        dom.rewardTrigger.parentNode.replaceChild(newTrigger, dom.rewardTrigger);

        // Ajouter le nouveau listener qui ouvre le modal
        newTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("[Items Modal] Opening modal");
            openModal();
        });

        // Mettre à jour la référence dans dom (important!)
        dom.rewardTrigger = newTrigger;
    } else {
        console.error("[Items Modal] Trigger button not found!");
    }

    // Retourner l'API publique
    return {
        open: openModal,
        close: closeModal
    };
}
