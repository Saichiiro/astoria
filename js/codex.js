// On récupère les données depuis data.js (inventoryData)
window.astoriaIsAdmin = false;

let allItems = (typeof inventoryData !== "undefined" && Array.isArray(inventoryData))
    ? inventoryData.slice()
    : [];
const localItems = allItems.slice();
const imageHelpers = window.astoriaImageHelpers || {};
function preloadItems(items) {
    if (typeof imageHelpers.preloadMany !== "function") return;
    const preloadCandidates = (items || [])
        .map((item) => (item && item.image) || "")
        .filter(Boolean);
    imageHelpers.preloadMany(preloadCandidates, 12);
}

preloadItems(allItems);

let currentData = allItems.slice();
const tableBody = document.getElementById("tableBody");
const modal = document.getElementById("itemModal");
const modalName = document.getElementById("modalName");
const modalImage = document.getElementById("modalImage");
const modalDescription = document.getElementById("modalDescription");
const modalPrice = document.getElementById("modalPrice");
const modalEffect = document.getElementById("modalEffect");
const carouselPrev = document.getElementById("carouselPrev");
const carouselNext = document.getElementById("carouselNext");
const carouselDots = document.getElementById("carouselDots");
const modalCloseBtn = document.querySelector(".modal-close");
const modalInner = document.querySelector(".modal-inner");
let lastFocusedElement = null;
const searchRoot = document.getElementById("codexSearch");
const searchToggle = document.getElementById("codexSearchToggle");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterChips = document.getElementById("filterChips");
const recentSearchesDropdown = document.getElementById("recentSearchesDropdown");
const statsBadge = document.getElementById("statsBadge");
const pageTitle = document.getElementById("pageTitle");
const sortHeaders = document.querySelectorAll('th.sortable[data-sort]');

const listHelpers = window.astoriaListHelpers || {};
const debounce = listHelpers.debounce || ((fn) => fn);
const filterItems = listHelpers.filterItems;
const sortItems = listHelpers.sortItems;

let currentCarouselImages = [];
let currentCarouselIndex = 0;
let currentCarouselTitle = "";

/* // IMAGE FIX : placeholder + correspondances de chemins */
const placeholderImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>` +
            `<rect width='200' height='200' fill='#fce4ec'/>` +
            `<text x='50%' y='50%' text-anchor='middle' fill='#d81b60' font-family='Segoe UI, Arial' font-size='16'>Image</text>` +
            `</svg>`
    );

if (modalImage) {
    modalImage.decoding = "async";
    modalImage.addEventListener("error", () => {
        modalImage.src = placeholderImage;
    });
}

const normalizeName = window.astoriaImageHelpers && window.astoriaImageHelpers.normalizeName
    ? window.astoriaImageHelpers.normalizeName
    : function (name) {
        return (name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
    };

function escapeHtml(str) {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text);

    const escaped = escapeHtml(text);
    const escapedQuery = escapeHtml(query);

    // Create case-insensitive regex
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function escapeForAttribute(str) {
    return escapeHtml(str)
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;");
}

function safeJson(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }
    return {};
}

function mapDbItem(row) {
    const images = safeJson(row.images);
    const primary = images.primary || images.url || row.image || row.image_url || "";
    const buyText = row.price_pa ? `${row.price_pa} pa` : "";
    const sellText = row.price_po ? `${row.price_po} po` : "";
    return {
        id: row.id,
        _dbId: row.id,
        source: "db",
        name: row.name || "",
        description: row.description || "",
        effect: row.effect || "",
        category: row.category || "",
        buyPrice: buyText,
        sellPrice: sellText,
        image: primary,
        images: images
    };
}

function mergeLocalItems(dbItems) {
    if (!Array.isArray(dbItems)) return localItems.slice();
    const merged = [];
    const seenNames = new Set();
    const addItem = (item) => {
        if (!item) return;
        const nameKey = normalizeName(item.name || item.nom || "");
        if (nameKey && seenNames.has(nameKey)) return;
        if (nameKey) seenNames.add(nameKey);
        merged.push(item);
    };
    dbItems.forEach(addItem);
    localItems.forEach(addItem);
    return merged;
}

async function hydrateItemsFromDb() {
    const supabaseUrl = window.ASTORIA_SUPABASE_URL || "https://eibfahbctgzqnmubrhzy.supabase.co";
    const supabaseKey = window.ASTORIA_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYmZhaGJjdGd6cW5tdWJyaHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODM1OTksImV4cCI6MjA4MTA1OTU5OX0.2Xc1oqi_UPhnFqJsFRO-eAHpiCLpjF16JQAGyIrl18E";
    if (!supabaseUrl || !supabaseKey) return;

    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/items?select=*&order=name.asc`, {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
            }
        });
        if (!res.ok) return;
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) return;

        const mapped = rows.map(mapDbItem);
        const merged = mergeLocalItems(mapped);
        replaceItems(merged);
    } catch (error) {
        console.warn("Codex DB items load failed:", error);
    }
}
// Stable item keys (avoid rebuilding rows/images on each filter)
const itemMeta = new WeakMap();
const rowCache = new Map();

function replaceItems(nextItems) {
    allItems = Array.isArray(nextItems) ? nextItems.slice() : [];
    currentData = allItems.slice();
    rowCache.clear();
    allItems.forEach((item, idx) => getOrCreateItemMeta(item, idx));
    preloadItems(allItems);
}


function getOrCreateItemMeta(item, fallbackIndex) {
    if (!item || typeof item !== "object") {
        return { key: String(fallbackIndex ?? ""), globalIndex: fallbackIndex ?? -1 };
    }

    const existing = itemMeta.get(item);
    if (existing) return existing;

    const idCandidate = item.id || item.item_id || item.itemId || "";
    const name = item.name || item.nom || "";
    const key = idCandidate ? String(idCandidate) : `${normalizeName(name || "item")}-${fallbackIndex ?? ""}`;
    const meta = { key, globalIndex: Number.isFinite(fallbackIndex) ? fallbackIndex : -1 };
    itemMeta.set(item, meta);
    return meta;
}

allItems.forEach((item, idx) => getOrCreateItemMeta(item, idx));

// IMAGE FIX : choix du bon visuel + galerie si disponible (via helper partagé)
function resolveImages(item) {
    const helpers = window.astoriaImageHelpers || {};

    if (helpers.resolveItemImages) {
        const resolved = helpers.resolveItemImages(item);
        if (resolved && resolved.primary && resolved.gallery) {
            return resolved;
        }
    }

    // Fallback local (au cas où le helper n'est pas disponible)
    const rawImage = (item && (item.image || item.img)) || placeholderImage;
    return {
        primary: rawImage || placeholderImage,
        gallery: [rawImage || placeholderImage]
    };
}

// // CAPE CAROUSEL : navigation image suivante/précédente
function updateCarouselView(nameForAlt) {
    const altText = nameForAlt || currentCarouselTitle || "Illustration";
    if (!currentCarouselImages || !currentCarouselImages.length) {
        currentCarouselImages = [placeholderImage];
    }

    const safeIndex =
        currentCarouselIndex >= 0
            ? currentCarouselIndex % currentCarouselImages.length
            : 0;
    currentCarouselIndex = safeIndex;

    modalImage.src = currentCarouselImages[safeIndex] || placeholderImage;
    modalImage.alt = altText;
    modalImage.style.display = "block";

    const hasMultiple = currentCarouselImages.length > 1;
    if (carouselPrev && carouselNext) {
        carouselPrev.style.display = hasMultiple ? "inline-flex" : "none";
        carouselNext.style.display = hasMultiple ? "inline-flex" : "none";
    }

    if (carouselDots) {
        carouselDots.innerHTML = "";
        if (hasMultiple) {
            currentCarouselImages.forEach((_, idx) => {
                const dot = document.createElement("button");
                dot.type = "button";
                dot.className = "carousel-dot" + (idx === safeIndex ? " active" : "");
                dot.addEventListener("click", (event) => {
                    event.stopPropagation();
                    setCarouselIndex(idx);
                });
                carouselDots.appendChild(dot);
            });
        }
    }
}

function setCarouselIndex(nextIndex) {
    if (!currentCarouselImages || !currentCarouselImages.length) return;
    const total = currentCarouselImages.length;
    const safeIndex = ((nextIndex % total) + total) % total;
    currentCarouselIndex = safeIndex;
    updateCarouselView();
}

if (carouselPrev) {
    carouselPrev.addEventListener("click", (event) => {
        event.stopPropagation();
        setCarouselIndex(currentCarouselIndex - 1);
    });
}

if (carouselNext) {
    carouselNext.addEventListener("click", (event) => {
        event.stopPropagation();
        setCarouselIndex(currentCarouselIndex + 1);
    });
}

function formatPrice(item) {
    const buy = item.buyPrice || "";
    const sell = item.sellPrice || "";

    if (buy && sell) {
        return `Achat : ${buy} / Vente : ${sell}`;
    }
    if (buy) {
        return `Achat : ${buy}`;
    }
    if (sell) {
        return `Vente : ${sell}`;
    }
    return "";
}

function summarizeEffect(effect) {
    if (!effect) return "";
    const plain = effect.replace(/\s+/g, " ").trim();
    const maxLen = 110;
    const dotIndex = plain.indexOf(".");

    let summary;
    if (dotIndex > 0 && dotIndex < maxLen) {
        summary = plain.slice(0, dotIndex + 1);
    } else {
        summary = plain.slice(0, maxLen);
    }

    if (summary.length < plain.length) {
        summary += " …";
    }
    return summary;
}

// Extrait la première phrase seulement (pour tooltips)
function getFirstSentence(text) {
    if (!text) return "";
    const plain = text.replace(/\s+/g, " ").trim();
    const dotIndex = plain.indexOf(".");

    if (dotIndex > 0) {
        return plain.slice(0, dotIndex + 1);
    }
    // Si pas de point, limite à 80 caractères
    return plain.slice(0, 80) + (plain.length > 80 ? "…" : "");
}

function buildRow(item, globalIndex) {
    const name = item.name || item.nom || "";
    const description = item.description || item.desc || "";
    const effect = item.effect || item.effet || "";
    const buy = item.buyPrice || "";
    const sell = item.sellPrice || "";
    const priceText = formatPrice(item);
    const buyLine = buy ? `${buy} (achat)` : "-";
    const sellLine = sell ? `${sell} (vente)` : "-";
    const effectSummary = summarizeEffect(effect);
    const images = resolveImages(item);
    const meta = getOrCreateItemMeta(item, globalIndex);
    const keyAttr = escapeHtml(meta.key);

    const badgeMatches = Array.from(name.matchAll(/\[(.*?)\]/g)).map(match => match[1]);
    const displayName = name.replace(/\s*\[.*?\]/g, "").trim() || name;

    const capeBaseName = "Cape de l'Aube Vermeille";
    const capeTag = "[Exclu saison]";
    const isSeasonCape = normalizeName(name) === normalizeName(`${capeBaseName} ${capeTag}`);

    const copyText =
        `${name} - ${description}` +
        (priceText ? ` (${priceText})` : "") +
        (effect ? ` | Effet : ${effect}` : "");

    const highlightedName = escapeHtml(displayName);
    const highlightedDesc = escapeHtml(description);
    const highlightedEffect = escapeHtml(effectSummary);
    const highlightedBuyLine = escapeHtml(buyLine);
    const highlightedSellLine = escapeHtml(sellLine);

    const nameContent = isSeasonCape
        ? `<span class="name-text name-text--stacked">${
              escapeHtml(capeBaseName)
          }<br><span class="name-tag-line">${
              escapeHtml(capeTag)
          }</span></span>`
        : `<span class="name-text">${highlightedName}</span>`;

    const badgesHtml = !isSeasonCape && badgeMatches.length
        ? `<span class="name-badges">${badgeMatches
              .map((badge) => `<span class=\"name-badge\">${escapeHtml(badge)}</span>`)
              .join("")}</span>`
        : "";

    const rowHtml = `
        <tr class="item-row" data-key="${keyAttr}" data-global-index="${globalIndex}">
            <td class="img-cell" data-label="Illustration">
                <img src="${escapeHtml(images.primary)}" alt="${escapeHtml(name || "Illustration")}" width="86" height="86" decoding="async" fetchpriority="low">
            </td>
            <td class="name-cell" data-label="Nom">
                ${nameContent}
                ${badgesHtml}
            </td>
            <td class="desc-cell" data-label="Description">
                <div class="desc-container">
                    <span class="desc-text">${highlightedDesc}</span>
                    <button class="more-link" type="button">Plus</button>
                    <div class="tooltip-box tooltip">
                        <span class="tooltip-title">${escapeHtml(name)}</span>
                        ${description ? `<span>${escapeHtml(getFirstSentence(description))}</span>` : ""}
                        ${priceText ? `<span class="tooltip-price">${escapeHtml(priceText)}</span>` : ""}
                    </div>
                </div>
            </td>
            <td class="price-cell commerce-cell" data-label="Commerce">
                <span class="commerce-line">${highlightedBuyLine}</span>
                <span class="commerce-line">${highlightedSellLine}</span>
            </td>
            <td class="effect-cell" data-label="Effet">${highlightedEffect}</td>
            <td class="action-cell" data-label="Action">
                ${(() => {
                    console.log('[CODEX DEBUG] buildRow - astoriaIsAdmin:', window.astoriaIsAdmin, 'for item:', name);
                    return window.astoriaIsAdmin
                        ? `<button class="edit-btn" type="button" data-edit-index="${globalIndex}" title="Modifier l'objet">Modifier</button>`
                        : `<button class="copy-btn" type="button" data-copy-text="${escapeForAttribute(copyText)}">Copy</button>`;
                })()}
            </td>
        </tr>
    `;

    return rowHtml;
}

function setupTooltipHandlers() {
    const container = document.querySelector(".table-container");
    const rows = document.querySelectorAll("#inventoryTable tbody tr");

    rows.forEach((row) => {
        if (row.dataset.tooltipBound === "1") return;
        const tooltip = row.querySelector(".tooltip");
        if (!tooltip) return;

        const showTooltip = () => {
            if (!tooltip._originalParent) {
                tooltip._originalParent = tooltip.parentElement;
            }
            if (tooltip.parentElement !== document.body) {
                document.body.appendChild(tooltip);
            }

            const anchor = row.querySelector(".desc-container") || row;
            const anchorRect = anchor.getBoundingClientRect();

            tooltip.style.display = "block";
            tooltip.style.visibility = "hidden";
            const tooltipRect = tooltip.getBoundingClientRect();

            const containerRect = container?.getBoundingClientRect();
            const limitBottom = containerRect
                ? Math.min(window.innerHeight, containerRect.bottom)
                : window.innerHeight;

            const useAbove = (limitBottom - anchorRect.bottom) < tooltipRect.height;
            const top = useAbove
                ? anchorRect.top - tooltipRect.height - 6
                : anchorRect.bottom + 6;
            const left = Math.max(8, Math.min(
                window.innerWidth - tooltipRect.width - 8,
                anchorRect.left
            ));

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${Math.max(8, top)}px`;
            tooltip.style.visibility = "visible";
            tooltip.classList.toggle("tooltip--above", useAbove);
        };

        const hideTooltip = () => {
            tooltip.style.display = "none";
            tooltip.style.left = "-9999px";
            tooltip.style.top = "-9999px";
            tooltip.classList.remove("tooltip--above");
            if (tooltip._originalParent && tooltip.parentElement !== tooltip._originalParent) {
                tooltip._originalParent.appendChild(tooltip);
            }
        };

        row.addEventListener("mouseenter", showTooltip);
        row.addEventListener("mouseleave", hideTooltip);
        tooltip.addEventListener("mouseenter", showTooltip);
        tooltip.addEventListener("mouseleave", hideTooltip);

        row.dataset.tooltipBound = "1";
    });
}

function getOrCreateRowElement(item, globalIndex) {
    const meta = getOrCreateItemMeta(item, globalIndex);
    const existing = rowCache.get(meta.key);
    if (existing) return existing;

    const html = buildRow(item, meta.globalIndex);
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const row = tpl.content.firstElementChild;
    const rowImage = row?.querySelector("img");
    if (rowImage && rowImage.dataset.fallbackBound !== "1") {
        rowImage.dataset.fallbackBound = "1";
        rowImage.addEventListener("error", () => {
            rowImage.src = placeholderImage;
        });
    }
    rowCache.set(meta.key, row);
    return row;
}

// Construction du tableau
function loadTable(data, searchQuery) {
    currentData = data.slice();
    tableBody.replaceChildren();

    try {
        const helpers = window.astoriaImageHelpers || {};
        if (helpers.preloadMany) {
            const urls = data.map((item) => resolveImages(item).primary);
            helpers.preloadMany(urls, 48);
        }
    } catch {
        // ignore
    }

    // Update stats badge
    if (statsBadge) {
        const count = data.length;
        statsBadge.textContent = `${count} objet${count > 1 ? 's' : ''}`;
    }

    if (data.length === 0) {
        // Empty state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div class="empty-state-title">Aucun objet trouvé</div>
                        <div class="empty-state-message">Essayez de modifier vos critères de recherche</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    data.forEach((item, index) => {
        const meta = getOrCreateItemMeta(item, -1);
        const row = getOrCreateRowElement(item, meta.globalIndex >= 0 ? meta.globalIndex : index);
        row.dataset.index = String(index);
        fragment.appendChild(row);
    });
    tableBody.replaceChildren(fragment);
    setupTooltipHandlers();
}

// Modal : ouverture / fermeture
function openItemModal(index) {
    const item = currentData[index];
    if (!item) return;

    // Highlight clicked row
    clearRowHighlights('row-selected');
    const clickedRow = document.querySelector(`.item-row[data-index="${index}"]`);
    if (clickedRow) clickedRow.classList.add('row-selected');

    const name = item.name || item.nom || "";
    const description = item.description || item.desc || "";
    const effect = item.effect || item.effet || "";
    const priceText = formatPrice(item);
    const resolvedImages = resolveImages(item);

    modalName.textContent = name;
    currentCarouselImages =
        resolvedImages.gallery && resolvedImages.gallery.length
            ? resolvedImages.gallery
            : [resolvedImages.primary];
    currentCarouselIndex = 0;
    currentCarouselTitle = name || "Illustration";
    updateCarouselView(name);

    modalDescription.innerHTML = description
        ? `<span class="modal-label">Description :</span> ${escapeHtml(description)}`
        : "";
    modalPrice.innerHTML = priceText
        ? `<span class="modal-label">Prix :</span> ${escapeHtml(priceText)}`
        : "";
    modalEffect.innerHTML = effect
        ? `<span class="modal-label">Effet :</span> ${escapeHtml(effect)}`
        : "";

    modal.classList.add("open");
    lastFocusedElement = document.activeElement;

    const focusTarget = modal.querySelector(".modal-close") || modal;
    focusTarget.focus({ preventScroll: true });

    if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('astoria:codex-modal-open', { detail: { index, item } }));
    }
}

// Delegate clicks to keep row DOM (and images) stable across filters/sorts
if (tableBody && tableBody.dataset.modalBound !== "1") {
    tableBody.dataset.modalBound = "1";
    tableBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!target) return;
        const copyButton = target.closest && target.closest(".copy-btn");
        if (copyButton) {
            const copyText = copyButton.dataset.copyText || "";
            copyToClipboard(copyText, copyButton);
            return;
        }

        const editButton = target.closest && target.closest(".edit-btn");
        if (editButton) {
            const editIndex = parseInt(editButton.dataset.editIndex || "", 10);
            if (Number.isFinite(editIndex) && typeof window.openEditModal === "function") {
                window.openEditModal(editIndex);
            }
            return;
        }

        const row = target.closest && target.closest("tr.item-row");
        if (!row) return;

        const shouldOpen =
            Boolean(target.closest(".img-cell")) ||
            Boolean(target.closest(".name-cell")) ||
            Boolean(target.closest(".more-link"));

        if (!shouldOpen) return;

        const index = parseInt(row.dataset.index || "", 10);
        if (!Number.isFinite(index)) return;
        openItemModal(index);
    });
}

function closeItemModal() {
    modal.classList.remove("open");
    clearRowHighlights('row-selected');
    if (lastFocusedElement?.focus) lastFocusedElement.focus({ preventScroll: true });
    if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('astoria:codex-modal-close'));
    }
}

window.closeItemModal = closeItemModal;

if (modal) {
    modal.addEventListener("click", () => closeItemModal());
}
if (modalInner) {
    modalInner.addEventListener("click", (event) => event.stopPropagation());
}
if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => closeItemModal());
}

// Track currently selected row for keyboard navigation
let selectedRowIndex = -1;

// Helper: Get all item rows
const getItemRows = () => document.querySelectorAll('.item-row');

// Helper: Clear all row highlights
function clearRowHighlights(className = 'keyboard-selected') {
    getItemRows().forEach(row => row.classList.remove(className));
}

function selectRow(index) {
    const rows = getItemRows();
    if (index < 0 || index >= rows.length) return;

    clearRowHighlights();
    selectedRowIndex = index;
    const selectedRow = rows[index];
    selectedRow.classList.add('keyboard-selected');
    selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function navigateRows(direction) {
    const rows = getItemRows();
    if (!rows.length) return;

    const newIndex = selectedRowIndex + direction;
    // Wrap around
    selectRow(newIndex < 0 ? rows.length - 1 : newIndex >= rows.length ? 0 : newIndex);
}

const openSelectedRow = () => selectedRowIndex >= 0 && openItemModal(selectedRowIndex);

const adminItemBackdrop = document.getElementById('adminItemBackdrop');
const adminCropperBackdrop = document.getElementById('itemCropperBackdrop');

function isAdminModalOpen() {
    return (
        (adminItemBackdrop && adminItemBackdrop.classList.contains('open')) ||
        (adminCropperBackdrop && adminCropperBackdrop.classList.contains('open'))
    );
}

// Keyboard shortcuts & focus management: ESC to close modal or clear search, Enter to focus search, arrows for carousel, Tab trap in modal
document.addEventListener("keydown", (e) => {
    if (modal.classList.contains("open")) {
        const focusableSelectors = [
            'button',
            'a[href]',
            'input',
            'textarea',
            'select',
            '[tabindex]:not([tabindex="-1"])'
        ];

        const focusables = modalInner
            ? Array.from(modalInner.querySelectorAll(focusableSelectors.join(','))).filter(el => !el.disabled)
            : [];

        if (e.key === "Escape") {
            closeItemModal();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setCarouselIndex(currentCarouselIndex - 1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setCarouselIndex(currentCarouselIndex + 1);
        } else if (e.key === "Tab" && focusables.length) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    } else {
        if (isAdminModalOpen()) {
            return;
        }
        // When modal is closed, handle table navigation
        const isSearchFocused = searchInput && document.activeElement === searchInput;

        if (e.key === "Escape") {
            if (isSearchFocused && searchInput) {
                searchInput.value = '';
                searchInput.blur();
                applyFilters();
            }
            clearRowHighlights();
            selectedRowIndex = -1;
        } else if (e.key === "Enter" && !isSearchFocused) {
            // Open selected row with Enter
            if (selectedRowIndex >= 0) {
                e.preventDefault();
                openSelectedRow();
            }
        } else if (e.key === " " && !isSearchFocused) {
            // Focus search with Space
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        } else if (e.key === "ArrowDown" && !isSearchFocused) {
            e.preventDefault();
            navigateRows(1);
        } else if (e.key === "ArrowUp" && !isSearchFocused) {
            e.preventDefault();
            navigateRows(-1);
        }
    }
});


function showCopyFeedback(button) {
    if (!button) return;
    button.classList.add("copied");
    if (button._copyTimeout) {
        clearTimeout(button._copyTimeout);
    }
    button._copyTimeout = setTimeout(() => {
        button.classList.remove("copied");
    }, 1200);
}

// Copier dans le presse-papiers (sans alerte bloquante)
function copyToClipboard(text, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback(button);
        });
    } else {
        // Fallback très simple
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showCopyFeedback(button);
    }
}

// Filtrage dynamique par catégorie
let currentCategory = '';
let currentSortColumn = null;
let currentSortDirection = 'asc';
const MAX_RECENT_SEARCHES = 3;

const searchHistory = window.astoriaSearchHistory
    ? window.astoriaSearchHistory.createSearchHistory({
        storageKey: 'astoriaRecentSearches',
        maxItems: MAX_RECENT_SEARCHES
    })
    : null;

const filterFields = [
    (item) => item?.name,
    (item) => item?.description,
    (item) => item?.effect,
    (item) => item?.buyPrice,
    (item) => item?.sellPrice
];

const sorters = {
    name: (item) => (item?.name || '').toLowerCase(),
    price: (item) => parseInt(String(item?.sellPrice || item?.buyPrice || '0').replace(/\D/g, ''), 10) || 0
};

function filterByCategory() {
    const select = categoryFilter;
    if (!select) return;
    currentCategory = select.value;

    // Mise à jour du titre
    const titles = {
        '': 'Liste d\'objets',
        'equipement': '\u00c9quipements',
        'consommable': 'Consommables',
        'agricole': 'Agricole'
    };
    if (pageTitle) {
        pageTitle.textContent = titles[currentCategory] || 'Liste d\'objets';
    }

    // Application du filtre
    applyFilters();
    updateFilterChips();
}

function clearCategoryFilter() {
    if (categoryFilter) {
        categoryFilter.value = '';
    }
    currentCategory = '';
    if (pageTitle) {
        pageTitle.textContent = 'Liste d\'objets';
    }
    applyFilters();
    updateFilterChips();
}

function clearAllFilters() {
    if (categoryFilter) {
        categoryFilter.value = '';
    }
    if (searchInput) {
        searchInput.value = '';
    }
    currentCategory = '';
    applyFilters();
    updateFilterChips('');
}

// Override: filter chips without "Réinitialiser filtres" action chip
function updateFilterChips(searchQuery = '') {
    const chipsContainer = filterChips;
    if (!chipsContainer) return;

    chipsContainer.innerHTML = '';

    const hasCategory = Boolean(currentCategory);

    if (hasCategory) {
        const categoryNames = {
            equipement: '\u00c9quipements',
            consommable: 'Consommables',
            agricole: 'Agricole'
        };

        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `
            <span>${categoryNames[currentCategory] || ''}</span>
            <button type="button" class="chip-remove" data-chip-action="clear-category">×</button>
        `;
        chipsContainer.appendChild(chip);
    }
}

// Combine recherche + catégorie + tri
function applyFilters() {
    const searchQuery = (searchInput?.value || '').toLowerCase();

    // Save to recent searches if there's a query
    if (searchQuery.length >= 2) {
        if (searchHistory) {
            searchHistory.save(searchQuery);
        }
    }

    const filtered = filterItems
        ? filterItems(allItems, {
            category: currentCategory,
            getCategory: (item) => item?.category,
            query: searchQuery,
            fields: filterFields
        })
        : allItems;

    if (currentSortColumn && sortItems) {
        sortItems(filtered, currentSortColumn, currentSortDirection, sorters);
    }

    loadTable(filtered, searchQuery);

    // Afficher/masquer le bouton clear
    if (clearSearchBtn) {
        if ('hidden' in clearSearchBtn) {
            clearSearchBtn.hidden = !searchQuery;
        } else {
            clearSearchBtn.style.display = searchQuery ? 'inline' : 'none';
        }
    }

    updateFilterChips(searchQuery);
}

const debouncedApplyFilters = debounce(() => applyFilters(), 200);

// Recherche live avec debounce
function filterTable() {
    debouncedApplyFilters();
}

function clearSearch() {
    if (!searchInput) return;
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
}

function applyRecentSearch(query) {
    if (searchInput) {
        searchInput.value = query;
    }
    applyFilters();
}

function clearRecentSearches() {
    if (searchHistory) {
        searchHistory.clear();
    }
    if (recentSearchesDropdown) {
        recentSearchesDropdown.innerHTML = '';
        recentSearchesDropdown.style.display = 'none';
    }
}

function showRecentSearches() {
    if (!recentSearchesDropdown || !searchHistory || !window.astoriaSearchHistory) return;
    const searches = searchHistory.get();
    if (!searches.length) return;

    window.astoriaSearchHistory.renderDropdown(recentSearchesDropdown, searches, {
        onSelect: (query) => applyRecentSearch(query),
        onClear: () => clearRecentSearches()
    });
    recentSearchesDropdown.style.display = 'block';
}

function hideRecentSearches() {
    setTimeout(() => {
        if (recentSearchesDropdown) {
            recentSearchesDropdown.style.display = 'none';
        }
    }, 200);
}

function bindPageEvents() {
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => filterByCategory());
    }

    if (searchRoot && searchInput && window.astoriaSearchBar) {
        window.astoriaSearchBar.bind({
            root: searchRoot,
            input: searchInput,
            toggle: searchToggle,
            clearButton: clearSearchBtn,
            dropdown: recentSearchesDropdown,
            history: searchHistory,
            debounceWait: 200,
            onSearch: (value) => {
                if (searchInput) {
                    searchInput.value = value || '';
                }
                applyFilters();
            }
        });
    } else {
        if (searchInput) {
            searchInput.addEventListener('keyup', () => filterTable());
            searchInput.addEventListener('focus', () => showRecentSearches());
            searchInput.addEventListener('blur', () => hideRecentSearches());
        }

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => clearSearch());
        }
    }

    if (filterChips && filterChips.dataset.chipsBound !== "1") {
        filterChips.dataset.chipsBound = "1";
        filterChips.addEventListener('click', (event) => {
            const actionTarget = event.target?.closest?.('[data-chip-action]');
            if (!actionTarget) return;
            if (actionTarget.dataset.chipAction === 'clear-category') {
                clearCategoryFilter();
            }
        });
    }

    if (sortHeaders && sortHeaders.length) {
        sortHeaders.forEach((header) => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (column) sortTable(column);
            });
        });
    }
}

// Sort table by column
function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    applyFilters();
    updateSortIndicators();
}

function updateSortIndicators() {
    const sortableHeaders = document.querySelectorAll('th.sortable');

    sortableHeaders.forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = '';
            indicator.classList.remove('active');
        }
        header.setAttribute('aria-sort', 'none');
    });

    if (currentSortColumn) {
        const header = document.querySelector(`th[data-sort="${currentSortColumn}"]`);
        if (header) {
            const indicator = header.querySelector('.sort-indicator');
            indicator.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
            indicator.classList.add('active');
            header.setAttribute('aria-sort', currentSortDirection === 'asc' ? 'ascending' : 'descending');
        }
    }
}

// Initialisation depuis URL (paramètre ?category présent)
function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const urlCategory = params.get('category');

    if (urlCategory && categoryFilter) {
        const select = categoryFilter;
        select.value = urlCategory;
        currentCategory = urlCategory;
        filterByCategory();
    } else {
        loadTable(allItems);
    }

    updateFilterChips();
    populateCategoryCounts();
}

function populateCategoryCounts() {
    const counts = allItems.reduce((acc, item) => {
        const key = item.category || 'other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const select = categoryFilter;
    if (!select) return;

    Array.from(select.options).forEach(option => {
        const value = option.value;
        if (!value) return;
        const count = counts[value] || 0;
        const label = option.textContent.split(' (')[0];
        option.textContent = `${label} (${count})`;
    });
}

window.astoriaCodex = {
    setItems(items) {
        replaceItems(items);
        applyFilters();
        populateCategoryCounts();
    },
    setDbItems(items) {
        const merged = mergeLocalItems(items);
        replaceItems(merged);
        applyFilters();
        populateCategoryCounts();
    },
    addItems(items) {
        if (!Array.isArray(items) || items.length === 0) return;
        items.forEach((item) => {
            if (!item || typeof item !== 'object') return;
            const dbId = item._dbId;
            if (dbId && allItems.some((existing) => existing._dbId === dbId)) return;
            allItems.push(item);
            getOrCreateItemMeta(item, allItems.length - 1);
        });
        applyFilters();
        populateCategoryCounts();
    },
    removeItemByRef(itemRef) {
        if (!itemRef) return;
        const index = allItems.indexOf(itemRef);
        if (index < 0) return;
        allItems.splice(index, 1);
        applyFilters();
        populateCategoryCounts();
    },
    updateItemById(dbId, updates) {
        if (!dbId) return null;
        const target = allItems.find((item) => item && item._dbId === dbId);
        if (!target) return null;
        Object.assign(target, updates || {});
        rowCache.clear();
        applyFilters();
        populateCategoryCounts();
        return target;
    },
    getItemByIndex(index) {
        return currentData[index];
    },
    refresh() {
        console.log('[CODEX DEBUG] refresh() called - clearing rowCache');
        rowCache.clear();
        applyFilters();
        populateCategoryCounts();
    }
};

bindPageEvents();
void (async () => {
    await hydrateItemsFromDb();
    initFromUrl();
})();
