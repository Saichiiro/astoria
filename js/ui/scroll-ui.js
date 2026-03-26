/**
 * scroll-ui.js — Headroom utility (ES module)
 *
 * Même mécanique pour les deux éléments :
 *   - .page-header .character-summary → reçoit headroom-character + headroom--hidden
 *   - .sidebarIconToggle              → reçoit headroom-hamburger + headroom--hidden
 *
 * CSS dans style.css (chargé en premier, jamais async).
 * Safe to call multiple times — listener précédent nettoyé automatiquement.
 */

const THRESHOLD = 10;
const TOLERANCE = 2;

let _removeListener = null;

export function initScrollUI() {
    if (_removeListener) {
        _removeListener();
        _removeListener = null;
    }

    const targets = [];

    // Character summary
    document.querySelectorAll('.page-header .character-summary').forEach(el => {
        if (el.closest('[role="dialog"], [aria-modal="true"]')) return;
        el.classList.add('headroom-character');
        targets.push(el);
    });

    // Hamburger — classe dédiée, CSS dans style.css comme headroom-character
    const toggle = document.querySelector('.sidebarIconToggle');
    if (toggle) {
        toggle.classList.add('headroom-hamburger');
        targets.push(toggle);
    }

    if (!targets.length) return;

    let lastY = window.scrollY;
    let ticking = false;
    let hidden = false;

    function setHidden(next) {
        if (next === hidden) return;
        hidden = next;
        targets.forEach(el => el.classList.toggle('headroom--hidden', hidden));
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
