/**
 * FilterBar — reusable filter state manager.
 *
 * Binds to existing DOM elements (selects, toggle buttons).
 * Manages state, fires onChange, exposes getState / setState / reset / destroy.
 *
 * Does NOT handle the search input — that stays with astoriaSearchBar (history, toggle UI).
 * Feed search changes into the FilterBar via setState({ search: value }).
 *
 * Usage:
 *   import { createFilterBar, itemMatchesFilters, sortItemsBy, normalizeFilter } from "./FilterBar.js";
 *
 *   const bar = createFilterBar({
 *     filters: [
 *       { id: "type",     type: "select", el: dom.typeFilter,   default: "all" },
 *       { id: "status",   type: "select", el: dom.statusFilter, default: "all" },
 *       { id: "sort",     type: "select", el: dom.sortFilter,   default: "default" },
 *       { id: "myQuests", type: "toggle", el: dom.myQuestsBtn,  default: false,
 *                         labels: ["Toutes", "Mes quêtes"] },
 *     ],
 *     onChange: (filters) => { ... }
 *   });
 */

/**
 * Normalize a string for accent-insensitive search comparison.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeFilter(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Create a FilterBar bound to existing DOM elements.
 *
 * @param {Object} options
 * @param {Array<FilterDef>} options.filters
 * @param {function(Object): void} [options.onChange]
 * @returns {{ getState, setState, reset, destroy }}
 *
 * @typedef {Object} FilterDef
 * @property {string} id             - key in the returned state object
 * @property {"select"|"toggle"}type - control type
 * @property {HTMLElement} [el]      - DOM element to bind (optional — can be added later via setState)
 * @property {*} [default]           - initial value (default "all" for select, false for toggle)
 * @property {string[]} [labels]     - [inactiveLabel, activeLabel] for toggle buttons
 */
export function createFilterBar({ filters = [], onChange } = {}) {
    const state = {};
    const teardowns = [];

    for (const def of filters) {
        const fallback = def.type === 'toggle' ? false : 'all';
        state[def.id] = def.default ?? fallback;

        if (!def.el) continue;

        if (def.type === 'select') {
            def.el.value = String(state[def.id]);
            const handler = () => {
                state[def.id] = def.el.value;
                onChange?.({ ...state });
            };
            def.el.addEventListener('change', handler);
            teardowns.push(() => def.el.removeEventListener('change', handler));
        }

        if (def.type === 'toggle') {
            _syncToggle(def.el, state[def.id], def.labels);
            const handler = () => {
                state[def.id] = !state[def.id];
                _syncToggle(def.el, state[def.id], def.labels);
                onChange?.({ ...state });
            };
            def.el.addEventListener('click', handler);
            teardowns.push(() => def.el.removeEventListener('click', handler));
        }
    }

    function _syncToggle(el, active, labels) {
        el.setAttribute('aria-pressed', String(active));
        el.classList.toggle('is-active', active);
        if (labels) el.textContent = active ? (labels[1] ?? labels[0]) : labels[0];
    }

    return {
        /** Current filter values (shallow copy). */
        getState() {
            return { ...state };
        },

        /**
         * Programmatically update one or more filters (also syncs DOM).
         * Does NOT fire onChange.
         * @param {Object} partial
         */
        setState(partial) {
            for (const def of filters) {
                if (!(def.id in partial)) continue;
                state[def.id] = partial[def.id];
                if (!def.el) continue;
                if (def.type === 'select') def.el.value = String(state[def.id]);
                if (def.type === 'toggle') _syncToggle(def.el, state[def.id], def.labels);
            }
        },

        /** Reset all filters to their defaults and fire onChange. */
        reset() {
            for (const def of filters) {
                const fallback = def.type === 'toggle' ? false : 'all';
                state[def.id] = def.default ?? fallback;
                if (!def.el) continue;
                if (def.type === 'select') def.el.value = String(state[def.id]);
                if (def.type === 'toggle') _syncToggle(def.el, state[def.id], def.labels);
            }
            onChange?.({ ...state });
        },

        /** Remove all event listeners. */
        destroy() {
            teardowns.forEach((fn) => fn());
            teardowns.length = 0;
        },
    };
}

/**
 * Test whether an item passes all active filters.
 *
 * @param {Object} item
 * @param {Object} filterState      - from filterBar.getState()
 * @param {Array<MatcherDef>} matchers
 * @returns {boolean}
 *
 * @typedef {Object} MatcherDef
 * @property {string} id               - filter state key
 * @property {function(Object, *): boolean} match - (item, filterValue) => passes
 */
export function itemMatchesFilters(item, filterState, matchers) {
    if (!item) return false;
    for (const { id, match } of matchers) {
        if (!match(item, filterState[id])) return false;
    }
    return true;
}

/**
 * Sort an array by the active sort value using a sorters map.
 * Returns a new array — does not mutate the original.
 *
 * @param {Array} items
 * @param {string} sortValue
 * @param {Object.<string, function(*, *): number>} sorters
 * @returns {Array}
 */
export function sortItemsBy(items, sortValue, sorters) {
    const sorter = sorters?.[sortValue];
    if (!sorter) return items;
    return [...items].sort(sorter);
}
