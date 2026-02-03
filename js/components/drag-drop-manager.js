/**
 * DragDropManager - Wrapper SortableJS unifié
 * Gère le drag-and-drop avec validation, animations, et support mobile
 */

class DragDropManager {
    constructor() {
        this.instances = new Map();
        this.hasSortable = typeof Sortable !== 'undefined';

        if (!this.hasSortable) {
            console.warn('[DragDropManager] SortableJS library not loaded!');
        }
    }

    /**
     * Créer une zone de drag-and-drop
     * @param {HTMLElement} element - Element conteneur
     * @param {object} options - Options de configuration
     * @param {string} options.group - Groupe pour partage entre zones (ex: 'equipment')
     * @param {string} options.animation - Durée animation (ms, default: 150)
     * @param {boolean} options.ghostClass - Classe CSS pour l'élément fantôme
     * @param {boolean} options.dragClass - Classe CSS pour l'élément en cours de drag
     * @param {function} options.onAdd - Callback(event) quand élément ajouté
     * @param {function} options.onRemove - Callback(event) quand élément retiré
     * @param {function} options.onUpdate - Callback(event) quand ordre changé
     * @param {function} options.onMove - Callback(event, originalEvent) validation avant move
     * @param {string|function} options.handle - Sélecteur ou fonction pour poignée de drag
     * @param {string|function} options.filter - Sélecteur ou fonction pour éléments non-draggables
     * @param {boolean} options.disabled - Désactiver le drag-and-drop
     * @returns {object|null} - Instance Sortable ou null
     */
    create(element, options = {}) {
        if (!this.hasSortable) {
            console.warn('[DragDropManager] Cannot create - SortableJS not available');
            return null;
        }

        if (!element) {
            console.error('[DragDropManager] No element provided');
            return null;
        }

        // Destroy existing instance if any
        if (this.instances.has(element)) {
            this.destroy(element);
        }

        const config = {
            animation: options.animation ?? 150,
            easing: 'cubic-bezier(1, 0, 0, 1)',
            ghostClass: options.ghostClass ?? 'sortable-ghost',
            dragClass: options.dragClass ?? 'sortable-drag',
            chosenClass: options.chosenClass ?? 'sortable-chosen',
            forceFallback: false, // Use native HTML5 when possible
            fallbackOnBody: true,
            swapThreshold: 0.65,
            invertSwap: false,
            direction: options.direction ?? 'vertical',
            touchStartThreshold: 3, // Mobile touch sensitivity
            delay: options.delay ?? 0,
            delayOnTouchOnly: options.delayOnTouchOnly ?? false,
            disabled: options.disabled ?? false,
        };

        // Group configuration for shared drag-and-drop zones
        if (options.group) {
            config.group = typeof options.group === 'string'
                ? { name: options.group, pull: true, put: true }
                : options.group;
        }

        // Handle configuration
        if (options.handle) {
            config.handle = options.handle;
        }

        // Filter configuration (non-draggable items)
        if (options.filter) {
            config.filter = options.filter;
        }

        // Event callbacks
        if (options.onAdd) {
            config.onAdd = (event) => {
                console.log('[DragDropManager] Item added:', event);
                options.onAdd(event);
            };
        }

        if (options.onRemove) {
            config.onRemove = (event) => {
                console.log('[DragDropManager] Item removed:', event);
                options.onRemove(event);
            };
        }

        if (options.onUpdate) {
            config.onUpdate = (event) => {
                console.log('[DragDropManager] Order updated:', event);
                options.onUpdate(event);
            };
        }

        if (options.onMove) {
            config.onMove = (event, originalEvent) => {
                const allowed = options.onMove(event, originalEvent);
                console.log('[DragDropManager] Move validation:', allowed);
                return allowed;
            };
        }

        if (options.onStart) {
            config.onStart = (event) => {
                console.log('[DragDropManager] Drag started:', event);
                options.onStart(event);
            };
        }

        if (options.onEnd) {
            config.onEnd = (event) => {
                console.log('[DragDropManager] Drag ended:', event);
                options.onEnd(event);
            };
        }

        // Create Sortable instance
        const instance = Sortable.create(element, config);
        this.instances.set(element, instance);

        console.log('[DragDropManager] Created instance for:', element);
        return instance;
    }

    /**
     * Détruire une instance
     * @param {HTMLElement} element - Element conteneur
     */
    destroy(element) {
        const instance = this.instances.get(element);
        if (instance) {
            instance.destroy();
            this.instances.delete(element);
            console.log('[DragDropManager] Destroyed instance for:', element);
        }
    }

    /**
     * Détruire toutes les instances
     */
    destroyAll() {
        this.instances.forEach((instance, element) => {
            instance.destroy();
        });
        this.instances.clear();
        console.log('[DragDropManager] Destroyed all instances');
    }

    /**
     * Obtenir une instance existante
     * @param {HTMLElement} element - Element conteneur
     * @returns {object|null} - Instance Sortable ou null
     */
    get(element) {
        return this.instances.get(element) || null;
    }

    /**
     * Activer/désactiver une instance
     * @param {HTMLElement} element - Element conteneur
     * @param {boolean} enabled - Activer ou désactiver
     */
    setEnabled(element, enabled) {
        const instance = this.instances.get(element);
        if (instance) {
            instance.option('disabled', !enabled);
            console.log('[DragDropManager] Set enabled:', enabled, 'for:', element);
        }
    }

    /**
     * Utilitaire: Validation de slot d'équipement
     * @param {string} itemSlot - Slot de l'item (ex: 'casque', 'boots')
     * @param {string} targetSlot - Slot cible (ex: 'casque', 'boots')
     * @returns {boolean} - true si le slot est valide
     */
    validateEquipmentSlot(itemSlot, targetSlot) {
        // Pour l'instant, on accepte tout
        // Plus tard: itemSlot === targetSlot pour forcer casque → casque seulement
        return true;
    }

    /**
     * Utilitaire: Extraire data-* d'un élément
     * @param {HTMLElement} element - Element
     * @param {string} key - Clé data-* (ex: 'item-id')
     * @returns {string|null} - Valeur ou null
     */
    getData(element, key) {
        if (!element || !element.dataset) return null;
        // Convert 'item-id' to 'itemId' for dataset access
        const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        return element.dataset[camelKey] || null;
    }
}

// Instance globale
const dragDropManager = new DragDropManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dragDropManager;
}
