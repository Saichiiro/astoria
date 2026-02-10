/**
 * ItemsModal - Reusable items selection modal component
 * A complete, configurable modal for selecting items with quantities
 */

import { getSupabaseClient } from '../../api/supabase-client.js';
import { showItemDetailsPopover } from '../../item-details-popover.js';
import { ItemCard } from './ItemCard.js';
import { QuantityControl } from './QuantityControl.js';
import { CategoryFilter } from './CategoryFilter.js';

/**
 * Helper to safely parse JSON
 */
function safeJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }
    return {};
}

export class ItemsModal {
    /**
     * Create an items modal instance
     * @param {Object} config - Modal configuration
     * @param {string} config.backdropId - ID of the backdrop element
     * @param {string} config.title - Modal title (default: "Sélectionner des objets")
     * @param {Function} config.onConfirm - Callback when confirmed (selectedItems: Map) => {}
     * @param {Function} config.onCancel - Callback when canceled
     * @param {Function} config.itemFilter - Optional filter function (item) => boolean
     * @param {Array<string>} config.categories - Categories to show (default: all)
     * @param {boolean} config.showPrice - Show item prices (default: true)
     * @param {boolean} config.persistSelection - Keep selection between opens (default: true)
     */
    constructor(config) {
        this.config = {
            backdropId: config.backdropId || 'itemsModalBackdrop',
            title: config.title || 'Sélectionner des objets',
            onConfirm: config.onConfirm || null,
            onCancel: config.onCancel || null,
            itemFilter: config.itemFilter || null,
            categories: config.categories || Object.keys(CategoryFilter.CATEGORIES),
            showPrice: config.showPrice !== false,
            persistSelection: config.persistSelection !== false,
        };

        // State
        this.state = {
            selectedItems: new Map(), // Map<itemName, quantity>
            allItems: [],
            currentCategory: 'all',
            searchQuery: '',
        };

        // DOM references
        this.dom = null;

        // Quantity controls cache
        this.quantityControls = new Map();

        // Initialize
        this._initializeDOM();
        this._setupEventListeners();
    }

    /**
     * Initialize or find DOM elements
     * @private
     */
    _initializeDOM() {
        this.dom = {
            backdrop: document.getElementById(this.config.backdropId),
            modal: null,
            title: null,
            close: null,
            search: null,
            body: null,
            selectedCount: null,
            cancel: null,
            confirm: null,
            categoryFilter: null,
        };

        if (!this.dom.backdrop) {
            console.warn(`[ItemsModal] Backdrop element not found: ${this.config.backdropId}`);
            return;
        }

        // Find modal container within backdrop
        this.dom.modal = this.dom.backdrop.querySelector('.modal-container, .quest-items-modal');
        this.dom.title = this.dom.backdrop.querySelector('.modal-title, .quest-items-modal-title');
        this.dom.close = this.dom.backdrop.querySelector('.modal-close, .quest-items-modal-close');
        this.dom.search = this.dom.backdrop.querySelector('.modal-search-input, .quest-items-search-input');
        this.dom.body = this.dom.backdrop.querySelector('.modal-body, .quest-items-modal-body');
        this.dom.selectedCount = this.dom.backdrop.querySelector('.modal-selected-count, .quest-items-selected-count');
        this.dom.cancel = this.dom.backdrop.querySelector('.modal-cancel, .quest-items-modal-cancel');
        this.dom.confirm = this.dom.backdrop.querySelector('.modal-confirm, .quest-items-modal-confirm');

        // Set title
        if (this.dom.title) {
            this.dom.title.textContent = this.config.title;
        }
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        if (!this.dom.backdrop) return;

        // Close button
        if (this.dom.close) {
            this.dom.close.addEventListener('click', () => this.close());
        }

        // Cancel button
        if (this.dom.cancel) {
            this.dom.cancel.addEventListener('click', () => this.close());
        }

        // Confirm button
        if (this.dom.confirm) {
            this.dom.confirm.addEventListener('click', () => this._handleConfirm());
        }

        // Search input
        if (this.dom.search) {
            this.dom.search.addEventListener('input', (e) => {
                this.state.searchQuery = e.target.value;
                this._renderItems();
            });
        }
    }

    /**
     * Load items from Supabase
     * @private
     */
    async _loadItems() {
        try {
            const supabase = await getSupabaseClient();

            const { data: dbItems, error } = await supabase
                .from('items')
                .select('id, name, description, effect, category, price_kaels, price_po, images, enabled')
                .eq('enabled', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('[ItemsModal] Error loading items:', error);
                this.state.allItems = [];
                return;
            }

            // Map items
            this.state.allItems = (dbItems || []).map(item => {
                const images = safeJson(item.images);
                const image = images.primary || images.url || item.image || item.image_url || '';
                return {
                    name: item.name || '',
                    category: item.category || 'autre',
                    description: item.description || item.effect || '',
                    image: image,
                    price: item.price_kaels || item.price_po || 0,
                    effect: item.effect || '',
                };
            });

            // Apply custom filter if provided
            if (this.config.itemFilter) {
                this.state.allItems = this.state.allItems.filter(this.config.itemFilter);
            }

            console.log(`[ItemsModal] Loaded ${this.state.allItems.length} items`);
        } catch (err) {
            console.error('[ItemsModal] Exception loading items:', err);
            this.state.allItems = [];
        }
    }

    /**
     * Render all items in the modal body
     * @private
     */
    _renderItems() {
        if (!this.dom.body) return;

        this.dom.body.innerHTML = '';
        this.quantityControls.clear();

        const query = this.state.searchQuery.toLowerCase().trim();

        // Filter by category
        let filtered = this.state.currentCategory === 'all'
            ? this.state.allItems
            : this.state.allItems.filter(item => item.category === this.state.currentCategory);

        // Filter by search
        if (query) {
            filtered = filtered.filter(item => {
                const name = item.name.toLowerCase();
                const category = item.category.toLowerCase();
                const desc = (item.description || '').toLowerCase();
                return name.includes(query) || category.includes(query) || desc.includes(query);
            });
        }

        // Empty state
        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'modal-empty-state';
            empty.textContent = 'Aucun objet trouvé';
            this.dom.body.appendChild(empty);
            return;
        }

        // Render each item
        filtered.forEach(item => {
            const itemRow = this._renderItemRow(item);
            this.dom.body.appendChild(itemRow);
        });
    }

    /**
     * Render a single item row
     * @private
     */
    _renderItemRow(item) {
        const row = document.createElement('div');
        row.className = 'quest-items-modal-item';

        // Item card
        const card = ItemCard.create(item, {
            onMoreClick: (item, btn) => showItemDetailsPopover(item, btn),
            showPrice: this.config.showPrice,
            className: this.state.selectedItems.has(item.name) ? 'selected' : '',
        });

        // Quantity control
        const quantity = this.state.selectedItems.get(item.name) || 0;
        const qtyControl = QuantityControl.create({
            value: quantity,
            onChange: (newQty) => this._handleQuantityChange(item.name, newQty, card),
            className: 'quest-items-modal-item-qty',
        });

        this.quantityControls.set(item.name, qtyControl);

        row.appendChild(card);
        row.appendChild(qtyControl.element);

        return row;
    }

    /**
     * Handle quantity change
     * @private
     */
    _handleQuantityChange(itemName, quantity, cardElement) {
        if (quantity > 0) {
            this.state.selectedItems.set(itemName, quantity);
            ItemCard.setSelected(cardElement, true);
        } else {
            this.state.selectedItems.delete(itemName);
            ItemCard.setSelected(cardElement, false);
        }

        this._updateSelectedCount();
    }

    /**
     * Update selected count display
     * @private
     */
    _updateSelectedCount() {
        const count = this.state.selectedItems.size;

        if (this.dom.selectedCount) {
            this.dom.selectedCount.textContent = `${count} objet(s) sélectionné(s)`;
        }

        if (this.dom.confirm) {
            this.dom.confirm.disabled = count === 0;
        }
    }

    /**
     * Handle confirm button
     * @private
     */
    _handleConfirm() {
        if (this.config.onConfirm) {
            this.config.onConfirm(new Map(this.state.selectedItems));
        }

        if (!this.config.persistSelection) {
            this.state.selectedItems.clear();
        }

        this.close();
    }

    /**
     * Open the modal
     */
    async open() {
        if (!this.dom.backdrop) {
            console.error('[ItemsModal] Cannot open: backdrop not found');
            return;
        }

        // Load items
        await this._loadItems();

        // Reset category and search
        this.state.currentCategory = 'all';
        this.state.searchQuery = '';

        if (this.dom.search) {
            this.dom.search.value = '';
        }

        // Render category filter if not already present
        const existingCategoryFilter = this.dom.backdrop.querySelector('.quest-items-modal-categories');
        if (existingCategoryFilter) {
            // Use existing HTML category buttons
            this._setupExistingCategoryButtons(existingCategoryFilter);
        }

        // Render items
        this._renderItems();
        this._updateSelectedCount();

        // Open modal using modalManager
        if (typeof modalManager !== 'undefined') {
            modalManager.open(this.dom.backdrop, {
                closeOnBackdropClick: true,
                closeOnEsc: true,
                focusElement: this.dom.search,
                openClass: 'open',
                onClose: () => {
                    if (this.config.onCancel) {
                        this.config.onCancel();
                    }
                },
            });
        } else {
            // Fallback: manual open
            this.dom.backdrop.classList.add('open');
        }
    }

    /**
     * Setup existing category buttons from HTML
     * @private
     */
    _setupExistingCategoryButtons(container) {
        const buttons = container.querySelectorAll('.quest-items-category-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.state.currentCategory = category;

                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this._renderItems();
            });
        });
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.dom.backdrop) return;

        if (typeof modalManager !== 'undefined') {
            modalManager.close(this.dom.backdrop);
        } else {
            // Fallback: manual close
            this.dom.backdrop.classList.remove('open');
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.state.selectedItems.clear();
        this._updateSelectedCount();
        this._renderItems();
    }

    /**
     * Get selected items
     * @returns {Map<string, number>} Map of item names to quantities
     */
    getSelection() {
        return new Map(this.state.selectedItems);
    }

    /**
     * Set selected items programmatically
     * @param {Map<string, number>} items - Map of item names to quantities
     */
    setSelection(items) {
        this.state.selectedItems = new Map(items);
        this._updateSelectedCount();
        if (this.dom.body && this.dom.body.children.length > 0) {
            this._renderItems();
        }
    }
}
