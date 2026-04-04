import {
  PUBLIC_SITE_CTA_KEYS,
  PUBLIC_SITE_NAV_KEYS,
  getRouteDefinition,
  getRouteHref,
} from "./config/routes.js";

const BRAND_NAME = "Astoria";

function buildNavLinks(activeKey) {
  return PUBLIC_SITE_NAV_KEYS.map((routeKey) => {
    const route = getRouteDefinition(routeKey);
    if (!route) return "";
    const isActive = activeKey === routeKey ? " is-active" : "";
    return `<a class="public-nav-link${isActive}" href="${getRouteHref(routeKey)}">${route.label}</a>`;
  }).join("");
}

function buildHeader(activeKey) {
  const loginHref = getRouteHref(PUBLIC_SITE_CTA_KEYS[0]);
  const appHref = getRouteHref(PUBLIC_SITE_CTA_KEYS[1]);

  return `
    <div class="public-shell">
      <div class="public-topbar">
        <a class="public-brand" href="${getRouteHref("publicHome")}" aria-label="Retour a l'accueil ${BRAND_NAME}">
          <span class="public-brand-mark">A</span>
          <span class="public-brand-copy">
            <span class="public-brand-title">${BRAND_NAME}</span>
            <span class="public-brand-sub">Monde RP vivant</span>
          </span>
        </a>
        <button type="button" class="public-menu-toggle" data-public-menu-toggle aria-expanded="false" aria-controls="publicSiteNav">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="public-topbar-inner" id="publicSiteNav" data-public-menu>
          <nav class="public-nav" aria-label="Navigation principale">
            ${buildNavLinks(activeKey)}
          </nav>
          <div class="public-topbar-actions">
            <a class="public-button public-button--ghost" href="${loginHref}">Connexion</a>
            <a class="public-button" href="${appHref}">Mes personnages</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildFooter(activeKey) {
  const footerLinks = PUBLIC_SITE_NAV_KEYS
    .filter((routeKey) => routeKey !== activeKey)
    .map((routeKey) => {
      const route = getRouteDefinition(routeKey);
      if (!route) return "";
      return `<a href="${getRouteHref(routeKey)}">${route.label}</a>`;
    })
    .join("");

  return `
    <div class="public-shell">
      <div class="public-footer-panel">
        <div class="public-footer-grid">
          <div>
            <h2 class="public-footer-title">${BRAND_NAME}</h2>
            <p class="public-footer-copy">Traverse les royaumes, mesure le ton du monde, puis entre dans la partie jouable quand tu sais deja ce que tu veux y vivre.</p>
          </div>
          <div class="public-footer-links">
            ${footerLinks}
            <a href="${getRouteHref("login")}">Connexion</a>
            <a href="${getRouteHref("characterHub")}">Hub personnages</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initMenu() {
  const toggle = document.querySelector("[data-public-menu-toggle]");
  const menu = document.querySelector("[data-public-menu]");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const nextOpen = !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", nextOpen);
    toggle.setAttribute("aria-expanded", String(nextOpen));
  });

  menu.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initSwitchers() {
  document.querySelectorAll("[data-public-switcher]").forEach((switcher) => {
    const buttons = Array.from(switcher.querySelectorAll("[data-switch-target]"));
    const panels = Array.from(document.querySelectorAll(`[data-switch-group="${switcher.dataset.publicSwitcher}"]`));
    if (!buttons.length || !panels.length) return;

    const activate = (targetKey) => {
      buttons.forEach((button) => {
        const isActive = button.dataset.switchTarget === targetKey;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.switchPanel === targetKey;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => activate(button.dataset.switchTarget));
    });

    const initial = buttons.find((button) => button.classList.contains("is-active"))?.dataset.switchTarget
      || buttons[0].dataset.switchTarget;
    activate(initial);
  });
}

function initAccordions() {
  document.querySelectorAll("[data-public-accordion]").forEach((accordion) => {
    const items = Array.from(accordion.querySelectorAll(".public-accordion-item"));
    items.forEach((item, index) => {
      const button = item.querySelector(".public-accordion-button");
      const panel = item.querySelector(".public-accordion-panel");
      if (!button || !panel) return;

      if (index === 0) {
        item.classList.add("is-open");
        panel.hidden = false;
        button.setAttribute("aria-expanded", "true");
      } else {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }

      button.addEventListener("click", () => {
        const willOpen = !item.classList.contains("is-open");
        items.forEach((otherItem) => {
          const otherButton = otherItem.querySelector(".public-accordion-button");
          const otherPanel = otherItem.querySelector(".public-accordion-panel");
          otherItem.classList.remove("is-open");
          if (otherButton) otherButton.setAttribute("aria-expanded", "false");
          if (otherPanel) otherPanel.hidden = true;
        });
        item.classList.toggle("is-open", willOpen);
        panel.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
      });
    });
  });
}

function initPublicShell() {
  const activeKey = document.body.dataset.publicPage || "publicHome";
  const headerHost = document.querySelector("[data-public-header]");
  const footerHost = document.querySelector("[data-public-footer]");

  if (headerHost) headerHost.innerHTML = buildHeader(activeKey);
  if (footerHost) footerHost.innerHTML = buildFooter(activeKey);

  initMenu();
  initSwitchers();
  initAccordions();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPublicShell);
} else {
  initPublicShell();
}
