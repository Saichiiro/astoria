(() => {
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

  if (document.getElementById("sidebarMenu")) return;

  const markup = `
    <input type="checkbox" class="openSidebarMenu" id="openSidebarMenu" aria-controls="sidebarMenu" aria-label="Ouvrir le menu">
    <label for="openSidebarMenu" class="sidebarIconToggle">
      <div class="spinner diagonal part-1"></div>
      <div class="spinner horizontal"></div>
      <div class="spinner diagonal part-2"></div>
    </label>

    <nav id="sidebarMenu" aria-label="Raccourcis">
      <div class="sidebar-topbar">
        <div class="menu-header">
          <span class="menu-header-title" aria-hidden="true">&nbsp;</span>
          <span class="menu-header-sub">Astoria</span>
        </div>
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
        <li class="menu-item" id="adminShortcut" hidden>
          <button type="button" class="menu-link" data-panel="admin">
            <span class="menu-icon" aria-hidden="true">&#9881;</span>
            <span class="menu-text">Admin</span>
          </button>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="codex.html">
              <span class="menu-icon" aria-hidden="true">&#128214;</span>
              <span class="menu-text">Codex</span>
            </a>
            <button type="button" class="menu-open" data-panel="codex" aria-label="Ouvrir le panneau Codex">&#8599;</button>
          </div>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="competences.html">
              <span class="menu-icon" aria-hidden="true">&#9876;</span>
              <span class="menu-text">Comp&#233;tences</span>
            </a>
            <button type="button" class="menu-open" data-panel="competences" aria-label="Ouvrir le panneau Comp&#233;tences">&#8599;</button>
          </div>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="hdv.html">
              <span class="menu-icon" aria-hidden="true">&#127963;</span>
              <span class="menu-text">H&#244;tel de vente</span>
            </a>
            <button type="button" class="menu-open" data-panel="hdv" aria-label="Ouvrir le panneau HDV">&#8599;</button>
          </div>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="inventaire.html">
              <span class="menu-icon" aria-hidden="true">&#127890;</span>
              <span class="menu-text">Inventaire</span>
            </a>
            <button type="button" class="menu-open" data-panel="inventaire" aria-label="Ouvrir le panneau Inventaire">&#8599;</button>
          </div>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="magie.html">
              <span class="menu-icon" aria-hidden="true">&#10024;</span>
              <span class="menu-text">Magie</span>
            </a>
            <button type="button" class="menu-open" data-panel="magie" aria-label="Ouvrir le panneau Magie">&#8599;</button>
          </div>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="nokorah.html">
              <span class="menu-icon" aria-hidden="true">&#128123;</span>
              <span class="menu-text">Nokorah</span>
            </a>
            <button type="button" class="menu-open" data-panel="nokorah" aria-label="Ouvrir le panneau Nokorah">&#8599;</button>
          </div>
        </li>
        <li class="menu-item">
          <div class="sidebar-row">
            <a class="menu-link" href="fiche.html">
              <span class="menu-icon" aria-hidden="true">&#128100;</span>
              <span class="menu-text">Personnage</span>
            </a>
            <button type="button" class="menu-open" data-panel="fiche" aria-label="Ouvrir le panneau Personnage">&#8599;</button>
          </div>
        </li>
        <li class="menu-item menu-footer">
          <button type="button" class="character-select-logout" id="logoutButton" hidden>D&#233;connexion</button>
          <button type="button" class="character-select-logout" id="loginButton" hidden>Connexion</button>
        </li>
      </ul>
    </nav>
  `;

  body.insertAdjacentHTML("afterbegin", markup);

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

  if (toggle) {
    toggle.addEventListener("change", () => {
      body.classList.toggle("sidebar-open", toggle.checked);
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
      if (sidebar.contains(target) || iconToggle.contains(target)) return;
      body.classList.remove("sidebar-open");
      toggle.checked = false;
    });
  }

  const logoutBtn = document.getElementById("logoutButton");
  const loginBtn = document.getElementById("loginButton");
  const adminShortcut = document.getElementById("adminShortcut");

  const setAuthButtons = async () => {
    if (!logoutBtn || !loginBtn) return;

    try {
      const auth = await import("./auth.js");
      const isLoggedIn = typeof auth.isAuthenticated === "function"
        ? auth.isAuthenticated()
        : !!auth.getCurrentUser?.();
      const isAdmin = typeof auth.isAdmin === "function" ? auth.isAdmin() : false;

      if (isLoggedIn) {
        logoutBtn.hidden = false;
        loginBtn.hidden = true;
        if (adminShortcut) adminShortcut.hidden = !isAdmin;
        logoutBtn.addEventListener("click", () => {
          if (typeof auth.logout === "function") {
            auth.logout();
          }
          window.location.href = "login.html";
        });
      } else {
        logoutBtn.hidden = true;
        loginBtn.hidden = false;
        if (adminShortcut) adminShortcut.hidden = true;
        loginBtn.addEventListener("click", () => {
          window.location.href = "login.html";
        });
      }
    } catch (error) {
      console.warn("Sidebar auth load failed:", error);
      logoutBtn.hidden = true;
      loginBtn.hidden = false;
      if (adminShortcut) adminShortcut.hidden = true;
      loginBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }
  };

  setAuthButtons();

  const setupPanelShortcuts = async () => {
    try {
      const panelShortcuts = await import("./ui/panel-shortcuts.js");
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
