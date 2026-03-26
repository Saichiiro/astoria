/**
 * scroll-ui.js — Headroom utility (ES module)
 *
 * Handles scroll-aware hiding/showing of:
 *   - .page-header .character-summary  → becomes fixed, slides up on scroll-down
 *   - .sidebarIconToggle               → slides up on scroll-down
 *
 * Safe to call multiple times — previous listener is cleaned up automatically.
 * The toggle is re-queried on each state change to handle late DOM insertion.
 */

const THRESHOLD = 10;   // px from top before hiding kicks in
const TOLERANCE = 2;    // minimum delta to trigger hide/show

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

    // No summary found = nothing to do
    if (!summaryTargets.length) return;

    let lastY = window.scrollY;
    let ticking = false;
    let hidden = false;

    function setHidden(next) {
        if (next === hidden) return;
        hidden = next;

        summaryTargets.forEach(el => el.classList.toggle('headroom--hidden', hidden));

        // Toggle re-queried fresh each time — immune to late DOM insertion timing
        const toggle = document.querySelector('.sidebarIconToggle');
        if (toggle) toggle.classList.toggle('headroom--hidden', hidden);
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
