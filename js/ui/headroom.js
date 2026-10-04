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
    var FOCUS_TOP_BUFFER = 120;
    var CHARACTER_SELECTOR = '.page-header .character-summary';
    var HAMBURGER_SELECTOR = '.sidebarIconToggle';
    var MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"]';
    var SEARCH_CONTAINER_SELECTOR = '.inventory-search, [data-search-priority]';
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
            el.classList.toggle('headroom--hidden', hidden);
        });
    }

    function hasSearchFocus() {
        var active = document.activeElement;
        if (!active || typeof active.closest !== 'function') return false;
        if (active.isContentEditable) {
            return Boolean(active.closest(SEARCH_CONTAINER_SELECTOR));
        }

        var tag = active.tagName ? active.tagName.toLowerCase() : '';
        if (['input', 'textarea', 'select'].indexOf(tag) === -1) return false;
        return Boolean(active.closest(SEARCH_CONTAINER_SELECTOR));
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
            var searchFocusActive = hasSearchFocus();

            if (searchFocusActive && y < FOCUS_TOP_BUFFER) {
                hidden = false;
            } else if (y < THRESHOLD) {
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

        function onFocusChange() {
            requestAnimationFrame(function () {
                syncVisibility(false);
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pageshow', onPageShow);
        document.addEventListener('focusin', onFocusChange);
        document.addEventListener('focusout', onFocusChange);
        removeListener = function () {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pageshow', onPageShow);
            document.removeEventListener('focusin', onFocusChange);
            document.removeEventListener('focusout', onFocusChange);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFallback);
    } else {
        initFallback();
    }

    window.astoriaHeadroom = { init: initFallback };
})();
