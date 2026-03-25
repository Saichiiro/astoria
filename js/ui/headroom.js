(function () {
    'use strict';

    var THRESHOLD = 60;
    var TOLERANCE = 6;

    function bindHeadroom(el) {
        if (el._headroom) return;
        el._headroom = true;

        // Inject a fixed wrapper around the header.
        // The header stays in normal-flow layout inside the wrapper —
        // its internal flex/responsive layout is untouched.
        var outer = document.createElement('div');
        outer.className = 'headroom-outer';
        el.parentNode.insertBefore(outer, el);
        outer.appendChild(el);

        // Spacer keeps the space the header used to occupy in the flow.
        var spacer = document.createElement('div');
        spacer.className = 'headroom-spacer';
        outer.parentNode.insertBefore(spacer, outer.nextSibling);

        function syncHeight() {
            var h = el.offsetHeight;
            outer.style.height = h + 'px';
            spacer.style.height = h + 'px';
        }
        syncHeight();

        if (window.ResizeObserver) {
            new ResizeObserver(syncHeight).observe(el);
        }
        window.addEventListener('resize', syncHeight, { passive: true });

        var lastY = window.scrollY;
        var ticking = false;
        var hidden = false;

        function update() {
            var y = window.scrollY;
            var delta = y - lastY;

            if (y < THRESHOLD) {
                if (hidden) {
                    outer.classList.remove('headroom--hidden');
                    hidden = false;
                }
            } else if (Math.abs(delta) >= TOLERANCE) {
                if (delta > 0 && !hidden) {
                    outer.classList.add('headroom--hidden');
                    hidden = true;
                } else if (delta < 0 && hidden) {
                    outer.classList.remove('headroom--hidden');
                    hidden = false;
                }
            }

            lastY = y;
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }

    function init() {
        document.querySelectorAll('.page-header').forEach(function (el) {
            if (el.closest('[role="dialog"], [aria-modal="true"], .panel-host, .sidebar-panel')) return;
            bindHeadroom(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.astoriaHeadroom = { bind: bindHeadroom, init: init };
})();
