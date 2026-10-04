// Collapsible filter panels on phones.
// Markup: a container with data-mobile-filters (optional value = button label)
// and the filters to fold marked with data-filter-item. On small screens the
// filters start folded behind a "Filtres" button that shows how many are
// active; on larger screens nothing changes.

const MOBILE_QUERY = window.matchMedia('(max-width: 600px)');

function isFilterActive(item) {
    const select = item.matches('select') ? item : item.querySelector('select');
    if (select) return select.selectedIndex > 0;
    const pressed = item.matches('[aria-pressed]') ? item : item.querySelector('[aria-pressed]');
    if (pressed) return pressed.getAttribute('aria-pressed') === 'true';
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox) return checkbox.checked;
    return Array.from(item.querySelectorAll('input')).some((input) => input.value.trim() !== '');
}

function setupContainer(container) {
    if (container.dataset.mobileFiltersReady === 'on') return;
    const items = Array.from(container.querySelectorAll('[data-filter-item]'));
    if (!items.length) return;
    container.dataset.mobileFiltersReady = 'on';

    const label = container.dataset.mobileFilters || 'Filtres';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-filters-toggle tw-press';
    button.setAttribute('aria-expanded', 'false');
    const firstItem = items[0];
    firstItem.parentElement.insertBefore(button, firstItem);

    const render = () => {
        const active = items.filter(isFilterActive).length;
        button.textContent = active ? `${label} · ${active} actif${active > 1 ? 's' : ''}` : label;
    };

    const setOpen = (open) => {
        container.classList.toggle('mobile-filters--open', open);
        button.setAttribute('aria-expanded', String(open));
    };

    button.addEventListener('click', () => setOpen(!container.classList.contains('mobile-filters--open')));
    container.addEventListener('change', render);
    container.addEventListener('input', render);
    container.addEventListener('click', () => requestAnimationFrame(render));
    setOpen(!MOBILE_QUERY.matches);
    MOBILE_QUERY.addEventListener('change', (event) => setOpen(!event.matches));
    render();
}

export function setupMobileFilters(root = document) {
    root.querySelectorAll('[data-mobile-filters]').forEach(setupContainer);
}

setupMobileFilters();
