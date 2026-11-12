// Single source of the "links to Astoria sites": data/glossaire.json > liens.
// Used by the home page, the public menu and the in-game menu so every site is
// reachable from every page, and a new link only has to be added in the data file.
import { getRouteHref } from '../config/routes.js';

// Single place for the content file location (edited by the team, see _lisezMoi inside).
export const CONTENT_URL = 'data/glossaire.json';

// Built-in screens of the home page, used while a site has no url yet.
export const VIEW_KINGDOMS = 'royaumes';
export const VIEW_GLOSSARY = 'glossaire';
export const VIEWS = [VIEW_KINGDOMS, VIEW_GLOSSARY];

// Only absolute http(s) links from the content file are accepted.
export function safeUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
        return null;
    }
}

let contentPromise = null;

// The content file, fetched once per page.
export function loadSiteContent() {
    if (!contentPromise) {
        contentPromise = fetch(CONTENT_URL, { cache: 'no-cache' })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .catch((error) => {
                contentPromise = null;
                throw error;
            });
    }
    return contentPromise;
}

// A link item becomes:
//  - external: opens the site in a new tab (url)
//  - view:     opens a built-in screen of the home page (vue), shareable as index.html#<vue>
// Items with neither are not shown anywhere: never a dead end.
export function resolveSiteLink(item) {
    if (!item || !item.titre || item.masque === true) return null;
    const external = safeUrl(item.url);
    const view = VIEWS.includes(item.vue) ? item.vue : null;
    if (!external && !view) return null;
    return {
        id: item.id || item.titre,
        titre: item.titre,
        texte: item.texte || '',
        icone: item.icone || '',
        external: Boolean(external),
        view: external ? null : view,
        href: external || getRouteHref('publicHome', { hash: view })
    };
}

// Built-in screens that are switched on: a screen is off when its link is hidden (masque: true).
export function getEnabledViews(data) {
    const links = Array.isArray(data?.liens) ? data.liens : [];
    const hidden = new Set(links.filter((item) => item?.masque === true && item.vue).map((item) => item.vue));
    return new Set(VIEWS.filter((view) => !hidden.has(view)));
}

export async function loadSiteLinks() {
    const data = await loadSiteContent();
    return (Array.isArray(data.liens) ? data.liens : []).map(resolveSiteLink).filter(Boolean);
}
