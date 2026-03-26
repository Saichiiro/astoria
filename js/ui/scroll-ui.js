/**
 * scroll-ui.js — Headroom utility (ES module)
 *
 * Handles scroll-aware hiding/showing of:
 *   - .page-header .character-summary  → becomes fixed, slides up on scroll-down
 *   - .sidebarIconToggle               → slides up on scroll-down
 *
 * Call initScrollUI() after the page UI is ready (e.g. after initCharacterSummary).
 * Safe to call multiple times — previous scroll listener is cleaned up automatically.
 */

const THRESHOLD = 60;   // px from top before hiding kicks in
const TOLERANCE = 6;    // minimum delta to trigger hide/show

let _removeListener = null;

export function initScrollUI() {
    // Clean up previous listener to avoid stacking
    if (_removeListener) {
        _removeListener();
        _removeListener = null;
    }

    const targets = [];

    // Character summary cards in page headers (not inside modals)
    document.querySelectorAll('.page-header .character-summary').forEach(el => {
        if (el.closest('[role="dialog"], [aria-modal="true"]')) return;
        el.classList.add('headroom-character');
        targets.push(el);
    });

    // Sidebar hamburger toggle
    const toggle = document.querySelector('.sidebarIconToggle');
    if (toggle) {
        toggle.style.transition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
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

    // Bridge for legacy IIFE callers (headroom.js)
    window.astoriaScrollUI = { init: initScrollUI };
}
