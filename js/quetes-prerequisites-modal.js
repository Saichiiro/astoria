// ============================================================================
// Modal de sélection des prérequis (quêtes) - Extension pour quetes.js
// ============================================================================

import { getSupabaseClient } from "./api/supabase-client.js";

// Cette fonction doit être appelée depuis quetes.js après l'initialisation du dom
export function initPrerequisitesModal(questesModule) {
    console.log("[Prerequisites Modal] Initializing prerequisites modal...");
    const { state, renderPrerequisitesList } = questesModule;

    // Créer le modal backdrop et structure
    const backdrop = document.createElement("div");
    backdrop.className = "quest-items-modal-backdrop";
    backdrop.id = "questPrerequisitesModalBackdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");

    const modalHTML = `
        <div class="quest-items-modal" role="dialog" aria-modal="true" aria-labelledby="questPrerequisitesModalTitle">
            <div class="quest-items-modal-header">
                <h3 id="questPrerequisitesModalTitle">Sélectionner des quêtes prérequises</h3>
                <button type="button" class="quest-items-modal-close" id="questPrerequisitesModalClose" aria-label="Fermer">×</button>
            </div>
            <div class="quest-items-modal-search">
                <input type="search" id="questPrerequisitesSearch" placeholder="Rechercher une quête..." class="quest-items-search-input">
            </div>
            <div class="quest-items-modal-body" id="questPrerequisitesModalBody"></div>
            <div class="quest-items-modal-footer">
                <div class="quest-items-modal-count">
                    <span id="questPrerequisitesSelectedCount">0 quête sélectionnée</span>
                </div>
                <div class="quest-items-modal-actions">
                    <button type="button" class="quest-action-btn quest-action-btn--ghost tw-press" id="questPrerequisitesModalCancel">Annuler</button>
                    <button type="button" class="quest-action-btn tw-press" id="questPrerequisitesModalConfirm">Confirmer</button>
                </div>
            </div>
        </div>
    `;

    backdrop.innerHTML = modalHTML;
    document.body.appendChild(backdrop);

    // Éléments du modal
    const modalDom = {
        backdrop: backdrop,
        modal: backdrop.querySelector(".quest-items-modal"),
        title: document.getElementById("questPrerequisitesModalTitle"),
        close: document.getElementById("questPrerequisitesModalClose"),
        search: document.getElementById("questPrerequisitesSearch"),
        body: document.getElementById("questPrerequisitesModalBody"),
        selectedCount: document.getElementById("questPrerequisitesSelectedCount"),
        cancel: document.getElementById("questPrerequisitesModalCancel"),
        confirm: document.getElementById("questPrerequisitesModalConfirm")
    };

    // État du modal
    const modalState = {
        selectedQuests: new Set(), // Set<questId>
        allQuests: []
    };

    // Charger les quêtes depuis Supabase
    async function loadQuests() {
        try {
            const supabase = await getSupabaseClient();

            const { data: quests, error } = await supabase
                .from('quests')
                .select('id, name, type, rank, description')
                .order('name', { ascending: true });

            if (error) {
                console.error('[Prerequisites Modal] Error loading quests:', error);
                modalState.allQuests = [];
                return;
            }

            modalState.allQuests = quests || [];
            console.log(`[Prerequisites Modal] Loaded ${modalState.allQuests.length} quests`);

        } catch (err) {
            console.error('[Prerequisites Modal] Exception loading quests:', err);
            modalState.allQuests = [];
        }
    }

    // Rendre une quête dans le modal
    function renderQuest(quest) {
        const isSelected = modalState.selectedQuests.has(quest.id);

        const questEl = document.createElement("div");
        questEl.className = `quest-items-modal-item${isSelected ? " selected" : ""}`;
        questEl.dataset.questId = quest.id;

        const thumb = document.createElement("div");
        thumb.className = "quest-items-modal-item-thumb";
        thumb.textContent = quest.rank || "?";
        thumb.style.background = "linear-gradient(135deg, #d81b60, #f48fb1)";
        thumb.style.color = "#fff";
        thumb.style.display = "flex";
        thumb.style.alignItems = "center";
        thumb.style.justifyContent = "center";
        thumb.style.fontWeight = "700";
        thumb.style.fontSize = "1.2rem";

        const info = document.createElement("div");
        info.className = "quest-items-modal-item-info";

        const name = document.createElement("div");
        name.className = "quest-items-modal-item-name";
        name.textContent = quest.name || "Sans titre";

        const desc = document.createElement("div");
        desc.className = "quest-items-modal-item-desc";
        desc.textContent = quest.type || "";

        info.appendChild(name);
        info.appendChild(desc);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "quest-items-modal-checkbox";
        checkbox.checked = isSelected;

        questEl.appendChild(thumb);
        questEl.appendChild(info);
        questEl.appendChild(checkbox);

        // Toggle selection
        questEl.addEventListener("click", () => {
            if (modalState.selectedQuests.has(quest.id)) {
                modalState.selectedQuests.delete(quest.id);
            } else {
                modalState.selectedQuests.add(quest.id);
            }
            renderModalBody();
            updateSelectedCount();
        });

        return questEl;
    }

    // Rendre le body du modal
    function renderModalBody() {
        if (!modalDom.body) return;

        const searchTerm = modalDom.search?.value.toLowerCase() || "";
        const filtered = modalState.allQuests.filter(q => {
            const name = (q.name || "").toLowerCase();
            const type = (q.type || "").toLowerCase();
            return name.includes(searchTerm) || type.includes(searchTerm);
        });

        if (filtered.length === 0) {
            modalDom.body.innerHTML = '<div class="quest-items-modal-empty">Aucune quête trouvée</div>';
            return;
        }

        modalDom.body.innerHTML = "";
        filtered.forEach(quest => {
            modalDom.body.appendChild(renderQuest(quest));
        });
    }

    // Mettre à jour le compteur
    function updateSelectedCount() {
        const count = modalState.selectedQuests.size;
        if (modalDom.selectedCount) {
            modalDom.selectedCount.textContent = `${count} quête${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;
        }
    }

    // Ouvrir le modal
    async function openModal() {
        // Charger les items existants en prérequis
        modalState.selectedQuests = new Set(state.currentQuest.prerequisites || []);

        // Charger les quêtes
        await loadQuests();
        renderModalBody();
        updateSelectedCount();

        modalDom.backdrop.hidden = false;
        modalDom.backdrop.setAttribute("aria-hidden", "false");
    }

    // Fermer le modal
    function closeModal() {
        modalDom.backdrop.hidden = true;
        modalDom.backdrop.setAttribute("aria-hidden", "true");
        modalDom.search.value = "";
    }

    // Confirmer la sélection
    function confirmSelection() {
        state.currentQuest.prerequisites = Array.from(modalState.selectedQuests);
        renderPrerequisitesList();
        closeModal();
    }

    // Event listeners
    const openBtn = document.getElementById("questOpenPrerequisitesModalBtn");
    if (openBtn) {
        openBtn.addEventListener("click", openModal);
    }

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
        modalDom.search.addEventListener("input", renderModalBody);
    }

    // Close on backdrop click
    modalDom.backdrop.addEventListener("click", (e) => {
        if (e.target === modalDom.backdrop) {
            closeModal();
        }
    });

    console.log("[Prerequisites Modal] Initialized successfully");
}
