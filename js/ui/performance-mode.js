(function () {
    const STORAGE_KEY = 'astoria_perf_mode';

    function readStoredMode() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw === 'lite' || raw === 'auto' ? raw : 'auto';
        } catch {
            return 'auto';
        }
    }

    function writeStoredMode(mode) {
        try {
            localStorage.setItem(STORAGE_KEY, mode === 'lite' ? 'lite' : 'auto');
        } catch {
            // Ignore storage write failures (tracking prevention/private mode).
        }
    }

    function inferLiteMode() {
        const reducedMotion = Boolean(
            window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
        const saveData = Boolean(navigator.connection && navigator.connection.saveData);
        const lowCores = Number(navigator.hardwareConcurrency) > 0 && Number(navigator.hardwareConcurrency) <= 4;
        const lowMemory = Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4;
        return reducedMotion || saveData || lowCores || lowMemory;
    }

    function applyMode(isLite) {
        const root = document.documentElement;
        const body = document.body;
        if (root) {
            root.classList.toggle('perf-lite', isLite);
            root.setAttribute('data-perf-mode', isLite ? 'lite' : 'auto');
        }
        if (body) {
            body.classList.toggle('perf-lite', isLite);
            body.setAttribute('data-perf-mode', isLite ? 'lite' : 'auto');
        }
    }

    function resolveLiteMode(preferred) {
        if (preferred === 'lite') return true;
        return inferLiteMode();
    }

    let preferredMode = readStoredMode();
    let enabled = resolveLiteMode(preferredMode);

    function setMode(mode) {
        preferredMode = mode === 'lite' ? 'lite' : 'auto';
        writeStoredMode(preferredMode);
        enabled = resolveLiteMode(preferredMode);
        applyMode(enabled);
        return enabled;
    }

    // Apply immediately, and again after DOM is ready.
    applyMode(enabled);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyMode(enabled), { once: true });
    }

    if (window.matchMedia) {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', () => {
                if (preferredMode === 'auto') {
                    enabled = resolveLiteMode(preferredMode);
                    applyMode(enabled);
                }
            });
        }
    }

    window.astoriaPerformanceMode = {
        get enabled() {
            return enabled;
        },
        get mode() {
            return preferredMode;
        },
        infer: inferLiteMode,
        setMode
    };
})();
