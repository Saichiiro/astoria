// Loading and error states for data tables.
// - First load (no rows yet): placeholder skeleton rows.
// - Reload: existing rows stay visible, dimmed via aria-busy (no layout jump).
// - Error: one message row with a retry button instead of an empty-state text.

function hasDataRows(tbody) {
    return Array.from(tbody.rows).some((row) => !row.classList.contains('table-skeleton-row')
        && !row.querySelector('.table-state-cell'));
}

export function setTableLoading(tbody, { columns, rows = 4 } = {}) {
    const table = tbody?.closest('table');
    if (!tbody || !table) return;
    table.setAttribute('aria-busy', 'true');
    if (hasDataRows(tbody)) return;
    tbody.innerHTML = '';
    for (let index = 0; index < rows; index += 1) {
        const tr = document.createElement('tr');
        tr.className = 'table-skeleton-row';
        tr.setAttribute('aria-hidden', 'true');
        for (let column = 0; column < columns; column += 1) {
            const td = document.createElement('td');
            td.innerHTML = '<span class="table-skeleton-bar"></span>';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

export function clearTableLoading(tbody) {
    tbody?.closest('table')?.removeAttribute('aria-busy');
}

export function showTableError(tbody, { columns, message, onRetry } = {}) {
    if (!tbody) return;
    clearTableLoading(tbody);
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns;
    td.className = 'table-state-cell table-state-cell--error';
    const text = document.createElement('span');
    text.textContent = message;
    td.appendChild(text);
    if (typeof onRetry === 'function') {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn-secondary table-state-retry tw-press';
        retry.textContent = 'Réessayer';
        retry.addEventListener('click', onRetry);
        td.appendChild(retry);
    }
    tr.appendChild(td);
    tbody.appendChild(tr);
}

const tableRequestIds = new WeakMap();

function getTableColumnCount(body) {
    return body?.closest('table')?.tHead?.rows?.[0]?.cells?.length || 1;
}

// Loads data into a table body: skeleton/dimmed rows while loading, an error
// row with retry on failure, and only the latest request for a table renders.
// Resolves { ok: true, data } | { ok: false } | { stale: true } (a newer request won).
export async function loadTable(body, { load, render, errorMessage, onRetry }) {
    const requestId = (tableRequestIds.get(body) || 0) + 1;
    tableRequestIds.set(body, requestId);
    setTableLoading(body, { columns: getTableColumnCount(body) });
    try {
        const data = await load();
        if (tableRequestIds.get(body) !== requestId) return { stale: true };
        clearTableLoading(body);
        render(data);
        return { ok: true, data };
    } catch (err) {
        if (tableRequestIds.get(body) !== requestId) return { stale: true };
        console.error(err);
        showTableError(body, { columns: getTableColumnCount(body), message: errorMessage, onRetry });
        return { ok: false };
    }
}
