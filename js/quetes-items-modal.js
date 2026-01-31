// ============================================================================
// Modal de sélection des récompenses - Extension pour quetes.js
// ============================================================================

import { getSupabaseClient } from "./api/supabase-client.js";
import { showItemDetailsPopover } from "./item-details-popover.js";

// Helper pour parser JSON de façon safe
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

// Cette fonction doit être appelée depuis quetes.js après l'initialisation du dom
export function initItemsModal(questesModule) {
    console.log("[Items Modal] Initializing items modal...");
    const { dom, resolveItemByName, addReward } = questesModule;

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
        confirm: document.getElementById("questItemsModalConfirm"),
        categoryButtons: document.querySelectorAll(".quest-items-category-btn")
    };

    // État du modal
    const state = {
        selectedItems: new Map(), // Map<itemName, quantity>
        allItems: [],
        currentCategory: 'all'
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
                state.allItems = [];
                return;
            }

            // Mapper les items de la DB
            state.allItems = (dbItems || []).map(item => {
                const images = safeJson(item.images);
                const image = images.primary || images.url || item.image || item.image_url || "";
                return {
                    name: item.name || "",
                    category: item.category || "autre",
                    description: item.description || item.effect || "",
                    image: image,
                    price: item.price_kaels || item.price_po || 0,
                    effect: item.effect || ""
                };
            });

            console.log(`[Items Modal] Loaded ${state.allItems.length} items from DB`);

        } catch (err) {
            console.error('[Items Modal] Exception loading items:', err);
            state.allItems = [];
        }
    }

    // Rendre un item dans le modal
    function renderItem(item) {
        const quantity = state.selectedItems.get(item.name) || 0;
        const isSelected = quantity > 0;
        const firstLetter = item.name ? item.name[0].toUpperCase() : "?";

        const itemEl = document.createElement("div");
        itemEl.className = `quest-items-modal-item${isSelected ? " selected" : ""}`;
        itemEl.dataset.itemName = item.name;

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

        const descContainer = document.createElement("div");
        descContainer.className = "quest-items-modal-item-desc-container";

        const desc = document.createElement("div");
        desc.className = "quest-items-modal-item-desc";
        desc.textContent = item.description || "Aucune description disponible";

        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "quest-items-modal-more-btn";
        moreBtn.textContent = "Plus";

        descContainer.appendChild(desc);
        descContainer.appendChild(moreBtn);

        info.appendChild(name);
        info.appendChild(category);
        if (item.description) {
            info.appendChild(descContainer);
        }

        if (item.price > 0) {
            const price = document.createElement("div");
            price.className = "quest-items-modal-item-price";
            price.textContent = `${item.price} kaels`;
            info.appendChild(price);
        }

        // Click sur Plus pour voir détails complets
        moreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            showItemDetailsPopover(item, moreBtn);
        });

        // Contrôles de quantité (style compétences)
        const qtyControls = document.createElement("div");
        qtyControls.className = "quest-items-modal-item-qty";

        const minusBtn = document.createElement("button");
        minusBtn.type = "button";
        minusBtn.className = "quest-items-modal-qty-btn";
        minusBtn.textContent = "-";
        minusBtn.disabled = quantity <= 0;

        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.className = "quest-items-modal-qty-input";
        qtyInput.min = "0";
        qtyInput.max = "999";
        qtyInput.value = quantity;

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.className = "quest-items-modal-qty-btn";
        plusBtn.textContent = "+";

        qtyControls.appendChild(minusBtn);
        qtyControls.appendChild(qtyInput);
        qtyControls.appendChild(plusBtn);

        itemEl.appendChild(thumb);
        itemEl.appendChild(info);
        itemEl.appendChild(qtyControls);

        // Fonction pour mettre à jour la quantité
        function updateQuantity(newQty) {
            const qty = Math.max(0, Math.min(999, newQty));
            qtyInput.value = qty;
            minusBtn.disabled = qty <= 0;

            if (qty > 0) {
                state.selectedItems.set(item.name, qty);
                itemEl.classList.add("selected");
            } else {
                state.selectedItems.delete(item.name);
                itemEl.classList.remove("selected");
            }
            updateSelectedCount();
        }

        // Event listeners
        minusBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(qtyInput.value || 0) - 1);
        });

        plusBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(qtyInput.value || 0) + 1);
        });

        qtyInput.addEventListener("input", (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(e.target.value || 0));
        });

        qtyInput.addEventListener("change", (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(e.target.value || 0));
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

        // Filtrer par catégorie d'abord
        let filtered = state.currentCategory === 'all'
            ? state.allItems
            : state.allItems.filter(item => item.category === state.currentCategory);

        // Puis filtrer par recherche si nécessaire
        if (query) {
            filtered = filtered.filter(item => {
                const name = item.name.toLowerCase();
                const category = item.category.toLowerCase();
                const desc = item.description.toLowerCase();
                return name.includes(query) || category.includes(query) || desc.includes(query);
            });
        }

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

        // Réinitialiser la catégorie à "Tous"
        state.currentCategory = 'all';
        if (modalDom.categoryButtons) {
            modalDom.categoryButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === 'all');
            });
        }

        // Ne PAS clear les selectedItems ici - persistence des quantités entre ouvertures
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
        // Ne PAS clear - persistence des quantités entre ouvertures
    }

    // Confirmer et ajouter les récompenses
    function confirmSelection() {
        // Pour chaque item sélectionné avec sa quantité
        state.selectedItems.forEach((qty, itemName) => {
            if (qty > 0) {
                addReward(itemName, qty);
            }
        });

        // Clear les sélections après ajout
        state.selectedItems.clear();
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

    // Event listeners pour les boutons de catégories
    if (modalDom.categoryButtons) {
        modalDom.categoryButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const category = btn.dataset.category;
                state.currentCategory = category;

                // Mettre à jour l'état actif des boutons
                modalDom.categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Re-rendre avec le filtre de catégorie
                renderItems(modalDom.search?.value || "");
            });
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

    // Connecter le bouton d'ouverture du modal
    const openModalBtn = document.getElementById("questOpenItemsModalBtn");
    if (openModalBtn) {
        console.log("[Items Modal] Initializing open modal button");
        openModalBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("[Items Modal] Opening modal");
            openModal();
        });
    } else {
        console.error("[Items Modal] Open modal button not found!");
    }

    // Retourner l'API publique
    return {
        open: openModal,
        close: closeModal
    };
}
