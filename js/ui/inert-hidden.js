// Keeps panels, drawers and modals that are hidden (aria-hidden="true") out of
// reach: they must not receive keyboard focus or be read by screen readers.
// An element hidden from assistive tech that still contains links or buttons let
// Tab walk through invisible controls (dozens of stops on the quests page).
//
// Mirrors aria-hidden onto the `inert` attribute: the open/close code of each page
// keeps toggling aria-hidden as before, nothing else changes.
(function () {
    'use strict';

    var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

    function sync(el) {
        if (!(el instanceof HTMLElement)) return;
        var hidden = el.getAttribute('aria-hidden') === 'true';
        if (hidden) {
            // Only containers with something focusable inside: decorative aria-hidden
            // icons and text are left alone.
            if (el.matches(FOCUSABLE) || el.querySelector(FOCUSABLE)) el.inert = true;
        } else if (el.inert && el.hasAttribute('aria-hidden')) {
            el.inert = false;
        }
    }

    function scan(root) {
        if (root.matches && root.matches('[aria-hidden]')) sync(root);
        if (root.querySelectorAll) root.querySelectorAll('[aria-hidden]').forEach(sync);
    }

    function init() {
        scan(document.body);

        // Open/close code flips aria-hidden: follow it.
        new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.type === 'attributes') sync(m.target);
                else m.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); });
            });
        }).observe(document.body, {
            attributes: true,
            attributeFilter: ['aria-hidden'],
            subtree: true,
            childList: true
        });
    }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
