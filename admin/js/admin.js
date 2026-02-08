/**
 * Astoria Admin Panel
 * Built with Tabler UI Framework
 */

import { getSupabaseClient, getAllCharacters, updateCharacter, setActiveCharacter, getAllItems } from '../../js/auth.js';
import { logActivity, ActionTypes } from '../../js/api/activity-logger.js';

(function() {
    'use strict';

    // Supabase reference
    let supabase = null;
    let allCharacters = [];
    let allItems = [];

    // =================================================================
    // CONFIGURATION
    // =================================================================

    const PAGE_TITLES = {
        dashboard: { title: 'Tableau de bord', subtitle: "Vue d'ensemble de l'activité" },
        users: { title: 'Utilisateurs', subtitle: 'Gestion des comptes et permissions' },
        characters: { title: 'Personnages', subtitle: 'Revue et gestion des personnages' },
        items: { title: 'Objets', subtitle: 'Gestion du Codex et inventaires' },
        economy: { title: 'Économie', subtitle: 'Kaels et transactions' },
        market: { title: 'Marché', subtitle: 'Configuration et monitoring' },
        events: { title: 'Événements', subtitle: 'Gestion des events RP' },
        announcements: { title: 'Annonces', subtitle: 'Communication avec les joueurs' },
        logs: { title: 'Logs & Audit', subtitle: 'Suivi des actions' },
        integrations: { title: 'Intégrations', subtitle: 'Discord, Webhooks, API' },
        settings: { title: 'Paramètres', subtitle: 'Configuration système' }
    };

    // =================================================================
    // DOM ELEMENTS
    // =================================================================

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const pages = document.querySelectorAll('.admin-page[data-page]');
    const navItems = document.querySelectorAll('[data-page]');

    // =================================================================
    // NAVIGATION
    // =================================================================

    /**
     * Navigate to a page
     */
    function navigateTo(pageName) {
        // Update pages visibility
        pages.forEach(page => {
            page.classList.toggle('active', page.dataset.page === pageName);
        });

        // Update nav active state
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        // Update header
        const info = PAGE_TITLES[pageName] || { title: pageName, subtitle: '' };
        if (pageTitle) pageTitle.textContent = info.title;
        if (pageSubtitle) pageSubtitle.textContent = info.subtitle;

        // Update URL hash
        if (window.location.hash !== `#${pageName}`) {
            history.pushState(null, '', `#${pageName}`);
        }

        // Close mobile menu if open
        const navbarCollapse = document.getElementById('sidebar-menu');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if (bsCollapse) bsCollapse.hide();
        }

        console.log('[Admin] Navigated to:', pageName);
    }

    /**
     * Initialize navigation handlers
     */
    function initNavigation() {
        // Handle all elements with data-page attribute
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-page]');
            if (target && target.dataset.page) {
                e.preventDefault();
                navigateTo(target.dataset.page);
            }
        });

        // Handle initial hash
        const hash = window.location.hash.slice(1) || 'dashboard';
        navigateTo(hash);

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            navigateTo(hash);
        });
    }

    // =================================================================
    // AUTHENTICATION
    // =================================================================

    /**
     * Check if user is authenticated as admin
     */
    async function checkAuth() {
        try {
            const sessionStr = localStorage.getItem('astoria_session');
            if (!sessionStr) {
                return redirectToLogin('Session non trouvée');
            }

            const session = JSON.parse(sessionStr);
            if (!session || !session.user) {
                return redirectToLogin('Session invalide');
            }

            // Check expiration (7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - session.timestamp > maxAge) {
                return redirectToLogin('Session expirée');
            }

            // Check admin role
            if (session.user.role !== 'admin') {
                return redirectToLogin('Accès non autorisé - Admin requis');
            }

            // Update UI with user info
            updateUserInfo(session.user);

            // Refresh session timestamp (sliding expiration)
            session.timestamp = Date.now();
            localStorage.setItem('astoria_session', JSON.stringify(session));

            return true;
        } catch (err) {
            console.error('[Admin] Auth check failed:', err);
            return redirectToLogin('Erreur d\'authentification');
        }
    }

    /**
     * Update user info in header
     */
    function updateUserInfo(user) {
        const usernameEl = document.getElementById('adminUsername');
        const avatarEl = document.getElementById('adminAvatar');

        if (usernameEl) {
            usernameEl.textContent = user.username || 'Admin';
        }

        // Avatar could be set if user has one
        // if (avatarEl && user.avatar) {
        //     avatarEl.style.backgroundImage = `url(${user.avatar})`;
        // }
    }

    /**
     * Redirect to login/home
     */
    function redirectToLogin(reason) {
        console.warn('[Admin] Access denied:', reason);
        alert('Accès refusé: ' + reason);
        window.location.href = '../index.html';
        return false;
    }

    /**
     * Handle logout
     */
    function handleLogout() {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            localStorage.removeItem('astoria_session');
            localStorage.removeItem('astoria_active_character');
            window.location.href = '../index.html';
        }
    }

    // =================================================================
    // DASHBOARD DATA
    // =================================================================

    /**
     * Load dashboard statistics from Supabase
     */
    async function loadDashboardStats() {
        try {
            if (!supabase) {
                supabase = await getSupabaseClient();
            }

            // Get user count
            const { count: userCount } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true });

            // Get characters
            allCharacters = await getAllCharacters() || [];

            // Get items
            allItems = await getAllItems() || [];

            // Calculate total kaels
            const totalKaels = allCharacters.reduce((sum, char) => sum + (char.kaels || 0), 0);

            animateCounter('statUsers', String(userCount || 0));
            animateCounter('statCharacters', String(allCharacters.length));
            animateCounter('statItems', String(allItems.length));
            animateCounter('statKaels', totalKaels.toLocaleString('fr-FR'));

        } catch (err) {
            console.error('[Admin] Failed to load stats:', err);
        }
    }

    /**
     * Animate a counter from 0 to value
     */
    function animateCounter(elementId, value) {
        const el = document.getElementById(elementId);
        if (!el) return;

        // If value contains non-numeric chars (like commas), just set it
        const numericValue = parseInt(value.replace(/,/g, ''), 10);
        if (isNaN(numericValue)) {
            el.textContent = value;
            return;
        }

        // Animate
        const duration = 1000;
        const start = performance.now();
        const startValue = 0;

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = Math.floor(startValue + (numericValue - startValue) * eased);
            el.textContent = current.toLocaleString('fr-FR');

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = value; // Ensure final value is exact
            }
        }

        requestAnimationFrame(update);
    }

    /**
     * Load recent activity
     * TODO: Connect to Supabase logs table
     */
    async function loadRecentActivity() {
        const container = document.getElementById('activityList');
        if (!container) return;

        // Placeholder - will show actual logs when connected
        // For now, keep the empty state
    }

    // =================================================================
    // USERS PAGE
    // =================================================================

    /**
     * Load users list with enhanced data
     */
    async function loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        try {
            // Show loading state
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Chargement...</span>
                        </div>
                    </td>
                </tr>
            `;

            // Fetch users with character count and total kaels
            const { data: users, error } = await supabase
                .from('users')
                .select(`
                    id,
                    username,
                    role,
                    created_at,
                    last_login,
                    is_active,
                    characters (
                        id,
                        name,
                        kaels,
                        is_active
                    )
                `)
                .order('last_login', { ascending: false, nullsLast: true });

            if (error) {
                console.error('[Admin] Error loading users:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger py-4">
                            <i class="ti ti-alert-circle me-2"></i>
                            Erreur: ${error.message}
                        </td>
                    </tr>
                `;
                return;
            }

            if (!users || users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="ti ti-users-off me-2"></i>
                            Aucun utilisateur trouvé
                        </td>
                    </tr>
                `;
                return;
            }

            // Render enhanced users table
            tbody.innerHTML = users.map(user => {
                const lastLogin = user.last_login
                    ? new Date(user.last_login).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : '<span class="text-muted">Jamais</span>';

                const roleClass = user.role === 'admin' ? 'bg-red' : 'bg-blue';
                const roleIcon = user.role === 'admin' ? 'ti-shield-check' : 'ti-user';
                const roleBadge = `<span class="badge ${roleClass}"><i class="ti ${roleIcon} me-1"></i>${user.role === 'admin' ? 'Admin' : 'Joueur'}</span>`;

                const charCount = user.characters?.length || 0;
                const totalKaels = user.characters?.reduce((sum, char) => sum + (char.kaels || 0), 0) || 0;

                const charDisplay = charCount > 0
                    ? `<span class="text-primary fw-bold">${charCount}</span> <span class="text-muted">perso${charCount > 1 ? 's' : ''}</span>`
                    : '<span class="text-muted">Aucun</span>';

                const kaelsDisplay = totalKaels > 0
                    ? `<span class="fw-bold">${totalKaels.toLocaleString('fr-FR')}</span> <i class="ti ti-coin text-warning"></i>`
                    : '<span class="text-muted">0 K</span>';

                return `
                    <tr style="background: rgba(255, 255, 255, 0.02);">
                        <td>
                            <div class="d-flex align-items-center">
                                <span class="avatar avatar-sm me-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">
                                    ${(user.username || 'U').charAt(0).toUpperCase()}
                                </span>
                                <div>
                                    <div class="fw-bold text-white">${user.username || '-'}</div>
                                    <div class="text-muted small"><code>${user.id.substring(0, 8)}...</code></div>
                                </div>
                            </div>
                        </td>
                        <td>${roleBadge}</td>
                        <td>${charDisplay}</td>
                        <td>${kaelsDisplay}</td>
                        <td class="text-muted small">${lastLogin}</td>
                        <td>
                            ${user.is_active !== false ? `
                                <span class="badge bg-success">
                                    <i class="ti ti-circle-check me-1"></i> Actif
                                </span>
                            ` : `
                                <span class="badge bg-danger">
                                    <i class="ti ti-circle-x me-1"></i> Désactivé
                                </span>
                            `}
                        </td>
                        <td class="text-end">
                            <div class="btn-list">
                                ${charCount > 0 ? `
                                    <button class="btn btn-sm btn-ghost-info" onclick="viewUserCharacters('${user.id}')" title="Voir les personnages">
                                        <i class="ti ti-mask"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm ${user.is_active !== false ? 'btn-ghost-danger' : 'btn-ghost-success'}"
                                        onclick="toggleUserActiveStatus('${user.id}', ${user.is_active !== false})"
                                        title="${user.is_active !== false ? 'Désactiver' : 'Activer'}">
                                    <i class="ti ${user.is_active !== false ? 'ti-lock' : 'ti-lock-open'}"></i>
                                </button>
                                <button class="btn btn-sm btn-ghost-warning" onclick="changeUserRole('${user.id}', '${user.role}')" title="Changer le rôle">
                                    <i class="ti ti-user-cog"></i>
                                </button>
                                <button class="btn btn-sm btn-ghost-primary" onclick="editUser('${user.id}')" title="Modifier">
                                    <i class="ti ti-edit"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            console.log('[Admin] Loaded', users.length, 'users');

        } catch (err) {
            console.error('[Admin] Exception loading users:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="ti ti-database-off me-2"></i>
                        Erreur de connexion à la base de données
                    </td>
                </tr>
            `;
        }
    }

    /**
     * View user characters
     */
    window.viewUserCharacters = function(userId) {
        const user = allCharacters.filter(char => char.user_id === userId);
        if (user.length === 0) {
            showToast('Aucun personnage trouvé', 'info');
            return;
        }

        // Switch to characters page and filter by user
        switchPage('characters');
        showToast(`Affichage des personnages (${user.length})`, 'info');
    };

    /**
     * Change user role
     */
    window.changeUserRole = async function(userId, currentRole) {
        const newRole = currentRole === 'admin' ? 'player' : 'admin';
        const confirm = window.confirm(`Changer le rôle de cet utilisateur en "${newRole}" ?`);

        if (!confirm) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            showToast('Rôle mis à jour avec succès', 'success');
            loadUsers();
        } catch (err) {
            console.error('[Admin] Failed to change role:', err);
            showToast('Erreur lors du changement de rôle', 'error');
        }
    };

    /**
     * Toggle user active status
     */
    window.toggleUserActiveStatus = async function(userId, currentlyActive) {
        const action = currentlyActive ? 'désactiver' : 'activer';
        const confirm = window.confirm(`Voulez-vous ${action} ce compte utilisateur ?`);

        if (!confirm) return;

        try {
            const { toggleUserActive } = await import('../../js/api/auth-service.js');
            const result = await toggleUserActive(userId, !currentlyActive);

            if (!result.success) {
                throw new Error(result.error || 'Échec de la modification');
            }

            showToast(`Compte ${currentlyActive ? 'désactivé' : 'activé'} avec succès`, 'success');
            loadUsers();
        } catch (err) {
            console.error('[Admin] Failed to toggle user active:', err);
            showToast('Erreur lors de la modification du statut', 'error');
        }
    };

    /**
     * Edit user
     */
    window.editUser = function(userId) {
        showToast('Fonctionnalité en développement', 'info');
        // TODO: Open edit modal with user details
    };

    // =================================================================
    // CHARACTERS PAGE
    // =================================================================

    /**
     * Render characters table
     */
    function renderCharactersTable(characters) {
        const tbody = document.getElementById('charactersTableBody');
        if (!tbody) return;

        if (!characters || characters.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="ti ti-users-off me-2"></i>
                        Aucun personnage trouvé
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = characters.map(char => {
            const avatarUrl = char.profile_data?.avatar_url || '';
            const avatarHtml = avatarUrl
                ? `<span class="avatar" style="background-image: url(${avatarUrl})"></span>`
                : `<span class="avatar">${(char.name || '?').charAt(0).toUpperCase()}</span>`;

            const createdDate = char.created_at
                ? new Date(char.created_at).toLocaleDateString('fr-FR')
                : '-';

            const ownerShort = char.user_id ? char.user_id.slice(0, 8) + '...' : '-';
            const raceClass = `${char.race || ''} ${char.class || ''}`.trim() || '-';
            const kaels = char.kaels != null ? char.kaels.toLocaleString('fr-FR') : '0';

            return `
                <tr>
                    <td>${avatarHtml}</td>
                    <td>
                        <div class="font-weight-medium">${char.name || 'Sans nom'}</div>
                    </td>
                    <td class="text-muted">${ownerShort}</td>
                    <td>${raceClass}</td>
                    <td><span class="badge bg-warning-lt text-warning">${kaels} K</span></td>
                    <td class="text-muted">${createdDate}</td>
                    <td>
                        <div class="btn-list flex-nowrap">
                            <button class="btn btn-sm btn-ghost-primary" data-action="select" data-char-id="${char.id}" title="Activer">
                                <i class="ti ti-user-check"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost-warning" data-action="edit-kaels" data-char-id="${char.id}" title="Modifier Kaels">
                                <i class="ti ti-coin"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost-danger" data-action="delete" data-char-id="${char.id}" title="Supprimer">
                                <i class="ti ti-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Load characters list from Supabase
     */
    async function loadCharacters() {
        const tbody = document.getElementById('charactersTableBody');
        if (!tbody) return;

        try {
            if (!allCharacters.length) {
                allCharacters = await getAllCharacters() || [];
            }
            renderCharactersTable(allCharacters);
        } catch (err) {
            console.error('[Admin] Failed to load characters:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="ti ti-alert-circle me-2"></i>
                        Erreur de chargement
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Filter characters by search term
     */
    function filterCharacters(searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            renderCharactersTable(allCharacters);
            return;
        }
        const filtered = allCharacters.filter(char =>
            (char.name || '').toLowerCase().includes(term) ||
            (char.race || '').toLowerCase().includes(term) ||
            (char.class || '').toLowerCase().includes(term)
        );
        renderCharactersTable(filtered);
    }

    /**
     * Initialize characters search
     */
    function initCharactersSearch() {
        const searchInput = document.getElementById('charactersSearch');
        if (!searchInput) return;

        let searchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                filterCharacters(searchInput.value);
            }, 200);
        });
    }

    /**
     * Handle character actions (select, edit kaels, delete)
     */
    function initCharacterActions() {
        const tbody = document.getElementById('charactersTableBody');
        if (!tbody) return;

        tbody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const charId = btn.dataset.charId;
            const char = allCharacters.find(c => c.id === charId);
            if (!char) return;

            switch (action) {
                case 'select':
                    const result = await setActiveCharacter(charId);
                    if (result && result.success) {
                        showToast('Personnage activé', 'success');
                    }
                    break;
                case 'edit-kaels':
                    openKaelsModal(char);
                    break;
                case 'delete':
                    openDeleteModal(char);
                    break;
            }
        });
    }

    /**
     * Open kaels edit modal
     */
    function openKaelsModal(char) {
        const modal = document.getElementById('kaelsModal');
        if (!modal) return;

        const nameEl = modal.querySelector('#kaelsModalCharName');
        const input = modal.querySelector('#kaelsModalInput');

        if (nameEl) nameEl.textContent = char.name || 'Sans nom';
        if (input) input.value = char.kaels || 0;

        modal.dataset.charId = char.id;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * Open delete confirmation modal
     */
    function openDeleteModal(char) {
        const modal = document.getElementById('deleteModal');
        if (!modal) return;

        const nameEl = modal.querySelector('#deleteModalCharName');
        if (nameEl) nameEl.textContent = char.name || 'Sans nom';

        modal.dataset.charId = char.id;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Simple console log for now - could add actual toast UI later
        console.log(`[Admin Toast - ${type}] ${message}`);
    }

    // =================================================================
    // ECONOMY
    // =================================================================

    /**
     * Load characters for kaels dropdown
     */
    async function loadCharactersForKaels() {
        const selects = [
            document.getElementById('kaelsCharacterSelect'),
            document.getElementById('quickKaelsCharacter')
        ];

        selects.forEach(select => {
            if (!select) return;

            // Clear existing options except first
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add characters
            allCharacters.forEach(char => {
                const option = document.createElement('option');
                option.value = char.id;
                option.textContent = `${char.name || 'Sans nom'} (${char.kaels || 0} K)`;
                select.appendChild(option);
            });
        });
    }

    /**
     * Initialize quick kaels form
     */
    function initQuickKaelsForm() {
        const select = document.getElementById('quickKaelsCharacter');
        const amountInput = document.getElementById('quickKaelsAmount');
        const submitBtn = document.getElementById('quickKaelsSubmit');

        if (!select || !amountInput || !submitBtn) return;

        // Enable/disable submit based on form validity
        function updateSubmitState() {
            const hasCharacter = select.value !== '';
            const hasAmount = parseInt(amountInput.value, 10) > 0;
            submitBtn.disabled = !(hasCharacter && hasAmount);
        }

        select.addEventListener('change', updateSubmitState);
        amountInput.addEventListener('input', updateSubmitState);

        // Handle submit
        submitBtn.addEventListener('click', async () => {
            const charId = select.value;
            const amount = parseInt(amountInput.value, 10);
            const reason = document.getElementById('quickKaelsReason')?.value || '';

            if (!charId || !amount || amount <= 0) return;

            const char = allCharacters.find(c => c.id === charId);
            if (!char) return;

            const newKaels = (char.kaels || 0) + amount;

            try {
                const result = await updateCharacter(charId, { kaels: newKaels });
                if (result && result.success) {
                    // Update local data
                    char.kaels = newKaels;
                    renderCharactersTable(allCharacters);
                    loadDashboardStats();
                    loadCharactersForKaels();

                    // Log admin action
                    const reasonText = document.getElementById('quickKaelsReason')?.value || 'Aucune raison spécifiée';
                    await logActivity({
                        actionType: ActionTypes.KAELS_ADMIN_GRANT,
                        characterId: charId,
                        actionData: {
                            amount: amount,
                            previous_balance: char.kaels - amount,
                            new_balance: newKaels,
                            reason: reasonText
                        }
                    });

                    // Close modal and reset form
                    const modal = document.getElementById('giveKaelsModal');
                    bootstrap.Modal.getInstance(modal)?.hide();
                    select.value = '';
                    amountInput.value = '';
                    if (document.getElementById('quickKaelsReason')) {
                        document.getElementById('quickKaelsReason').value = '';
                    }
                    submitBtn.disabled = true;

                    showToast(`${amount} kaels donnés à ${char.name}`, 'success');
                    console.log('[Admin] Kaels given:', { charId, amount, reason });
                }
            } catch (err) {
                console.error('[Admin] Failed to give kaels:', err);
                showToast('Erreur lors de l\'envoi', 'error');
            }
        });
    }

    // =================================================================
    // INITIALIZATION
    // =================================================================

    /**
     * Initialize modal handlers for kaels and delete
     */
    function initModals() {
        // Kaels modal save handler
        const kaelsSaveBtn = document.getElementById('kaelsModalSave');
        if (kaelsSaveBtn) {
            kaelsSaveBtn.addEventListener('click', async () => {
                const modal = document.getElementById('kaelsModal');
                const charId = modal?.dataset.charId;
                const input = modal?.querySelector('#kaelsModalInput');
                const newKaels = parseInt(input?.value, 10);

                if (!charId || isNaN(newKaels) || newKaels < 0) {
                    showToast('Valeur invalide', 'error');
                    return;
                }

                try {
                    const char = allCharacters.find(c => c.id === charId);
                    const previousKaels = char?.kaels || 0;

                    const result = await updateCharacter(charId, { kaels: newKaels });
                    if (result && result.success) {
                        // Update local data
                        if (char) char.kaels = newKaels;
                        renderCharactersTable(allCharacters);
                        loadDashboardStats(); // Refresh total kaels

                        // Log admin action
                        await logActivity({
                            actionType: ActionTypes.KAELS_ADMIN_GRANT,
                            characterId: charId,
                            actionData: {
                                amount: newKaels - previousKaels,
                                previous_balance: previousKaels,
                                new_balance: newKaels,
                                reason: 'Modification manuelle par admin'
                            }
                        });

                        bootstrap.Modal.getInstance(modal)?.hide();
                        showToast('Kaels mis à jour', 'success');
                    }
                } catch (err) {
                    console.error('[Admin] Failed to update kaels:', err);
                    showToast('Erreur de mise à jour', 'error');
                }
            });
        }

        // Delete modal confirm handler
        const deleteConfirmBtn = document.getElementById('deleteModalConfirm');
        if (deleteConfirmBtn) {
            deleteConfirmBtn.addEventListener('click', async () => {
                const modal = document.getElementById('deleteModal');
                const charId = modal?.dataset.charId;

                if (!charId || !supabase) return;

                try {
                    const { error } = await supabase
                        .from('characters')
                        .delete()
                        .eq('id', charId);

                    if (error) throw error;

                    // Update local data
                    allCharacters = allCharacters.filter(c => c.id !== charId);
                    renderCharactersTable(allCharacters);
                    loadDashboardStats(); // Refresh counts

                    bootstrap.Modal.getInstance(modal)?.hide();
                    showToast('Personnage supprimé', 'success');
                } catch (err) {
                    console.error('[Admin] Failed to delete character:', err);
                    showToast('Erreur de suppression', 'error');
                }
            });
        }
    }

    async function init() {
        console.log('[Admin] Initializing...');

        // Check authentication
        const isAuthorized = await checkAuth();
        if (!isAuthorized) return;

        // Initialize Supabase early
        supabase = await getSupabaseClient();

        // Initialize navigation
        initNavigation();

        // Load initial data
        await loadDashboardStats();
        loadRecentActivity();
        loadUsers();
        loadCharacters();
        loadCharactersForKaels();

        // Initialize interactive features
        initCharactersSearch();
        initCharacterActions();
        initModals();
        initQuickKaelsForm();

        // Logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

        console.log('[Admin] Ready');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
