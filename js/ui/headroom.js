/**
 * headroom.js — legacy IIFE shim
 *
 * Kept for backward compatibility (pages include this via <script src>).
 * The real logic lives in scroll-ui.js (ES module).
 *
 * On DOMContentLoaded, calls initScrollUI() if available, otherwise falls back
 * to the inline implementation so the page still works even if character-summary
 * hasn't called initScrollUI() yet.
 */
(function () {
    'use strict';

    var THRESHOLD = 60;
    var TOLERANCE = 6;

    function initFallback() {
        // Delegate to scroll-ui.js if already loaded via the module path
        if (window.astoriaScrollUI && typeof window.astoriaScrollUI.init === 'function') {
            window.astoriaScrollUI.init();
            return;
        }

        // Fallback: inline headroom (same logic, no cleanup guard — scroll-ui will take over later)
        var targets = [];

        document.querySelectorAll('.page-header .character-summary').forEach(function (el) {
            if (el.closest('[role="dialog"], [aria-modal="true"]')) return;
            el.classList.add('headroom-character');
            targets.push(el);
        });

        var toggle = document.querySelector('.sidebarIconToggle');
        if (toggle) {
            toggle.style.transition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
            targets.push(toggle);
        }

        if (!targets.length) return;

        var lastY = window.scrollY;
        var ticking = false;
        var hidden = false;

        function setHidden(next) {
            if (next === hidden) return;
            hidden = next;
            targets.forEach(function (el) {
                el.classList.toggle('headroom--hidden', hidden);
            });
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var y = window.scrollY;
                    var delta = y - lastY;
                    if (y < THRESHOLD) {
                        setHidden(false);
                    } else if (Math.abs(delta) >= TOLERANCE) {
                        setHidden(delta > 0);
                    }
                    lastY = y;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFallback);
    } else {
        initFallback();
    }

    // Expose for any legacy callers
    window.astoriaHeadroom = { init: initFallback };
})();
