/**
 * Astoria Admin Panel
 * Built with Tabler UI Framework
 */

(function() {
    'use strict';

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
     * Load dashboard statistics
     * TODO: Connect to Supabase for real data
     */
    async function loadDashboardStats() {
        try {
            // Placeholder - will be replaced with actual Supabase queries
            const stats = {
                users: '12',
                characters: '28',
                items: '36',
                kaels: '15,420'
            };

            animateCounter('statUsers', stats.users);
            animateCounter('statCharacters', stats.characters);
            animateCounter('statItems', stats.items);
            animateCounter('statKaels', stats.kaels);

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
     * Load users list
     * TODO: Connect to Supabase
     */
    async function loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        // Placeholder
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="ti ti-database-off me-2"></i>
                    Connexion à la base de données requise
                </td>
            </tr>
        `;
    }

    // =================================================================
    // CHARACTERS PAGE
    // =================================================================

    /**
     * Load characters list
     * TODO: Connect to Supabase
     */
    async function loadCharacters() {
        const tbody = document.getElementById('charactersTableBody');
        if (!tbody) return;

        // Placeholder
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="ti ti-database-off me-2"></i>
                    Connexion à la base de données requise
                </td>
            </tr>
        `;
    }

    // =================================================================
    // ECONOMY
    // =================================================================

    /**
     * Load characters for kaels dropdown
     * TODO: Connect to Supabase
     */
    async function loadCharactersForKaels() {
        const selects = [
            document.getElementById('kaelsCharacterSelect'),
            document.getElementById('quickKaelsCharacter')
        ];

        selects.forEach(select => {
            if (!select) return;
            // Placeholder - will populate from Supabase
        });
    }

    // =================================================================
    // INITIALIZATION
    // =================================================================

    async function init() {
        console.log('[Admin] Initializing...');

        // Check authentication
        const isAuthorized = await checkAuth();
        if (!isAuthorized) return;

        // Initialize navigation
        initNavigation();

        // Load initial data
        loadDashboardStats();
        loadRecentActivity();
        loadUsers();
        loadCharacters();
        loadCharactersForKaels();

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
