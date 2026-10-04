/**
 * Floating - Wrapper Floating UI
 * Gère tooltips, popovers, dropdowns avec positionnement intelligent
 */

class FloatingManager {
    constructor() {
        this.hasFloatingUI = typeof FloatingUIDOM !== 'undefined';
        this.activeFloating = new Map(); // Map<triggerElement, config>

        if (!this.hasFloatingUI) {
            console.warn('[FloatingManager] Floating UI library not loaded!');
        }
    }

    /**
     * Crée un tooltip
     * @param {HTMLElement} triggerElement - Élément déclencheur (hover/focus)
     * @param {HTMLElement|string} contentElement - Élément tooltip ou texte HTML
     * @param {object} options - Options de configuration
     * @param {string} options.placement - Position ('top', 'bottom', 'left', 'right', 'top-start', etc.)
     * @param {number} options.offset - Distance en px (default: 8)
     * @param {boolean} options.arrow - Afficher flèche (default: true)
     * @param {string} options.trigger - 'hover', 'click', 'focus' (default: 'hover')
     * @param {number} options.delay - Délai d'apparition en ms (default: 200 pour hover, 0 pour click)
     * @param {function} options.onShow - Callback appelé à l'ouverture
     * @param {function} options.onHide - Callback appelé à la fermeture
     * @returns {object} - Instance avec méthodes show(), hide(), destroy()
     */
    createTooltip(triggerElement, contentElement, options = {}) {
        if (!triggerElement || !(triggerElement instanceof HTMLElement)) {
            console.error('[FloatingManager] Invalid triggerElement');
            return null;
        }

        // Get or create tooltip element
        let tooltipElement;
        if (typeof contentElement === 'string') {
            tooltipElement = document.createElement('div');
            tooltipElement.className = 'floating-tooltip';
            tooltipElement.innerHTML = contentElement;
            tooltipElement.setAttribute('role', 'tooltip');
            document.body.appendChild(tooltipElement);
        } else if (contentElement instanceof HTMLElement) {
            tooltipElement = contentElement;
        } else {
            console.error('[FloatingManager] Invalid contentElement');
            return null;
        }

        const config = {
            triggerElement,
            tooltipElement,
            placement: options.placement || 'top',
            offset: options.offset ?? 8,
            arrow: options.arrow !== false,
            trigger: options.trigger || 'hover',
            delay: options.delay ?? (options.trigger === 'click' ? 0 : 200),
            onShow: options.onShow || null,
            onHide: options.onHide || null,
            isVisible: false,
            cleanupFn: null,
            timeoutId: null,
        };

        // Create arrow if needed
        if (config.arrow) {
            const arrow = document.createElement('div');
            arrow.className = 'floating-arrow';
            tooltipElement.appendChild(arrow);
            config.arrowElement = arrow;
        }

        // Initial hide
        tooltipElement.style.position = 'absolute';
        tooltipElement.style.visibility = 'hidden';
        tooltipElement.setAttribute('aria-hidden', 'true');

        // Setup event listeners based on trigger type
        this._setupTriggers(config);

        // Store config
        this.activeFloating.set(triggerElement, config);

        console.log('[FloatingManager] Tooltip created for:', triggerElement);

        // Return instance API
        return {
            show: () => this._showTooltip(config),
            hide: () => this._hideTooltip(config),
            destroy: () => this._destroyTooltip(config),
            update: () => this._updatePosition(config),
        };
    }

    /**
     * Setup event listeners pour trigger
     * @private
     */
    _setupTriggers(config) {
        const { triggerElement, trigger } = config;

        if (trigger === 'hover') {
            config.mouseEnterHandler = () => {
                clearTimeout(config.timeoutId);
                config.timeoutId = setTimeout(() => this._showTooltip(config), config.delay);
            };
            config.mouseLeaveHandler = () => {
                clearTimeout(config.timeoutId);
                this._hideTooltip(config);
            };

            triggerElement.addEventListener('mouseenter', config.mouseEnterHandler);
            triggerElement.addEventListener('mouseleave', config.mouseLeaveHandler);
            triggerElement.addEventListener('focus', config.mouseEnterHandler);
            triggerElement.addEventListener('blur', config.mouseLeaveHandler);
        } else if (trigger === 'click') {
            config.clickHandler = (event) => {
                event.preventDefault();
                if (config.isVisible) {
                    this._hideTooltip(config);
                } else {
                    this._showTooltip(config);
                }
            };
            triggerElement.addEventListener('click', config.clickHandler);
        } else if (trigger === 'focus') {
            config.focusHandler = () => this._showTooltip(config);
            config.blurHandler = () => this._hideTooltip(config);
            triggerElement.addEventListener('focus', config.focusHandler);
            triggerElement.addEventListener('blur', config.blurHandler);
        }
    }

    /**
     * Show tooltip
     * @private
     */
    async _showTooltip(config) {
        if (config.isVisible) return;
        if (!this.hasFloatingUI) return;

        const { triggerElement, tooltipElement, placement, offset, arrowElement } = config;

        tooltipElement.style.visibility = 'visible';
        tooltipElement.setAttribute('aria-hidden', 'false');
        config.isVisible = true;

        // Compute position avec Floating UI
        const middleware = [
            FloatingUIDOM.offset(offset),
            FloatingUIDOM.flip(),
            FloatingUIDOM.shift({ padding: 5 }),
        ];

        if (arrowElement) {
            middleware.push(FloatingUIDOM.arrow({ element: arrowElement }));
        }

        const { x, y, placement: finalPlacement, middlewareData } = await FloatingUIDOM.computePosition(
            triggerElement,
            tooltipElement,
            {
                placement,
                middleware,
            }
        );

        // Apply position
        Object.assign(tooltipElement.style, {
            left: `${x}px`,
            top: `${y}px`,
        });

        // Position arrow
        if (arrowElement && middlewareData.arrow) {
            const { x: arrowX, y: arrowY } = middlewareData.arrow;
            const staticSide = {
                top: 'bottom',
                right: 'left',
                bottom: 'top',
                left: 'right',
            }[finalPlacement.split('-')[0]];

            Object.assign(arrowElement.style, {
                left: arrowX != null ? `${arrowX}px` : '',
                top: arrowY != null ? `${arrowY}px` : '',
                right: '',
                bottom: '',
                [staticSide]: '-4px',
            });
        }

        // Setup auto-update on scroll/resize
        if (this.hasFloatingUI && typeof FloatingUIDOM.autoUpdate === 'function') {
            config.cleanupFn = FloatingUIDOM.autoUpdate(triggerElement, tooltipElement, () => {
                this._updatePosition(config);
            });
        }

        // Callback
        if (config.onShow) {
            config.onShow();
        }

        console.log('[FloatingManager] Tooltip shown');
    }

    /**
     * Hide tooltip
     * @private
     */
    _hideTooltip(config) {
        if (!config.isVisible) return;

        const { tooltipElement } = config;

        tooltipElement.style.visibility = 'hidden';
        tooltipElement.setAttribute('aria-hidden', 'true');
        config.isVisible = false;

        // Cleanup auto-update
        if (config.cleanupFn) {
            config.cleanupFn();
            config.cleanupFn = null;
        }

        // Callback
        if (config.onHide) {
            config.onHide();
        }

        console.log('[FloatingManager] Tooltip hidden');
    }

    /**
     * Update tooltip position
     * @private
     */
    async _updatePosition(config) {
        if (!config.isVisible || !this.hasFloatingUI) return;

        const { triggerElement, tooltipElement, placement, offset, arrowElement } = config;

        const middleware = [
            FloatingUIDOM.offset(offset),
            FloatingUIDOM.flip(),
            FloatingUIDOM.shift({ padding: 5 }),
        ];

        if (arrowElement) {
            middleware.push(FloatingUIDOM.arrow({ element: arrowElement }));
        }

        const { x, y, placement: finalPlacement, middlewareData } = await FloatingUIDOM.computePosition(
            triggerElement,
            tooltipElement,
            {
                placement,
                middleware,
            }
        );

        Object.assign(tooltipElement.style, {
            left: `${x}px`,
            top: `${y}px`,
        });

        if (arrowElement && middlewareData.arrow) {
            const { x: arrowX, y: arrowY } = middlewareData.arrow;
            const staticSide = {
                top: 'bottom',
                right: 'left',
                bottom: 'top',
                left: 'right',
            }[finalPlacement.split('-')[0]];

            Object.assign(arrowElement.style, {
                left: arrowX != null ? `${arrowX}px` : '',
                top: arrowY != null ? `${arrowY}px` : '',
                right: '',
                bottom: '',
                [staticSide]: '-4px',
            });
        }
    }

    /**
     * Destroy tooltip
     * @private
     */
    _destroyTooltip(config) {
        this._hideTooltip(config);

        const { triggerElement, tooltipElement } = config;

        // Remove event listeners
        if (config.mouseEnterHandler) {
            triggerElement.removeEventListener('mouseenter', config.mouseEnterHandler);
            triggerElement.removeEventListener('mouseleave', config.mouseLeaveHandler);
            triggerElement.removeEventListener('focus', config.mouseEnterHandler);
            triggerElement.removeEventListener('blur', config.mouseLeaveHandler);
        }
        if (config.clickHandler) {
            triggerElement.removeEventListener('click', config.clickHandler);
        }
        if (config.focusHandler) {
            triggerElement.removeEventListener('focus', config.focusHandler);
            triggerElement.removeEventListener('blur', config.blurHandler);
        }

        // Remove tooltip from DOM if we created it
        if (tooltipElement.classList.contains('floating-tooltip') && tooltipElement.parentElement) {
            tooltipElement.remove();
        }

        // Clear timeout
        clearTimeout(config.timeoutId);

        // Remove from active map
        this.activeFloating.delete(triggerElement);

        console.log('[FloatingManager] Tooltip destroyed');
    }

    /**
     * Destroy tous les tooltips actifs
     */
    destroyAll() {
        const configs = Array.from(this.activeFloating.values());
        configs.forEach((config) => this._destroyTooltip(config));
    }

    /**
     * Crée un popover (similaire à tooltip mais pour click + contenu riche)
     * @param {HTMLElement} triggerElement - Élément déclencheur
     * @param {HTMLElement} contentElement - Élément popover
     * @param {object} options - Options (mêmes que createTooltip)
     * @returns {object} - Instance
     */
    createPopover(triggerElement, contentElement, options = {}) {
        // Popover = tooltip avec trigger click par défaut
        const popoverOptions = {
            ...options,
            trigger: options.trigger || 'click',
            arrow: options.arrow ?? false, // Pas de flèche par défaut pour popovers
        };

        return this.createTooltip(triggerElement, contentElement, popoverOptions);
    }
}

// Instance globale
const floatingManager = new FloatingManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = floatingManager;
}
