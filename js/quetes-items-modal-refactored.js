/**
 * Quest Items Modal - REFACTORED VERSION using reusable ItemsModal component
 * This is the NEW way - no code duplication!
 */

import { ItemsModal } from './components/ui/index.js';

/**
 * Initialize the items modal for quests page
 * @param {Object} questesModule - The quests module interface
 * @param {Function} questesModule.addReward - Function to add reward to quest
 * @returns {Object} Modal API { open, close }
 */
export function initItemsModal(questesModule) {
    console.log("[Items Modal] Initializing items modal...");
    const { addReward } = questesModule;

    // Create the modal instance using our reusable component!
    const itemsModal = new ItemsModal({
        backdropId: 'questItemsModalBackdrop',
        title: 'Sélectionner des récompenses',
        onConfirm: (selectedItems) => {
            // Add each selected item to the quest
            selectedItems.forEach((qty, itemName) => {
                if (qty > 0) {
                    addReward(itemName, qty);
                }
            });

            // Clear selection after adding
            itemsModal.clearSelection();
        },
        onCancel: () => {
            console.log('[Items Modal] Cancelled');
        },
        showPrice: true,
        persistSelection: false,  // Don't persist for quests
        categories: ['all', 'agricole', 'consommable', 'equipement', 'materiau', 'quete', 'monnaie'],
    });

    // Connect the open button
    const openModalBtn = document.getElementById("questOpenItemsModalBtn");
    if (openModalBtn) {
        console.log("[Items Modal] Connecting open button");
        openModalBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            itemsModal.open();
        });
    } else {
        console.error("[Items Modal] Open button not found!");
    }

    // Return the API
    return {
        open: () => itemsModal.open(),
        close: () => itemsModal.close(),
        getSelection: () => itemsModal.getSelection(),
        clearSelection: () => itemsModal.clearSelection(),
    };
}

/**
 * Comparison:
 *
 * OLD WAY (quetes-items-modal.js):
 * - 400 lines of code
 * - Duplicated in inventory-items-modal.js
 * - Hard to maintain
 * - Inconsistent between pages
 *
 * NEW WAY (this file):
 * - 60 lines of code
 * - Reuses ItemsModal component
 * - Easy to maintain
 * - Consistent everywhere
 * - Single source of truth
 */
