/**
 * scroll-ui.js — Headroom utility (ES module)
 *
 * Comportements :
 *   - .page-header .character-summary → visible au sommet, se cache en scrollant bas
 *   - .sidebarIconToggle              → caché au sommet, apparaît quand la carte se cache
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

    // Character summary — visible au sommet, cache au scroll bas
    document.querySelectorAll('.page-header .character-summary').forEach(el => {
        if (el.closest('[role="dialog"], [aria-modal="true"]')) return;
        el.classList.add('headroom-character');
        targets.push(el);
    });

    // Hamburger — inverse : caché au sommet, apparaît quand la carte se cache
    const toggle = document.querySelector('.sidebarIconToggle');
    if (toggle) {
        toggle.classList.add('headroom-hamburger');
        toggle.classList.add('headroom--hidden'); // caché par défaut
    }

    if (!targets.length && !toggle) return;

    let lastY = window.scrollY;
    let ticking = false;
    let hidden = false;

    function setHidden(next) {
        if (next === hidden) return;
        hidden = next;
        // Carte : se cache quand hidden=true
        targets.forEach(el => el.classList.toggle('headroom--hidden', hidden));
        // Hamburger : inverse — apparaît quand la carte se cache
        if (toggle) toggle.classList.toggle('headroom--hidden', !hidden);
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
