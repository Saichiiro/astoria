(function () {
    'use strict';

    var THRESHOLD = 60;
    var TOLERANCE = 6;

    function bindHeadroom(el) {
        if (el._headroom) return;
        el._headroom = true;

        el.classList.add('headroom');

        var spacer = document.createElement('div');
        spacer.className = 'headroom-spacer';
        spacer.style.height = el.offsetHeight + 'px';
        el.parentNode.insertBefore(spacer, el.nextSibling);

        if (window.ResizeObserver) {
            var ro = new ResizeObserver(function () {
                spacer.style.height = el.offsetHeight + 'px';
            });
            ro.observe(el);
        }

        var lastY = window.scrollY;
        var ticking = false;
        var hidden = false;

        function update() {
            var y = window.scrollY;
            var delta = y - lastY;

            if (y < THRESHOLD) {
                if (hidden) {
                    el.classList.remove('headroom--hidden');
                    hidden = false;
                }
            } else if (Math.abs(delta) >= TOLERANCE) {
                if (delta > 0 && !hidden) {
                    el.classList.add('headroom--hidden');
                    hidden = true;
                } else if (delta < 0 && hidden) {
                    el.classList.remove('headroom--hidden');
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
