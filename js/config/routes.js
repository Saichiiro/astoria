const ROUTE_DEFINITIONS = Object.freeze({
  publicHome: {
    path: "index.html",
    area: "public",
    label: "Accueil",
  },
  login: { path: "html/login.html", area: "public", label: "Connexion" },
  characterHub: { path: "html/personnages.html", area: "app", label: "Selection personnage" },
  profile: { path: "html/profil.html", area: "app", label: "Profil" },
  characterSheet: { path: "html/fiche.html", area: "app", label: "Personnage" },
  inventory: { path: "html/inventaire.html", area: "app", label: "Inventaire" },
  skills: { path: "html/competences.html", area: "app", label: "Competences" },
  market: { path: "html/hdv.html", area: "app", label: "Hotel de vente" },
  quests: { path: "html/quetes.html", area: "app", label: "Quetes" },
  magic: { path: "html/magie.html", area: "app", label: "Magie" },
  craft: { path: "html/craft.html", area: "app", label: "Craft" },
  nokorah: { path: "html/nokorah.html", area: "app", label: "Nokorah" },
  codex: { path: "html/codex.html", area: "app", label: "Codex" },
  admin: { path: "admin/index.html", area: "admin", label: "Admin" },
  publicUniverse: { path: "univers.html", area: "public", label: "Univers" },
  publicKingdoms: { path: "royaumes.html", area: "public", label: "Royaumes" },
  publicGameplay: { path: "gameplay.html", area: "public", label: "Gameplay" },
  publicRoadmap: { path: "prochainement.html", area: "public", label: "Prochainement" },
  publicJoin: { path: "rejoindre.html", area: "public", label: "Rejoindre" },
});

export const ROUTES = Object.freeze(
  Object.fromEntries(
    Object.entries(ROUTE_DEFINITIONS).map(([key, definition]) => [key, definition.path]),
  ),
);

export const APP_SIDEBAR_ITEMS = Object.freeze([
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
]);

function getCurrentHref() {
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href;
  }
  return "http://localhost/";
}

function getProjectBaseUrl(from = getCurrentHref()) {
  const currentUrl = from instanceof URL ? from : new URL(from, getCurrentHref());
  const normalizedPath = String(currentUrl.pathname || "/").replace(/\\/g, "/");
  // Pages in these sub-folders resolve routes from the project root.
  const folderMarkers = ["/admin/", "/html/"];
  const markerIndex = folderMarkers
    .map((marker) => normalizedPath.lastIndexOf(marker))
    .reduce((best, index) => Math.max(best, index), -1);
  const basePath = markerIndex >= 0
    ? normalizedPath.slice(0, markerIndex + 1)
    : normalizedPath.slice(0, normalizedPath.lastIndexOf("/") + 1);
  return new URL(basePath || "/", currentUrl);
}

function applyRouteOptions(url, { query, hash } = {}) {
  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value == null || value === "") {
        url.searchParams.delete(key);
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  if (typeof hash === "string") {
    url.hash = hash.startsWith("#") ? hash : `#${hash}`;
  }

  return url;
}

export function getRouteDefinition(routeKey) {
  return ROUTE_DEFINITIONS[routeKey] || null;
}

export function getRouteUrl(routeKey, options = {}) {
  const definition = getRouteDefinition(routeKey);
  if (!definition) {
    throw new Error(`Unknown route key: ${routeKey}`);
  }

  const baseUrl = getProjectBaseUrl(options.from);
  const url = new URL(definition.path, baseUrl);
  return applyRouteOptions(url, options);
}

export function getRouteHref(routeKey, options = {}) {
  const url = getRouteUrl(routeKey, options);
  if (options.absolute) return url.href;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function redirectToRoute(routeKey, options = {}) {
  if (typeof window === "undefined") return;
  window.location.href = getRouteHref(routeKey, options);
}
