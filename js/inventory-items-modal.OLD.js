/**
 * Inventory Items Modal Integration
 * Initializes the items selection modal for the inventory page
 */

import { initItemsModal } from './quetes-items-modal.js';

// Initialize items modal for inventory
document.addEventListener('DOMContentLoaded', () => {
    const itemsModalAPI = initItemsModal({
        dom: {}, // Modal has its own DOM references
        resolveItemByName: (name) => {
            // Optional: resolve item from codex if needed
            return { name };
        },
        addReward: (itemName, quantity) => {
            // Callback to add item to inventory
            if (window.astoriaInventory && window.astoriaInventory.addItemFromExternal) {
                window.astoriaInventory.addItemFromExternal(itemName, quantity);
            } else {
                console.warn('[Inventory Items Modal] Inventory API not ready');
            }
        }
    });

    // Expose to global scope for the inventory script to use
    window.astoriaItemsModal = itemsModalAPI;
    console.log('[Inventory Items Modal] Initialized');
});
