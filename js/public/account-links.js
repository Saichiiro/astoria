// Shared by the public pages: page links come from js/config/routes.js and the
// "account" entry point adapts to the visitor (login, or characters when logged in).
import { readSession } from '../api/session-store.js';
import { getRouteHref } from '../config/routes.js';

export function isLoggedIn() {
    try {
        return Boolean(readSession()?.user?.id);
    } catch {
        return false;
    }
}

// <a data-route="key" [data-route-hash="section"]>
export function applyRouteLinks(root = document) {
    root.querySelectorAll('[data-route]').forEach((link) => {
        const hash = link.dataset.routeHash;
        link.href = getRouteHref(link.dataset.route, hash ? { hash } : {});
    });
}

// Elements marked data-account-link lead to the characters once logged in.
export function syncAccountLinks(root = document) {
    if (!isLoggedIn()) return;
    root.querySelectorAll('[data-account-link]').forEach((link) => {
        link.dataset.route = 'characterHub';
        if (!link.hasAttribute('data-account-card')) link.textContent = 'Mes personnages';
    });
    root.querySelectorAll('[data-account-title]').forEach((node) => { node.textContent = 'Je joue déjà'; });
    root.querySelectorAll('[data-account-text]').forEach((node) => { node.textContent = 'Mes personnages'; });
}

export function initAccountLinks(root = document) {
    syncAccountLinks(root);
    applyRouteLinks(root);
}

export { getRouteHref };
