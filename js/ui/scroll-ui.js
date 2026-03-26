/**
 * scroll-ui.js — Headroom utility (ES module)
 *
 * - .page-header .character-summary : CSS class (headroom-character / headroom--hidden)
 * - .sidebarIconToggle              : inline style direct (bypass CSS cascade)
 *
 * Safe to call multiple times. Toggle re-queried à chaque changement d'état.
 */

const THRESHOLD = 10;
const TOLERANCE = 2;

let _removeListener = null;

export function initScrollUI() {
    if (_removeListener) {
        _removeListener();
        _removeListener = null;
    }

    const summaryTargets = [];
    document.querySelectorAll('.page-header .character-summary').forEach(el => {
        if (el.closest('[role="dialog"], [aria-modal="true"]')) return;
        el.classList.add('headroom-character');
        summaryTargets.push(el);
    });

    if (!summaryTargets.length) return;

    let lastY = window.scrollY;
    let ticking = false;
    let hidden = false;

    function setHidden(next) {
        if (next === hidden) return;
        hidden = next;

        // Character summary via CSS class
        summaryTargets.forEach(el => el.classList.toggle('headroom--hidden', hidden));

        // Hamburger via inline style — spécificité maximale, 0 dépendance CSS externe
        const toggle = document.querySelector('.sidebarIconToggle');
        if (toggle) {
            toggle.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
            toggle.style.transform = hidden ? 'translateY(-200%)' : '';
            toggle.style.pointerEvents = hidden ? 'none' : '';
        }
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            const delta = y - lastY;
            if (y < THRESHOLD) {
                setHidden(false);
            } else if (Math.abs(delta) >= TOLERANCE) {
                setHidden(delta > 0);
            }
            lastY = y;
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    _removeListener = () => window.removeEventListener('scroll', onScroll);
    window.astoriaScrollUI = { init: initScrollUI };
}
