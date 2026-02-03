/**
 * Modal Manager - Wrapper body-scroll-lock
 * Gère les modals avec accessibility et gestion du scroll
 */

class ModalManager {
    constructor() {
        this.activeModals = new Map(); // Map<element, config>
        this.modalStack = []; // Stack pour gérer les modals imbriqués
        this.hasBodyScrollLock = typeof bodyScrollLock !== 'undefined';

        if (!this.hasBodyScrollLock) {
            console.warn('[ModalManager] body-scroll-lock library not loaded. Scroll lock disabled.');
        }

        // Bind global ESC handler
        document.addEventListener('keydown', this._handleEscKey.bind(this));
    }

    /**
     * Ouvre un modal
     * @param {HTMLElement} modalElement - Élément du modal (backdrop ou container)
     * @param {object} options - Options de configuration
     * @param {function} options.onClose - Callback appelé à la fermeture
     * @param {HTMLElement} options.focusElement - Élément à focus (default: premier input/button)
     * @param {boolean} options.closeOnBackdropClick - Fermer sur clic backdrop (default: true)
     * @param {boolean} options.closeOnEsc - Fermer sur ESC (default: true)
     * @param {string} options.openClass - Classe CSS pour ouvrir (default: 'open')
     */
    open(modalElement, options = {}) {
        if (!modalElement) {
            console.error('[ModalManager] open() called with null element');
            return;
        }

        if (this.activeModals.has(modalElement)) {
            console.warn('[ModalManager] Modal already open:', modalElement);
            return;
        }

        const config = {
            onClose: options.onClose || null,
            focusElement: options.focusElement || null,
            closeOnBackdropClick: options.closeOnBackdropClick !== false,
            closeOnEsc: options.closeOnEsc !== false,
            openClass: options.openClass || 'open',
            previousFocus: document.activeElement, // Sauvegarder focus actuel
        };

        // Ajouter à la stack
        this.modalStack.push(modalElement);
        this.activeModals.set(modalElement, config);

        // Lock scroll (seulement pour le premier modal)
        if (this.modalStack.length === 1 && this.hasBodyScrollLock) {
            bodyScrollLock.disableBodyScroll(modalElement, {
                reserveScrollBarGap: true,
            });
        }

        // Ouvrir le modal (ajouter classe CSS)
        modalElement.removeAttribute('hidden'); // Remove hidden boolean attribute
        modalElement.classList.add(config.openClass);
        modalElement.setAttribute('aria-hidden', 'false');

        // Focus management
        this._setInitialFocus(modalElement, config.focusElement);

        // Backdrop click handler
        if (config.closeOnBackdropClick) {
            modalElement.addEventListener('click', this._handleBackdropClick);
        }

        console.log('[ModalManager] Modal opened:', modalElement, 'Stack size:', this.modalStack.length);
    }

    /**
     * Ferme un modal
     * @param {HTMLElement} modalElement - Élément du modal à fermer
     */
    close(modalElement) {
        if (!modalElement || !this.activeModals.has(modalElement)) {
            return;
        }

        const config = this.activeModals.get(modalElement);

        // Remove backdrop click handler
        modalElement.removeEventListener('click', this._handleBackdropClick);

        // Fermer le modal (retirer classe CSS)
        modalElement.classList.remove(config.openClass);
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('hidden', ''); // Add back hidden boolean attribute

        // Unlock scroll (seulement si c'était le dernier modal)
        const wasLast = this.modalStack[this.modalStack.length - 1] === modalElement;
        if (wasLast && this.hasBodyScrollLock) {
            bodyScrollLock.enableBodyScroll(modalElement);
        }

        // Retirer de la stack
        const index = this.modalStack.indexOf(modalElement);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }
        this.activeModals.delete(modalElement);

        // Restore focus
        if (config.previousFocus && typeof config.previousFocus.focus === 'function') {
            config.previousFocus.focus();
        }

        // Callback onClose
        if (typeof config.onClose === 'function') {
            config.onClose();
        }

        console.log('[ModalManager] Modal closed:', modalElement, 'Stack size:', this.modalStack.length);
    }

    /**
     * Ferme le modal le plus récent
     */
    closeTop() {
        if (this.modalStack.length === 0) return;
        const topModal = this.modalStack[this.modalStack.length - 1];
        this.close(topModal);
    }

    /**
     * Ferme tous les modals
     */
    closeAll() {
        // Clone stack car close() modifie le tableau
        const modals = [...this.modalStack];
        modals.forEach(modal => this.close(modal));
    }

    /**
     * Vérifie si un modal est ouvert
     * @param {HTMLElement} modalElement - Élément du modal (optionnel)
     * @returns {boolean}
     */
    isOpen(modalElement) {
        if (modalElement) {
            return this.activeModals.has(modalElement);
        }
        return this.modalStack.length > 0;
    }

    /**
     * Handler global ESC key
     * @private
     */
    _handleEscKey(event) {
        if (event.key !== 'Escape') return;
        if (this.modalStack.length === 0) return;

        const topModal = this.modalStack[this.modalStack.length - 1];
        const config = this.activeModals.get(topModal);

        if (config && config.closeOnEsc) {
            event.preventDefault();
            this.close(topModal);
        }
    }

    /**
     * Handler clic sur backdrop
     * @private
     */
    _handleBackdropClick = (event) => {
        // Fermer seulement si clic direct sur backdrop (pas sur enfants)
        if (event.target === event.currentTarget) {
            const modalElement = event.currentTarget;
            this.close(modalElement);
        }
    }

    /**
     * Set focus initial dans le modal
     * @private
     */
    _setInitialFocus(modalElement, customFocusElement) {
        // Delay focus pour éviter conflit avec animations
        setTimeout(() => {
            if (customFocusElement && typeof customFocusElement.focus === 'function') {
                customFocusElement.focus();
                return;
            }

            // Auto-focus sur premier input/button/textarea
            const focusable = modalElement.querySelector(
                'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );

            if (focusable && typeof focusable.focus === 'function') {
                focusable.focus();
            }
        }, 100);
    }

    /**
     * Utilitaire: Toggle modal (open si fermé, close si ouvert)
     * @param {HTMLElement} modalElement - Élément du modal
     * @param {object} options - Options (seulement pour open)
     */
    toggle(modalElement, options = {}) {
        if (this.isOpen(modalElement)) {
            this.close(modalElement);
        } else {
            this.open(modalElement, options);
        }
    }
}

// Instance globale
const modalManager = new ModalManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = modalManager;
}
