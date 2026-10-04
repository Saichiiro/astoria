/**
 * ItemCard - Reusable item card component
 * Creates a consistent item display card used across the application
 */

export class ItemCard {
    /**
     * Create an item card element
     * @param {Object} item - Item data
     * @param {string} item.name - Item name
     * @param {string} item.category - Item category
     * @param {string} item.description - Item description
     * @param {string} item.image - Item image URL
     * @param {number} item.price - Item price in kaels
     * @param {string} item.effect - Item effect description
     * @param {Object} options - Configuration options
     * @param {Function} options.onMoreClick - Callback when "Plus" button is clicked
     * @param {boolean} options.showPrice - Show price (default: true)
     * @param {boolean} options.showCategory - Show category (default: true)
     * @param {boolean} options.showMore - Show "Plus" button (default: true)
     * @param {string} options.className - Additional CSS classes
     * @returns {HTMLElement} The item card element
     */
    static create(item, options = {}) {
        const {
            onMoreClick = null,
            showPrice = true,
            showCategory = true,
            showMore = true,
            className = '',
        } = options;

        const itemEl = document.createElement('div');
        itemEl.className = `item-card ${className}`;
        itemEl.dataset.itemName = item.name;

        // Thumbnail
        const thumb = ItemCard._createThumbnail(item);

        // Info section
        const info = ItemCard._createInfo(item, {
            showPrice,
            showCategory,
            showMore,
            onMoreClick,
        });

        itemEl.appendChild(thumb);
        itemEl.appendChild(info);

        return itemEl;
    }

    /**
     * Create thumbnail element
     * @private
     */
    static _createThumbnail(item) {
        const thumb = document.createElement('div');
        thumb.className = 'item-card-thumb';

        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.loading = 'lazy';
            thumb.appendChild(img);
        } else {
            const firstLetter = item.name ? item.name[0].toUpperCase() : '?';
            const letter = document.createElement('div');
            letter.className = 'item-card-thumb-letter';
            letter.textContent = firstLetter;
            thumb.appendChild(letter);
        }

        return thumb;
    }

    /**
     * Create info section
     * @private
     */
    static _createInfo(item, options) {
        const info = document.createElement('div');
        info.className = 'item-card-info';

        // Name
        const name = document.createElement('div');
        name.className = 'item-card-name';
        name.textContent = item.name;
        name.title = item.name;
        info.appendChild(name);

        // Category
        if (options.showCategory) {
            const category = document.createElement('div');
            category.className = 'item-card-category';
            category.textContent = item.category || 'Autre';
            info.appendChild(category);
        }

        // Description container with "Plus" button
        if (item.description) {
            const descContainer = document.createElement('div');
            descContainer.className = 'item-card-desc-container';

            const desc = document.createElement('div');
            desc.className = 'item-card-desc';
            desc.textContent = item.description || 'Aucune description disponible';
            descContainer.appendChild(desc);

            if (options.showMore) {
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'item-card-more-btn';
                moreBtn.textContent = 'Plus';

                if (options.onMoreClick) {
                    moreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        options.onMoreClick(item, moreBtn);
                    });
                }

                descContainer.appendChild(moreBtn);
            }

            info.appendChild(descContainer);
        }

        // Price
        if (options.showPrice && item.price > 0) {
            const price = document.createElement('div');
            price.className = 'item-card-price';
            price.textContent = `${item.price} kaels`;
            info.appendChild(price);
        }

        return info;
    }

    /**
     * Update an existing item card's selected state
     * @param {HTMLElement} cardElement - The card element
     * @param {boolean} isSelected - Whether the card is selected
     */
    static setSelected(cardElement, isSelected) {
        if (!cardElement) return;
        cardElement.classList.toggle('selected', isSelected);
    }
}
