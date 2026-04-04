(async () => {
  const body = document.body;
  if (!body) return;

  body.classList.add("sidebar-layout");

  const main = body.querySelector("main");
  if (main) main.classList.add("sidebar-content");

  const head = document.head;
  if (head && !document.querySelector('link[href="css/sidebar.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/sidebar.css";
    head.appendChild(link);
  }
  if (head && !document.querySelector('link[href="css/theme-toggle.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/theme-toggle.css";
    head.appendChild(link);
  }

  const resolveModuleUrl = (relativePath) => {
    const current = document.currentScript;
    if (current?.src) {
      return new URL(relativePath, current.src).href;
    }
    const fallback = document.querySelector('script[src*="js/sidebar.js"]');
    if (fallback?.src) {
      return new URL(relativePath, fallback.src).href;
    }
    return new URL(relativePath, window.location.href).href;
  };

  const fallbackRoutes = {
    characterHub: "personnages.html",
    login: "login.html",
    admin: "admin/index.html",
    codex: "codex.html",
    skills: "competences.html",
    market: "hdv.html",
    inventory: "inventaire.html",
    quests: "quetes.html",
    magic: "magie.html",
    craft: "craft.html",
    nokorah: "nokorah.html",
    characterSheet: "fiche.html",
  };

  const fallbackItems = [
    { id: "adminShortcut", routeKey: "admin", label: "Admin", icon: "⚙", adminOnly: true },
    { id: "codexShortcut", routeKey: "codex", label: "Codex", icon: "📖", adminOnly: true, panelId: "codex" },
    { routeKey: "skills", label: "Compétences", icon: "⚔", panelId: "competences" },
    { routeKey: "market", label: "Hôtel de vente", icon: "🏛", panelId: "hdv" },
    { routeKey: "inventory", label: "Inventaire", icon: "🎒", panelId: "inventaire" },
    { routeKey: "quests", label: "Quêtes", icon: "🔍", panelId: "quetes" },
    { routeKey: "magic", label: "Magie", icon: "✨", panelId: "magie" },
    { routeKey: "craft", label: "Craft", icon: "🔨" },
    { routeKey: "nokorah", label: "Nokorah", icon: "👻", panelId: "nokorah" },
    { routeKey: "characterSheet", label: "Personnage", icon: "👤", panelId: "fiche" },
  ];

  let routesModule = null;
  try {
    routesModule = await import(resolveModuleUrl("./config/routes.js"));
  } catch (error) {
    console.warn("Sidebar routes load failed:", error);
  }

  const getRouteHref = routesModule?.getRouteHref || ((key) => fallbackRoutes[key] || fallbackRoutes.characterHub);
  const sidebarItems = routesModule?.APP_SIDEBAR_ITEMS || fallbackItems;

  if (document.getElementById("sidebarMenu")) return;

  const sidebarItemsMarkup = sidebarItems
    .map((item) => {
      const itemId = item.id ? ` id="${item.id}"` : "";
      const hiddenAttr = item.adminOnly ? " hidden" : "";
      const openButton = item.panelId
        ? `<button type="button" class="menu-open" data-panel="${item.panelId}" aria-label="Ouvrir le panneau ${item.label}">&#8599;</button>`
        : "";

      return `
        <li class="menu-item"${itemId}${hiddenAttr}>
          <div class="sidebar-row">
            <a class="menu-link" href="${getRouteHref(item.routeKey)}">
              <span class="menu-icon" aria-hidden="true">${item.icon}</span>
              <span class="menu-text">${item.label}</span>
            </a>
            ${openButton}
          </div>
        </li>`;
    })
    .join("");

  const markup = `
    <input type="checkbox" class="openSidebarMenu" id="openSidebarMenu" aria-controls="sidebarMenu" aria-label="Ouvrir le menu">
    <label for="openSidebarMenu" class="sidebarIconToggle">
      <div class="spinner diagonal part-1"></div>
      <div class="spinner horizontal"></div>
      <div class="spinner diagonal part-2"></div>
    </label>

    <nav id="sidebarMenu" aria-label="Raccourcis">
      <div class="sidebar-topbar">
        <a class="menu-header menu-header-link" href="${getRouteHref("characterHub")}" aria-label="Retour au hub personnages">
          <span class="menu-header-title" aria-hidden="true">&nbsp;</span>
          <span class="menu-header-sub">Astoria</span>
        </a>
        <button type="button" class="theme-toggle sidebar-theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Basculer le theme">
          <span class="theme-toggle-track">
            <span class="theme-toggle-thumb">
              <span class="theme-toggle-icon theme-toggle-sun" aria-hidden="true">&#9728;</span>
              <span class="theme-toggle-icon theme-toggle-moon" aria-hidden="true">&#9790;</span>
            </span>
          </span>
        </button>
      </div>
      <ul class="sidebarMenuInner">
        ${sidebarItemsMarkup}
        <li class="menu-item menu-footer">
          <button type="button" class="character-select-logout" id="logoutButton" hidden>Déconnexion</button>
          <button type="button" class="character-select-logout" id="loginButton" hidden>Connexion</button>
        </li>
      </ul>
    </nav>
  `;

  body.insertAdjacentHTML("afterbegin", markup);

  const refreshHeadroom = () => {
    if (window.astoriaScrollUI && typeof window.astoriaScrollUI.init === "function") {
      window.astoriaScrollUI.init();
      return;
    }
    if (window.astoriaHeadroom && typeof window.astoriaHeadroom.init === "function") {
      window.astoriaHeadroom.init();
    }
  };

  const themeScriptLoaded = () => {
    if (typeof window.initThemeToggle === "function") {
      window.initThemeToggle(body);
    }
  };

  if (!document.querySelector('script[src="js/theme-toggle.js"]')) {
    const script = document.createElement("script");
    script.src = "js/theme-toggle.js";
    script.onload = themeScriptLoaded;
    document.body.appendChild(script);
  } else {
    themeScriptLoaded();
  }

  const toggle = document.getElementById("openSidebarMenu");
  const sidebar = document.getElementById("sidebarMenu");
  const iconToggle = document.querySelector(".sidebarIconToggle");
  const closeSidebar = () => {
    body.classList.remove("sidebar-open");
    if (toggle) toggle.checked = false;
  };
  const syncSidebarState = () => {
    if (!toggle) return;
    body.classList.toggle("sidebar-open", !!toggle.checked);
  };

  closeSidebar();
  refreshHeadroom();

  if (toggle) {
    toggle.addEventListener("change", () => {
      syncSidebarState();
    });
  }

  if (toggle && iconToggle) {
    iconToggle.addEventListener("click", (event) => {
      event.preventDefault();
      const nextOpen = !body.classList.contains("sidebar-open");
      body.classList.toggle("sidebar-open", nextOpen);
      toggle.checked = nextOpen;
    });
  }

  if (toggle && sidebar && iconToggle) {
    document.addEventListener("click", (event) => {
      if (!body.classList.contains("sidebar-open")) return;
      const target = event.target;
      if (target?.closest?.(".panel-backdrop, .panel-drawer")) return;
      if (document.documentElement.classList.contains("panel-open")) return;
      if (sidebar.contains(target) || iconToggle.contains(target)) return;
      closeSidebar();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (event.defaultPrevented) return;
    if (document.documentElement.classList.contains("panel-open")) return;
    if (!body.classList.contains("sidebar-open")) return;
    closeSidebar();
  });

  sidebar?.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener("click", () => {
      closeSidebar();
    });
  });

  document.querySelectorAll("a.page-back[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const sameOriginReferrer = Boolean(document.referrer) && (() => {
        try {
          return new URL(document.referrer).origin === window.location.origin;
        } catch {
          return false;
        }
      })();
      if (window.history.length > 1 && sameOriginReferrer) {
        event.preventDefault();
        window.history.back();
      }
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      closeSidebar();
      refreshHeadroom();
      return;
    }
    syncSidebarState();
    refreshHeadroom();
  });

  window.addEventListener("pagehide", () => {
    closeSidebar();
  });

  const logoutBtns = Array.from(document.querySelectorAll("#logoutButton"));
  const loginBtns = Array.from(document.querySelectorAll("#loginButton"));
  const adminShortcut = document.getElementById("adminShortcut");
  const codexShortcut = document.getElementById("codexShortcut");

  const setAuthButtons = async () => {
    if (!logoutBtns.length || !loginBtns.length) return;

    try {
      const auth = await import(resolveModuleUrl("./auth.js"));
      const isLoggedIn = typeof auth.isAuthenticated === "function"
        ? auth.isAuthenticated()
        : !!auth.getCurrentUser?.();
      const isAdmin = typeof auth.isAdmin === "function" ? auth.isAdmin() : false;

      if (isLoggedIn) {
        logoutBtns.forEach((btn) => (btn.hidden = false));
        loginBtns.forEach((btn) => (btn.hidden = true));
        if (adminShortcut) adminShortcut.hidden = !isAdmin;
        if (codexShortcut) codexShortcut.hidden = !isAdmin;
        logoutBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            if (typeof auth.logout === "function") {
              auth.logout();
            }
            window.location.href = getRouteHref("login");
          });
        });
      } else {
        logoutBtns.forEach((btn) => (btn.hidden = true));
        loginBtns.forEach((btn) => (btn.hidden = false));
        if (adminShortcut) adminShortcut.hidden = true;
        if (codexShortcut) codexShortcut.hidden = true;
        loginBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            window.location.href = getRouteHref("login");
          });
        });
      }
    } catch (error) {
      console.warn("Sidebar auth load failed:", error);
      logoutBtns.forEach((btn) => (btn.hidden = true));
      loginBtns.forEach((btn) => (btn.hidden = false));
      if (adminShortcut) adminShortcut.hidden = true;
      if (codexShortcut) codexShortcut.hidden = true;
      loginBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          window.location.href = getRouteHref("login");
        });
      });
    }
  };

  setAuthButtons();

  const setupPanelShortcuts = async () => {
    try {
      const panelShortcuts = await import(resolveModuleUrl("./ui/panel-shortcuts.js"));
      if (typeof panelShortcuts.initPanelShortcuts === "function") {
        panelShortcuts.initPanelShortcuts({
          selector: ".sidebarMenuInner [data-panel]",
        });
      }
    } catch (error) {
      console.warn("Sidebar panel shortcuts failed:", error);
    }
  };

  setupPanelShortcuts();
})();
