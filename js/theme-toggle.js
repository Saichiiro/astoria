(function () {
  const STORAGE_KEY = "astoria_theme";
  const root = document.documentElement;

  function readStoredTheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "dark" || stored === "light" ? stored : null;
    } catch {
      return null;
    }
  }

  function writeStoredTheme(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore storage issues
    }
  }

  function resolveInitialTheme() {
    const stored = readStoredTheme();
    if (stored) return stored;
    return "light";
  }

  function applyTheme(next) {
    const value = next === "dark" ? "dark" : "light";
    root.dataset.theme = value;
    if (document.body) {
      document.body.dataset.theme = value;
    }
    writeStoredTheme(value);
  }

  function syncToggle(toggle) {
    if (!toggle) return;
    const isDark = root.dataset.theme === "dark";
    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    toggle.dataset.themeState = isDark ? "dark" : "light";
  }

  function init(scope) {
    const container = scope || document;
    const toggles = Array.from(container.querySelectorAll("[data-theme-toggle]"));
    if (!toggles.length) return;

    toggles.forEach((toggle) => {
      if (toggle.dataset.bound === "true") return;
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        syncToggle(toggle);
      });
      syncToggle(toggle);
    });
  }

  if (!root.dataset.theme) {
    applyTheme(resolveInitialTheme());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  window.initThemeToggle = init;
})();
