// Public home page: presentation, kingdoms and glossary from data/glossaire.json.
// Everything is built with textContent: content is never parsed as HTML.

// Single place for the content file location (edited by the team, see _lisezMoi inside).
const CONTENT_URL = 'data/glossaire.json';
const GENERAL = 'general';

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

// Text with every occurrence of the (normalized) query wrapped in <mark>, built as nodes.
function highlight(text, query) {
    const value = String(text || '');
    const fragment = document.createDocumentFragment();
    if (!query) {
        fragment.append(value);
        return fragment;
    }
    // normalize() keeps one character per source character for Latin text (accents are
    // dropped after NFD), so indexes found on the normalized copy map back to the original.
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
    set('homeText', p.texte);
}

function renderKingdoms(data, onSelect) {
    const list = document.getElementById('homeKingdoms');
    if (!list) return;
    list.innerHTML = '';
    (data.royaumes || []).forEach((kingdom) => {
        const card = el('article', 'home-kingdom');
        card.id = `royaume-${kingdom.id}`;
        if (kingdom.couleur) card.style.setProperty('--kingdom-color', kingdom.couleur);
        if (kingdom.position) card.appendChild(el('span', 'home-kingdom-position', kingdom.position));
        card.appendChild(el('h3', 'home-kingdom-name', kingdom.nom));
        if (kingdom.accroche) card.appendChild(el('p', 'home-kingdom-tagline', kingdom.accroche));
        if (kingdom.description) card.appendChild(el('p', 'home-kingdom-text', kingdom.description));
        if (Array.isArray(kingdom.tags) && kingdom.tags.length) {
            const tags = el('div', 'home-tags');
            kingdom.tags.forEach((tag) => tags.appendChild(el('span', 'home-tag', tag)));
            card.appendChild(tags);
        }
        const btn = el('button', 'home-btn home-btn--ghost', `Termes de ${kingdom.nom}`);
        btn.type = 'button';
        btn.addEventListener('click', () => onSelect(kingdom.id));
        card.appendChild(btn);
        list.appendChild(card);
    });
}

function createGlossary(data) {
    const kingdoms = data.royaumes || [];
    const categories = data.categories || [];
    const kingdomName = (id) => (id === GENERAL ? 'Général' : kingdoms.find((k) => k.id === id)?.nom || id);
    const categoryName = (id) => categories.find((c) => c.id === id)?.libelle || id;
    const terms = (data.termes || [])
        .filter((t) => t && t.terme)
        .map((t) => ({
            ...t,
            royaume: t.royaume || GENERAL,
            slug: `terme-${slugify(t.terme)}`,
            haystack: normalize([t.terme, ...(t.alias || []), t.definition].join(' '))
        }))
        .sort((a, b) => normalize(a.terme).localeCompare(normalize(b.terme), 'fr'));

    const state = { query: '', kingdom: 'all', category: 'all' };
    const search = document.getElementById('glossarySearch');
    const kingdomChips = document.getElementById('glossaryKingdoms');
    const categoryChips = document.getElementById('glossaryCategories');
    const letters = document.getElementById('glossaryLetters');
    const results = document.getElementById('glossaryResults');
    const count = document.getElementById('glossaryCount');

    // After a filter/search change, keep the top of the results in view instead of
    // leaving the reader wherever the shorter page happens to end.
    function keepResultsInView() {
        const section = document.getElementById('glossaire');
        const bar = document.querySelector('.home-topbar');
        if (!section) return;
        const barBottom = bar ? bar.getBoundingClientRect().bottom : 0;
        const top = count.getBoundingClientRect().top;
        if (top < barBottom || top > window.innerHeight) {
            window.scrollTo({ top: window.scrollY + top - barBottom - 12, behavior: 'auto' });
        }
    }

    function buildChips(container, options, key) {
        container.innerHTML = '';
        options.forEach(({ value, label, total }) => {
            const chip = el('button', 'home-chip', label);
            chip.type = 'button';
            if (total !== undefined) {
                chip.appendChild(el('span', 'home-chip-count', String(total)));
                if (!total) chip.classList.add('home-chip--empty');
            }
            chip.dataset.value = value;
            chip.setAttribute('aria-pressed', String(state[key] === value));
            chip.addEventListener('click', () => {
                state[key] = value;
                syncChips();
                render();
                keepResultsInView();
            });
            container.appendChild(chip);
        });
    }

    function syncChips() {
        kingdomChips.querySelectorAll('.home-chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === state.kingdom)));
        categoryChips.querySelectorAll('.home-chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === state.category)));
    }

    const isFiltered = () => Boolean(state.query.trim()) || state.kingdom !== 'all' || state.category !== 'all';

    function reset() {
        state.query = '';
        state.kingdom = 'all';
        state.category = 'all';
        search.value = '';
        syncChips();
        render();
        keepResultsInView();
        search.focus();
    }

    function resetButton() {
        const btn = el('button', 'home-reset', 'Réinitialiser les filtres');
        btn.type = 'button';
        btn.addEventListener('click', reset);
        return btn;
    }

    async function shareTerm(t, button) {
        const url = new URL(window.location.href);
        url.hash = t.slug;
        history.replaceState(null, '', `#${t.slug}`);
        const done = await copyText(url.href);
        button.textContent = done ? 'Lien copié ✓' : 'Lien dans la barre d\'adresse';
        button.classList.add('is-done');
        setTimeout(() => {
            button.textContent = '🔗';
            button.classList.remove('is-done');
        }, 1800);
    }

    function render() {
        const query = normalize(state.query);
        const visible = terms.filter((t) =>
            (state.kingdom === 'all' || t.royaume === state.kingdom)
            && (state.category === 'all' || t.categorie === state.category)
            && (!query || t.haystack.includes(query)));

        count.textContent = `${visible.length} terme${visible.length > 1 ? 's' : ''}`;
        if (visible.length !== terms.length) count.append(` sur ${terms.length}`);
        if (isFiltered()) count.appendChild(resetButton());
        results.innerHTML = '';
        letters.innerHTML = '';

        if (!visible.length) {
            const empty = el('div', 'home-empty');
            empty.appendChild(el('p', null, 'Aucun terme ne correspond à cette recherche.'));
            empty.appendChild(resetButton());
            results.appendChild(empty);
            return;
        }

        const groups = new Map();
        visible.forEach((t) => {
            const letter = normalize(t.terme).charAt(0).toUpperCase() || '#';
            if (!groups.has(letter)) groups.set(letter, []);
            groups.get(letter).push(t);
        });

        groups.forEach((items, letter) => {
            const link = el('a', 'home-letter', letter);
            link.href = `#lettre-${letter}`;
            letters.appendChild(link);

            const group = el('section', 'home-letter-group');
            group.setAttribute('aria-labelledby', `lettre-${letter}`);
            const heading = el('h3', 'home-letter-title', letter);
            heading.id = `lettre-${letter}`;
            group.appendChild(heading);
            const list = el('div', 'home-terms');
            items.forEach((t) => {
                const card = el('article', 'home-term');
                card.id = t.slug;
                const head = el('div', 'home-term-head');
                const name = el('h4', 'home-term-name');
                name.appendChild(highlight(t.terme, query));
                if (Array.isArray(t.alias) && t.alias.length) {
                    const alias = el('span', 'home-term-alias');
                    alias.append(' (', highlight(t.alias.join(', '), query), ')');
                    name.appendChild(alias);
                }
                head.appendChild(name);
                const share = el('button', 'home-term-share', '🔗');
                share.type = 'button';
                share.setAttribute('aria-label', `Copier le lien vers « ${t.terme} »`);
                share.title = 'Copier le lien vers ce terme';
                share.addEventListener('click', () => shareTerm(t, share));
                head.appendChild(share);
                card.appendChild(head);
                const hasDef = Boolean(String(t.definition || '').trim());
                const def = el('p', hasDef ? 'home-term-def' : 'home-term-def home-term-def--empty');
                def.appendChild(hasDef ? highlight(t.definition, query) : document.createTextNode('Définition à venir.'));
                card.appendChild(def);
                const tags = el('div', 'home-tags');
                tags.appendChild(el('span', 'home-tag', kingdomName(t.royaume)));
                if (t.categorie) tags.appendChild(el('span', 'home-tag', categoryName(t.categorie)));
                card.appendChild(tags);
                list.appendChild(card);
            });
            group.appendChild(list);
            results.appendChild(group);
        });
    }

    const totalBy = (key, value) => terms.filter((t) => t[key] === value).length;
    buildChips(kingdomChips, [
        { value: 'all', label: 'Tous les royaumes' },
        { value: GENERAL, label: 'Général', total: totalBy('royaume', GENERAL) },
        ...kingdoms.map((k) => ({ value: k.id, label: k.nom, total: totalBy('royaume', k.id) }))
    ], 'kingdom');
    buildChips(categoryChips, [
        { value: 'all', label: 'Toutes les catégories' },
        ...categories.map((c) => ({ value: c.id, label: c.libelle, total: totalBy('categorie', c.id) }))
    ], 'category');

    // "/" jumps to the search field, like most sites with a search box.
    document.addEventListener('keydown', (event) => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        event.preventDefault();
        search.focus();
    });

    let timer = null;
    search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.query = search.value;
            render();
            keepResultsInView();
        }, 120);
    });

    render();

    return {
        selectKingdom(id) {
            state.kingdom = id;
            syncChips();
            render();
            document.getElementById('glossaire')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
}

// Top bar: mark the section being read; floating "back to top" once past the hero.
function initScrollUi() {
    const links = [...document.querySelectorAll('.home-topnav a[href^="#"]')];
    const sections = links
        .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
        .filter(Boolean);
    const hero = document.querySelector('.home-hero');
    const footer = document.querySelector('.home-footer');

    const toTop = el('a', 'home-totop', '↑');
    toTop.href = '#haut';
    toTop.setAttribute('aria-label', 'Revenir en haut de la page');
    toTop.hidden = true;
    document.body.appendChild(toTop);

    let ticking = false;
    const update = () => {
        ticking = false;
        const probe = window.innerHeight * 0.35;
        let current = null;
        sections.forEach((section) => {
            if (section.getBoundingClientRect().top <= probe) current = section.id;
        });
        links.forEach((link) => {
            if (link.getAttribute('href') === `#${current}`) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
        // Hidden over the hero, and once the footer (with its own "Haut de page" link) shows.
        toTop.hidden = !hero || hero.getBoundingClientRect().bottom > 0
            || Boolean(footer && footer.getBoundingClientRect().top < window.innerHeight);
    };
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
    update();
}

async function initHome() {
    const status = document.getElementById('glossaryCount');
    try {
        const response = await fetch(CONTENT_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        renderPresentation(data);
        const setStat = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = String(value); };
        setStat('statKingdoms', (data.royaumes || []).length);
        setStat('statTerms', (data.termes || []).filter((t) => t && t.terme).length);
        const glossary = createGlossary(data);
        renderKingdoms(data, (id) => glossary.selectKingdom(id));
        // Deep link to a term (index.html#terme-kaels) once rendered
        if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } catch (error) {
        console.error('[Home] content load failed:', error);
        if (status) status.textContent = 'Le contenu n\'a pas pu être chargé. Recharge la page.';
    }
}

initScrollUi();
initHome();
