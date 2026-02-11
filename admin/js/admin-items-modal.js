/**
 * Admin Items Modal - Reusable ItemsModal for admin panel
 * Allows admins to give items to characters
 */

import { ItemsModal } from '../../js/components/ui/index.js';
import { getAllItems } from '../../js/auth.js';
import { getInventoryRows, setInventoryItem } from '../../js/api/inventory-service.js';

export class AdminItemsModal {
    constructor() {
        this.modal = null;
        this.currentCharacterId = null;
        this.onItemsGiven = null;
        this.itemCatalogByNormalizedName = new Map();
        this.itemCatalogLoaded = false;
        this._initPromise = this._init();
    }

    async _init() {
        await this._ensureItemCatalog();

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

    _notify(type, message, fallbackToAlert = false) {
        const safeType = ['success', 'error', 'info', 'warning'].includes(type) ? type : 'info';

        try {
            if (typeof toastManager !== 'undefined' && toastManager && typeof toastManager[safeType] === 'function') {
                toastManager[safeType](message);
                return;
            }
        } catch (_) {
            // Ignore and fallback below.
        }

        if (typeof window !== 'undefined' && window.toastManager && typeof window.toastManager[safeType] === 'function') {
            window.toastManager[safeType](message);
            return;
        }

        if (fallbackToAlert) {
            alert(message);
        }
    }

    _normalizeItemKey(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    async _ensureItemCatalog() {
        if (this.itemCatalogLoaded) return;

        try {
            const items = await getAllItems();
            this.itemCatalogByNormalizedName.clear();

            (items || []).forEach((item, index) => {
                const name = String(item?.name || '').trim();
                const normalized = this._normalizeItemKey(name);
                if (!normalized || this.itemCatalogByNormalizedName.has(normalized)) return;

                this.itemCatalogByNormalizedName.set(normalized, {
                    name,
                    index: Number.isFinite(index) ? index : null,
                });
            });
        } catch (error) {
            console.warn('[Admin Items Modal] Failed to preload item catalog:', error);
        } finally {
            this.itemCatalogLoaded = true;
        }
    }

    async _handleConfirm(selectedItems) {
        const characterId = this.currentCharacterId;

        if (!characterId) {
            this._notify('error', 'Erreur: Aucun personnage selectionne', true);
            return;
        }

        try {
            await this._ensureItemCatalog();

            const currentRows = await getInventoryRows(characterId);
            const rowByNormalizedKey = new Map();

            (currentRows || []).forEach((row) => {
                const normalized = this._normalizeItemKey(row?.item_key);
                if (!normalized || rowByNormalizedKey.has(normalized)) return;
                rowByNormalizedKey.set(normalized, row);
            });

            const updates = [];

            selectedItems.forEach((qty, itemName) => {
                const safeQty = Math.floor(Number(qty) || 0);
                if (safeQty <= 0) return;

                const normalized = this._normalizeItemKey(itemName);
                if (!normalized) return;

                const existingRow = rowByNormalizedKey.get(normalized);
                if (existingRow) {
                    const nextQty = Math.floor(Number(existingRow.qty) || 0) + safeQty;
                    updates.push(
                        setInventoryItem(characterId, String(existingRow.item_key), existingRow.item_index, nextQty)
                    );
                    existingRow.qty = nextQty;
                    return;
                }

                const catalogEntry = this.itemCatalogByNormalizedName.get(normalized);
                const canonicalName = String(catalogEntry?.name || itemName || '').trim();
                if (!canonicalName) return;

                const canonicalIndex = Number.isFinite(catalogEntry?.index) ? catalogEntry.index : null;
                updates.push(setInventoryItem(characterId, canonicalName, canonicalIndex, safeQty));

                rowByNormalizedKey.set(normalized, {
                    item_key: canonicalName,
                    item_index: canonicalIndex,
                    qty: safeQty,
                });
            });

            if (updates.length === 0) {
                this._notify('warning', 'Aucun objet valide a ajouter.', true);
                return;
            }

            await Promise.all(updates);

            const totalUnits = Array.from(selectedItems.values()).reduce((sum, qty) => {
                return sum + Math.max(0, Math.floor(Number(qty) || 0));
            }, 0);
            const uniqueItems = selectedItems.size;
            const unitLabel = totalUnits > 1 ? 'objets' : 'objet';
            const typeLabel = uniqueItems > 1 ? ` (${uniqueItems} types)` : '';
            this._notify('success', `${totalUnits} ${unitLabel} donnes avec succes${typeLabel}!`, true);

            // Callback for UI refresh
            if (this.onItemsGiven) {
                this.onItemsGiven(characterId, selectedItems);
            }

            // Clear selection
            this.modal.clearSelection();

        } catch (error) {
            console.error('[Admin Items Modal] Error giving items:', error);
            this._notify('error', `Erreur: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * Open modal for a specific character
     * @param {string} characterId - Character ID to give items to
     * @param {Function} callback - Optional callback when items are given
     */
    async openForCharacter(characterId, callback = null) {
        if (!characterId) {
            this._notify('error', 'Erreur: Aucun personnage selectionne', true);
            console.error('[Admin Items Modal] No character ID provided');
            return;
        }

        // Wait for initialization to complete
        await this._initPromise;

        if (!this.modal) {
            this._notify('error', 'Erreur: Modal non initialise', true);
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
