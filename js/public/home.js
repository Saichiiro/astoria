// Public home page: a minimal welcome with two choices, and a built-in viewer
// (guided tour "Je découvre Astoria" + glossary) that never leaves the page.
// Content comes from data/glossaire.json; everything is built with textContent.
import { initAccountLinks, getRouteHref } from './account-links.js';

// Single place for the content file location (edited by the team, see _lisezMoi inside).
const CONTENT_URL = 'data/glossaire.json';
const GENERAL = 'general';
// Viewer screens in the URL: #decouvrir, #decouvrir-2…, #glossaire, #terme-<mot>
const VIEW_TOUR = 'decouvrir';
const VIEW_GLOSSARY = 'glossaire';
const TERM_PREFIX = 'terme-';

const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const slugify = (value) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function button(label, className, onClick) {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
}

function link(label, className, href) {
    const node = el('a', className, label);
    node.href = href;
    return node;
}

// Text with every occurrence of the (normalized) query wrapped in <mark>, built as nodes.
function highlight(text, query) {
    const value = String(text || '');
    const fragment = document.createDocumentFragment();
    if (!query) {
        fragment.append(value);
        return fragment;
    }
    // Accents are dropped after NFD, one character per source character for Latin text,
    // so indexes found on the folded copy map back to the original.
    const folded = value.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (folded.length !== value.length) {
        fragment.append(value);
        return fragment;
    }
    const haystack = folded.toLowerCase();
    let from = 0;
    let index = haystack.indexOf(query);
    while (index !== -1) {
        fragment.append(value.slice(from, index));
        fragment.appendChild(el('mark', 'home-mark', value.slice(index, index + query.length)));
        from = index + query.length;
        index = haystack.indexOf(query, from);
    }
    fragment.append(value.slice(from));
    return fragment;
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function renderPresentation(data) {
    const p = data.presentation || {};
    const set = (id, value) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.textContent = value || '';
        node.hidden = !value;
    };
    set('homeKicker', p.surtitre);
    set('homeTitle', p.titre || 'Astoria');
    set('homeTagline', p.accroche);
}

function createViewer(data) {
    const viewer = document.getElementById('homeViewer');
    const panelBody = document.getElementById('viewerBody');
    const labelEl = document.getElementById('viewerLabel');
    const titleEl = document.getElementById('viewerTitle');
    const content = document.getElementById('viewerContent');
    const foot = document.getElementById('viewerFoot');
    const steps = Array.isArray(data.parcours) ? data.parcours : [];
    const kingdoms = data.royaumes || [];
    const categories = data.categories || [];
    let lastFocus = null;

    // ---------- Visite guidée ----------
    function renderStepBody(step) {
        if (step.texte) content.appendChild(el('p', 'viewer-text', step.texte));

        if (step.type === 'royaumes') {
            const list = el('div', 'viewer-kingdom-list');
            kingdoms.forEach((kingdom) => {
                const item = el('details', 'viewer-kingdom');
                if (kingdom.couleur) item.style.setProperty('--kingdom-color', kingdom.couleur);
                const summary = el('summary', 'viewer-kingdom-summary');
                summary.appendChild(el('span', 'viewer-kingdom-name', kingdom.nom));
                if (kingdom.accroche) summary.appendChild(el('span', 'viewer-kingdom-tagline', kingdom.accroche));
                item.appendChild(summary);
                if (kingdom.description) item.appendChild(el('p', 'viewer-kingdom-text', kingdom.description));
                list.appendChild(item);
            });
            content.appendChild(list);
        }

        if (step.type === 'rejoindre') {
            const actions = el('div', 'viewer-actions');
            actions.appendChild(link('Créer un compte', 'home-btn', getRouteHref('login', { hash: 'register' })));
            actions.appendChild(link('Se connecter', 'home-btn home-btn--ghost', getRouteHref('login')));
            content.appendChild(actions);
            content.appendChild(button('Ouvrir le glossaire', 'home-link', () => show(VIEW_GLOSSARY)));
        }
    }

    function renderTour(index) {
        const i = Math.min(Math.max(index, 0), Math.max(steps.length - 1, 0));
        const step = steps[i];
        if (!step) return;
        labelEl.textContent = `Découvrir · ${i + 1} / ${steps.length}`;
        titleEl.textContent = step.titre || '';
        renderStepBody(step);

        const prev = button('Précédent', 'home-btn home-btn--ghost', () => show(VIEW_TOUR, i - 1));
        prev.disabled = i === 0;
        const dots = el('div', 'viewer-dots');
        dots.setAttribute('aria-hidden', 'true');
        steps.forEach((_, index2) => dots.appendChild(el('span', index2 === i ? 'viewer-dot is-active' : 'viewer-dot')));
        const isLast = i === steps.length - 1;
        const next = isLast
            ? button('Terminer', 'home-btn', close)
            : button('Suivant', 'home-btn', () => show(VIEW_TOUR, i + 1));
        foot.append(prev, dots, next);
    }

    // ---------- Glossaire ----------
    const terms = (data.termes || [])
        .filter((t) => t && t.terme)
        .map((t) => ({
            ...t,
            royaume: t.royaume || GENERAL,
            slug: `${TERM_PREFIX}${slugify(t.terme)}`,
            haystack: normalize([t.terme, ...(t.alias || []), t.definition].join(' '))
        }))
        .sort((a, b) => normalize(a.terme).localeCompare(normalize(b.terme), 'fr'));
    const kingdomName = (id) => (id === GENERAL ? 'Général' : kingdoms.find((k) => k.id === id)?.nom || id);
    const categoryName = (id) => categories.find((c) => c.id === id)?.libelle || id;
    const totalBy = (key, value) => terms.filter((t) => t[key] === value).length;
    const glossaryState = { query: '', kingdom: 'all' };
    let searchInput = null;

    async function shareTerm(t, shareButton) {
        const url = new URL(window.location.href);
        url.hash = t.slug;
        const done = await copyText(url.href);
        shareButton.textContent = done ? 'Lien copié ✓' : url.href;
        shareButton.classList.add('is-done');
        setTimeout(() => {
            shareButton.textContent = '🔗';
            shareButton.classList.remove('is-done');
        }, 1800);
    }

    function renderGlossary(focusSlug = null) {
        labelEl.textContent = 'Glossaire';
        titleEl.textContent = 'Glossaire';

        const search = el('input', 'home-search');
        search.type = 'search';
        search.placeholder = 'Rechercher un mot…';
        search.setAttribute('aria-label', 'Rechercher un mot');
        search.value = glossaryState.query;
        searchInput = search;

        const chips = el('div', 'home-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Filtrer par royaume');
        const count = el('p', 'home-count');
        count.setAttribute('aria-live', 'polite');
        const list = el('div', 'home-terms viewer-terms');

        const isFiltered = () => Boolean(glossaryState.query.trim()) || glossaryState.kingdom !== 'all';
        const syncChips = () => chips.querySelectorAll('.home-chip')
            .forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === glossaryState.kingdom)));
        const reset = () => {
            glossaryState.query = '';
            glossaryState.kingdom = 'all';
            search.value = '';
            syncChips();
            renderList();
            search.focus();
        };
        const resetButton = () => button('Réinitialiser les filtres', 'home-reset', reset);

        function renderList() {
            const query = normalize(glossaryState.query);
            const visible = terms.filter((t) =>
                (glossaryState.kingdom === 'all' || t.royaume === glossaryState.kingdom)
                && (!query || t.haystack.includes(query)));
            count.textContent = `${visible.length} mot${visible.length > 1 ? 's' : ''}`;
            if (visible.length !== terms.length) count.append(` sur ${terms.length}`);
            if (isFiltered()) count.appendChild(resetButton());
            list.innerHTML = '';
            if (!visible.length) {
                const empty = el('div', 'home-empty');
                empty.appendChild(el('p', null, 'Aucun mot ne correspond.'));
                empty.appendChild(resetButton());
                list.appendChild(empty);
                return;
            }
            visible.forEach((t) => {
                const card = el('article', 'home-term');
                card.id = t.slug;
                const head = el('div', 'home-term-head');
                const name = el('h3', 'home-term-name');
                name.appendChild(highlight(t.terme, query));
                if (Array.isArray(t.alias) && t.alias.length) {
                    const alias = el('span', 'home-term-alias');
                    alias.append(' (', highlight(t.alias.join(', '), query), ')');
                    name.appendChild(alias);
                }
                head.appendChild(name);
                const share = button('🔗', 'home-term-share', () => shareTerm(t, share));
                share.setAttribute('aria-label', `Copier le lien vers « ${t.terme} »`);
                share.title = 'Copier le lien vers ce mot';
                head.appendChild(share);
                card.appendChild(head);
                const hasDef = Boolean(String(t.definition || '').trim());
                const def = el('p', hasDef ? 'home-term-def' : 'home-term-def home-term-def--empty');
                def.appendChild(hasDef ? highlight(t.definition, query) : document.createTextNode('Définition à venir.'));
                card.appendChild(def);
                card.appendChild(el('p', 'viewer-term-meta',
                    [kingdomName(t.royaume), t.categorie ? categoryName(t.categorie) : ''].filter(Boolean).join(' · ')));
                list.appendChild(card);
            });
        }

        [
            { value: 'all', label: 'Tout' },
            { value: GENERAL, label: 'Général', total: totalBy('royaume', GENERAL) },
            ...kingdoms.map((k) => ({ value: k.id, label: k.nom, total: totalBy('royaume', k.id) }))
        ].forEach(({ value, label, total }) => {
            const chip = button(label, 'home-chip', () => {
                glossaryState.kingdom = value;
                syncChips();
                renderList();
                panelBody.scrollTop = 0;
            });
            chip.dataset.value = value;
            if (total !== undefined) {
                chip.appendChild(el('span', 'home-chip-count', String(total)));
                if (!total) chip.classList.add('home-chip--empty');
            }
            chips.appendChild(chip);
        });
        syncChips();

        let timer = null;
        search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                glossaryState.query = search.value;
                renderList();
            }, 120);
        });

        const tools = el('div', 'viewer-glossary-tools');
        tools.append(search, chips, count);
        content.append(tools, list);
        renderList();
        foot.appendChild(button('Revenir à l\'accueil', 'home-btn home-btn--ghost', close));

        if (focusSlug) {
            const target = document.getElementById(focusSlug);
            if (target) {
                target.classList.add('is-target');
                requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
            }
        }
    }

    // ---------- Ouverture / fermeture (liée à l'adresse) ----------
    function parseHash() {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash === VIEW_GLOSSARY) return { view: VIEW_GLOSSARY };
        if (hash.startsWith(TERM_PREFIX)) return { view: VIEW_GLOSSARY, term: hash };
        const match = hash.match(/^decouvrir(?:-(\d+))?$/);
        if (match) return { view: VIEW_TOUR, step: match[1] ? Number(match[1]) - 1 : 0 };
        return null;
    }

    function hashFor(view, step) {
        if (view === VIEW_TOUR) return step > 0 ? `#${VIEW_TOUR}-${step + 1}` : `#${VIEW_TOUR}`;
        return `#${view}`;
    }

    function lockScroll(locked) {
        const lock = window.bodyScrollLock;
        if (lock) {
            if (locked) lock.disableBodyScroll(panelBody, { reserveScrollBarGap: true });
            else lock.enableBodyScroll(panelBody);
        } else {
            document.documentElement.style.overflow = locked ? 'hidden' : '';
        }
    }

    function render(state) {
        if (!state) {
            if (!viewer.hidden) {
                viewer.hidden = true;
                lockScroll(false);
                lastFocus?.focus?.();
            }
            return;
        }
        if (viewer.hidden) {
            lastFocus = document.activeElement;
            viewer.hidden = false;
            lockScroll(true);
        }
        content.innerHTML = '';
        foot.innerHTML = '';
        searchInput = null;
        panelBody.scrollTop = 0;
        if (state.view === VIEW_GLOSSARY) renderGlossary(state.term || null);
        else renderTour(state.step || 0);
        panelBody.focus({ preventScroll: true });
    }

    // Viewer screens pushed in the history since the home page: "Fermer" goes
    // back to the home page in one step, the back button goes back one screen.
    let depth = 0;

    function show(view, step = 0) {
        const hash = hashFor(view, step);
        if (window.location.hash === hash) return;
        history.pushState(null, '', window.location.pathname + window.location.search + hash);
        depth += 1;
        render(parseHash());
    }

    function close() {
        if (depth > 0) {
            history.go(-depth); // popstate renders the home page
            depth = 0;
            return;
        }
        // Opened from a shared link: no home entry to go back to.
        history.replaceState(null, '', window.location.pathname + window.location.search);
        render(null);
    }

    document.querySelectorAll('[data-open-view]').forEach((trigger) => {
        trigger.addEventListener('click', () => show(trigger.dataset.openView));
    });
    document.getElementById('viewerClose').addEventListener('click', close);
    viewer.addEventListener('click', (event) => {
        if (event.target === viewer) close();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !viewer.hidden) {
            close();
            return;
        }
        // "/" opens the glossary search, like most sites with a search box.
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        event.preventDefault();
        if (!searchInput) show(VIEW_GLOSSARY);
        searchInput?.focus();
    });
    window.addEventListener('popstate', () => {
        const state = parseHash();
        depth = state ? Math.max(0, depth - 1) : 0;
        render(state);
    });

    // Direct link (shared on Discord: index.html#decouvrir, #glossaire, #terme-kaels…)
    render(parseHash());
}

async function initHome() {
    initAccountLinks();
    try {
        const response = await fetch(CONTENT_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        renderPresentation(data);
        createViewer(data);
    } catch (error) {
        console.error('[Home] content load failed:', error);
        const tagline = document.getElementById('homeTagline');
        if (tagline) {
            tagline.hidden = false;
            tagline.textContent = 'Le contenu n\'a pas pu être chargé. Recharge la page.';
        }
    }
}

initHome();
