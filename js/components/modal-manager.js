/**
 * Modal Manager - Wrapper body-scroll-lock
 * Handles modal open/close, accessibility and scroll locking.
 */

class ModalManager {
    constructor() {
        this.activeModals = new Map(); // Map<element, config>
        this.modalStack = []; // Stack to support nested modals
        this.hasBodyScrollLock = typeof bodyScrollLock !== 'undefined';
        this.documentLockCount = 0;
        this.previousDocumentStyles = null;

        if (!this.hasBodyScrollLock) {
            console.warn('[ModalManager] body-scroll-lock library not loaded. Scroll lock fallback enabled.');
        }

        // Bind global ESC handler
        document.addEventListener('keydown', this._handleEscKey.bind(this));
    }

    /**
     * Open a modal
     * @param {HTMLElement} modalElement - Modal element (backdrop/container)
     * @param {object} options
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
            previousFocus: document.activeElement,
            scrollLockElement:
                options.scrollLockElement instanceof HTMLElement
                    ? options.scrollLockElement
                    : modalElement,
        };

        this.modalStack.push(modalElement);
        this.activeModals.set(modalElement, config);

        // Lock document scroll (native fallback + body-scroll-lock when available)
        this._lockDocumentScroll();
        if (this.hasBodyScrollLock) {
            bodyScrollLock.clearAllBodyScrollLocks();
            bodyScrollLock.disableBodyScroll(config.scrollLockElement, {
                reserveScrollBarGap: true,
            });
        }

        modalElement.removeAttribute('hidden');
        modalElement.classList.add(config.openClass);
        modalElement.setAttribute('aria-hidden', 'false');

        this._setInitialFocus(modalElement, config.focusElement);

        if (config.closeOnBackdropClick) {
            modalElement.addEventListener('click', this._handleBackdropClick);
        }

        console.log('[ModalManager] Modal opened:', modalElement, 'Stack size:', this.modalStack.length);
    }

    /**
     * Close a modal
     * @param {HTMLElement} modalElement
     */
    close(modalElement) {
        if (!modalElement || !this.activeModals.has(modalElement)) {
            return;
        }

        const config = this.activeModals.get(modalElement);

        modalElement.removeEventListener('click', this._handleBackdropClick);

        modalElement.classList.remove(config.openClass);
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('hidden', '');

        const index = this.modalStack.indexOf(modalElement);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }
        this.activeModals.delete(modalElement);

        // Rebind body-scroll-lock to current top modal, or fully unlock.
        if (this.hasBodyScrollLock) {
            bodyScrollLock.clearAllBodyScrollLocks();
            if (this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                const topConfig = this.activeModals.get(topModal);
                bodyScrollLock.disableBodyScroll(topConfig?.scrollLockElement || topModal, {
                    reserveScrollBarGap: true,
                });
            }
        }

        this._unlockDocumentScroll();

        if (config.previousFocus && typeof config.previousFocus.focus === 'function') {
            config.previousFocus.focus();
        }

        if (typeof config.onClose === 'function') {
            config.onClose();
        }

        console.log('[ModalManager] Modal closed:', modalElement, 'Stack size:', this.modalStack.length);
    }

    /**
     * Close most recently opened modal
     */
    closeTop() {
        if (this.modalStack.length === 0) return;
        const topModal = this.modalStack[this.modalStack.length - 1];
        this.close(topModal);
    }

    /**
     * Close all modals
     */
    closeAll() {
        const modals = [...this.modalStack];
        modals.forEach((modal) => this.close(modal));
    }

    /**
     * Is modal open?
     * @param {HTMLElement} modalElement
     * @returns {boolean}
     */
    isOpen(modalElement) {
        if (modalElement) {
            return this.activeModals.has(modalElement);
        }
        return this.modalStack.length > 0;
    }

    /**
     * Global ESC handler
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
     * Backdrop click handler
     * @private
     */
    _handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            this.close(event.currentTarget);
        }
    }

    /**
     * Set initial focus in modal
     * @private
     */
    _setInitialFocus(modalElement, customFocusElement) {
        setTimeout(() => {
            if (customFocusElement && typeof customFocusElement.focus === 'function') {
                customFocusElement.focus();
                return;
            }

            const focusable = modalElement.querySelector(
                'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );

            if (focusable && typeof focusable.focus === 'function') {
                focusable.focus();
            }
        }, 100);
    }

    /**
     * Toggle modal
     * @param {HTMLElement} modalElement
     * @param {object} options
     */
    toggle(modalElement, options = {}) {
        if (this.isOpen(modalElement)) {
            this.close(modalElement);
        } else {
            this.open(modalElement, options);
        }
    }

    /**
     * Native fallback lock (and extra safety on mobile)
     * @private
     */
    _lockDocumentScroll() {
        if (this.documentLockCount === 0) {
            const html = document.documentElement;
            const body = document.body;
            this.previousDocumentStyles = {
                htmlOverflow: html.style.overflow,
                bodyOverflow: body.style.overflow,
                htmlOverscroll: html.style.overscrollBehavior,
                bodyOverscroll: body.style.overscrollBehavior,
            };

            html.style.overflow = 'hidden';
            body.style.overflow = 'hidden';
            html.style.overscrollBehavior = 'none';
            body.style.overscrollBehavior = 'none';
            html.classList.add('modal-scroll-locked');
            body.classList.add('modal-scroll-locked');
        }

        this.documentLockCount += 1;
    }

    /**
     * Restore native fallback lock
     * @private
     */
    _unlockDocumentScroll() {
        if (this.documentLockCount === 0) return;

        this.documentLockCount = Math.max(0, this.documentLockCount - 1);
        if (this.documentLockCount > 0) return;

        const html = document.documentElement;
        const body = document.body;

        if (this.previousDocumentStyles) {
            html.style.overflow = this.previousDocumentStyles.htmlOverflow || '';
            body.style.overflow = this.previousDocumentStyles.bodyOverflow || '';
            html.style.overscrollBehavior = this.previousDocumentStyles.htmlOverscroll || '';
            body.style.overscrollBehavior = this.previousDocumentStyles.bodyOverscroll || '';
        } else {
            html.style.overflow = '';
            body.style.overflow = '';
            html.style.overscrollBehavior = '';
            body.style.overscrollBehavior = '';
        }

        html.classList.remove('modal-scroll-locked');
        body.classList.remove('modal-scroll-locked');
        this.previousDocumentStyles = null;
    }
}

// Global singleton
const modalManager = new ModalManager();

// CommonJS export for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = modalManager;
}
