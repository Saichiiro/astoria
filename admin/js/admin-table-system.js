function todayStamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

export function safeText(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function setUsersInfo(text) {
    const info = document.getElementById('usersTableInfo');
    if (info) info.textContent = text;
}

export function setCharactersInfo(text) {
    const info = document.getElementById('charactersTableInfo');
    if (info) info.textContent = text;
}

export function setInventoryInfo(text) {
    const info = document.getElementById('inventoryTableInfo');
    if (info) info.textContent = text;
}

export function getUserRows(users) {
    return (users || []).map((user) => {
        const charCount = user.characters?.length || 0;
        const totalKaels = user.characters?.reduce((sum, char) => sum + (char.kaels || 0), 0) || 0;
        return {
            ...user,
            charCount,
            totalKaels,
            lastLoginDate: user.last_login ? new Date(user.last_login) : null
        };
    });
}

export function getCharacterRows(characters) {
    return (characters || []).map((char) => {
        const createdDate = char.created_at
            ? new Date(char.created_at).toLocaleDateString('fr-FR')
            : '-';
        const ownerShort = char.user_id ? `${char.user_id.slice(0, 8)}...` : '-';
        const raceClass = `${char.race || ''} ${char.class || ''}`.trim() || '-';
        const kaels = char.kaels != null ? Number(char.kaels) : 0;
        return {
            ...char,
            createdDate,
            ownerShort,
            raceClass,
            kaels
        };
    });
}

function withBaseTableOptions({
    placeholder,
    persistenceID,
    paginationSize = 12,
    paginationSizeSelector = [12, 25, 50, 100],
    initialSort = [],
    columns = []
}) {
    return {
        layout: 'fitColumns',
        responsiveLayout: 'collapse',
        responsiveLayoutCollapseUseFormatters: false,
        placeholder,
        pagination: true,
        paginationSize,
        paginationSizeSelector,
        paginationCounter: 'rows',
        movableColumns: true,
        columnHeaderVertAlign: 'bottom',
        history: true,
        clipboard: true,
        persistence: {
            sort: true,
            filter: true,
            headerFilter: true,
            page: true,
            columns: true
        },
        persistenceID,
        initialSort,
        columnDefaults: {
            headerSortTristate: true,
            vertAlign: 'middle',
            resizable: true,
            headerTooltip: true,
            tooltip: (cell) => safeText(cell.getValue() ?? '')
        },
        columns
    };
}

function getTableStats(table) {
    const total = Number(table.getDataCount('all') || 0);
    const visible = Number(table.getDataCount('active') || 0);
    return { total, visible };
}

function renderToolbarStats(toolbar, table) {
    if (!toolbar || !table) return;
    const statsNode = toolbar.querySelector('[data-table-stat="count"]');
    if (!statsNode) return;
    const { total, visible } = getTableStats(table);
    statsNode.textContent = `${visible}/${total} lignes`;
}

function bindToolbar({ toolbarName, table, filePrefix }) {
    if (!table) return;
    const toolbar = document.querySelector(`[data-table-toolbar="${toolbarName}"]`);
    if (!toolbar) return;

    if (toolbar.dataset.bound === '1') {
        renderToolbarStats(toolbar, table);
        return;
    }

    toolbar.dataset.bound = '1';

    toolbar.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-table-action]');
        if (!btn) return;
        const action = btn.dataset.tableAction;

        switch (action) {
            case 'reset-view':
                table.clearHeaderFilter();
                table.clearFilter(true);
                table.clearSort();
                table.setPage(1);
                table.redraw(true);
                break;
            case 'clear-filters':
                table.clearHeaderFilter();
                table.clearFilter(true);
                table.setPage(1);
                break;
            case 'export-csv':
                table.download('csv', `${filePrefix}-${todayStamp()}.csv`, { bom: true });
                break;
            case 'redraw':
                table.redraw(true);
                break;
            default:
                break;
        }
    });

    const refreshStats = () => renderToolbarStats(toolbar, table);
    table.on('dataLoaded', refreshStats);
    table.on('dataFiltered', refreshStats);
    table.on('dataSorted', refreshStats);
    table.on('renderComplete', refreshStats);
    table.on('pageLoaded', refreshStats);
    refreshStats();
}

function boolFilter(headerValue, rowValue) {
    if (headerValue == null || headerValue === '' || headerValue === 'all') return true;
    const active = rowValue !== false;
    return String(active) === String(headerValue);
}

export function ensureAdminTables({ usersTable = null, charactersTable = null, inventoryTable = null } = {}) {
    if (!(typeof window !== 'undefined' && typeof window.Tabulator === 'function')) {
        return { usersTable, charactersTable, inventoryTable };
    }

    if (!usersTable && document.getElementById('usersTabulator')) {
        usersTable = new window.Tabulator('#usersTabulator', withBaseTableOptions({
            placeholder: 'Aucun utilisateur trouve',
            persistenceID: 'admin-users-table-v2',
            initialSort: [{ column: 'lastLoginDate', dir: 'desc' }],
            columns: [
                {
                    title: 'Utilisateur',
                    field: 'username',
                    minWidth: 240,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Pseudo / ID',
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const name = safeText(row.username || '-');
                        const shortId = safeText(String(row.id || '').slice(0, 8));
                        const initial = safeText((row.username || 'U').charAt(0).toUpperCase());
                        return `
                            <div class="admin-tabulator-user">
                                <span class="admin-tabulator-avatar">${initial}</span>
                                <div>
                                    <div class="admin-tabulator-user-name">${name}</div>
                                    <div class="admin-tabulator-user-id"><code>${shortId}...</code></div>
                                </div>
                            </div>
                        `;
                    }
                },
                {
                    title: 'Role',
                    field: 'role',
                    width: 140,
                    headerFilter: 'list',
                    headerFilterParams: { values: { '': 'Tous', admin: 'Admin', player: 'Joueur' } },
                    formatter: (cell) => {
                        const role = String(cell.getValue() || 'player');
                        const cls = role === 'admin' ? 'bg-red' : 'bg-blue';
                        const icon = role === 'admin' ? 'ti-shield-check' : 'ti-user';
                        const text = role === 'admin' ? 'Admin' : 'Joueur';
                        return `<span class="badge ${cls}"><i class="ti ${icon} me-1"></i>${text}</span>`;
                    }
                },
                {
                    title: 'Persos',
                    field: 'charCount',
                    width: 110,
                    hozAlign: 'center',
                    sorter: 'number',
                    headerFilter: 'input',
                    headerFilterPlaceholder: '>=',
                    formatter: (cell) => {
                        const count = Number(cell.getValue() || 0);
                        if (count <= 0) return '<span class="text-muted">Aucun</span>';
                        return `<span class="text-primary fw-bold">${count}</span>`;
                    }
                },
                {
                    title: 'Kaels',
                    field: 'totalKaels',
                    width: 130,
                    hozAlign: 'right',
                    sorter: 'number',
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Montant',
                    formatter: (cell) => `${Number(cell.getValue() || 0).toLocaleString('fr-FR')} K`
                },
                {
                    title: 'Derniere connexion',
                    field: 'lastLoginDate',
                    minWidth: 180,
                    sorter: 'datetime',
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'jj/mm/aaaa',
                    formatter: (cell) => {
                        const value = cell.getValue();
                        if (!value) return '<span class="text-muted">Jamais</span>';
                        return new Date(value).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                },
                {
                    title: 'Statut',
                    field: 'is_active',
                    width: 128,
                    hozAlign: 'center',
                    headerFilter: 'list',
                    headerFilterParams: {
                        values: {
                            all: 'Tous',
                            true: 'Actif',
                            false: 'Desactive'
                        }
                    },
                    headerFilterFunc: boolFilter,
                    formatter: (cell) => {
                        const active = cell.getValue() !== false;
                        return active
                            ? '<span class="badge bg-success"><i class="ti ti-circle-check me-1"></i>Actif</span>'
                            : '<span class="badge bg-danger"><i class="ti ti-circle-x me-1"></i>Desactive</span>';
                    }
                },
                {
                    title: 'Actions',
                    field: 'id',
                    width: 196,
                    headerSort: false,
                    hozAlign: 'right',
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const userId = safeText(row.id || '');
                        const role = safeText(row.role || 'player');
                        const active = row.is_active !== false;
                        const lockIcon = active ? 'ti-lock' : 'ti-lock-open';
                        const lockAction = active ? 'Desactiver' : 'Activer';
                        const charsBtn = row.charCount > 0
                            ? `<button class="admin-tabulator-btn" data-action="view-user-characters" data-user-id="${userId}" title="Voir persos"><i class="ti ti-mask"></i></button>`
                            : '';
                        return `
                            <div class="admin-tabulator-actions">
                                ${charsBtn}
                                <button class="admin-tabulator-btn" data-action="toggle-user-active" data-user-id="${userId}" data-user-active="${active ? '1' : '0'}" title="${lockAction}">
                                    <i class="ti ${lockIcon}"></i>
                                </button>
                                <button class="admin-tabulator-btn" data-action="change-user-role" data-user-id="${userId}" data-user-role="${role}" title="Changer role">
                                    <i class="ti ti-user-cog"></i>
                                </button>
                                <button class="admin-tabulator-btn" data-action="edit-user" data-user-id="${userId}" title="Modifier">
                                    <i class="ti ti-edit"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ]
        }));
        bindToolbar({ toolbarName: 'users', table: usersTable, filePrefix: 'astoria-users' });
    }

    if (!charactersTable && document.getElementById('charactersTabulator')) {
        charactersTable = new window.Tabulator('#charactersTabulator', withBaseTableOptions({
            placeholder: 'Aucun personnage trouve',
            persistenceID: 'admin-characters-table-v2',
            initialSort: [{ column: 'createdDate', dir: 'desc' }],
            columns: [
                {
                    title: 'Avatar',
                    field: 'profile_data',
                    width: 92,
                    hozAlign: 'center',
                    headerSort: false,
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const avatarUrl = row?.profile_data?.avatar_url || '';
                        if (avatarUrl) {
                            return `<span class="avatar" style="background-image: url(${safeText(avatarUrl)})"></span>`;
                        }
                        const initial = safeText((row?.name || '?').charAt(0).toUpperCase());
                        return `<span class="avatar">${initial}</span>`;
                    }
                },
                {
                    title: 'Nom',
                    field: 'name',
                    minWidth: 180,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Nom perso',
                    formatter: (cell) => `<span class="font-weight-medium">${safeText(cell.getValue() || 'Sans nom')}</span>`
                },
                {
                    title: 'Proprietaire',
                    field: 'ownerShort',
                    minWidth: 140,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'ID user'
                },
                {
                    title: 'Race/Classe',
                    field: 'raceClass',
                    minWidth: 170,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Race ou classe'
                },
                {
                    title: 'Kaels',
                    field: 'kaels',
                    width: 130,
                    hozAlign: 'right',
                    sorter: 'number',
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Montant',
                    formatter: (cell) => `<span class="badge bg-warning-lt text-warning">${Number(cell.getValue() || 0).toLocaleString('fr-FR')} K</span>`
                },
                {
                    title: 'Cree le',
                    field: 'createdDate',
                    width: 132,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'jj/mm/aaaa'
                },
                {
                    title: 'Actions',
                    field: 'id',
                    width: 230,
                    headerSort: false,
                    hozAlign: 'right',
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const id = safeText(row.id || '');
                        return `
                            <div class="admin-tabulator-actions">
                                <button class="admin-tabulator-btn" data-action="select" data-char-id="${id}" title="Activer"><i class="ti ti-user-check"></i></button>
                                <button class="admin-tabulator-btn" data-action="edit-kaels" data-char-id="${id}" title="Modifier Kaels"><i class="ti ti-coin"></i></button>
                                <button class="admin-tabulator-btn" data-action="give-items" data-char-id="${id}" title="Donner des objets"><i class="ti ti-gift"></i></button>
                                <button class="admin-tabulator-btn" data-action="view-inventory" data-char-id="${id}" title="Voir inventaire"><i class="ti ti-backpack"></i></button>
                                <button class="admin-tabulator-btn" data-action="delete" data-char-id="${id}" title="Supprimer"><i class="ti ti-trash"></i></button>
                            </div>
                        `;
                    }
                }
            ]
        }));
        bindToolbar({ toolbarName: 'characters', table: charactersTable, filePrefix: 'astoria-characters' });
    }

    if (!inventoryTable && document.getElementById('adminInventoryTabulator')) {
        inventoryTable = new window.Tabulator('#adminInventoryTabulator', withBaseTableOptions({
            placeholder: 'Aucune donnee',
            persistenceID: 'admin-inventory-table-v2',
            paginationSize: 10,
            paginationSizeSelector: [10, 20, 50],
            initialSort: [{ column: 'qty', dir: 'desc' }],
            columns: [
                {
                    title: 'Objet',
                    field: 'itemName',
                    minWidth: 260,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Nom objet',
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const name = safeText(row.itemName || '(item inconnu)');
                        const image = row.itemImage ? safeText(row.itemImage) : '';
                        if (!image) {
                            return `
                                <div class="admin-tabulator-item">
                                    <span class="admin-tabulator-item-thumb admin-tabulator-item-thumb--fallback">IT</span>
                                    <span class="admin-tabulator-item-name">${name}</span>
                                </div>
                            `;
                        }
                        return `
                            <div class="admin-tabulator-item">
                                <img class="admin-tabulator-item-thumb" src="${image}" alt="${name}">
                                <span class="admin-tabulator-item-name">${name}</span>
                            </div>
                        `;
                    }
                },
                {
                    title: 'Categorie',
                    field: 'category',
                    minWidth: 130,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Categorie'
                },
                {
                    title: 'Qte',
                    field: 'qty',
                    width: 96,
                    sorter: 'number',
                    hozAlign: 'center',
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'Qte'
                },
                {
                    title: 'ID item',
                    field: 'itemId',
                    minWidth: 180,
                    headerFilter: 'input',
                    headerFilterPlaceholder: 'UUID'
                }
            ]
        }));
        bindToolbar({ toolbarName: 'inventory', table: inventoryTable, filePrefix: 'astoria-inventory' });
    }

    return { usersTable, charactersTable, inventoryTable };
}
