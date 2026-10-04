(function () {
    const helpers = window.astoriaListHelpers || {};

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function debounce(fn, wait) {
        let timerId = null;
        return function (...args) {
            if (timerId) {
                clearTimeout(timerId);
            }
            timerId = setTimeout(() => {
                fn.apply(this, args);
            }, wait);
        };
    }

    function readField(item, field) {
        if (typeof field === 'function') return field(item);
        return item ? item[field] : '';
    }

    function filterItems(items, options) {
        const list = Array.isArray(items) ? items : [];
        const query = normalizeText(options?.query || '');
        const category = options?.category || '';
        const getCategory = options?.getCategory || ((item) => item?.category);
        const fields = Array.isArray(options?.fields) ? options.fields : [];

        let filtered = list;

        if (category) {
            filtered = filtered.filter((item) => String(getCategory(item) || '') === category);
        }

        if (query && fields.length) {
            filtered = filtered.filter((item) =>
                fields.some((field) => normalizeText(readField(item, field) || '').includes(query))
            );
        }

        return filtered;
    }

    function sortItems(items, sortKey, sortDir, sorters) {
        if (!Array.isArray(items) || !sortKey || !sorters || !sorters[sortKey]) {
            return items;
        }

        const dir = sortDir === 'desc' ? -1 : 1;
        const sorter = sorters[sortKey];

        return items.sort((a, b) => {
            const aVal = sorter(a);
            const bVal = sorter(b);
            if (aVal < bVal) return -1 * dir;
            if (aVal > bVal) return 1 * dir;
            return 0;
        });
    }

    helpers.normalizeText = normalizeText;
    helpers.debounce = debounce;
    helpers.filterItems = filterItems;
    helpers.sortItems = sortItems;
    window.astoriaListHelpers = helpers;
})();
