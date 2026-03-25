(function () {
    'use strict';

    var THRESHOLD = 60;
    var TOLERANCE = 6;

    function init() {
        var targets = [];

        // Character summaries inside page headers (pas dans les modals)
        document.querySelectorAll('.page-header .character-summary').forEach(function (el) {
            if (el.closest('[role="dialog"], [aria-modal="true"]')) return;
            el.classList.add('headroom-character');
            targets.push(el);
        });

        // Sidebar toggle — déjà fixed, on lui ajoute juste le comportement scroll
        var toggle = document.querySelector('.sidebarIconToggle');
        if (toggle) targets.push(toggle);

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
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.astoriaHeadroom = { init: init };
})();
