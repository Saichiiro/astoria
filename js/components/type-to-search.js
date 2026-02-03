/**
 * Type-to-Search Component
 *
 * Allows users to start typing anywhere on the page to automatically
 * focus and open the most relevant search field.
 *
 * Priority system:
 * - data-search-priority="modal" (highest) - search bars inside modals
 * - data-search-priority="panel" - search bars in side panels
 * - data-search-priority="page" (lowest) - main page search bars
 *
 * The component automatically detects which search is "active" based on:
 * 1. Whether the parent modal/panel is visible
 * 2. The priority attribute
 *
 * Usage:
 * 1. Add data-search-priority="modal|panel|page" to your .inventory-search containers
 * 2. Include this script on pages with search functionality
 * 3. Users can now just start typing to search!
 */

(function() {
    'use strict';

    const PRIORITY_ORDER = ['modal', 'panel', 'page'];
    const IGNORED_KEYS = ['Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
    const IGNORED_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

    let isEnabled = true;

    /**
     * Check if an element is visible in the DOM
     */
    function isVisible(el) {
        if (!el) return false;

        // Check if element or any parent is hidden
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;

        // Check hidden attribute
        if (el.hidden) return false;

        // Check for modal/backdrop visibility
        const backdrop = el.closest('.codex-admin-backdrop, .modal, [role="dialog"]');
        if (backdrop) {
            // Modal must be open/visible
            if (backdrop.classList.contains('open') ||
                backdrop.getAttribute('aria-hidden') === 'false' ||
                backdrop.style.display === 'flex' ||
                backdrop.style.display === 'block') {
                return true;
            }
            return false;
        }

        return true;
    }

    /**
     * Find all search containers and return the highest priority visible one
     */
    function findActiveSearchContainer() {
        const allSearches = document.querySelectorAll('[data-search-priority]');
        if (!allSearches.length) return null;

        // Group by priority
        const byPriority = {};
        allSearches.forEach(el => {
            const priority = el.dataset.searchPriority || 'page';
            if (!byPriority[priority]) byPriority[priority] = [];
            byPriority[priority].push(el);
        });

        // Find highest priority visible search
        for (const priority of PRIORITY_ORDER) {
            const candidates = byPriority[priority] || [];
            for (const container of candidates) {
                if (isVisible(container)) {
                    return container;
                }
            }
        }

        return null;
    }

    /**
     * Find the input element within a search container
     */
    function findSearchInput(container) {
        if (!container) return null;
        return container.querySelector('input[type="search"], input[type="text"], .inventory-search-input');
    }

    /**
     * Open/expand the search container if needed
     */
    function expandSearch(container) {
        if (!container) return;

        // Add expanded class if the search uses a toggle pattern
        container.classList.add('expanded');

        // Click the toggle button if present and search is collapsed
        const toggle = container.querySelector('.inventory-search-toggle');
        const input = findSearchInput(container);

        if (toggle && input) {
            const inputStyle = window.getComputedStyle(input);
            // If input is hidden/collapsed, click the toggle
            if (inputStyle.width === '0px' || inputStyle.display === 'none' || inputStyle.visibility === 'hidden') {
                toggle.click();
            }
        }
    }

    /**
     * Handle keydown events for type-to-search
     */
    function handleKeyDown(event) {
        if (!isEnabled) return;

        // Ignore if already in an input field
        if (IGNORED_TAGS.includes(document.activeElement?.tagName)) return;

        // Ignore special keys
        if (IGNORED_KEYS.includes(event.key)) return;

        // Ignore if modifier keys are held (except Shift for uppercase)
        if (event.ctrlKey || event.altKey || event.metaKey) return;

        // Only handle printable characters
        if (event.key.length !== 1) return;

        // Find the active search container
        const container = findActiveSearchContainer();
        if (!container) return;

        const input = findSearchInput(container);
        if (!input) return;

        // Expand the search if needed
        expandSearch(container);

        // Focus the input and let the character be typed
        // We use a small delay to ensure the expansion animation has started
        requestAnimationFrame(() => {
            input.focus();
            // The keypress will naturally type the character since we didn't prevent default
        });
    }

    /**
     * Initialize type-to-search
     */
    function init() {
        document.addEventListener('keydown', handleKeyDown);
        console.log('[TypeToSearch] Initialized');
    }

    /**
     * Enable type-to-search
     */
    function enable() {
        isEnabled = true;
    }

    /**
     * Disable type-to-search (useful when showing custom dialogs)
     */
    function disable() {
        isEnabled = false;
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API
    window.astoriaTypeToSearch = {
        enable,
        disable,
        findActiveSearch: findActiveSearchContainer
    };

})();
