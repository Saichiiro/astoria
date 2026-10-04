/**
 * CategoryFilter - Reusable category filter component
 * Creates a horizontal category filter bar with icons
 */

export class CategoryFilter {
    /**
     * Category definitions with icons
     */
    static CATEGORIES = {
        all: { icon: '📦', label: 'Tous' },
        agricole: { icon: '🌾', label: 'Agricole' },
        consommable: { icon: '🧪', label: 'Consommables' },
        equipement: { icon: '⚔️', label: 'Équipements' },
        materiau: { icon: '⚒️', label: 'Matériaux' },
        quete: { icon: '✨', label: 'Quêtes' },
        monnaie: { icon: '💰', label: 'Monnaies' },
    };

    /**
     * Create a category filter bar
     * @param {Object} options - Configuration options
     * @param {Array<string>} options.categories - Categories to display (default: all)
     * @param {string} options.activeCategory - Initially active category (default: 'all')
     * @param {Function} options.onChange - Callback when category changes (category) => {}
     * @param {string} options.className - Additional CSS classes
     * @returns {Object} { element: HTMLElement, setActive: Function, getActive: Function }
     */
    static create(options = {}) {
        const {
            categories = Object.keys(CategoryFilter.CATEGORIES),
            activeCategory = 'all',
            onChange = null,
            className = '',
        } = options;

        const container = document.createElement('div');
        container.className = `category-filter ${className}`;

        let currentCategory = activeCategory;
        const buttons = new Map();

        // Create buttons for each category
        categories.forEach(categoryKey => {
            const categoryDef = CategoryFilter.CATEGORIES[categoryKey] || {
                icon: '📌',
                label: categoryKey,
            };

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'category-btn tw-press';
            btn.dataset.category = categoryKey;
            btn.setAttribute('aria-pressed', categoryKey === currentCategory);

            if (categoryKey === currentCategory) {
                btn.classList.add('active');
            }

            // Icon
            const icon = document.createElement('span');
            icon.className = 'category-icon';
            icon.textContent = categoryDef.icon;

            // Label
            const label = document.createElement('span');
            label.className = 'category-label';
            label.textContent = categoryDef.label;

            btn.appendChild(icon);
            btn.appendChild(label);

            btn.addEventListener('click', () => {
                // Update active state
                buttons.forEach((b, key) => {
                    b.classList.toggle('active', key === categoryKey);
                    b.setAttribute('aria-pressed', key === categoryKey);
                });

                currentCategory = categoryKey;

                if (onChange) {
                    onChange(categoryKey);
                }
            });

            buttons.set(categoryKey, btn);
            container.appendChild(btn);
        });

        // Public API
        return {
            element: container,
            setActive: (categoryKey) => {
                if (!buttons.has(categoryKey)) return;

                buttons.forEach((btn, key) => {
                    btn.classList.toggle('active', key === categoryKey);
                    btn.setAttribute('aria-pressed', key === categoryKey);
                });

                currentCategory = categoryKey;
            },
            getActive: () => currentCategory,
        };
    }

    /**
     * Add a custom category definition
     * @param {string} key - Category key
     * @param {string} icon - Category icon (emoji)
     * @param {string} label - Category label
     */
    static addCategory(key, icon, label) {
        CategoryFilter.CATEGORIES[key] = { icon, label };
    }
}
