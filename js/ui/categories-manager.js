// ============================================================================
// Categories Manager - Centralized category management for all pages
// ============================================================================
// Auto-updates all category dropdowns and filters across the app

import { getCategories, getCategoriesMap } from '../api/categories-service.js';

let categoriesCache = null;
let categoriesMapCache = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get categories (cached)
 * @returns {Promise<Array>} Categories array
 */
async function getCategoriesCached() {
    const now = Date.now();
    if (categoriesCache && (now - lastFetch) < CACHE_DURATION) {
        return categoriesCache;
    }

    try {
        categoriesCache = await getCategories();
        categoriesMapCache = await getCategoriesMap();
        lastFetch = now;
        return categoriesCache;
    } catch (error) {
        console.error('[Categories Manager] Failed to load categories:', error);
        // Fallback to hardcoded
        return getHardcodedCategories();
    }
}

/**
 * Hardcoded fallback categories
 */
function getHardcodedCategories() {
    return [
        { slug: 'agricole', name: 'Agricole', icon: '🌾', is_active: true, display_order: 1 },
        { slug: 'consommable', name: 'Consommable', icon: '🧪', is_active: true, display_order: 2 },
        { slug: 'equipement', name: 'Équipement', icon: '⚔️', is_active: true, display_order: 3 },
        { slug: 'materiau', name: 'Matériaux', icon: '⚒️', is_active: true, display_order: 4 },
        { slug: 'quete', name: 'Quêtes', icon: '✨', is_active: true, display_order: 5 }
    ];
}

/**
 * Populate a <select> dropdown with categories
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {Object} options - Configuration options
 */
export async function populateCategorySelect(selectElement, options = {}) {
    if (!selectElement) return;

    const {
        includeAll = true,
        allLabel = 'Toutes catégories',
        allValue = 'all',
        selectedValue = '',
        showIcons = true
    } = options;

    const categories = await getCategoriesCached();

    // Clear existing options
    selectElement.innerHTML = '';

    // Add "all" option
    if (includeAll) {
        const allOption = document.createElement('option');
        allOption.value = allValue;
        allOption.textContent = showIcons ? `📦 ${allLabel}` : allLabel;
        selectElement.appendChild(allOption);
    }

    // Add category options
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.slug;
        option.textContent = showIcons && cat.icon ? `${cat.icon} ${cat.name}` : cat.name;
        selectElement.appendChild(option);
    });

    // Set selected value
    if (selectedValue) {
        selectElement.value = selectedValue;
    }

    console.log(`[Categories Manager] Populated select with ${categories.length} categories`);
}

/**
 * Render category filter buttons
 * @param {HTMLElement} containerElement - Container to render buttons into
 * @param {Object} options - Configuration options
 */
export async function renderCategoryButtons(containerElement, options = {}) {
    if (!containerElement) return;

    const {
        includeAll = true,
        allLabel = 'Tous',
        activeCategory = 'all',
        onCategoryChange = () => {},
        buttonClass = 'category-btn',
        activeClass = 'active'
    } = options;

    const categories = await getCategoriesCached();

    containerElement.innerHTML = '';

    // Add "all" button
    if (includeAll) {
        const btn = createCategoryButton('all', allLabel, '📦', activeCategory === 'all', buttonClass, activeClass);
        btn.addEventListener('click', () => onCategoryChange('all'));
        containerElement.appendChild(btn);
    }

    // Add category buttons
    categories.forEach(cat => {
        const btn = createCategoryButton(cat.slug, cat.name, cat.icon, activeCategory === cat.slug, buttonClass, activeClass);
        btn.addEventListener('click', () => onCategoryChange(cat.slug));
        containerElement.appendChild(btn);
    });

    console.log(`[Categories Manager] Rendered ${categories.length} category buttons`);
}

/**
 * Create a category button element
 */
function createCategoryButton(slug, name, icon, isActive, buttonClass, activeClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = buttonClass + (isActive ? ` ${activeClass}` : '');
    btn.dataset.category = slug;

    if (icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'category-icon';
        iconSpan.textContent = icon;
        btn.appendChild(iconSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'category-label';
    labelSpan.textContent = name;
    btn.appendChild(labelSpan);

    return btn;
}

/**
 * Get category info by slug
 * @param {string} slug - Category slug
 * @returns {Promise<Object|null>} Category object or null
 */
export async function getCategoryInfo(slug) {
    const categories = await getCategoriesCached();
    return categories.find(cat => cat.slug === slug) || null;
}

/**
 * Get category name by slug
 * @param {string} slug - Category slug
 * @returns {Promise<string>} Category name
 */
export async function getCategoryName(slug) {
    if (slug === 'all') return 'Toutes catégories';

    const cat = await getCategoryInfo(slug);
    return cat?.name || slug;
}

/**
 * Get category icon by slug
 * @param {string} slug - Category slug
 * @returns {Promise<string>} Category icon
 */
export async function getCategoryIcon(slug) {
    if (slug === 'all') return '📦';

    const cat = await getCategoryInfo(slug);
    return cat?.icon || '';
}

/**
 * Force refresh categories from database
 */
export async function refreshCategories() {
    lastFetch = 0;
    return await getCategoriesCached();
}

/**
 * Initialize category system on a page
 * Automatically finds and populates all category selects and buttons
 */
export async function initCategoriesOnPage() {
    // Auto-populate all selects with data-category-select attribute
    const selects = document.querySelectorAll('select[data-category-select]');
    for (const select of selects) {
        await populateCategorySelect(select, {
            includeAll: select.dataset.includeAll !== 'false',
            showIcons: select.dataset.showIcons !== 'false',
            selectedValue: select.value || select.dataset.defaultValue || ''
        });
    }

    console.log(`[Categories Manager] Initialized ${selects.length} category selects on page`);
}
