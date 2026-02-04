/**
 * Astoria Admin Panel
 * Core functionality for the admin dashboard
 */

(function() {
    'use strict';

    // =================================================================
    // NAVIGATION
    // =================================================================

    const sidebar = document.getElementById('adminSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navItems = document.querySelectorAll('.admin-nav-item[data-page]');
    const pages = document.querySelectorAll('.admin-page[data-page]');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

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
        settings: { title: 'Paramètres', subtitle: 'Configuration système' }
    };

    /**
     * Navigate to a page
     */
    function navigateTo(pageName) {
        // Update nav items
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // Update pages
        pages.forEach(page => {
            page.classList.toggle('active', page.dataset.page === pageName);
        });

        // Update header
        const info = PAGE_TITLES[pageName] || { title: pageName, subtitle: '' };
        if (pageTitle) pageTitle.textContent = info.title;
        if (pageSubtitle) pageSubtitle.textContent = info.subtitle;

        // Update URL hash
        window.location.hash = pageName;

        // Close sidebar on mobile
        if (window.innerWidth <= 640) {
            sidebar?.classList.remove('open');
        }
    }

    /**
     * Initialize navigation
     */
    function initNavigation() {
        // Nav item clicks
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) navigateTo(page);
            });
        });

        // Sidebar toggle
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                sidebar?.classList.toggle('collapsed');
                // Save preference
                localStorage.setItem('admin_sidebar_collapsed', sidebar?.classList.contains('collapsed'));
            });
        }

        // Restore sidebar state
        const sidebarCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';
        if (sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
        }

        // Handle initial hash
        const hash = window.location.hash.slice(1) || 'dashboard';
        navigateTo(hash);

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            navigateTo(hash);
        });
    }

    // =================================================================
    // AUTH CHECK
    // =================================================================

    /**
     * Check if user is admin
     */
    async function checkAdminAuth() {
        try {
            const session = JSON.parse(localStorage.getItem('astoria_session') || 'null');
            if (!session || !session.user) {
                redirectToLogin('Session non trouvée');
                return false;
            }

            // Check expiration
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - session.timestamp > maxAge) {
                redirectToLogin('Session expirée');
                return false;
            }

            // Check admin role
            if (session.user.role !== 'admin') {
                redirectToLogin('Accès non autorisé');
                return false;
            }

            // Update user info display
            const userInfo = document.getElementById('adminUserInfo');
            if (userInfo) {
                const nameEl = userInfo.querySelector('.admin-user-name');
                const roleEl = userInfo.querySelector('.admin-user-role');
                if (nameEl) nameEl.textContent = session.user.username || 'Admin';
                if (roleEl) roleEl.textContent = session.user.role || 'Staff';
            }

            return true;
        } catch (err) {
            console.error('[Admin] Auth check failed:', err);
            redirectToLogin('Erreur d\'authentification');
            return false;
        }
    }

    /**
     * Redirect to login page
     */
    function redirectToLogin(reason) {
        console.warn('[Admin] Redirecting to login:', reason);
        // TODO: Implement proper login redirect
        // For now, just show an alert
        alert('Accès admin requis: ' + reason);
        window.location.href = '../index.html';
    }

    // =================================================================
    // STATS (Stub - will be connected to Supabase later)
    // =================================================================

    /**
     * Load dashboard stats
     */
    async function loadDashboardStats() {
        // Stub data - will be replaced with actual Supabase queries
        const stats = {
            users: '--',
            characters: '--',
            items: '--',
            kaels: '--'
        };

        document.getElementById('statUsers')?.textContent && (document.getElementById('statUsers').textContent = stats.users);
        document.getElementById('statCharacters')?.textContent && (document.getElementById('statCharacters').textContent = stats.characters);
        document.getElementById('statItems')?.textContent && (document.getElementById('statItems').textContent = stats.items);
        document.getElementById('statKaels')?.textContent && (document.getElementById('statKaels').textContent = stats.kaels);
    }

    // =================================================================
    // INITIALIZE
    // =================================================================

    async function init() {
        console.log('[Admin] Initializing admin panel...');

        // Check auth first
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) return;

        // Initialize navigation
        initNavigation();

        // Load dashboard stats
        loadDashboardStats();

        console.log('[Admin] Admin panel ready');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
