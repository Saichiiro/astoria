/**
 * Admin Items Modal - Reusable ItemsModal for admin panel
 * Allows admins to give items to characters
 */

import { ItemsModal } from '../../js/components/ui/index.js';

export class AdminItemsModal {
    constructor() {
        this.modal = null;
        this.currentCharacterId = null;
        this.onItemsGiven = null;
        this._initPromise = this._init();
    }

    async _init() {
        // Wait for Supabase
        const { getSupabaseClient } = await import('../../js/api/supabase-client.js');
        this.supabase = await getSupabaseClient();

        // Create modal instance
        this.modal = new ItemsModal({
            backdropId: 'adminItemsModalBackdrop',
            title: 'Donner des objets au personnage',
            onConfirm: async (selectedItems) => {
                await this._handleConfirm(selectedItems);
            },
            onCancel: () => {
                this.currentCharacterId = null;
            },
            showPrice: false, // Admin doesn't need prices
            persistSelection: false,
            categories: ['all', 'equipement', 'consommable', 'materiau', 'quete'],
        });

        console.log('[Admin Items Modal] Initialized');
    }

    async _handleConfirm(selectedItems) {
        if (!this.currentCharacterId) {
            alert('Erreur: Aucun personnage sélectionné');
            return;
        }

        try {
            // Get character inventory
            const { data: charData, error: charError } = await this.supabase
                .from('characters')
                .select('inventory')
                .eq('id', this.currentCharacterId)
                .single();

            if (charError) throw charError;

            // Parse current inventory
            let inventory = [];
            try {
                inventory = typeof charData.inventory === 'string'
                    ? JSON.parse(charData.inventory)
                    : (charData.inventory || []);
            } catch (e) {
                console.warn('[Admin Items Modal] Error parsing inventory, using empty array');
                inventory = [];
            }

            // Add each selected item
            selectedItems.forEach((qty, itemName) => {
                // Check if item already exists
                const existingItem = inventory.find(i => i.name === itemName);
                if (existingItem) {
                    existingItem.quantity = (existingItem.quantity || 0) + qty;
                } else {
                    inventory.push({
                        name: itemName,
                        quantity: qty
                    });
                }
            });

            // Update character inventory
            const { error: updateError } = await this.supabase
                .from('characters')
                .update({ inventory: JSON.stringify(inventory) })
                .eq('id', this.currentCharacterId);

            if (updateError) throw updateError;

            // Show success
            alert(`${selectedItems.size} objet(s) donnés avec succès!`);

            // Callback for UI refresh
            if (this.onItemsGiven) {
                this.onItemsGiven(this.currentCharacterId, selectedItems);
            }

            // Clear selection
            this.modal.clearSelection();

        } catch (error) {
            console.error('[Admin Items Modal] Error giving items:', error);
            alert(`Erreur: ${error.message}`);
        }
    }

    /**
     * Open modal for a specific character
     * @param {string} characterId - Character ID to give items to
     * @param {Function} callback - Optional callback when items are given
     */
    async openForCharacter(characterId, callback = null) {
        console.log('[Admin Items Modal] openForCharacter called with:', characterId, typeof characterId);

        if (!characterId) {
            alert('Erreur: Aucun personnage sélectionné');
            console.error('[Admin Items Modal] No character ID provided');
            return;
        }

        // Wait for initialization to complete
        await this._initPromise;

        if (!this.modal) {
            alert('Erreur: Modal non initialisé');
            console.error('[Admin Items Modal] Modal not initialized');
            return;
        }

        this.currentCharacterId = characterId;
        this.onItemsGiven = callback;
        this.modal.open();
    }
}

// Export singleton instance
export const adminItemsModal = new AdminItemsModal();

// Expose globally for onclick handlers in HTML
window.adminItemsModal = adminItemsModal;
