(function () {
  const root = document.querySelector('[data-card-gallery]');
  if (!root) return;

  const STORAGE_KEY = "astoria_active_character";
  const LEGACY_SUMMARY_KEY = "astoria_character_summary";

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function buildSummary() {
    const active = readJson(STORAGE_KEY);
    if (active && active.id) {
      const profileData = active.profile_data || {};
      const stored = profileData.fiche_summary;
      const base = {
        id: active.id,
        name: active.name || "Personnage",
        role: [active.race, active.class].filter(Boolean).join(" - ") || "Classe / Role / Surnom",
        avatar_url: profileData.avatar_url || ""
      };
      if (stored && typeof stored === "object") {
        return {
          ...base,
          ...stored,
          id: stored.id || base.id,
          name: stored.name || base.name,
          role: stored.role || base.role,
          avatar_url: stored.avatar_url || base.avatar_url
        };
      }
      return base;
    }
    return readJson(LEGACY_SUMMARY_KEY);
  }

  function hydrateSummary() {
    const summary = buildSummary();
    if (!summary) return;

    const nameEl = root.querySelector("[data-cc-name]");
    const roleEl = root.querySelector("[data-cc-role]");
    const taglineEl = root.querySelector("[data-cc-tagline]");
    const emblemEl = root.querySelector("[data-cc-emblem]");

    if (nameEl) nameEl.textContent = summary.name || "Personnage";
    if (roleEl) roleEl.textContent = summary.role || "Classe / Role / Surnom";
    if (taglineEl) taglineEl.textContent = summary.tagline || summary.role || "Classe / Role / Surnom";
    if (emblemEl) {
      const initial = summary.name ? summary.name.charAt(0).toUpperCase() : "A";
      emblemEl.textContent = initial;
    }
  }

  const tabs = Array.from(root.querySelectorAll('[data-card-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-card-panel]'));

  const setActive = (id) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.cardTab === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach((panel) => {
      const active = panel.dataset.cardPanel === id;
      panel.classList.toggle('is-hidden', !active);
      if (active) {
        panel.setAttribute('tabindex', '0');
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
        panel.removeAttribute('tabindex');
      }
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActive(tab.dataset.cardTab));
  });

  if (tabs[0]) setActive(tabs[0].dataset.cardTab);
  hydrateSummary();
})();
