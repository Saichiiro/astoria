// Mobile tables: style.css stacks table cells under 768px and prints each
// cell's data-label in front of its value. This copies the column headers onto
// the cells, including rows rendered later (tbody changes are observed).

function getHeaderLabels(table) {
    const headerRow = table.tHead?.rows?.[0];
    return headerRow ? Array.from(headerRow.cells, (cell) => cell.textContent.trim()) : [];
}

function labelRows(table, labels) {
    Array.from(table.tBodies).forEach((tbody) => {
        Array.from(tbody.rows).forEach((row) => {
            // Rows that span columns (empty states, messages) keep no label.
            if (row.cells.length !== labels.length) return;
            Array.from(row.cells).forEach((cell, index) => {
                if (!cell.hasAttribute('data-label') && labels[index]) {
                    cell.dataset.label = labels[index];
                }
            });
        });
    });
}

export function autoLabelTable(table) {
    if (!table || table.dataset.autoLabels === 'on') return;
    const labels = getHeaderLabels(table);
    if (!labels.length) return;
    table.dataset.autoLabels = 'on';
    labelRows(table, labels);
    const observer = new MutationObserver(() => labelRows(table, labels));
    Array.from(table.tBodies).forEach((tbody) => observer.observe(tbody, { childList: true }));
}

export function autoLabelTables(root = document) {
    root.querySelectorAll('table').forEach(autoLabelTable);
}

autoLabelTables();
