/**
 * Inventory Items Modal - REFACTORED using reusable ItemsModal component
 * Demonstrates reusing the SAME component with different configuration
 */

import { ItemsModal } from './components/ui/index.js';

/**
 * Initialize items modal for inventory
 */
export function initInventoryItemsModal() {
    console.log('[Inventory Items Modal] Initializing...');

    // Create the modal instance - SAME component, different configuration!
    const itemsModal = new ItemsModal({
        backdropId: 'questItemsModalBackdrop',
        title: 'Ajouter des objets à l\'inventaire',
        onConfirm: (selectedItems) => {
            // Add items to inventory
            selectedItems.forEach((qty, itemName) => {
                if (window.astoriaInventory && window.astoriaInventory.addItemFromExternal) {
                    window.astoriaInventory.addItemFromExternal(itemName, qty);
                } else {
                    console.warn('[Inventory Items Modal] Inventory API not ready');
                }
            });

            // Clear selection after adding
            itemsModal.clearSelection();
        },
        onCancel: () => {
            console.log('[Inventory Items Modal] Cancelled');
        },
        showPrice: false,  // Different from quests modal!
        persistSelection: false,
        categories: ['all', 'equipement', 'consommable', 'materiau'],
    });

    // Connect to inventory's add button (if exists)
    const addButton = document.getElementById('inventoryAddItemBtn');
    if (addButton) {
        addButton.addEventListener('click', () => itemsModal.open());
    }

    // Expose to global scope for inventory script
    window.astoriaItemsModal = {
        open: () => itemsModal.open(),
        close: () => itemsModal.close(),
        getSelection: () => itemsModal.getSelection(),
    };

    console.log('[Inventory Items Modal] Initialized');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInventoryItemsModal);
} else {
    initInventoryItemsModal();
}
