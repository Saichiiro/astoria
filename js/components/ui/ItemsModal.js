/**
 * ItemsModal - Reusable items selection modal component
 * A complete, configurable modal for selecting items with quantities
 */

import { getSupabaseClient } from '../../api/supabase-client.js';
import { showItemDetailsPopover } from '../../item-details-popover.js';

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
     * @param {string} config.title - Modal title (default: "Selectionner des objets")
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
            title: config.title || 'Selectionner des objets',
            onConfirm: config.onConfirm || null,
            onCancel: config.onCancel || null,
            itemFilter: config.itemFilter || null,
            categories: config.categories || ['all', 'agricole', 'consommable', 'equipement', 'materiau', 'quete', 'monnaie'],
            showPrice: config.showPrice !== false,
            persistSelection: config.persistSelection !== false,
        };

        // State
        this.state = {
            selectedItems: new Map(), // Map<itemName, quantity>
            allItems: [],
            currentCategory: 'all',
            searchQuery: '',
            isSubmitting: false,
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
        this.dom.title = this.dom.backdrop.querySelector('.modal-title, .quest-items-modal-title, #questItemsModalTitle');
        this.dom.close = this.dom.backdrop.querySelector('.modal-close, .quest-items-modal-close, #questItemsModalClose');
        this.dom.search = this.dom.backdrop.querySelector('.modal-search-input, .quest-items-search-input, #questItemsSearch');
        this.dom.body = this.dom.backdrop.querySelector('.modal-body, .quest-items-modal-body, #questItemsModalBody');
        this.dom.selectedCount = this.dom.backdrop.querySelector('.modal-selected-count, .quest-items-selected-count, #questItemsSelectedCount');
        this.dom.cancel = this.dom.backdrop.querySelector('#questItemsModalCancel, .quest-items-modal-btn--cancel');
        this.dom.confirm = this.dom.backdrop.querySelector('#questItemsModalConfirm, .quest-items-modal-btn--confirm');

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
            empty.textContent = 'Aucun objet trouve';
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
        const quantity = this.state.selectedItems.get(item.name) || 0;
        const isSelected = quantity > 0;
        const firstLetter = item.name ? item.name[0].toUpperCase() : '?';

        const itemEl = document.createElement('div');
        itemEl.className = `quest-items-modal-item${isSelected ? ' selected' : ''}`;
        itemEl.dataset.itemName = item.name;

        // Thumbnail
        const thumb = document.createElement('div');
        thumb.className = 'quest-items-modal-item-thumb';
        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.loading = 'lazy';
            thumb.appendChild(img);
        } else {
            const letter = document.createElement('div');
            letter.className = 'quest-items-modal-item-thumb-letter';
            letter.textContent = firstLetter;
            thumb.appendChild(letter);
        }

        // Info section
        const info = document.createElement('div');
        info.className = 'quest-items-modal-item-info';

        const name = document.createElement('div');
        name.className = 'quest-items-modal-item-name';
        name.textContent = item.name;
        name.title = item.name;

        const category = document.createElement('div');
        category.className = 'quest-items-modal-item-category';
        category.textContent = item.category;

        const descContainer = document.createElement('div');
        descContainer.className = 'quest-items-modal-item-desc-container';

        const desc = document.createElement('div');
        desc.className = 'quest-items-modal-item-desc';
        desc.textContent = item.description || 'Aucune description disponible';

        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'quest-items-modal-more-btn';
        moreBtn.textContent = 'Plus';
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showItemDetailsPopover(item, moreBtn);
        });

        descContainer.appendChild(desc);
        descContainer.appendChild(moreBtn);

        info.appendChild(name);
        info.appendChild(category);
        if (item.description) {
            info.appendChild(descContainer);
        }

        if (this.config.showPrice && item.price > 0) {
            const price = document.createElement('div');
            price.className = 'quest-items-modal-item-price';
            price.textContent = `${item.price} kaels`;
            info.appendChild(price);
        }

        // Quantity controls
        const qtyControls = document.createElement('div');
        qtyControls.className = 'quest-items-modal-item-qty';

        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.className = 'quest-items-modal-qty-btn';
        minusBtn.textContent = '-';
        minusBtn.disabled = quantity <= 0;

        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'quest-items-modal-qty-input';
        qtyInput.min = '0';
        qtyInput.max = '999';
        qtyInput.value = quantity;

        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.className = 'quest-items-modal-qty-btn';
        plusBtn.textContent = '+';

        qtyControls.appendChild(minusBtn);
        qtyControls.appendChild(qtyInput);
        qtyControls.appendChild(plusBtn);

        itemEl.appendChild(thumb);
        itemEl.appendChild(info);
        itemEl.appendChild(qtyControls);

        // Quantity change handler
        const updateQuantity = (newQty) => {
            const qty = Math.max(0, Math.min(999, newQty));
            qtyInput.value = qty;
            minusBtn.disabled = qty <= 0;

            if (qty > 0) {
                this.state.selectedItems.set(item.name, qty);
                itemEl.classList.add('selected');
            } else {
                this.state.selectedItems.delete(item.name);
                itemEl.classList.remove('selected');
            }
            this._updateSelectedCount();
        };

        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(qtyInput.value || 0) - 1);
        });

        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(qtyInput.value || 0) + 1);
        });

        qtyInput.addEventListener('input', (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(e.target.value || 0));
        });

        qtyInput.addEventListener('change', (e) => {
            e.stopPropagation();
            updateQuantity(parseInt(e.target.value || 0));
        });

        return itemEl;
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
            this.dom.confirm.disabled = count === 0 || this.state.isSubmitting;
        }
    }

    /**
     * Handle confirm button
     * @private
     */
    async _handleConfirm() {
        if (this.state.isSubmitting) return;

        this.state.isSubmitting = true;
        this._updateSelectedCount();

        try {
            if (this.config.onConfirm) {
                await Promise.resolve(this.config.onConfirm(new Map(this.state.selectedItems)));
            }

            if (!this.config.persistSelection) {
                this.state.selectedItems.clear();
            }

            this.close();
        } catch (error) {
            console.error('[ItemsModal] Confirm action failed:', error);
        } finally {
            this.state.isSubmitting = false;
            this._updateSelectedCount();
        }
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
