/**
 * headroom.js - legacy IIFE shim
 *
 * Kept for backward compatibility (pages include this via <script src>).
 * The real logic lives in scroll-ui.js (ES module).
 *
 * On DOMContentLoaded, calls initScrollUI() if available, otherwise falls back
 * to the inline implementation so the page still works even if character-summary
 * has not called initScrollUI() yet.
 */
(function () {
    'use strict';

    var THRESHOLD = 10;
    var TOLERANCE = 2;
    var CHARACTER_SELECTOR = '.page-header .character-summary';
    var HAMBURGER_SELECTOR = '.sidebarIconToggle';
    var MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"]';
    var removeListener = null;

    function collectTargets() {
        var characters = [];
        var hamburgers = [];

        document.querySelectorAll(CHARACTER_SELECTOR).forEach(function (el) {
            if (el.closest(MODAL_SELECTOR)) return;
            el.classList.add('headroom-character');
            characters.push(el);
        });

        document.querySelectorAll(HAMBURGER_SELECTOR).forEach(function (el) {
            el.classList.add('headroom-hamburger');
            hamburgers.push(el);
        });

        return { characters: characters, hamburgers: hamburgers };
    }

    function applyHiddenState(characters, hamburgers, hidden) {
        characters.forEach(function (el) {
            el.classList.toggle('headroom--hidden', hidden);
        });
        hamburgers.forEach(function (el) {
            el.classList.toggle('headroom--hidden', !hidden);
        });
    }

    function initFallback() {
        if (removeListener) {
            removeListener();
            removeListener = null;
        }

        if (window.astoriaScrollUI && typeof window.astoriaScrollUI.init === 'function') {
            window.astoriaScrollUI.init();
            return;
        }

        var collected = collectTargets();
        var targets = collected.characters;
        var hamburgers = collected.hamburgers;

        if (!targets.length && !hamburgers.length) return;

        var lastY = window.scrollY;
        var ticking = false;
        var hidden = window.scrollY >= THRESHOLD;

        applyHiddenState(targets, hamburgers, hidden);

        function syncVisibility(force) {
            var y = window.scrollY;
            var delta = y - lastY;

            if (y < THRESHOLD) {
                hidden = false;
            } else if (force) {
                hidden = true;
            } else if (Math.abs(delta) >= TOLERANCE) {
                hidden = delta > 0;
            }

            applyHiddenState(targets, hamburgers, hidden);
            lastY = y;
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                syncVisibility(false);
                ticking = false;
            });
        }

        function onPageShow() {
            syncVisibility(true);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pageshow', onPageShow);
        removeListener = function () {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pageshow', onPageShow);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFallback);
    } else {
        initFallback();
    }

    window.astoriaHeadroom = { init: initFallback };
})();
