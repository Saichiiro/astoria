import { createPanelHost } from "./panel-host.js";
import { getPanelById } from "../panels/registry.js";

let authModule = null;

async function loadAuthModule() {
  if (authModule) return authModule;
  try {
    authModule = await import("../auth.js");
    return authModule;
  } catch (error) {
    console.warn("Panel shortcuts: auth module unavailable.", error);
    return null;
  }
}

async function buildDefaultContext() {
  const auth = await loadAuthModule();
  const user = auth?.getCurrentUser ? auth.getCurrentUser() : null;
  const character = auth?.getActiveCharacter ? auth.getActiveCharacter() : null;
  const isAdmin = auth?.isAdmin ? auth.isAdmin() : false;
  return { user, character, isAdmin };
}

export function initPanelShortcuts({
  root = document,
  selector = "[data-panel]",
  getContext,
  variant,
} = {}) {
  const panelHost = createPanelHost({ root: document.body, variant });
  const resolveContext = typeof getContext === "function" ? getContext : buildDefaultContext;

  function buildFallbackPanel(titleText, messageText) {
    const wrapper = document.createElement("div");
    wrapper.className = "panel-card";
    const title = document.createElement("h3");
    title.className = "panel-card-title";
    title.textContent = titleText || "Panel";
    const message = document.createElement("p");
    message.className = "panel-muted";
    message.textContent = messageText || "Aucun contenu disponible.";
    wrapper.appendChild(title);
    wrapper.appendChild(message);
    return wrapper;
  }

  async function renderPanel(panelId) {
    const panel = getPanelById(panelId);
    if (!panel) {
      panelHost.open({
        panelId,
        titleText: "Panel",
        node: buildFallbackPanel("Panel indisponible", `Aucun panel pour ${panelId || "cette section"}.`),
      });
      return;
    }
    const ctx = await resolveContext();
    let node = null;
    try {
      node = panel.renderPanel(ctx);
    } catch (error) {
      console.warn("Panel render failed:", error);
      node = buildFallbackPanel("Panel indisponible", "Impossible d'afficher ce panneau.");
    }
    if (!node) {
      node = buildFallbackPanel("Panel indisponible", "Aucun contenu disponible.");
    }
    panelHost.open({
      panelId: panel.id,
      titleText: panel.title,
      fullPageHref: panel.fullPageHref,
      fullPageLabel: panel.fullPageLabel,
      node,
    });
  }

  async function syncAdminButtons() {
    const ctx = await resolveContext();
    const adminButtons = root.querySelectorAll(`${selector}[data-panel="admin"]`);
    adminButtons.forEach((btn) => {
      btn.hidden = !ctx?.isAdmin;
    });
  }

  function rerenderOpenPanelIfAny() {
    if (!panelHost.isOpen()) return;
    const current = panelHost.getCurrentPanelId();
    if (current) {
      void renderPanel(current);
    }
  }

  root.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const panelId = btn.getAttribute("data-panel");
      if (panelId) {
        void renderPanel(panelId);
      }
    });
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== "astoria_active_character") return;
    rerenderOpenPanelIfAny();
    void syncAdminButtons();
  });

  window.addEventListener("astoria:character-changed", () => {
    rerenderOpenPanelIfAny();
    void syncAdminButtons();
  });

  void syncAdminButtons();
  return { renderPanel, rerenderOpenPanelIfAny, panelHost };
}
