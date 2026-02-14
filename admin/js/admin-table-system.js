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

export function ensureAdminTables({ usersTable = null, charactersTable = null, inventoryTable = null } = {}) {
    if (!(typeof window !== 'undefined' && typeof window.Tabulator === 'function')) {
        return { usersTable, charactersTable, inventoryTable };
    }

    if (!usersTable && document.getElementById('usersTabulator')) {
        usersTable = new window.Tabulator('#usersTabulator', {
            layout: 'fitColumns',
            responsiveLayout: 'collapse',
            placeholder: 'Aucun utilisateur trouve',
            pagination: true,
            paginationSize: 12,
            paginationSizeSelector: [12, 25, 50, 100],
            columns: [
                {
                    title: 'Utilisateur',
                    field: 'username',
                    minWidth: 220,
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
                    width: 130,
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
                    formatter: (cell) => `${Number(cell.getValue() || 0).toLocaleString('fr-FR')} K`
                },
                {
                    title: 'Derniere connexion',
                    field: 'lastLoginDate',
                    minWidth: 170,
                    sorter: 'datetime',
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
                    width: 120,
                    hozAlign: 'center',
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
                    width: 190,
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
        });
    }

    if (!charactersTable && document.getElementById('charactersTabulator')) {
        charactersTable = new window.Tabulator('#charactersTabulator', {
            layout: 'fitColumns',
            responsiveLayout: 'collapse',
            placeholder: 'Aucun personnage trouve',
            pagination: true,
            paginationSize: 12,
            paginationSizeSelector: [12, 25, 50, 100],
            columns: [
                {
                    title: 'Avatar',
                    field: 'profile_data',
                    width: 88,
                    hozAlign: 'center',
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
                { title: 'Nom', field: 'name', minWidth: 170, formatter: (cell) => `<span class="font-weight-medium">${safeText(cell.getValue() || 'Sans nom')}</span>` },
                { title: 'Proprietaire', field: 'ownerShort', minWidth: 130 },
                { title: 'Race/Classe', field: 'raceClass', minWidth: 150 },
                {
                    title: 'Kaels',
                    field: 'kaels',
                    width: 130,
                    hozAlign: 'right',
                    formatter: (cell) => `<span class="badge bg-warning-lt text-warning">${Number(cell.getValue() || 0).toLocaleString('fr-FR')} K</span>`
                },
                { title: 'Cree le', field: 'createdDate', width: 120 },
                {
                    title: 'Actions',
                    field: 'id',
                    width: 220,
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
        });
    }

    if (!inventoryTable && document.getElementById('adminInventoryTabulator')) {
        inventoryTable = new window.Tabulator('#adminInventoryTabulator', {
            layout: 'fitColumns',
            responsiveLayout: 'collapse',
            placeholder: 'Aucune donnee',
            pagination: true,
            paginationSize: 10,
            paginationSizeSelector: [10, 20, 50],
            columns: [
                { title: 'Objet', field: 'itemName', minWidth: 220 },
                { title: 'Categorie', field: 'category', minWidth: 120 },
                { title: 'Qte', field: 'qty', width: 90, hozAlign: 'center' },
                { title: 'ID item', field: 'itemId', minWidth: 170 }
            ]
        });
    }

    return { usersTable, charactersTable, inventoryTable };
}
