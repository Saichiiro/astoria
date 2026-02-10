/**
 * Inventory Items Modal - REFACTORED using reusable ItemsModal component
 * Demonstrates reusing the SAME component with different configuration
 */

import { ItemsModal } from './components/ui/index.js';

/**
 * Wait for inventory API to be ready
 */
function waitForInventoryAPI() {
    return new Promise((resolve) => {
        if (window.astoriaInventory?.addItemFromExternal) {
            resolve();
            return;
        }

        const checkInterval = setInterval(() => {
            if (window.astoriaInventory?.addItemFromExternal) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('[Inventory Items Modal] Timeout waiting for inventory API');
            resolve();
        }, 10000);
    });
}

/**
 * Initialize items modal for inventory
 */
export async function initInventoryItemsModal() {
    console.log('[Inventory Items Modal] Initializing...');

    // Wait for inventory API to be ready
    await waitForInventoryAPI();
    console.log('[Inventory Items Modal] Inventory API ready');

    // Create the modal instance - SAME component, different configuration!
    const itemsModal = new ItemsModal({
        backdropId: 'questItemsModalBackdrop',
        title: 'Ajouter des objets à l\'inventaire',
        onConfirm: (selectedItems) => {
            // Add items to inventory
            if (!window.astoriaInventory?.addItemFromExternal) {
                console.error('[Inventory Items Modal] Inventory API not available!');
                alert('Erreur: L\'API d\'inventaire n\'est pas disponible. Veuillez recharger la page.');
                return;
            }

            selectedItems.forEach((qty, itemName) => {
                window.astoriaInventory.addItemFromExternal(itemName, qty);
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
    const addButton = document.getElementById('openAddPanel');
    if (addButton) {
        console.log('[Inventory Items Modal] Connecting to openAddPanel button');
        addButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Inventory Items Modal] Opening modal...');
            itemsModal.open();
        });
    } else {
        console.warn('[Inventory Items Modal] openAddPanel button not found!');
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
