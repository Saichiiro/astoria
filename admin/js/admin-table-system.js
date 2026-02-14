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

function htmlCell(params, html) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.firstElementChild || el;
}

function createAgGrid(rootId, gridOptions) {
    if (!(typeof window !== 'undefined' && window.agGrid)) return null;
    const root = document.getElementById(rootId);
    if (!root) return null;

    const options = {
        rowData: [],
        rowSelection: 'single',
        animateRows: true,
        pagination: true,
        paginationPageSize: gridOptions.paginationPageSize || 12,
        suppressCellFocus: true,
        defaultColDef: {
            sortable: true,
            filter: true,
            floatingFilter: true,
            resizable: true,
            minWidth: 100,
            flex: 1
        },
        ...gridOptions
    };

    let api = null;
    if (typeof window.agGrid.createGrid === 'function') {
        api = window.agGrid.createGrid(root, options);
    } else if (typeof window.agGrid.Grid === 'function') {
        // Compatibility with older AG Grid bundles.
        // eslint-disable-next-line no-new
        new window.agGrid.Grid(root, options);
        api = options.api || null;
    }
    if (!api) return null;

    const setData = (rows) => {
        if (typeof api.setGridOption === 'function') {
            api.setGridOption('rowData', rows || []);
        } else if (typeof api.setRowData === 'function') {
            api.setRowData(rows || []);
        }
    };

    return { api, setData };
}

function roleRenderer(params) {
    const role = String(params.value || 'player');
    const cls = role === 'admin' ? 'bg-red' : 'bg-blue';
    const icon = role === 'admin' ? 'ti-shield-check' : 'ti-user';
    const text = role === 'admin' ? 'Admin' : 'Joueur';
    return htmlCell(params, `<span class="badge ${cls}"><i class="ti ${icon} me-1"></i>${text}</span>`);
}

function activeRenderer(params) {
    const active = params.value !== false;
    return htmlCell(
        params,
        active
            ? '<span class="badge bg-success"><i class="ti ti-circle-check me-1"></i>Actif</span>'
            : '<span class="badge bg-danger"><i class="ti ti-circle-x me-1"></i>Desactive</span>'
    );
}

function usersActionsRenderer(params) {
    const row = params.data || {};
    const userId = safeText(row.id || '');
    const role = safeText(row.role || 'player');
    const active = row.is_active !== false;
    const lockIcon = active ? 'ti-lock' : 'ti-lock-open';
    const lockAction = active ? 'Desactiver' : 'Activer';
    const charsBtn = row.charCount > 0
        ? `<button class="admin-tabulator-btn" data-action="view-user-characters" data-user-id="${userId}" title="Voir persos"><i class="ti ti-mask"></i></button>`
        : '';

    return htmlCell(params, `
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
    `);
}

function charactersActionsRenderer(params) {
    const row = params.data || {};
    const id = safeText(row.id || '');
    return htmlCell(params, `
        <div class="admin-tabulator-actions">
            <button class="admin-tabulator-btn" data-action="select" data-char-id="${id}" title="Activer"><i class="ti ti-user-check"></i></button>
            <button class="admin-tabulator-btn" data-action="edit-kaels" data-char-id="${id}" title="Modifier Kaels"><i class="ti ti-coin"></i></button>
            <button class="admin-tabulator-btn" data-action="give-items" data-char-id="${id}" title="Donner des objets"><i class="ti ti-gift"></i></button>
            <button class="admin-tabulator-btn" data-action="view-inventory" data-char-id="${id}" title="Voir inventaire"><i class="ti ti-backpack"></i></button>
            <button class="admin-tabulator-btn" data-action="delete" data-char-id="${id}" title="Supprimer"><i class="ti ti-trash"></i></button>
        </div>
    `);
}

function inventoryNameRenderer(params) {
    const row = params.data || {};
    const name = safeText(row.itemName || '(item inconnu)');
    const image = safeText(row.itemImage || '');
    if (!image) {
        return htmlCell(params, `
            <div class="admin-tabulator-item">
                <span class="admin-tabulator-item-thumb admin-tabulator-item-thumb--fallback">IT</span>
                <span class="admin-tabulator-item-name">${name}</span>
            </div>
        `);
    }
    return htmlCell(params, `
        <div class="admin-tabulator-item">
            <img class="admin-tabulator-item-thumb" src="${image}" alt="${name}">
            <span class="admin-tabulator-item-name">${name}</span>
        </div>
    `);
}

export function ensureAdminTables({ usersTable = null, charactersTable = null, inventoryTable = null } = {}) {
    if (!(typeof window !== 'undefined' && window.agGrid)) {
        return { usersTable, charactersTable, inventoryTable };
    }

    if (!usersTable && document.getElementById('usersTabulator')) {
        usersTable = createAgGrid('usersTabulator', {
            paginationPageSize: 12,
            columnDefs: [
                {
                    headerName: 'Utilisateur',
                    field: 'username',
                    minWidth: 250,
                    cellRenderer: (params) => {
                        const row = params.data || {};
                        const name = safeText(row.username || '-');
                        const shortId = safeText(String(row.id || '').slice(0, 8));
                        const initial = safeText((row.username || 'U').charAt(0).toUpperCase());
                        return htmlCell(params, `
                            <div class="admin-tabulator-user">
                                <span class="admin-tabulator-avatar">${initial}</span>
                                <div>
                                    <div class="admin-tabulator-user-name">${name}</div>
                                    <div class="admin-tabulator-user-id"><code>${shortId}...</code></div>
                                </div>
                            </div>
                        `);
                    }
                },
                { headerName: 'Role', field: 'role', width: 130, cellRenderer: roleRenderer },
                {
                    headerName: 'Persos',
                    field: 'charCount',
                    width: 120,
                    type: 'numericColumn',
                    cellStyle: { textAlign: 'center' },
                    valueFormatter: (params) => {
                        const count = Number(params.value || 0);
                        return count <= 0 ? 'Aucun' : String(count);
                    }
                },
                {
                    headerName: 'Kaels',
                    field: 'totalKaels',
                    width: 130,
                    type: 'numericColumn',
                    cellStyle: { textAlign: 'right' },
                    valueFormatter: (params) => `${Number(params.value || 0).toLocaleString('fr-FR')} K`
                },
                {
                    headerName: 'Derniere connexion',
                    field: 'lastLoginDate',
                    minWidth: 190,
                    valueFormatter: (params) => {
                        if (!params.value) return 'Jamais';
                        return new Date(params.value).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                },
                { headerName: 'Statut', field: 'is_active', width: 140, cellRenderer: activeRenderer },
                { headerName: 'Actions', field: 'id', width: 190, sortable: false, filter: false, floatingFilter: false, cellRenderer: usersActionsRenderer }
            ]
        });
    }

    if (!charactersTable && document.getElementById('charactersTabulator')) {
        charactersTable = createAgGrid('charactersTabulator', {
            paginationPageSize: 12,
            columnDefs: [
                {
                    headerName: 'Avatar',
                    field: 'profile_data',
                    width: 92,
                    sortable: false,
                    filter: false,
                    floatingFilter: false,
                    cellRenderer: (params) => {
                        const row = params.data || {};
                        const avatarUrl = row?.profile_data?.avatar_url || '';
                        if (avatarUrl) {
                            return htmlCell(params, `<span class="avatar" style="background-image: url(${safeText(avatarUrl)})"></span>`);
                        }
                        const initial = safeText((row?.name || '?').charAt(0).toUpperCase());
                        return htmlCell(params, `<span class="avatar">${initial}</span>`);
                    }
                },
                { headerName: 'Nom', field: 'name', minWidth: 190 },
                { headerName: 'Proprietaire', field: 'ownerShort', minWidth: 130 },
                { headerName: 'Race/Classe', field: 'raceClass', minWidth: 160 },
                {
                    headerName: 'Kaels',
                    field: 'kaels',
                    width: 130,
                    type: 'numericColumn',
                    cellStyle: { textAlign: 'right' },
                    valueFormatter: (params) => `${Number(params.value || 0).toLocaleString('fr-FR')} K`
                },
                { headerName: 'Cree le', field: 'createdDate', width: 120 },
                { headerName: 'Actions', field: 'id', width: 230, sortable: false, filter: false, floatingFilter: false, cellRenderer: charactersActionsRenderer }
            ]
        });
    }

    if (!inventoryTable && document.getElementById('adminInventoryTabulator')) {
        inventoryTable = createAgGrid('adminInventoryTabulator', {
            paginationPageSize: 10,
            columnDefs: [
                { headerName: 'Objet', field: 'itemName', minWidth: 260, cellRenderer: inventoryNameRenderer },
                { headerName: 'Categorie', field: 'category', minWidth: 140 },
                { headerName: 'Qte', field: 'qty', width: 100, type: 'numericColumn', cellStyle: { textAlign: 'center' } },
                { headerName: 'ID item', field: 'itemId', minWidth: 180 }
            ]
        });
    }

    return { usersTable, charactersTable, inventoryTable };
}
