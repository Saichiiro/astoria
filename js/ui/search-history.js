(function () {
    const helpers = window.astoriaSearchHistory || {};

    // Using StorageManager instead of localStorage
    async function readStorage(key) {
        try {
            const data = await storageManager.get(key);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.warn('[SearchHistory] Read error:', error);
            return [];
        }
    }

    async function writeStorage(key, items) {
        try {
            await storageManager.set(key, items);
        } catch (error) {
            console.warn('[SearchHistory] Write error:', error);
        }
    }

    function createSearchHistory(options) {
        const storageKey = options?.storageKey || "astoriaRecentSearches";
        const maxItems = Number.isFinite(options?.maxItems) ? options.maxItems : 5;
        const minLength = Number.isFinite(options?.minLength) ? options.minLength : 2;

        async function get() {
            return await readStorage(storageKey);
        }

        async function save(query) {
            const value = String(query || "").trim();
            if (!value || value.length < minLength) return;

            let items = await readStorage(storageKey);
            items = items.filter((item) => item !== value);
            items.unshift(value);
            items = items.slice(0, maxItems);
            await writeStorage(storageKey, items);
        }

        async function clear() {
            try {
                await storageManager.remove(storageKey);
            } catch (error) {
                console.warn('[SearchHistory] Clear error:', error);
            }
        }

        return { get, save, clear };
    }

    function renderDropdown(container, items, options) {
        if (!container) return;
        container.innerHTML = "";

        const onSelect = options?.onSelect;
        const onClear = options?.onClear;
        const itemClass = options?.itemClass || "recent-search-item";
        const clearClass = options?.clearClass || "recent-search-item recent-search-item--clear";
        const clearLabel = options?.clearLabel || "Clear recent searches";

        (items || []).forEach((query) => {
            const item = document.createElement("div");
            item.className = itemClass;
            item.textContent = query;
            item.onmousedown = (event) => {
                event.preventDefault();
                if (typeof onSelect === "function") {
                    onSelect(query);
                }
            };
            container.appendChild(item);
        });

        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = clearClass;
        clearButton.textContent = clearLabel;
        clearButton.onmousedown = (event) => {
            event.preventDefault();
            if (typeof onClear === "function") {
                onClear();
            }
        };
        container.appendChild(clearButton);
    }

    helpers.createSearchHistory = createSearchHistory;
    helpers.renderDropdown = renderDropdown;
    window.astoriaSearchHistory = helpers;
})();
