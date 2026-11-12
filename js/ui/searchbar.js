(function () {
    const api = window.astoriaSearchBar || {};
    const listHelpers = window.astoriaListHelpers || {};
    const debounce = listHelpers.debounce || ((fn) => fn);

    function isEditableTarget(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    function bindSearchBar(options) {
        const root = options?.root;
        if (!root) return null;

        const input = options.input || root.querySelector('input');
        const toggle = options.toggle || root.querySelector('[data-search-toggle]');
        let clearButton = options.clearButton || root.querySelector('[data-search-clear]');

        // Same behaviour and same look on every page, whatever the page markup provides:
        // no autofill/keyboard noise, a "Search" key on phones, one clear button.
        if (input) {
            if (!input.hasAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
            if (!input.hasAttribute('enterkeyhint')) input.setAttribute('enterkeyhint', 'search');
            if (!input.hasAttribute('aria-label') && input.placeholder) input.setAttribute('aria-label', input.placeholder.replace(/\.{3}$/, ''));
            if (!clearButton) {
                clearButton = document.createElement('button');
                clearButton.type = 'button';
                clearButton.className = 'inventory-search-clear tw-press';
                clearButton.setAttribute('aria-label', 'Effacer la recherche');
                clearButton.textContent = 'x';
                clearButton.hidden = true;
                input.insertAdjacentElement('afterend', clearButton);
            }
        }
        const dropdown = options.dropdown || root.querySelector('[data-search-history]');
        const history = options.history || null;
        const onSearch = typeof options.onSearch === 'function' ? options.onSearch : null;
        const openClass = options.openClass || 'is-open';
        const debounceWait = Number.isFinite(options.debounceWait) ? options.debounceWait : 200;
        const closeDelay = Number.isFinite(options.closeDelay) ? options.closeDelay : 150;
        const collapseWhenEmpty = options.collapseWhenEmpty !== false;
        const openOnFocus = options.openOnFocus !== false;
        // "/" focuses the main search of a page (like the home page); modal/panel searches opt in explicitly.
        const hotkey = options.hotkey === false
            ? null
            : (options.hotkey || (root.dataset.searchPriority === 'page' ? '/' : null));

        let isOpen = root.classList.contains(openClass);

        function setOpen(nextOpen) {
            isOpen = nextOpen;
            root.classList.toggle(openClass, nextOpen);
            if (toggle) {
                toggle.setAttribute('aria-expanded', String(nextOpen));
            }
            if (!nextOpen) {
                hideDropdown();
            }
        }

        function syncClear() {
            if (!clearButton || !input) return;
            clearButton.hidden = !input.value;
        }

        function clearAndClose() {
            if (input) {
                input.value = '';
                syncClear();
                if (onSearch) onSearch('');
                if (collapseWhenEmpty) {
                    setOpen(false);
                }
                input.blur();
            } else if (collapseWhenEmpty) {
                setOpen(false);
            }
        }

        function hideDropdown() {
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        }

        function showDropdown() {
            if (!dropdown || !history || !window.astoriaSearchHistory) return;
            const items = history.get();
            if (!items.length) return;

            window.astoriaSearchHistory.renderDropdown(dropdown, items, {
                onSelect: (query) => {
                    if (input) {
                        input.value = query;
                        syncClear();
                    }
                    if (onSearch) onSearch(query);
                },
                onClear: () => {
                    history.clear();
                    hideDropdown();
                    syncClear();
                }
            });
            dropdown.style.display = 'block';
        }

        const runSearch = debounce((value) => {
            if (history) {
                history.save(value);
            }
            if (onSearch) onSearch(value);
        }, debounceWait);

        if (input) {
            input.addEventListener('input', () => {
                const value = input.value || '';
                syncClear();
                runSearch(value);
            });

            if (openOnFocus) {
                input.addEventListener('focus', () => {
                    if (!isOpen) setOpen(true);
                    showDropdown();
                });
            }

            input.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                clearAndClose();
            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    hideDropdown();
                    if (collapseWhenEmpty && !input.value) {
                        setOpen(false);
                    }
                }, closeDelay);
            });
        }

        if (toggle) {
            toggle.addEventListener('click', () => {
                setOpen(true);
                if (input) input.focus();
                showDropdown();
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (!input) return;
                input.value = '';
                syncClear();
                if (onSearch) onSearch('');
                input.focus();
            });
        }

        if (hotkey) {
            document.addEventListener('keydown', (event) => {
                if (event.key !== hotkey) return;
                if (isEditableTarget(event.target)) return;
                event.preventDefault();
                setOpen(true);
                if (input) input.focus();
            });
        }

        syncClear();
        return { setOpen, showDropdown, hideDropdown };
    }

    api.bind = bindSearchBar;
    window.astoriaSearchBar = api;
})();
