/**
 * Activity Logs Viewer - Admin Panel Component
 * Displays and filters player activity logs
 */

import { getSupabaseClient } from '../../js/api/supabase-client.js';
import { queryActivityLogs, getActivityStats, ActionTypes } from '../../js/api/activity-logger.js';

let supabase = null;
let currentFilters = {
    userId: null,
    characterId: null,
    actionType: null,
    startDate: null,
    endDate: null,
    limit: 50,
    offset: 0
};

let totalLogs = 0;
let currentPage = 1;

// DOM elements
const dom = {
    logsTable: null,
    filterForm: null,
    actionTypeSelect: null,
    startDateInput: null,
    endDateInput: null,
    userSearchInput: null,
    characterSearchInput: null,
    limitSelect: null,
    prevBtn: null,
    nextBtn: null,
    pageInfo: null,
    statsContainer: null,
    exportBtn: null,
    refreshBtn: null
};

/**
 * Initialize the activity logs viewer
 */
export async function initActivityLogs() {
    console.log('[ActivityLogs] Initializing...');

    try {
        supabase = await getSupabaseClient();
        initDom();
        initEventListeners();
        await loadLogs();
        await loadStats();

        console.log('[ActivityLogs] Initialized successfully');
    } catch (err) {
        console.error('[ActivityLogs] Initialization failed:', err);
    }
}

/**
 * Initialize DOM references
 */
function initDom() {
    dom.logsTable = document.getElementById('activityLogsTable');
    dom.filterForm = document.getElementById('activityLogsFilterForm');
    dom.actionTypeSelect = document.getElementById('actionTypeFilter');
    dom.startDateInput = document.getElementById('startDateFilter');
    dom.endDateInput = document.getElementById('endDateFilter');
    dom.userSearchInput = document.getElementById('userSearchFilter');
    dom.characterSearchInput = document.getElementById('characterSearchFilter');
    dom.limitSelect = document.getElementById('limitFilter');
    dom.prevBtn = document.getElementById('logsPrevBtn');
    dom.nextBtn = document.getElementById('logsNextBtn');
    dom.pageInfo = document.getElementById('logsPageInfo');
    dom.statsContainer = document.getElementById('logsStatsContainer');
    dom.exportBtn = document.getElementById('logsExportBtn');
    dom.refreshBtn = document.getElementById('logsRefreshBtn');

    // Populate action type filter
    if (dom.actionTypeSelect) {
        populateActionTypeFilter();
    }
}

/**
 * Populate the action type filter dropdown
 */
function populateActionTypeFilter() {
    const options = Object.entries(ActionTypes).map(([key, value]) => {
        const label = key.split('_').map(word =>
            word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
        return `<option value="${value}">${label}</option>`;
    }).join('');

    dom.actionTypeSelect.innerHTML = `
        <option value="">Tous les types</option>
        ${options}
    `;
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Filter form submission
    if (dom.filterForm) {
        dom.filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // Quick filter inputs
    if (dom.actionTypeSelect) {
        dom.actionTypeSelect.addEventListener('change', applyFilters);
    }

    if (dom.startDateInput) {
        dom.startDateInput.addEventListener('change', applyFilters);
    }

    if (dom.endDateInput) {
        dom.endDateInput.addEventListener('change', applyFilters);
    }

    if (dom.limitSelect) {
        dom.limitSelect.addEventListener('change', applyFilters);
    }

    // Pagination
    if (dom.prevBtn) {
        dom.prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                currentFilters.offset = (currentPage - 1) * currentFilters.limit;
                loadLogs();
            }
        });
    }

    if (dom.nextBtn) {
        dom.nextBtn.addEventListener('click', () => {
            currentPage++;
            currentFilters.offset = (currentPage - 1) * currentFilters.limit;
            loadLogs();
        });
    }

    // Export button
    if (dom.exportBtn) {
        dom.exportBtn.addEventListener('click', exportLogs);
    }

    // Refresh button
    if (dom.refreshBtn) {
        dom.refreshBtn.addEventListener('click', () => {
            loadLogs();
            loadStats();
        });
    }

    // Quick filter buttons
    const quickFilterToday = document.getElementById('quickFilterToday');
    if (quickFilterToday) {
        quickFilterToday.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            dom.startDateInput.value = today;
            dom.endDateInput.value = today;
            dom.actionTypeSelect.value = '';
            applyFilters();
        });
    }

    const quickFilterQuestsWeek = document.getElementById('quickFilterQuestsWeek');
    if (quickFilterQuestsWeek) {
        quickFilterQuestsWeek.addEventListener('click', () => {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            dom.startDateInput.value = weekAgo.toISOString().split('T')[0];
            dom.endDateInput.value = today.toISOString().split('T')[0];
            dom.actionTypeSelect.value = 'quest_complete';
            applyFilters();
        });
    }

    const quickFilterKaels = document.getElementById('quickFilterKaels');
    if (quickFilterKaels) {
        quickFilterKaels.addEventListener('click', () => {
            dom.actionTypeSelect.value = 'kaels_admin_grant';
            dom.startDateInput.value = '';
            dom.endDateInput.value = '';
            applyFilters();
        });
    }

    const quickFilterPurchases = document.getElementById('quickFilterPurchases');
    if (quickFilterPurchases) {
        quickFilterPurchases.addEventListener('click', () => {
            dom.actionTypeSelect.value = 'item_purchase';
            dom.startDateInput.value = '';
            dom.endDateInput.value = '';
            applyFilters();
        });
    }

    const quickFilterClear = document.getElementById('quickFilterClear');
    if (quickFilterClear) {
        quickFilterClear.addEventListener('click', () => {
            dom.actionTypeSelect.value = '';
            dom.startDateInput.value = '';
            dom.endDateInput.value = '';
            applyFilters();
        });
    }
}

/**
 * Apply filters and reload logs
 */
async function applyFilters() {
    currentFilters = {
        actionType: dom.actionTypeSelect?.value || null,
        startDate: dom.startDateInput?.value || null,
        endDate: dom.endDateInput?.value || null,
        userId: dom.userSearchInput?.value || null,
        characterId: dom.characterSearchInput?.value || null,
        limit: parseInt(dom.limitSelect?.value || 50, 10),
        offset: 0
    };

    currentPage = 1;
    await loadLogs();
}

/**
 * Load activity logs from database
 */
async function loadLogs() {
    try {
        if (!dom.logsTable) return;

        // Show loading state
        dom.logsTable.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                </td>
            </tr>
        `;

        // Query logs
        const logs = await queryActivityLogs(currentFilters);

        // Render logs
        if (logs.length === 0) {
            dom.logsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        Aucune activité trouvée
                    </td>
                </tr>
            `;
            updatePagination(0);
            return;
        }

        dom.logsTable.innerHTML = logs.map(log => renderLogRow(log)).join('');
        updatePagination(logs.length);

    } catch (err) {
        console.error('[ActivityLogs] Failed to load logs:', err);
        dom.logsTable.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    Erreur de chargement des logs
                </td>
            </tr>
        `;
    }
}

/**
 * Render a single log row
 */
function renderLogRow(log) {
    const timestamp = new Date(log.created_at).toLocaleString('fr-FR');
    const actionLabel = formatActionType(log.action_type);
    const actionBadge = getActionTypeBadge(log.action_type);
    const userEmail = log.user_id?.substring(0, 8) || 'Inconnu';
    const characterName = log.character?.name || '-';
    const actionDetails = formatActionData(log.action_type, log.action_data);

    return `
        <tr>
            <td class="text-muted small">${timestamp}</td>
            <td><span class="badge ${actionBadge}">${actionLabel}</span></td>
            <td>${userEmail}</td>
            <td>${characterName}</td>
            <td class="small">${actionDetails}</td>
            <td>
                <button class="btn btn-sm btn-ghost-primary" onclick="window.viewLogDetails('${log.id}')">
                    <i class="ti ti-eye"></i>
                </button>
            </td>
        </tr>
    `;
}

/**
 * Format action type for display
 */
function formatActionType(actionType) {
    return actionType.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Get badge class for action type
 */
function getActionTypeBadge(actionType) {
    const typeMap = {
        'item_purchase': 'bg-success-lt',
        'item_sell': 'bg-warning-lt',
        'kaels_transaction': 'bg-yellow-lt',
        'kaels_admin_grant': 'bg-purple-lt',
        'quest_join': 'bg-info-lt',
        'quest_complete': 'bg-success-lt',
        'character_create': 'bg-primary-lt',
        'inventory_add': 'bg-green-lt',
        'inventory_remove': 'bg-orange-lt',
        'codex_item_delete': 'bg-danger-lt'
    };

    return typeMap[actionType] || 'bg-secondary-lt';
}

/**
 * Format action data for display
 */
function formatActionData(actionType, data) {
    try {
        switch (actionType) {
            case 'item_purchase':
            case 'item_sell':
                return `${data.item_name} x${data.quantity} (${data.total_cost || data.price} K)`;

            case 'kaels_transaction':
            case 'kaels_admin_grant':
                return `${data.amount > 0 ? '+' : ''}${data.amount} K - ${data.reason || 'N/A'}`;

            case 'quest_join':
            case 'quest_complete':
                return data.quest_name || 'Quête inconnue';

            case 'character_create':
                return `${data.character_name} (${data.race}, ${data.class})`;

            case 'inventory_add':
            case 'inventory_remove':
                return `${data.item_name} x${data.quantity}`;

            default:
                return JSON.stringify(data).substring(0, 50) + '...';
        }
    } catch (err) {
        return 'Données invalides';
    }
}

/**
 * Update pagination controls
 */
function updatePagination(logsCount) {
    if (!dom.pageInfo) return;

    const start = (currentPage - 1) * currentFilters.limit + 1;
    const end = start + logsCount - 1;

    dom.pageInfo.textContent = `Page ${currentPage} (${start}-${end})`;

    // Enable/disable navigation buttons
    if (dom.prevBtn) {
        dom.prevBtn.disabled = currentPage === 1;
    }

    if (dom.nextBtn) {
        dom.nextBtn.disabled = logsCount < currentFilters.limit;
    }
}

/**
 * Load activity statistics
 */
async function loadStats() {
    try {
        if (!dom.statsContainer) return;

        const filters = {
            startDate: dom.startDateInput?.value || null,
            endDate: dom.endDateInput?.value || null
        };

        const stats = await getActivityStats(filters);

        // Render stats
        renderStats(stats);

    } catch (err) {
        console.error('[ActivityLogs] Failed to load stats:', err);
    }
}

/**
 * Render statistics
 */
function renderStats(stats) {
    if (!dom.statsContainer) return;

    const topActions = Object.entries(stats.byType || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const statsHtml = `
        <div class="row g-2">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="subheader">Total Actions</div>
                            <div class="ms-auto lh-1">
                                <i class="ti ti-activity text-primary"></i>
                            </div>
                        </div>
                        <div class="h1 mb-0">${stats.total || 0}</div>
                    </div>
                </div>
            </div>
            ${topActions.map(([type, count]) => `
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="subheader">${formatActionType(type)}</div>
                            <div class="h3 mb-0">${count}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    dom.statsContainer.innerHTML = statsHtml;
}

/**
 * Export logs to CSV
 */
async function exportLogs() {
    try {
        const logs = await queryActivityLogs({ ...currentFilters, limit: 10000, offset: 0 });

        const csv = [
            ['Timestamp', 'Action Type', 'User ID', 'Character', 'Details'].join(','),
            ...logs.map(log => [
                new Date(log.created_at).toISOString(),
                log.action_type,
                log.user_id || '',
                log.character?.name || '',
                JSON.stringify(log.action_data).replace(/,/g, ';')
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error('[ActivityLogs] Failed to export logs:', err);
        alert('Erreur lors de l\'export des logs');
    }
}

/**
 * View log details in modal
 */
window.viewLogDetails = async function(logId) {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .select(`
                *,
                user:users(id, role),
                character:characters(id, name)
            `)
            .eq('id', logId)
            .single();

        if (error) {
            console.error('[ActivityLogs] Failed to load log details:', error);
            return;
        }

        // Show modal with log details
        const modal = document.getElementById('logDetailsModal');
        if (modal) {
            const content = document.getElementById('logDetailsContent');
            content.innerHTML = `
                <dl class="row">
                    <dt class="col-sm-3">ID</dt>
                    <dd class="col-sm-9"><code>${data.id}</code></dd>

                    <dt class="col-sm-3">Timestamp</dt>
                    <dd class="col-sm-9">${new Date(data.created_at).toLocaleString('fr-FR')}</dd>

                    <dt class="col-sm-3">User ID</dt>
                    <dd class="col-sm-9"><code>${data.user_id || 'Inconnu'}</code></dd>

                    <dt class="col-sm-3">Character</dt>
                    <dd class="col-sm-9">${data.character?.name || '-'}</dd>

                    <dt class="col-sm-3">Action Type</dt>
                    <dd class="col-sm-9"><span class="badge ${getActionTypeBadge(data.action_type)}">${formatActionType(data.action_type)}</span></dd>

                    <dt class="col-sm-3">Action Data</dt>
                    <dd class="col-sm-9"><pre class="bg-light p-2"><code>${JSON.stringify(data.action_data, null, 2)}</code></pre></dd>

                    <dt class="col-sm-3">Metadata</dt>
                    <dd class="col-sm-9"><pre class="bg-light p-2"><code>${JSON.stringify(data.metadata, null, 2)}</code></pre></dd>
                </dl>
            `;

            // Show modal (using Bootstrap or custom modal system)
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }

    } catch (err) {
        console.error('[ActivityLogs] Failed to view log details:', err);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivityLogs);
} else {
    initActivityLogs();
}
