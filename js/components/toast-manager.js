/**
 * Toast Manager - Wrapper Notyf
 * Gère les notifications toast unifiées dans toute l'app
 */

class ToastManager {
    constructor() {
        if (!window.Notyf) {
            console.error('[ToastManager] Notyf library not loaded!');
            return;
        }

        this.notyf = new Notyf({
            duration: 3000,
            position: {
                x: 'right',
                y: 'top',
            },
            dismissible: true,
            ripple: true,
        });
    }

    /**
     * Affiche un toast de succès
     * @param {string} message - Message à afficher
     * @param {number} duration - Durée en ms (optionnel)
     */
    success(message, duration = 3000) {
        if (!this.notyf) {
            console.warn('[ToastManager] Notyf not initialized, message:', message);
            return;
        }
        this.notyf.dismissAll();
        this.notyf.success({
            message,
            duration,
        });
    }

    /**
     * Affiche un toast d'erreur
     * @param {string} message - Message à afficher
     * @param {number} duration - Durée en ms (optionnel)
     */
    error(message, duration = 4000) {
        if (!this.notyf) {
            console.warn('[ToastManager] Notyf not initialized, message:', message);
            return;
        }
        this.notyf.dismissAll();
        this.notyf.error({
            message,
            duration,
        });
    }

    /**
     * Affiche un toast d'information
     * @param {string} message - Message à afficher
     * @param {number} duration - Durée en ms (optionnel)
     */
    info(message, duration = 3000) {
        if (!this.notyf) {
            console.warn('[ToastManager] Notyf not initialized, message:', message);
            return;
        }
        this.notyf.dismissAll();
        this.notyf.open({
            type: 'info',
            message,
            duration,
            background: '#4A90E2',
            icon: {
                className: 'notyf__icon--info',
                tagName: 'span',
                text: 'ℹ️'
            }
        });
    }

    /**
     * Affiche un toast d'avertissement
     * @param {string} message - Message à afficher
     * @param {number} duration - Durée en ms (optionnel)
     */
    warning(message, duration = 3500) {
        if (!this.notyf) {
            console.warn('[ToastManager] Notyf not initialized, message:', message);
            return;
        }
        this.notyf.dismissAll();
        this.notyf.open({
            type: 'warning',
            message,
            duration,
            background: '#F5A623',
            icon: {
                className: 'notyf__icon--warning',
                tagName: 'span',
                text: '⚠️'
            }
        });
    }

    /**
     * Affiche un toast custom
     * @param {object} options - Options Notyf
     */
    custom(options) {
        if (!this.notyf) {
            console.warn('[ToastManager] Notyf not initialized');
            return;
        }
        this.notyf.open(options);
    }

    /**
     * Ferme tous les toasts actifs
     */
    dismissAll() {
        if (!this.notyf) return;
        this.notyf.dismissAll();
    }
}

// Instance globale
const toastManager = new ToastManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = toastManager;
}
