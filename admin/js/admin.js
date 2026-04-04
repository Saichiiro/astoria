/**
 * Astoria Admin Panel
 * Built with Tabler UI Framework
 */

import { getSupabaseClient, getAllCharacters, updateCharacter, setActiveCharacter, clearActiveCharacter, getActiveCharacter, getAllItems } from '../../js/auth.js';
import { logActivity, ActionTypes } from '../../js/api/activity-logger.js';
import { getInventoryRows, setInventoryItem, getEquippedSlots } from '../../js/api/inventory-service.js';
import { getRouteHref } from '../../js/config/routes.js';
import { adminItemsModal } from './admin-items-modal.js';

(function() {
    'use strict';

    // Supabase reference
    let supabase = null;
    let allCharacters = [];
    let allItems = [];
    let allUsers = [];
    let inventoryInspectorCharId = '';
    const itemsMirrorState = {
        search: '',
        category: 'all',
        rarity: 'all',
        rank: 'all',
        pricing: 'all',
        sortBy: 'name',
        sortDir: 'asc'
    };

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
        quetes: { title: 'Quêtes', subtitle: 'Gestion du tableau des quêtes' },
        'fiche-joueur': { title: 'Fiche Joueur', subtitle: 'Vue complète et contrôle total par joueur' },
        competences: { title: 'Compétences', subtitle: 'Catalogue et allocations' },
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

        if (pageName === 'items') {
            void loadItemsMirror();
        }

        if (pageName === 'quetes') {
            void loadQuests();
        }

        if (pageName === 'fiche-joueur') {
            renderFicheJoueurList(document.getElementById('ficheJoueurSearch')?.value || '');
        }

        if (pageName === 'competences') {
            void loadCompetencesHealth();
        }

        console.log('[Admin] Navigated to:', pageName);
    }

    /**
     * Initialize navigation handlers
     */
    function initNavigation() {
        // Handle all elements with data-page attribute (nav links only, not page containers)
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-page]');
            if (target && target.dataset.page && !target.classList.contains('admin-page')) {
                e.preventDefault();
                navigateTo(target.dataset.page);
            }
        });

        // Stat cards with data-nav navigate to their admin page
        document.addEventListener('click', (e) => {
            const card = e.target.closest('[data-nav]');
            if (card && card.dataset.nav) {
                navigateTo(card.dataset.nav);
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

            // Check session version (bump SESSION_VERSION in session-store.js to force re-login)
            const SESSION_VERSION = 'v2';
            if (session.version !== SESSION_VERSION) {
                localStorage.removeItem('astoria_session');
                return redirectToLogin('Session expirée — reconnexion requise');
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

            // Refresh session timestamp (sliding expiration) — re-stamp version
            session.timestamp = Date.now();
            session.version = SESSION_VERSION;
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
        window.location.href = getRouteHref('characterHub');
        return false;
    }

    /**
     * Handle logout
     */
    function handleLogout() {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            localStorage.removeItem('astoria_session');
            localStorage.removeItem('astoria_active_character');
            window.location.href = getRouteHref('characterHub');
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

            // Get active quests count
            let activeQuestCount = 0;
            try {
                const { count: questCount } = await supabase
                    .from('quests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'available');
                activeQuestCount = questCount || 0;
            } catch {}

            // Get total quests count for quetes page
            let totalQuestCount = 0;
            try {
                const { count: questTotal } = await supabase
                    .from('quests')
                    .select('id', { count: 'exact', head: true });
                totalQuestCount = questTotal || 0;
            } catch {}

            animateCounter('statUsers', String(userCount || 0));
            animateCounter('statCharacters', String(allCharacters.length));
            animateCounter('statItems', String(allItems.length));
            animateCounter('statKaels', totalKaels.toLocaleString('fr-FR'));
            animateCounter('statQuests', String(activeQuestCount));
            animateCounter('statQuestsFull', String(totalQuestCount));
            animateCounter('statQuestsActive', String(activeQuestCount));

            if (inventoryInspectorCharId) {
                void loadCharacterInventoryInspector(inventoryInspectorCharId);
            }

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

    /**
     * Render recently active users on the dashboard
     * Uses already-loaded allUsers, zero extra queries
     */
    function renderRecentlyActive() {
        const container = document.getElementById('recentlyActiveList');
        if (!container) return;

        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;

        const recent = allUsers
            .filter(u => u.last_login && (now - new Date(u.last_login).getTime()) < 30 * DAY)
            .sort((a, b) => new Date(b.last_login) - new Date(a.last_login))
            .slice(0, 12);

        if (!recent.length) {
            container.innerHTML = '<small class="text-muted">Aucune connexion ce mois-ci.</small>';
            return;
        }

        container.innerHTML = recent.map(u => {
            const lastLogin = new Date(u.last_login);
            const diffMs = now - lastLogin.getTime();
            const diffMin = Math.floor(diffMs / (60 * 1000));
            const diffH = Math.floor(diffMs / (60 * 60 * 1000));
            const diffD = Math.floor(diffMs / DAY);
            const timeLabel = diffMin < 60 ? `${diffMin}min`
                : diffH < 24 ? `${diffH}h`
                : diffD === 1 ? 'hier'
                : `${diffD}j`;
            const isToday = diffMs < DAY;
            const dotColor = isToday ? 'bg-success' : 'bg-secondary';
            const todayClass = isToday ? ' active-today' : '';
            const isAdmin = u.role === 'admin';
            const avatarBg = isAdmin
                ? 'linear-gradient(135deg,#f59f00,#d4ac0d)'
                : 'linear-gradient(135deg,#667eea,#764ba2)';

            return `
                <div class="d-flex align-items-center gap-2 mb-2${todayClass}">
                    <span class="avatar avatar-xs" style="background:${avatarBg}; color:${isAdmin ? '#1a1225' : '#fff'}; font-size:.7rem; font-weight:700;">
                        ${(u.username || '?').charAt(0).toUpperCase()}
                    </span>
                    <div class="flex-fill" style="min-width:0;">
                        <div class="fw-semibold text-truncate" style="font-size:.82rem;">${u.username || '-'}${isAdmin ? ' <span style="font-size:.65rem;opacity:.7;">⚡</span>' : ''}</div>
                        <div class="text-muted" style="font-size:.72rem;">il y a ${timeLabel}</div>
                    </div>
                    <span class="status-dot ${dotColor}" style="flex-shrink:0;"></span>
                </div>
            `;
        }).join('');
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

                const roleClass = user.role === 'admin' ? 'badge-role-admin' : 'badge-role-player';
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

            allUsers = users;
            renderRecentlyActive();
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

        const activeCharacterId = getActiveCharacter?.()?.id || '';

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
            const isActiveTarget = activeCharacterId === char.id;

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
                            <button class="btn btn-sm ${isActiveTarget ? 'btn-warning' : 'btn-ghost-primary'}" data-action="select" data-char-id="${char.id}" title="${isActiveTarget ? 'Quitter cette cible' : 'Activer'}">
                                <i class="ti ${isActiveTarget ? 'ti-arrow-back-up' : 'ti-user-check'}"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost-warning" data-action="edit-kaels" data-char-id="${char.id}" title="Modifier Kaels">
                                <i class="ti ti-coin"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost-success" data-action="give-items" data-char-id="${char.id}" title="Donner des objets">
                                <i class="ti ti-gift"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost-info" data-action="view-inventory" data-char-id="${char.id}" title="Voir inventaire">
                                <i class="ti ti-backpack"></i>
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

    function normalizeItemKey(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function parseJsonObject(value) {
        if (!value) return {};
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return {};
            }
        }
        return {};
    }

    function normalizeRarityLabel(value) {
        const key = normalizeItemKey(value);
        if (!key) return '-';
        if (key === 'common') return 'Commun';
        if (key === 'epic') return 'Epique';
        if (key === 'mythic') return 'Mythique';
        if (key === 'legendary') return 'Legendaire';
        const labels = {
            commun: 'Commun',
            rare: 'Rare',
            epique: 'Epique',
            mythique: 'Mythique',
            legendaire: 'Legendaire'
        };
        return labels[key] || String(value || '-');
    }

    function getItemPricingMeta(item) {
        const images = parseJsonObject(item?.images);
        const pricing = parseJsonObject(images?.pricing);
        const fallback = Number.parseInt(item?.price_kaels, 10) || 0;
        const buy = Number.parseInt(pricing?.buy_kaels, 10);
        const sell = Number.parseInt(pricing?.sell_kaels, 10);
        return {
            buy: Number.isFinite(buy) && buy > 0 ? buy : fallback,
            sell: Number.isFinite(sell) && sell > 0 ? sell : fallback,
            isSplit: Number.isFinite(buy) && Number.isFinite(sell) && buy > 0 && sell > 0 && buy !== sell
        };
    }

    function getNormalizedAdminItems() {
        return (allItems || []).map((item) => {
            const pricing = getItemPricingMeta(item);
            return {
                id: item?.id || '',
                name: String(item?.name || '').trim() || 'Sans nom',
                category: String(item?.category || '').trim() || '-',
                rarity: normalizeRarityLabel(item?.rarity),
                rank: String(item?.rank || '').trim().toUpperCase() || '-',
                buy: pricing.buy,
                sell: pricing.sell,
                isSplit: pricing.isSplit,
                description: String(item?.description || ''),
                effect: String(item?.effect || '')
            };
        });
    }

    function populateItemsMirrorFilters(items) {
        const categorySelect = document.getElementById('adminItemsMirrorCategory');
        const raritySelect = document.getElementById('adminItemsMirrorRarity');
        const rankSelect = document.getElementById('adminItemsMirrorRank');
        if (!categorySelect || !raritySelect || !rankSelect) return;

        const fillSelect = (select, values, allLabel) => {
            const previous = select.value || 'all';
            select.innerHTML = `<option value="all">${allLabel}</option>`;
            values.forEach((value) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
            select.value = values.includes(previous) ? previous : 'all';
        };

        const categories = Array.from(new Set(items.map((item) => item.category).filter((value) => value && value !== '-'))).sort((a, b) => a.localeCompare(b, 'fr'));
        const rarities = Array.from(new Set(items.map((item) => item.rarity).filter((value) => value && value !== '-'))).sort((a, b) => a.localeCompare(b, 'fr'));
        const ranks = Array.from(new Set(items.map((item) => item.rank).filter((value) => value && value !== '-'))).sort((a, b) => a.localeCompare(b, 'fr'));

        fillSelect(categorySelect, categories, 'Toutes categories');
        fillSelect(raritySelect, rarities, 'Toutes raretes');
        fillSelect(rankSelect, ranks, 'Tous rangs');
    }

    function getFilteredItemsMirrorRows(items) {
        const search = normalizeItemKey(itemsMirrorState.search);
        const rows = items.filter((item) => {
            if (itemsMirrorState.category !== 'all' && item.category !== itemsMirrorState.category) return false;
            if (itemsMirrorState.rarity !== 'all' && item.rarity !== itemsMirrorState.rarity) return false;
            if (itemsMirrorState.rank !== 'all' && item.rank !== itemsMirrorState.rank) return false;
            if (itemsMirrorState.pricing === 'split' && !item.isSplit) return false;
            if (itemsMirrorState.pricing === 'legacy' && item.isSplit) return false;
            if (!search) return true;
            const haystack = normalizeItemKey(`${item.name} ${item.description} ${item.effect} ${item.category} ${item.rarity} ${item.rank}`);
            return haystack.includes(search);
        });

        const direction = itemsMirrorState.sortDir === 'desc' ? -1 : 1;
        rows.sort((a, b) => {
            const by = itemsMirrorState.sortBy;
            if (by === 'buy' || by === 'sell') {
                return ((a[by] || 0) - (b[by] || 0)) * direction;
            }
            const left = String(a[by] || '');
            const right = String(b[by] || '');
            return left.localeCompare(right, 'fr', { sensitivity: 'base' }) * direction;
        });
        return rows;
    }

    function renderItemsMirror() {
        const tbody = document.getElementById('adminItemsMirrorBody');
        const countEl = document.getElementById('adminItemsMirrorCount');
        if (!tbody || !countEl) return;

        const rows = getFilteredItemsMirrorRows(getNormalizedAdminItems());
        if (!rows.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">Aucun objet ne correspond aux filtres.</td>
                </tr>
            `;
            countEl.textContent = '0 objet(s)';
            return;
        }

        tbody.innerHTML = rows.map((item) => `
            <tr>
                <td class="fw-semibold">${item.name}</td>
                <td>${item.category}</td>
                <td>${item.rarity}</td>
                <td>${item.rank}</td>
                <td>${item.buy > 0 ? `${item.buy.toLocaleString('fr-FR')} kaels` : '-'}</td>
                <td>${item.sell > 0 ? `${item.sell.toLocaleString('fr-FR')} kaels` : '-'}</td>
                <td>
                    <span class="badge ${item.isSplit ? 'bg-green-lt text-green' : 'bg-secondary-lt text-secondary'}">
                        ${item.isSplit ? 'Separer' : 'Legacy'}
                    </span>
                </td>
            </tr>
        `).join('');

        countEl.textContent = `${rows.length} objet(s)`;
    }

    async function loadItemsMirror({ force = false } = {}) {
        if (force || !Array.isArray(allItems) || allItems.length === 0) {
            allItems = await getAllItems() || [];
        }
        const normalized = getNormalizedAdminItems();
        populateItemsMirrorFilters(normalized);
        renderItemsMirror();
    }

    function initItemsMirrorControls() {
        const searchInput = document.getElementById('adminItemsMirrorSearch');
        const categorySelect = document.getElementById('adminItemsMirrorCategory');
        const raritySelect = document.getElementById('adminItemsMirrorRarity');
        const rankSelect = document.getElementById('adminItemsMirrorRank');
        const pricingSelect = document.getElementById('adminItemsMirrorPricing');
        const refreshBtn = document.getElementById('adminItemsMirrorRefresh');
        const sortHeaders = Array.from(document.querySelectorAll('[data-page="items"] th.sortable[data-sort]'));

        if (!searchInput || !categorySelect || !raritySelect || !rankSelect || !pricingSelect || !refreshBtn) return;

        searchInput.addEventListener('input', () => {
            itemsMirrorState.search = searchInput.value || '';
            renderItemsMirror();
        });

        categorySelect.addEventListener('change', () => {
            itemsMirrorState.category = categorySelect.value || 'all';
            renderItemsMirror();
        });

        raritySelect.addEventListener('change', () => {
            itemsMirrorState.rarity = raritySelect.value || 'all';
            renderItemsMirror();
        });

        rankSelect.addEventListener('change', () => {
            itemsMirrorState.rank = rankSelect.value || 'all';
            renderItemsMirror();
        });

        pricingSelect.addEventListener('change', () => {
            itemsMirrorState.pricing = pricingSelect.value || 'all';
            renderItemsMirror();
        });

        refreshBtn.addEventListener('click', async () => {
            await loadItemsMirror({ force: true });
            showToast('Codex miroir actualise', 'success');
        });

        sortHeaders.forEach((header) => {
            header.addEventListener('click', () => {
                const key = header.dataset.sort;
                if (!key) return;
                if (itemsMirrorState.sortBy === key) {
                    itemsMirrorState.sortDir = itemsMirrorState.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    itemsMirrorState.sortBy = key;
                    itemsMirrorState.sortDir = 'asc';
                }
                renderItemsMirror();
            });
        });
    }

    function getItemCatalogLookups() {
        const byId = new Map();
        const byName = new Map();

        (allItems || []).forEach((item) => {
            const id = String(item?.id || '').trim();
            const name = String(item?.name || '').trim();
            if (id && !byId.has(id)) byId.set(id, item);
            const normalized = normalizeItemKey(name);
            if (normalized && !byName.has(normalized)) byName.set(normalized, item);
        });

        return { byId, byName };
    }

    function populateInventoryInspectorCharacters(characters) {
        const select = document.getElementById('adminInventoryCharacterSelect');
        if (!select) return;

        const previous = select.value;
        select.innerHTML = '<option value="">Selectionner un personnage...</option>';

        (characters || []).forEach((char) => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = `${char.name || 'Sans nom'} (${(char.kaels || 0).toLocaleString('fr-FR')} K)`;
            select.appendChild(option);
        });

        if (previous && (characters || []).some((char) => char.id === previous)) {
            select.value = previous;
        }
    }

    async function renderInventoryInspectorEquipment(character) {
        const container = document.getElementById('adminInventoryEquipment');
        if (!container) return;

        const slotLabels = {
            head: 'Tete', neck: 'Cou', shoulders: 'Epaules', chest: 'Torse',
            cape: 'Cape', cloak: 'Cape', amulet: 'Collier', gloves: 'Gants',
            belt: 'Ceinture', ring1: 'Anneau G', ring2: 'Anneau D', boots: 'Bottes',
            artifact: 'Artefact', companion: 'Familier', pet: 'Familier',
            weapon: 'Arme', offhand: 'Main G', mount: 'Monture'
        };

        if (!character?.id) {
            container.innerHTML = '<span class="text-muted">Aucun equipement enregistre.</span>';
            return;
        }

        try {
            const rows = await getEquippedSlots(character.id);
            if (!rows || !rows.length) {
                container.innerHTML = '<span class="text-muted">Aucun equipement enregistre.</span>';
                return;
            }
            container.innerHTML = rows.map((row) => {
                const slotLabel = slotLabels[row.slot_key] || row.slot_key;
                return `<span class="admin-inventory-slot"><strong>${slotLabel}</strong> ${row.item_key || 'Inconnu'}</span>`;
            }).join('');
        } catch {
            container.innerHTML = '<span class="text-muted">Aucun equipement enregistre.</span>';
        }
    }

    function renderInventoryInspectorRows(rows) {
        const tbody = document.getElementById('adminInventoryRows');
        if (!tbody) return;

        if (!Array.isArray(rows) || rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">Inventaire vide.</td>
                </tr>
            `;
            return;
        }

        const { byId, byName } = getItemCatalogLookups();
        tbody.innerHTML = rows.map((row) => {
            const itemId = String(row?.item_id || '').trim();
            const itemKey = String(row?.item_key || '').trim();
            const byIdMatch = itemId ? byId.get(itemId) : null;
            const byNameMatch = byName.get(normalizeItemKey(itemKey));
            const item = byIdMatch || byNameMatch || null;
            const itemName = item?.name || itemKey || '(item inconnu)';
            const category = item?.category || '-';
            const qty = Math.max(0, Math.floor(Number(row?.qty) || 0));
            const rowItemKey = itemKey || item?.name || '';
            const rowItemId = itemId || item?._dbId || '';

            return `
                <tr>
                    <td>${itemName}</td>
                    <td class="text-muted">${category}</td>
                    <td><span class="badge bg-primary-lt">${qty}</span></td>
                    <td class="text-muted"><code>${itemId || '-'}</code></td>
                    <td>
                        <div class="btn-list">
                            <button type="button" class="btn btn-sm btn-outline-warning" data-admin-inv-adjust="-1" data-item-key="${rowItemKey}" data-item-id="${rowItemId}" title="Retirer 1">-1</button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-admin-inv-adjust="0" data-item-key="${rowItemKey}" data-item-id="${rowItemId}" title="Supprimer">Suppr.</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('[data-admin-inv-adjust]').forEach((button) => {
            button.addEventListener('click', async () => {
                const delta = Number(button.dataset.adminInvAdjust || 0);
                const itemKey = String(button.dataset.itemKey || '').trim();
                const itemId = String(button.dataset.itemId || '').trim();
                if (!inventoryInspectorCharId || (!itemKey && !itemId)) return;

                const currentRows = await getInventoryRows(inventoryInspectorCharId).catch(() => []);
                const target = currentRows.find((entry) => {
                    const sameId = itemId && String(entry?.item_id || '') === itemId;
                    const sameKey = itemKey && String(entry?.item_key || '') === itemKey;
                    return Boolean(sameId || sameKey);
                });
                if (!target) return;

                const currentQty = Math.max(0, Math.floor(Number(target.qty) || 0));
                const nextQty = delta === 0 ? 0 : Math.max(0, currentQty + delta);

                await setInventoryItem(
                    inventoryInspectorCharId,
                    {
                        item_key: target.item_key || itemKey,
                        item_id: target.item_id || itemId || null,
                        item_index: target.item_index
                    },
                    nextQty
                );

                await loadCharacterInventoryInspector(inventoryInspectorCharId);
            });
        });
    }

    async function loadCharacterInventoryInspector(characterId) {
        const summary = document.getElementById('adminInventorySummary');
        const select = document.getElementById('adminInventoryCharacterSelect');
        const character = allCharacters.find((char) => char.id === characterId);

        if (!characterId || !character) {
            inventoryInspectorCharId = '';
            renderInventoryInspectorRows([]);
            renderInventoryInspectorEquipment(null);
            if (summary) {
                summary.textContent = 'Selectionne un personnage pour afficher son inventaire et son equipement.';
            }
            return;
        }

        inventoryInspectorCharId = characterId;
        if (select && select.value !== characterId) {
            select.value = characterId;
        }
        if (summary) {
            summary.textContent = `Chargement de l'inventaire de ${character.name || 'ce personnage'}...`;
        }

        try {
            const rows = await getInventoryRows(characterId);
            renderInventoryInspectorRows(rows);
            renderInventoryInspectorEquipment(character);

            const totalUnits = (rows || []).reduce((sum, row) => sum + Math.max(0, Math.floor(Number(row?.qty) || 0)), 0);
            if (summary) {
                summary.textContent = `${character.name || 'Personnage'}: ${rows.length} type(s) d'objet, ${totalUnits} unite(s).`;
            }
        } catch (error) {
            console.error('[Admin] Failed to load character inventory inspector:', error);
            renderInventoryInspectorRows([]);
            if (summary) {
                summary.textContent = `Erreur de chargement inventaire: ${error.message || 'inconnue'}`;
            }
        }
    }

    function initCharacterInventoryInspector() {
        const select = document.getElementById('adminInventoryCharacterSelect');
        const refreshBtn = document.getElementById('adminInventoryRefreshBtn');
        if (!select || !refreshBtn) return;

        select.addEventListener('change', async () => {
            await loadCharacterInventoryInspector(select.value);
        });

        refreshBtn.addEventListener('click', async () => {
            if (!select.value) return;
            await loadCharacterInventoryInspector(select.value);
        });
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
            populateInventoryInspectorCharacters(allCharacters);
            loadCharactersForKaels();
            if (inventoryInspectorCharId) {
                await loadCharacterInventoryInspector(inventoryInspectorCharId);
            }
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

        // Filter dropdown buttons
        document.querySelectorAll('[data-char-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.charFilter;
                // Update active state on dropdown items
                document.querySelectorAll('[data-char-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (filter === 'all') {
                    renderCharactersTable(allCharacters);
                } else if (filter === 'active') {
                    renderCharactersTable(allCharacters.filter(c => c.is_active !== false));
                } else if (filter === 'inactive') {
                    renderCharactersTable(allCharacters.filter(c => c.is_active === false));
                }

                // Also reset search
                if (searchInput) searchInput.value = '';
            });
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
                    if (getActiveCharacter?.()?.id === charId) {
                        clearActiveCharacter?.();
                        renderCharactersTable(allCharacters);
                        showToast('Cible admin retirÃ©e', 'success');
                        break;
                    }

                    const result = await setActiveCharacter(charId);
                    if (result && result.success) {
                        renderCharactersTable(allCharacters);
                        showToast('Personnage activé', 'success');
                    }
                    break;
                case 'edit-kaels':
                    openKaelsModal(char);
                    break;
                case 'give-items':
                    await adminItemsModal.openForCharacter(charId, (charId, items) => {
                        console.log(`Items given to character ${charId}:`, items);
                        renderCharactersTable(allCharacters);
                        loadDashboardStats();
                        if (inventoryInspectorCharId === charId) {
                            void loadCharacterInventoryInspector(charId);
                        }
                    });
                    break;
                case 'view-inventory':
                    await loadCharacterInventoryInspector(charId);
                    document.querySelector('.admin-inventory-inspector')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
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
        const safeType = String(type || 'info').toLowerCase();
        const toastApi = (typeof window !== 'undefined' && window.toastManager) ? window.toastManager : null;
        if (toastApi && typeof toastApi[safeType] === 'function') {
            toastApi[safeType](message);
            return;
        }
        console.log(`[Admin Toast - ${type}] ${message}`);
    }

    // =================================================================
    // ECONOMY
    // =================================================================

    function formatKaelsTransferMessage(amount, charName) {
        if (amount > 0) {
            return `${amount} kaels donnés à ${charName}`;
        }
        return `${Math.abs(amount)} kaels retirés à ${charName}`;
    }

    async function applyKaelsTransfer({ charId, amount, reason = '', source = 'admin_panel' }) {
        const parsedAmount = parseInt(amount, 10);
        if (!charId || Number.isNaN(parsedAmount) || parsedAmount === 0) {
            return { success: false, error: 'INVALID_INPUT' };
        }

        const char = allCharacters.find(c => c.id === charId);
        if (!char) {
            return { success: false, error: 'CHARACTER_NOT_FOUND' };
        }

        const previousKaels = Number(char.kaels) || 0;
        const newKaels = previousKaels + parsedAmount;
        if (newKaels < 0) {
            return { success: false, error: 'INSUFFICIENT_KAELS' };
        }

        const result = await updateCharacter(charId, { kaels: newKaels });
        if (!result || !result.success) {
            return { success: false, error: 'UPDATE_FAILED' };
        }

        char.kaels = newKaels;
        renderCharactersTable(allCharacters);
        loadDashboardStats();
        loadCharactersForKaels();

        const reasonText = reason?.trim() || 'Aucune raison spécifiée';
        await logActivity({
            actionType: ActionTypes.KAELS_ADMIN_GRANT,
            characterId: charId,
            actionData: {
                amount: parsedAmount,
                previous_balance: previousKaels,
                new_balance: newKaels,
                reason: reasonText,
                source
            }
        });

        return {
            success: true,
            char,
            amount: parsedAmount
        };
    }

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
        const reasonInput = document.getElementById('quickKaelsReason');
        const submitBtn = document.getElementById('quickKaelsSubmit');

        if (!select || !amountInput || !submitBtn) return;

        function updateSubmitState() {
            const hasCharacter = select.value !== '';
            const amount = parseInt(amountInput.value, 10);
            const hasAmount = !Number.isNaN(amount) && amount > 0;
            submitBtn.disabled = !(hasCharacter && hasAmount);
        }

        select.addEventListener('change', updateSubmitState);
        amountInput.addEventListener('input', updateSubmitState);

        submitBtn.addEventListener('click', async () => {
            const charId = select.value;
            const amount = parseInt(amountInput.value, 10);
            const reason = reasonInput?.value || '';

            try {
                const result = await applyKaelsTransfer({
                    charId,
                    amount,
                    reason,
                    source: 'quick_actions_modal'
                });

                if (!result.success) {
                    if (result.error === 'INSUFFICIENT_KAELS') {
                        showToast('Solde insuffisant pour ce retrait', 'error');
                    } else {
                        showToast('Erreur lors de l\'envoi', 'error');
                    }
                    return;
                }

                const modal = document.getElementById('giveKaelsModal');
                bootstrap.Modal.getInstance(modal)?.hide();
                select.value = '';
                amountInput.value = '';
                if (reasonInput) reasonInput.value = '';
                submitBtn.disabled = true;

                showToast(formatKaelsTransferMessage(result.amount, result.char.name || 'Sans nom'), 'success');
                console.log('[Admin] Kaels updated via quick modal:', { charId, amount, reason });
            } catch (err) {
                console.error('[Admin] Failed to give kaels:', err);
                showToast('Erreur lors de l\'envoi', 'error');
            }
        });
    }

    /**
     * Initialize economy kaels form
     */
    function initEconomyKaelsForm() {
        const form = document.getElementById('kaelsForm');
        const select = document.getElementById('kaelsCharacterSelect');
        const amountInput = document.getElementById('kaelsAmount');
        const reasonInput = document.getElementById('kaelsReason');
        const submitBtn = form?.querySelector('button[type="submit"]');

        if (!form || !select || !amountInput || !submitBtn) return;

        function updateSubmitState() {
            const hasCharacter = select.value !== '';
            const amount = parseInt(amountInput.value, 10);
            const hasAmount = !Number.isNaN(amount) && amount !== 0;
            submitBtn.disabled = !(hasCharacter && hasAmount);
        }

        select.addEventListener('change', updateSubmitState);
        amountInput.addEventListener('input', updateSubmitState);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const charId = select.value;
            const amount = parseInt(amountInput.value, 10);
            const reason = reasonInput?.value || '';

            try {
                const result = await applyKaelsTransfer({
                    charId,
                    amount,
                    reason,
                    source: 'economy_page'
                });

                if (!result.success) {
                    if (result.error === 'INSUFFICIENT_KAELS') {
                        showToast('Solde insuffisant pour ce retrait', 'error');
                    } else {
                        showToast('Action impossible, vérifie personnage et montant', 'error');
                    }
                    return;
                }

                amountInput.value = '';
                if (reasonInput) reasonInput.value = '';
                updateSubmitState();
                showToast(formatKaelsTransferMessage(result.amount, result.char.name || 'Sans nom'), 'success');
            } catch (err) {
                console.error('[Admin] Failed to apply kaels from economy form:', err);
                showToast('Erreur de mise à jour', 'error');
            }
        });

        updateSubmitState();
    }

    /**
     * Link quick-actions Kaels button to the same main give-kaels modal
     */
    function initQuickActionsBridge() {
        const quickActionGiveKaels = document.getElementById('quickActionGiveKaels');
        if (!quickActionGiveKaels) return;

        quickActionGiveKaels.addEventListener('click', (event) => {
            event.preventDefault();

            const quickModalEl = document.getElementById('quickActionsModal');
            const giveKaelsModalEl = document.getElementById('giveKaelsModal');
            if (!giveKaelsModalEl) return;

            const openGiveKaelsModal = () => {
                const giveKaelsModal = bootstrap.Modal.getOrCreateInstance(giveKaelsModalEl);
                giveKaelsModal.show();
            };

            if (quickModalEl && quickModalEl.classList.contains('show')) {
                quickModalEl.addEventListener('hidden.bs.modal', openGiveKaelsModal, { once: true });
                bootstrap.Modal.getOrCreateInstance(quickModalEl).hide();
            } else {
                openGiveKaelsModal();
            }
        });
    }

    // Give Items button handler
    const giveItemsBtn = document.getElementById('giveItemsBtn');
    if (giveItemsBtn) {
        giveItemsBtn.addEventListener('click', async () => {
            const charSelect = document.getElementById('kaelsCharacterSelect');
            const characterId = charSelect?.value;

            if (!characterId) {
                alert('Veuillez sélectionner un personnage');
                return;
            }

            adminItemsModal.openForCharacter(characterId, (charId, items) => {
                console.log(`Items given to character ${charId}:`, items);
                renderCharactersTable(allCharacters);
                loadDashboardStats();
            });
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
                    populateInventoryInspectorCharacters(allCharacters);
                    if (inventoryInspectorCharId === charId) {
                        await loadCharacterInventoryInspector('');
                    }
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

    // =================================================================
    // QUÊTES CRUD
    // =================================================================

    let allQuests = [];

    const QUEST_STATUS_LABELS = {
        available:   { label: 'Disponible',  color: '#66bb6a' },
        in_progress: { label: 'En cours',    color: '#ff9800' },
        locked:      { label: 'Verrouillée', color: '#ef5350' },
    };

    const QUEST_RANK_COLORS = {
        F:'#78909c', E:'#90a4ae', D:'#66bb6a', C:'#42a5f5',
        B:'#7e57c2', A:'#ef5350', S:'#ff9800', 'S+':'#f06292',
        SS:'#ab47bc', SSS:'#d4ac0d',
    };

    async function loadQuests() {
        const tbody = document.getElementById('questsTableBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;
        try {
            const { data, error } = await supabase
                .from('quests')
                .select('id, name, type, rank, status, repeatable, max_participants, description, rewards, images, completed_by')
                .order('created_at', { ascending: false });
            if (error) throw error;
            allQuests = data || [];

            // Get participant counts
            const { data: parts } = await supabase
                .from('quest_participants')
                .select('quest_id');
            const partCounts = {};
            (parts || []).forEach(p => { partCounts[p.quest_id] = (partCounts[p.quest_id] || 0) + 1; });
            allQuests.forEach(q => { q._partCount = partCounts[q.id] || 0; });

            sortAndRender();
            animateCounter('statQuestsFull', String(allQuests.length));
            animateCounter('statQuestsActive', String(allQuests.filter(q => q.status === 'available').length));
            animateCounter('statQuests', String(allQuests.filter(q => q.status === 'available').length));
        } catch (err) {
            console.error('[Admin] loadQuests error:', err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Erreur de chargement</td></tr>`;
        }
    }

    function renderQuestsTable(quests) {
        const tbody = document.getElementById('questsTableBody');
        if (!tbody) return;
        if (!quests.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">Aucune quête</td></tr>`;
            return;
        }
        tbody.innerHTML = quests.map(q => {
            const st = QUEST_STATUS_LABELS[q.status] || { label: q.status, color: '#999' };
            const rankColor = QUEST_RANK_COLORS[q.rank] || '#78909c';
            const maxP = q.max_participants || '∞';
            const kaelsReward = (() => {
                const r = (q.rewards || []).find(r => r.name === 'Kaels');
                return r ? `<span class="quest-kaels-badge"><i class="ti ti-coin"></i> ${r.qty}</span>` : '';
            })();
            const statusBadge = `<span class="quest-status-badge" style="color:${st.color};background:${st.color}18;border-color:${st.color}35;">${st.label}</span>`;
            const rankBadge = `<span class="quest-rank-badge" style="color:${rankColor};background:${rankColor}15;border-color:${rankColor}40;">${q.rank || '?'}</span>`;
            return `<tr>
                <td>
                    <div class="fw-semibold text-white">${q.name || '—'}</div>
                    ${kaelsReward}
                </td>
                <td><span class="quest-type-label">${q.type || '—'}</span></td>
                <td>${rankBadge}</td>
                <td>${statusBadge}</td>
                <td><span class="quest-part-count">${q._partCount} <span class="text-muted">/ ${maxP}</span></span></td>
                <td>${q.repeatable ? '<span class="quest-repeatable-yes">↻ Oui</span>' : '<span class="text-muted" style="font-size:.8rem;">—</span>'}</td>
                <td>
                    <div class="btn-list flex-nowrap">
                        <button class="btn btn-sm btn-ghost-warning" title="Modifier" data-quest-edit="${q.id}"><i class="ti ti-edit"></i></button>
                        <button class="btn btn-sm btn-ghost-info" title="Participants" data-quest-parts="${q.id}"><i class="ti ti-users"></i></button>
                        <button class="btn btn-sm btn-ghost-danger" title="Supprimer" data-quest-delete="${q.id}"><i class="ti ti-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    let questSortCol = null;
    let questSortDir = 1; // 1 = asc, -1 = desc
    let questActiveFilter = 'all';
    let questModalInstance = null;

    const QUEST_RANK_ORDER = ['F','E','D','C','B','A','S','S+','SS','SSS'];

    function getFilteredQuests() {
        return questActiveFilter === 'all' ? allQuests : allQuests.filter(q => q.status === questActiveFilter);
    }

    function sortAndRender() {
        let quests = [...getFilteredQuests()];
        if (questSortCol) {
            quests.sort((a, b) => {
                let av = a[questSortCol] ?? '';
                let bv = b[questSortCol] ?? '';
                if (questSortCol === 'rank') {
                    av = QUEST_RANK_ORDER.indexOf(av);
                    bv = QUEST_RANK_ORDER.indexOf(bv);
                    return (av - bv) * questSortDir;
                }
                return String(av).localeCompare(String(bv), 'fr') * questSortDir;
            });
        }
        renderQuestsTable(quests);
        // Update indicators
        document.querySelectorAll('.sort-indicator[data-sort-col]').forEach(el => {
            if (el.dataset.sortCol === questSortCol) {
                el.textContent = questSortDir === 1 ? '↑' : '↓';
                el.classList.add('active');
            } else {
                el.textContent = '↕';
                el.classList.remove('active');
            }
        });
    }

    function initQuestsPage() {
        const questModalEl = document.getElementById('questModal');
        questModalInstance = questModalEl ? bootstrap.Modal.getOrCreateInstance(questModalEl) : null;

        // Filter buttons
        document.getElementById('questFilterBtns')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-quest-filter]');
            if (!btn) return;
            document.querySelectorAll('[data-quest-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            questActiveFilter = btn.dataset.questFilter;
            sortAndRender();
        });

        // Column sort headers
        document.querySelector('[data-page="quetes"] thead')?.addEventListener('click', (e) => {
            const th = e.target.closest('[data-quest-sort]');
            if (!th) return;
            const col = th.dataset.questSort;
            if (questSortCol === col) {
                questSortDir *= -1;
            } else {
                questSortCol = col;
                questSortDir = 1;
            }
            sortAndRender();
        });

        // Create button
        document.getElementById('btnCreateQuest')?.addEventListener('click', () => openQuestModal(null));

        // Table actions (delegated)
        document.getElementById('questsTableBody')?.addEventListener('click', async (e) => {
            const editBtn   = e.target.closest('[data-quest-edit]');
            const partsBtn  = e.target.closest('[data-quest-parts]');
            const deleteBtn = e.target.closest('[data-quest-delete]');
            if (editBtn)   openQuestModal(allQuests.find(q => q.id === editBtn.dataset.questEdit));
            if (partsBtn)  openParticipantsModal(partsBtn.dataset.questParts);
            if (deleteBtn) await deleteQuest(deleteBtn.dataset.questDelete);
        });

        // Save quest
        document.getElementById('btnSaveQuest')?.addEventListener('click', saveQuest);

        // Add reward buttons
        document.getElementById('btnAddKaelsReward')?.addEventListener('click', () => addRewardRow('kaels'));
        document.getElementById('btnAddItemReward')?.addEventListener('click', () => addRewardRow('item'));

        questModalEl?.addEventListener('hidden.bs.modal', resetQuestForm);
    }

    function resetQuestForm() {
        document.getElementById('questModalTitle').textContent = 'Nouvelle quÃªte';
        document.getElementById('questModalId').value = '';
        document.getElementById('questFormName').value = '';
        document.getElementById('questFormType').value = 'ExpÃ©dition';
        document.getElementById('questFormRank').value = 'F';
        document.getElementById('questFormStatus').value = 'available';
        document.getElementById('questFormMaxPart').value = 5;
        document.getElementById('questFormRepeatable').checked = false;
        document.getElementById('questFormDesc').value = '';
        const imagesInput = document.getElementById('questFormImages');
        if (imagesInput) imagesInput.value = '';
        const list = document.getElementById('questRewardsList');
        if (list) list.innerHTML = '';
    }

    function serializeQuestImages(images) {
        return (Array.isArray(images) ? images : [])
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .join('\n');
    }

    function parseQuestImagesInput() {
        const rawValue = document.getElementById('questFormImages')?.value || '';
        return rawValue
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean);
    }

    function openQuestModal(quest) {
        resetQuestForm();
        document.getElementById('questModalTitle').textContent = quest ? 'Modifier la quête' : 'Nouvelle quête';
        document.getElementById('questModalId').value = quest?.id || '';
        document.getElementById('questFormName').value = quest?.name || '';
        document.getElementById('questFormType').value = quest?.type || 'Expédition';
        document.getElementById('questFormRank').value = quest?.rank || 'F';
        document.getElementById('questFormStatus').value = quest?.status || 'available';
        document.getElementById('questFormMaxPart').value = quest?.max_participants || 5;
        document.getElementById('questFormRepeatable').checked = quest?.repeatable || false;
        document.getElementById('questFormDesc').value = quest?.description || '';
        const imagesInput = document.getElementById('questFormImages');
        if (imagesInput) {
            imagesInput.value = serializeQuestImages(quest?.images);
        }

        // Populate rewards
        const list = document.getElementById('questRewardsList');
        list.innerHTML = '';
        (quest?.rewards || []).forEach(r => {
            if (r.name === 'Kaels') addRewardRow('kaels', r.qty);
            else addRewardRow('item', r.qty, r.name);
        });

        questModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('questModal'));
        questModalInstance.show();
    }

    function addRewardRow(type, qty = '', name = '') {
        const list = document.getElementById('questRewardsList');
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 align-items-center reward-row';
        row.dataset.rewardType = type;
        if (type === 'kaels') {
            row.innerHTML = `
                <span class="badge bg-yellow-lt text-warning flex-shrink-0"><i class="ti ti-coin"></i> Kaels</span>
                <input type="number" class="form-control form-control-sm reward-qty" placeholder="Quantité" value="${qty}" min="1">
                <button type="button" class="btn btn-sm btn-ghost-danger btn-remove-reward"><i class="ti ti-x"></i></button>`;
        } else {
            row.innerHTML = `
                <span class="badge bg-blue-lt text-blue flex-shrink-0"><i class="ti ti-box"></i> Objet</span>
                <input type="text" class="form-control form-control-sm reward-name" placeholder="Nom de l'objet" value="${name}">
                <input type="number" class="form-control form-control-sm reward-qty" placeholder="Qté" value="${qty}" min="1" style="width:80px">
                <button type="button" class="btn btn-sm btn-ghost-danger btn-remove-reward"><i class="ti ti-x"></i></button>`;
        }
        row.querySelector('.btn-remove-reward').addEventListener('click', () => row.remove());
        list.appendChild(row);
    }

    function readRewards() {
        return Array.from(document.querySelectorAll('#questRewardsList .reward-row')).map(row => {
            const type = row.dataset.rewardType;
            const qty = parseInt(row.querySelector('.reward-qty')?.value) || 0;
            if (type === 'kaels') return { name: 'Kaels', qty };
            const name = row.querySelector('.reward-name')?.value?.trim();
            if (!name) return null;
            return { name, qty };
        }).filter(Boolean);
    }

    async function saveQuest() {
        const id   = document.getElementById('questModalId').value;
        const name = document.getElementById('questFormName').value.trim();
        if (!name) { showToast('Le nom est requis', 'error'); return; }

        const payload = {
            name,
            type:             document.getElementById('questFormType').value,
            rank:             document.getElementById('questFormRank').value,
            status:           document.getElementById('questFormStatus').value,
            max_participants: parseInt(document.getElementById('questFormMaxPart').value) || 5,
            repeatable:       document.getElementById('questFormRepeatable').checked,
            description:      document.getElementById('questFormDesc').value.trim(),
            images:           parseQuestImagesInput(),
            rewards:          readRewards(),
        };

        const btn = document.getElementById('btnSaveQuest');
        btn.disabled = true;
        try {
            let error;
            if (id) {
                ({ error } = await supabase.from('quests').update(payload).eq('id', id));
            } else {
                payload.completed_by = [];
                ({ error } = await supabase.from('quests').insert(payload));
            }
            if (error) throw error;
            questModalInstance?.hide();
            showToast(id ? 'Quête mise à jour' : 'Quête créée', 'success');
            await loadQuests();
        } catch (err) {
            console.error('[Admin] saveQuest error:', err);
            showToast('Erreur de sauvegarde', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async function deleteQuest(id) {
        const quest = allQuests.find(q => q.id === id);
        if (!confirm(`Supprimer "${quest?.name || id}" ? Cette action est irréversible.`)) return;
        try {
            const { error } = await supabase.from('quests').delete().eq('id', id);
            if (error) throw error;
            showToast('Quête supprimée', 'success');
            await loadQuests();
        } catch (err) {
            console.error('[Admin] deleteQuest error:', err);
            showToast('Erreur de suppression', 'error');
        }
    }

    async function openParticipantsModal(questId) {
        const quest = allQuests.find(q => q.id === questId);
        document.getElementById('questParticipantsTitle').textContent = quest?.name || 'Participants';
        const body = document.getElementById('questParticipantsBody');
        body.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>`;
        new bootstrap.Modal(document.getElementById('questParticipantsModal')).show();
        try {
            const { data, error } = await supabase
                .from('quest_participants')
                .select('joined_at, characters(id, name)')
                .eq('quest_id', questId)
                .order('joined_at', { ascending: true });
            if (error) throw error;
            if (!data?.length) {
                body.innerHTML = `<p class="text-muted text-center py-3">Aucun participant.</p>`;
                showToast('Aucun participant pour cette quête', 'info');
                return;
            }
            body.innerHTML = `<ul class="list-group list-group-flush">
                ${data.map(p => {
                    const charName = p.characters?.name || 'Inconnu';
                    const joined = p.joined_at ? new Date(p.joined_at).toLocaleDateString('fr-FR') : '—';
                    return `<li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="ti ti-user me-2 text-muted"></i>${charName}</span>
                        <small class="text-muted">${joined}</small>
                    </li>`;
                }).join('')}
            </ul>`;
        } catch (err) {
            body.innerHTML = `<p class="text-danger text-center py-3">Erreur de chargement</p>`;
            showToast('Erreur lors du chargement des participants', 'error');
        }
    }

    // =================================================================
    // FICHE JOUEUR
    // =================================================================

    let fjSelectedUser = null;
    let fjSelectedChars = [];
    let fjActiveTab = 'characters';

    function initFicheJoueur() {
        // Search filter
        document.getElementById('ficheJoueurSearch')?.addEventListener('input', (e) => {
            renderFicheJoueurList(e.target.value.toLowerCase());
        });

        // Tab clicks
        document.getElementById('fjTabs')?.addEventListener('click', (e) => {
            const a = e.target.closest('[data-fj-tab]');
            if (!a) return;
            e.preventDefault();
            document.querySelectorAll('[data-fj-tab]').forEach(t => t.classList.remove('active'));
            a.classList.add('active');
            fjActiveTab = a.dataset.fjTab;
            renderFjContext();
            renderFjTab();
        });

        // Role button
        document.getElementById('fjBtnRole')?.addEventListener('click', async () => {
            if (!fjSelectedUser) return;
            const newRole = fjSelectedUser.role === 'admin' ? 'player' : 'admin';
            if (!confirm(`Passer ${fjSelectedUser.username} en "${newRole}" ?`)) return;
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', fjSelectedUser.id);
            if (error) { showToast('Erreur', 'error'); return; }
            fjSelectedUser.role = newRole;
            const idx = allUsers.findIndex(u => u.id === fjSelectedUser.id);
            if (idx >= 0) allUsers[idx].role = newRole;
            showToast(`Rôle mis à jour : ${newRole}`, 'success');
            renderFjHeader();
        });

        // Ban/unban button
        document.getElementById('fjBtnToggleActive')?.addEventListener('click', async () => {
            if (!fjSelectedUser) return;
            const newActive = fjSelectedUser.is_active === false ? true : false;
            const label = newActive ? 'réactiver' : 'bannir';
            if (!confirm(`Voulez-vous ${label} ${fjSelectedUser.username} ?`)) return;
            const { error } = await supabase.from('users').update({ is_active: newActive }).eq('id', fjSelectedUser.id);
            if (error) { showToast('Erreur', 'error'); return; }
            fjSelectedUser.is_active = newActive;
            const idx = allUsers.findIndex(u => u.id === fjSelectedUser.id);
            if (idx >= 0) allUsers[idx].is_active = newActive;
            showToast(newActive ? 'Joueur réactivé' : 'Joueur banni', 'success');
            renderFjHeader();
        });

        // Render list from already-loaded users
        renderFicheJoueurList('');
    }

    function renderFicheJoueurList(filter) {
        const container = document.getElementById('ficheJoueurList');
        if (!container) return;
        const users = allUsers.filter(u => !filter || u.username?.toLowerCase().includes(filter));
        if (!users.length) {
            container.innerHTML = '<div class="text-center py-3 text-muted small">Aucun résultat</div>';
            return;
        }
        container.innerHTML = users.map(u => {
            const isSelected = fjSelectedUser?.id === u.id;
            const isAdmin = u.role === 'admin';
            const isBanned = u.is_active === false;
            const avatarBg = isAdmin ? 'linear-gradient(135deg,#f59f00,#d4ac0d)' : 'linear-gradient(135deg,#667eea,#764ba2)';
            const avatarColor = isAdmin ? '#1a1225' : '#fff';
            return `<div class="fj-user-row ${isSelected ? 'selected' : ''} ${isBanned ? 'banned' : ''}" data-fj-uid="${u.id}">
                <span class="avatar avatar-xs" style="background:${avatarBg};color:${avatarColor};font-size:.7rem;font-weight:700;flex-shrink:0;">
                    ${(u.username||'?').charAt(0).toUpperCase()}
                </span>
                <div class="flex-fill" style="min-width:0;">
                    <div class="fj-user-name">${u.username || '—'}${isAdmin ? ' ⚡' : ''}</div>
                    ${isBanned ? '<div class="fj-user-meta text-danger">Banni</div>' : ''}
                </div>
                <i class="ti ti-chevron-right fj-arrow"></i>
            </div>`;
        }).join('');

        container.querySelectorAll('.fj-user-row').forEach(row => {
            row.addEventListener('click', () => selectFjUser(row.dataset.fjUid));
        });
    }

    async function selectFjUser(uid) {
        fjSelectedUser = allUsers.find(u => u.id === uid);
        if (!fjSelectedUser) return;

        // Update selected state in list
        document.querySelectorAll('.fj-user-row').forEach(r => r.classList.toggle('selected', r.dataset.fjUid === uid));

        // Show profile panel
        document.getElementById('ficheJoueurEmpty')?.classList.add('d-none');
        const profile = document.getElementById('ficheJoueurProfile');
        profile?.classList.remove('d-none');

        // Load characters
        const { data: chars } = await supabase
            .from('characters')
            .select('id, name, kaels, is_active, profile_data')
            .eq('user_id', uid);
        fjSelectedChars = chars || [];

        renderFjHeader();

        // Reset to characters tab
        fjActiveTab = 'characters';
        document.querySelectorAll('[data-fj-tab]').forEach(t => t.classList.toggle('active', t.dataset.fjTab === 'characters'));
        renderFjContext();
        renderFjTab();
    }

    function renderFjHeader() {
        const u = fjSelectedUser;
        if (!u) return;
        const isAdmin = u.role === 'admin';
        const isBanned = u.is_active === false;
        const avatarBg = isAdmin ? 'linear-gradient(135deg,#f59f00,#d4ac0d)' : 'linear-gradient(135deg,#667eea,#764ba2)';
        const avatarColor = isAdmin ? '#1a1225' : '#fff';

        document.getElementById('fjAvatar').style.cssText = `background:${avatarBg};color:${avatarColor};`;
        document.getElementById('fjAvatar').textContent = (u.username||'?').charAt(0).toUpperCase();
        document.getElementById('fjUsername').textContent = u.username || '—';
        document.getElementById('fjRoleBadge').innerHTML = isAdmin
            ? '<span class="badge badge-role-admin"><i class="ti ti-shield-check me-1"></i>Admin</span>'
            : '<span class="badge badge-role-player"><i class="ti ti-user me-1"></i>Joueur</span>';
        document.getElementById('fjLastLogin').textContent = u.last_login
            ? new Date(u.last_login).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
            : 'Jamais';
        const totalKaels = fjSelectedChars.reduce((s, c) => s + (c.kaels || 0), 0);
        document.getElementById('fjCharCount').textContent = fjSelectedChars.length;
        document.getElementById('fjTotalKaels').textContent = totalKaels.toLocaleString('fr-FR');

        const banBtn = document.getElementById('fjBtnToggleActive');
        banBtn.innerHTML = isBanned
            ? '<i class="ti ti-check me-1"></i>Réactiver'
            : '<i class="ti ti-ban me-1"></i>Bannir';
        banBtn.className = `btn btn-sm ${isBanned ? 'btn-outline-success' : 'btn-outline-danger'}`;

        renderFjContext();
        const roleBtn = document.getElementById('fjBtnRole');
        roleBtn.innerHTML = isAdmin
            ? '<i class="ti ti-user me-1"></i>→ Joueur'
            : '<i class="ti ti-shield me-1"></i>→ Admin';
    }

    function renderFjTab() {
        const container = document.getElementById('fjTabContent');
        if (!container) return;
        if (fjActiveTab === 'characters') renderFjTabCharacters(container);
        else if (fjActiveTab === 'inventory') renderFjTabInventory(container);
        else if (fjActiveTab === 'kaels') renderFjTabKaels(container);
        else if (fjActiveTab === 'quests') renderFjTabQuestsV2(container);
    }

    function formatAdminQuestDate(value, { withTime = false } = {}) {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString(
                'fr-FR',
                withTime
                    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                    : { day: '2-digit', month: '2-digit', year: 'numeric' }
            );
        } catch {
            return '—';
        }
    }

    function cleanAdminHtml(value) {
        return String(value ?? '—')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderFjContext() {
        const bar = document.getElementById('fjContextBar');
        if (!bar) return;
        if (!fjSelectedUser) {
            bar.innerHTML = '';
            bar.hidden = true;
            return;
        }

        const activeTabLabelMap = {
            characters: 'Personnages',
            inventory: 'Inventaire',
            kaels: 'Kaels',
            quests: 'Quêtes'
        };
        const singleCharLabel = fjSelectedChars.length === 1 ? (fjSelectedChars[0]?.name || 'Sans nom') : null;
        const pills = [
            { icon: 'ti-user', label: fjSelectedUser.username || '—' },
            { icon: 'ti-layers-subtract', label: singleCharLabel || `${fjSelectedChars.length} personnage(s)` },
            { icon: 'ti-layout-grid', label: activeTabLabelMap[fjActiveTab] || 'Fiche joueur' }
        ];

        if (fjSelectedUser.role === 'admin') {
            pills.push({ icon: 'ti-shield-check', label: 'Compte staff' });
        }
        if (fjSelectedUser.is_active === false) {
            pills.push({ icon: 'ti-ban', label: 'Compte banni' });
        }

        bar.hidden = false;
        bar.innerHTML = pills.map((pill) => `
            <span class="fj-context-pill">
                <i class="ti ${pill.icon}"></i>
                ${cleanAdminHtml(pill.label)}
            </span>
        `).join('');
    }

    function renderFjTabCharacters(container) {
        if (!fjSelectedChars.length) {
            container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-mask"></i><div class="mt-2 text-muted">Aucun personnage</div></div></div>';
            return;
        }
        container.innerHTML = `<div class="row g-3">${fjSelectedChars.map(c => {
            const active = c.is_active !== false;
            return `<div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <span class="avatar" style="background:linear-gradient(135deg,#d24b8f,#880e4f);color:#fff;font-weight:700;">${(c.name||'?').charAt(0)}</span>
                            <div class="flex-fill">
                                <div class="fw-semibold text-white">${c.name || '—'}</div>
                                <div class="small text-muted">${active ? '<span class="text-success">Actif</span>' : '<span class="text-danger">Inactif</span>'}</div>
                            </div>
                            <span class="badge bg-yellow-lt text-warning"><i class="ti ti-coin me-1"></i>${(c.kaels||0).toLocaleString('fr-FR')}</span>
                        </div>
                        <div class="btn-list">
                            <button class="btn btn-sm btn-outline-warning" data-fj-char-kaels="${c.id}"><i class="ti ti-coin me-1"></i>Kaels</button>
                            <button class="btn btn-sm btn-outline-info" data-fj-char-inv="${c.id}"><i class="ti ti-backpack me-1"></i>Inventaire</button>
                            <button class="btn btn-sm ${active ? 'btn-outline-danger' : 'btn-outline-success'}" data-fj-char-toggle="${c.id}" data-fj-char-active="${active}">
                                ${active ? '<i class="ti ti-eye-off me-1"></i>Désactiver' : '<i class="ti ti-eye me-1"></i>Activer'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;

        // Wire buttons
        container.querySelectorAll('[data-fj-char-toggle]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const charId = btn.dataset.fjCharToggle;
                const wasActive = btn.dataset.fjCharActive === 'true';
                const { error } = await supabase.from('characters').update({ is_active: !wasActive }).eq('id', charId);
                if (error) { showToast('Erreur', 'error'); return; }
                const c = fjSelectedChars.find(x => x.id === charId);
                if (c) c.is_active = !wasActive;
                showToast(wasActive ? 'Personnage désactivé' : 'Personnage activé', 'success');
                renderFjTabCharacters(container);
            });
        });
        container.querySelectorAll('[data-fj-char-kaels]').forEach(btn => {
            btn.addEventListener('click', () => {
                fjActiveTab = 'kaels';
                document.querySelectorAll('[data-fj-tab]').forEach(t => t.classList.toggle('active', t.dataset.fjTab === 'kaels'));
                renderFjTab();
            });
        });
        container.querySelectorAll('[data-fj-char-inv]').forEach(btn => {
            btn.addEventListener('click', () => {
                fjActiveTab = 'inventory';
                document.querySelectorAll('[data-fj-tab]').forEach(t => t.classList.toggle('active', t.dataset.fjTab === 'inventory'));
                renderFjTab();
            });
        });
    }

    function renderFjTabKaels(container) {
        if (!fjSelectedChars.length) {
            container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-coin"></i><div class="mt-2 text-muted">Aucun personnage</div></div></div>';
            return;
        }
        container.innerHTML = `<div class="card"><div class="card-body"><div class="row g-3">
            ${fjSelectedChars.map(c => `
                <div class="col-md-6">
                    <div class="card card-body" style="background:rgba(245,159,0,.06);border-color:rgba(245,159,0,.2);">
                        <div class="fw-semibold text-white mb-2">${c.name}</div>
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <span class="badge bg-yellow-lt text-warning fs-4 px-3 py-2"><i class="ti ti-coin me-1"></i>${(c.kaels||0).toLocaleString('fr-FR')}</span>
                        </div>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control fj-kaels-input" placeholder="Montant (+/-)" data-char-id="${c.id}">
                            <button class="btn btn-outline-success fj-kaels-add" data-char-id="${c.id}" title="Ajouter"><i class="ti ti-plus"></i></button>
                            <button class="btn btn-outline-danger fj-kaels-remove" data-char-id="${c.id}" title="Retirer"><i class="ti ti-minus"></i></button>
                            <button class="btn btn-outline-warning fj-kaels-set" data-char-id="${c.id}" title="Définir exactement"><i class="ti ti-pencil"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div></div></div>`;

        async function applyKaels(charId, mode) {
            const input = container.querySelector(`.fj-kaels-input[data-char-id="${charId}"]`);
            const amount = parseInt(input?.value);
            if (isNaN(amount) || amount < 0) { showToast('Montant invalide', 'error'); return; }
            const char = fjSelectedChars.find(c => c.id === charId);
            let newKaels;
            if (mode === 'add') newKaels = (char.kaels || 0) + amount;
            else if (mode === 'remove') newKaels = Math.max(0, (char.kaels || 0) - amount);
            else newKaels = amount;
            const { error } = await supabase.from('characters').update({ kaels: newKaels }).eq('id', charId);
            if (error) { showToast('Erreur', 'error'); return; }
            char.kaels = newKaels;
            if (input) input.value = '';
            showToast(`Kaels mis à jour : ${newKaels.toLocaleString('fr-FR')}`, 'success');
            renderFjHeader();
            renderFjTabKaels(container);
        }

        container.querySelectorAll('.fj-kaels-add').forEach(btn => btn.addEventListener('click', () => applyKaels(btn.dataset.charId, 'add')));
        container.querySelectorAll('.fj-kaels-remove').forEach(btn => btn.addEventListener('click', () => applyKaels(btn.dataset.charId, 'remove')));
        container.querySelectorAll('.fj-kaels-set').forEach(btn => btn.addEventListener('click', () => applyKaels(btn.dataset.charId, 'set')));
    }

    async function renderFjTabInventory(container) {
        container.innerHTML = `<div class="card"><div class="card-body text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></div></div>`;
        try {
            const charIds = fjSelectedChars.map(c => c.id);
            if (!charIds.length) { container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-backpack"></i><div class="mt-2 text-muted">Aucun personnage</div></div></div>'; return; }
            const { data: rows } = await supabase
                .from('character_inventory')
                .select('id, character_id, item_key, qty, item_id')
                .in('character_id', charIds)
                .order('item_key');
            const items = rows || [];
            if (!items.length) { container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-backpack"></i><div class="mt-2 text-muted">Inventaire vide</div></div></div>'; return; }
            const charMap = Object.fromEntries(fjSelectedChars.map(c => [c.id, c.name]));
            container.innerHTML = `<div class="card"><div class="table-sheet"><table class="table table-vcenter">
                <thead><tr>
                    <th>Objet</th><th>Personnage</th><th style="width:120px">Quantité</th><th style="width:80px">Actions</th>
                </tr></thead>
                <tbody>${items.map(row => `<tr>
                    <td class="fw-semibold text-white">${row.item_key || '—'}</td>
                    <td class="text-muted">${charMap[row.character_id] || '—'}</td>
                    <td><span class="badge bg-blue-lt text-blue">×${row.qty}</span></td>
                    <td>
                        <button class="btn btn-sm btn-ghost-danger" data-fj-inv-delete="${row.id}" title="Retirer"><i class="ti ti-trash"></i></button>
                    </td>
                </tr>`).join('')}
                </tbody>
            </table></div></div>`;

            container.querySelectorAll('[data-fj-inv-delete]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Retirer cet objet ?')) return;
                    const { error } = await supabase.from('character_inventory').delete().eq('id', btn.dataset.fjInvDelete);
                    if (error) { showToast('Erreur', 'error'); return; }
                    showToast('Objet retiré', 'success');
                    renderFjTabInventory(container);
                });
            });
        } catch { container.innerHTML = '<div class="card"><div class="empty-state text-danger">Erreur de chargement</div></div>'; }
    }

    async function renderFjTabQuests(container) {
        container.innerHTML = `<div class="card"><div class="card-body text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></div></div>`;
        try {
            const charIds = fjSelectedChars.map(c => c.id);
            if (!charIds.length) { container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-map-2"></i><div class="mt-2 text-muted">Aucun personnage</div></div></div>'; return; }
            const { data: parts } = await supabase
                .from('quest_participants')
                .select('quest_id, joined_at, characters(name), quests(name, rank, status)')
                .in('character_id', charIds)
                .order('joined_at', { ascending: false });
            const list = parts || [];
            if (!list.length) { container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-map-2"></i><div class="mt-2 text-muted">Aucune participation</div></div></div>'; return; }
            container.innerHTML = `<div class="card"><div class="table-sheet"><table class="table table-vcenter">
                <thead><tr><th>Quête</th><th style="width:70px">Rang</th><th style="width:120px">Statut</th><th>Personnage</th><th>Rejoint le</th></tr></thead>
                <tbody>${list.map(p => {
                    const rank = p.quests?.rank || '?';
                    const rc = QUEST_RANK_COLORS[rank] || '#999';
                    const st = QUEST_STATUS_LABELS[p.quests?.status] || { label: p.quests?.status || '—', color: '#999' };
                    return `<tr>
                        <td class="fw-semibold text-white">${p.quests?.name || '—'}</td>
                        <td><span class="quest-rank-badge" style="color:${rc};background:${rc}15;border-color:${rc}40;">${rank}</span></td>
                        <td><span class="quest-status-badge" style="color:${st.color};background:${st.color}18;border-color:${st.color}35;">${st.label}</span></td>
                        <td class="text-muted">${p.characters?.name || '—'}</td>
                        <td class="text-muted small">${p.joined_at ? new Date(p.joined_at).toLocaleDateString('fr-FR') : '—'}</td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table></div></div>`;
        } catch { container.innerHTML = '<div class="card"><div class="empty-state text-danger">Erreur de chargement</div></div>'; }
    }

    async function renderFjTabQuestsV2(container) {
        container.innerHTML = `<div class="card"><div class="card-body text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></div></div>`;
        try {
            const charIds = fjSelectedChars.map(c => c.id);
            if (!charIds.length) {
                container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-map-2"></i><div class="mt-2 text-muted">Aucun personnage</div></div></div>';
                return;
            }

            const charNames = [...new Set(fjSelectedChars.map(c => String(c.name || '').trim()).filter(Boolean))];
            const [partsRes, historyByIdRes, historyByLabelRes] = await Promise.all([
                supabase
                    .from('quest_participants')
                    .select('quest_id, joined_at, characters(name), quests(id, name, rank, status, type)')
                    .in('character_id', charIds)
                    .order('joined_at', { ascending: false }),
                supabase
                    .from('quest_history')
                    .select('*')
                    .in('character_id', charIds)
                    .order('date', { ascending: false })
                    .limit(80),
                charNames.length
                    ? supabase
                        .from('quest_history')
                        .select('*')
                        .in('character_label', charNames)
                        .order('date', { ascending: false })
                        .limit(80)
                    : Promise.resolve({ data: [], error: null })
            ]);

            const activeEntries = partsRes?.data || [];
            const historyMerged = [...(historyByIdRes?.data || []), ...(historyByLabelRes?.data || [])];
            const historyMap = new Map();
            historyMerged.forEach((row) => {
                const key = String(
                    row?.id
                    || `${row?.date || ''}|${row?.quest_id || ''}|${row?.name || ''}|${row?.character_id || row?.character_label || ''}`
                );
                if (!historyMap.has(key)) historyMap.set(key, row);
            });
            const historyEntries = [...historyMap.values()]
                .sort((a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime());

            if (!activeEntries.length && !historyEntries.length) {
                container.innerHTML = '<div class="card"><div class="empty-state"><i class="ti ti-map-2"></i><div class="mt-2 text-muted">Aucune trace de quête pour ce joueur</div></div></div>';
                return;
            }

            const activeCount = activeEntries.length;
            const completedCount = historyEntries.length;
            const lastRun = historyEntries[0]?.date || activeEntries[0]?.joined_at || null;

            container.innerHTML = `
                <div class="fj-quest-summary-grid mb-3">
                    <div class="card fj-quest-stat">
                        <div class="card-body">
                            <div class="fj-quest-stat-label">Journal de route</div>
                            <div class="fj-quest-stat-value">${completedCount}</div>
                            <div class="fj-quest-stat-meta">quête(s) réalisées</div>
                        </div>
                    </div>
                    <div class="card fj-quest-stat">
                        <div class="card-body">
                            <div class="fj-quest-stat-label">Expéditions en piste</div>
                            <div class="fj-quest-stat-value">${activeCount}</div>
                            <div class="fj-quest-stat-meta">participation(s) active(s)</div>
                        </div>
                    </div>
                    <div class="card fj-quest-stat">
                        <div class="card-body">
                            <div class="fj-quest-stat-label">Dernière trace</div>
                            <div class="fj-quest-stat-value fj-quest-stat-value--date">${cleanAdminHtml(formatAdminQuestDate(lastRun, { withTime: true }))}</div>
                            <div class="fj-quest-stat-meta">activité RP la plus récente</div>
                        </div>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-12 col-xl-5">
                        <div class="card fj-quest-panel h-100">
                            <div class="card-header">
                                <h3 class="card-title mb-0"><i class="ti ti-swords me-2"></i>Expéditions en cours</h3>
                            </div>
                            <div class="card-body">
                                ${activeEntries.length ? `<div class="fj-quest-list">
                                    ${activeEntries.map((entry) => {
                                        const rank = entry.quests?.rank || '?';
                                        const rankColor = QUEST_RANK_COLORS[rank] || '#999';
                                        const status = QUEST_STATUS_LABELS[entry.quests?.status] || { label: entry.quests?.status || '—', color: '#999' };
                                        return `<article class="fj-quest-entry">
                                            <div class="fj-quest-entry-top">
                                                <span class="quest-rank-badge" style="color:${rankColor};background:${rankColor}15;border-color:${rankColor}40;">${cleanAdminHtml(rank)}</span>
                                                <span class="quest-status-badge" style="color:${status.color};background:${status.color}18;border-color:${status.color}35;">${cleanAdminHtml(status.label)}</span>
                                            </div>
                                            <div class="fj-quest-entry-title">${cleanAdminHtml(entry.quests?.name || '—')}</div>
                                            <div class="fj-quest-entry-meta">
                                                <span><i class="ti ti-user me-1"></i>${cleanAdminHtml(entry.characters?.name || '—')}</span>
                                                <span><i class="ti ti-clock-hour-4 me-1"></i>${cleanAdminHtml(formatAdminQuestDate(entry.joined_at, { withTime: true }))}</span>
                                            </div>
                                        </article>`;
                                    }).join('')}
                                </div>` : `<div class="empty-state fj-quest-empty"><i class="ti ti-campfire"></i><div class="mt-2 text-muted">Aucune expédition active</div></div>`}
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-xl-7">
                        <div class="card fj-quest-panel h-100">
                            <div class="card-header">
                                <h3 class="card-title mb-0"><i class="ti ti-scroll me-2"></i>Chronique des quêtes réalisées</h3>
                            </div>
                            <div class="card-body">
                                ${historyEntries.length ? `<div class="fj-quest-timeline">
                                    ${historyEntries.map((entry) => {
                                        const rank = entry?.rank || '?';
                                        const rankColor = QUEST_RANK_COLORS[rank] || '#999';
                                        const characterLabel = entry?.character_label || fjSelectedChars.find(c => c.id === entry?.character_id)?.name || '—';
                                        return `<article class="fj-quest-timeline-entry">
                                            <div class="fj-quest-timeline-marker" style="background:${rankColor}"></div>
                                            <div class="fj-quest-timeline-content">
                                                <div class="fj-quest-timeline-top">
                                                    <span class="quest-rank-badge" style="color:${rankColor};background:${rankColor}15;border-color:${rankColor}40;">${cleanAdminHtml(rank)}</span>
                                                    <span class="fj-quest-timeline-date">${cleanAdminHtml(formatAdminQuestDate(entry?.date, { withTime: true }))}</span>
                                                </div>
                                                <div class="fj-quest-entry-title">${cleanAdminHtml(entry?.name || '—')}</div>
                                                <div class="fj-quest-entry-meta">
                                                    <span><i class="ti ti-user me-1"></i>${cleanAdminHtml(characterLabel)}</span>
                                                    <span><i class="ti ti-sparkles me-1"></i>${cleanAdminHtml(entry?.type || 'Quête')}</span>
                                                </div>
                                                ${entry?.gains ? `<div class="fj-quest-gains"><i class="ti ti-gift me-1"></i>${cleanAdminHtml(entry.gains)}</div>` : ''}
                                            </div>
                                        </article>`;
                                    }).join('')}
                                </div>` : `<div class="empty-state fj-quest-empty"><i class="ti ti-book-off"></i><div class="mt-2 text-muted">Aucune quête validée</div></div>`}
                            </div>
                        </div>
                    </div>
                </div>`;
        } catch {
            container.innerHTML = '<div class="card"><div class="empty-state text-danger">Erreur de chargement</div></div>';
        }
    }

    // =================================================================
    // COMPÉTENCES HEALTH
    // =================================================================

    const COMP_CATEGORIES = [
        { id: 'arts',          label: 'Arts' },
        { id: 'connaissances', label: 'Conn.' },
        { id: 'combat',        label: 'Combat' },
        { id: 'social',        label: 'Social' },
        { id: 'nature',        label: 'Nature' },
        { id: 'physique',      label: 'Physique' },
        { id: 'pouvoirs',      label: 'Pouvoirs' },
        { id: 'artisanat',     label: 'Artisanat' },
        { id: 'reputation',    label: 'Réputation' },
    ];

    async function loadCompetencesHealth() {
        const container = document.getElementById('competencesHealthTable');
        if (!container) return;
        container.innerHTML = '<div class="text-center p-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Chargement...</div>';

        try {
            if (!supabase) supabase = await getSupabaseClient();
            const { data: characters, error } = await supabase
                .from('characters')
                .select('id, name, profile_data')
                .order('name');

            if (error) throw error;
            if (!characters?.length) {
                container.innerHTML = '<div class="text-center p-4 text-muted">Aucun personnage trouvé.</div>';
                return;
            }

            const characterIds = characters
                .map((char) => char?.id)
                .filter(Boolean);

            let competencesByCharacterId = new Map();
            if (characterIds.length) {
                const { data: competencesRows, error: competencesError } = await supabase
                    .from('character_competences')
                    .select('character_id, data')
                    .in('character_id', characterIds);

                if (competencesError) throw competencesError;

                competencesByCharacterId = new Map(
                    (competencesRows || [])
                        .filter((row) => row?.character_id)
                        .map((row) => [String(row.character_id), row?.data || null])
                );
            }

            const rows = characters.map(char => {
                const dbCompetences = competencesByCharacterId.get(String(char.id)) || null;
                const legacyCompetences = char.profile_data?.competences || null;
                const competences = dbCompetences || legacyCompetences || null;
                const source = dbCompetences ? 'table' : (legacyCompetences ? 'legacy' : 'missing');
                if (!competences) return { name: char.name, source, noData: true };

                const points = competences.pointsByCategory || {};
                const base = competences.baseValuesByCategory || {};

                const cats = COMP_CATEGORIES.map(cat => {
                    const remaining = points[cat.id] ?? 0;
                    const spent = Object.values(base[cat.id] || {})
                        .reduce((s, v) => s + (Number(v) || 0), 0);
                    return { ...cat, remaining, spent };
                });

                const totalRemaining = cats.reduce((s, c) => s + c.remaining, 0);
                const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
                return { name: char.name, cats, totalRemaining, totalSpent, source };
            });

            const summary = rows.reduce((acc, row) => {
                if (row.source === 'table') acc.table += 1;
                else if (row.source === 'legacy') acc.legacy += 1;
                else acc.missing += 1;
                return acc;
            }, { table: 0, legacy: 0, missing: 0 });

            const html = `
            <div class="competences-health-summary">
                <div class="competences-health-pill is-table">Table dédiée: <strong>${summary.table}</strong></div>
                <div class="competences-health-pill is-legacy">Profil hérité: <strong>${summary.legacy}</strong></div>
                <div class="competences-health-pill is-missing">Aucune donnée: <strong>${summary.missing}</strong></div>
            </div>
            <div class="table-sheet">
                <table class="table table-vcenter">
                    <thead>
                        <tr>
                            <th>Personnage</th>
                            ${COMP_CATEGORIES.map(c => `<th class="text-center" style="width:72px;">${c.label}</th>`).join('')}
                            <th class="text-center" style="width:92px;">Alloué</th>
                            <th class="text-center" style="width:92px;">Restant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => {
                            const sourceLabel = row.source === 'table'
                                ? '<span class="competences-health-source is-table">Table</span>'
                                : row.source === 'legacy'
                                    ? '<span class="competences-health-source is-legacy">Profil hérité</span>'
                                    : '<span class="competences-health-source is-missing">Aucune donnée</span>';

                            if (row.noData) return `
                                <tr>
                                    <td>
                                        <div class="competences-health-name">${row.name}</div>
                                        ${sourceLabel}
                                    </td>
                                    <td colspan="${COMP_CATEGORIES.length + 2}" class="text-muted small fst-italic">Aucune donnée détectée dans la table dédiée ni dans le profil hérité.</td>
                                </tr>`;

                            return `<tr>
                                <td title="${row.name}">
                                    <div class="competences-health-name">${row.name}</div>
                                    ${sourceLabel}
                                    <div class="competences-health-meta">
                                        <span>Alloué ${row.totalSpent}</span>
                                        <span>Reste ${row.totalRemaining}</span>
                                    </div>
                                </td>
                                ${row.cats.map(cat => {
                                    const remaining = cat.remaining;
                                    const remainingColor = remaining === 0 ? '#2fb344' : remaining <= 10 ? '#f59f00' : '#d63939';
                                    const spentColor = cat.spent > 0 ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.45)';
                                    return `<td class="text-center" title="${cat.id} — Alloué: ${cat.spent} | Restant: ${remaining}">
                                        <div class="competences-health-metric">
                                            <span class="competences-health-metric-main" style="color:${spentColor};">${cat.spent}</span>
                                            <span class="competences-health-metric-sub" style="color:${remainingColor};">r ${remaining}</span>
                                        </div>
                                    </td>`;
                                }).join('')}
                                <td class="text-center">
                                    <strong style="color:${row.totalSpent > 0 ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.45)'};">${row.totalSpent}</strong>
                                </td>
                                <td class="text-center">
                                    <strong style="color:${row.totalRemaining === 0 ? '#2fb344' : row.totalRemaining <= 30 ? '#f59f00' : '#d63939'};">${row.totalRemaining}</strong>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="px-3 pb-2 text-muted small">
                Les cellules affichent <strong>alloué</strong> puis <strong>reste</strong>. La table dédiée reste prioritaire; le profil hérité n'est utilisé qu'en secours.
            </div>`;

            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<div class="text-center p-4 text-danger"><i class="ti ti-alert-circle me-2"></i>Erreur : ${err.message}</div>`;
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
        await loadCharacters();
        loadCharactersForKaels();

        // Initialize interactive features
        initCharactersSearch();
        initCharacterActions();
        initCharacterInventoryInspector();
        initItemsMirrorControls();
        initModals();
        initQuickKaelsForm();
        initEconomyKaelsForm();
        initQuickActionsBridge();
        await loadItemsMirror();
        initQuestsPage();
        initFicheJoueur();

        // Competences health refresh button
        document.getElementById('refreshCompetencesHealth')?.addEventListener('click', () => {
            void loadCompetencesHealth();
        });

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
