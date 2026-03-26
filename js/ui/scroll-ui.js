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
const CHARACTER_SELECTOR = '.page-header .character-summary';
const HAMBURGER_SELECTOR = '.sidebarIconToggle';
const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"]';

let _removeListener = null;

function collectTargets() {
    const characters = [];
    const hamburgers = [];

    document.querySelectorAll(CHARACTER_SELECTOR).forEach((el) => {
        if (el.closest(MODAL_SELECTOR)) return;
        el.classList.add('headroom-character');
        characters.push(el);
    });

    document.querySelectorAll(HAMBURGER_SELECTOR).forEach((el) => {
        el.classList.add('headroom-hamburger');
        hamburgers.push(el);
    });

    return { characters, hamburgers };
}

function applyHiddenState(characters, hamburgers, hidden) {
    characters.forEach((el) => el.classList.toggle('headroom--hidden', hidden));
    hamburgers.forEach((el) => el.classList.toggle('headroom--hidden', hidden));
}

export function initScrollUI() {
    if (_removeListener) {
        _removeListener();
        _removeListener = null;
    }

    const { characters, hamburgers } = collectTargets();
    if (!characters.length && !hamburgers.length) return;

    let lastY = window.scrollY;
    let ticking = false;
    let hidden = window.scrollY >= THRESHOLD;

    applyHiddenState(characters, hamburgers, hidden);

    function syncVisibility({ force = false } = {}) {
        const y = window.scrollY;
        const delta = y - lastY;

        if (y < THRESHOLD) {
            hidden = false;
        } else if (force) {
            hidden = true;
        } else if (Math.abs(delta) >= TOLERANCE) {
            hidden = delta > 0;
        }

        applyHiddenState(characters, hamburgers, hidden);
        lastY = y;
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            syncVisibility();
            ticking = false;
        });
    }

    function onPageShow() {
        syncVisibility({ force: true });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pageshow', onPageShow);
    _removeListener = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pageshow', onPageShow);
    };
}

window.astoriaScrollUI = { init: initScrollUI };
