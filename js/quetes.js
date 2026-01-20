import { getActiveCharacter, getCurrentUser, isAdmin, refreshSessionUser } from "./auth.js";
import { initCharacterSummary } from "./ui/character-summary.js";

const QUEST_TYPES = ["Expédition", "Chasse", "Assistance", "Investigation"];
const QUEST_RANKS = ["F", "E", "D", "C", "B", "A", "S", "S+", "SS", "SSS"];
const STATUS_META = {
    available: { label: "Disponible", color: "#6aa7ff" },
    in_progress: { label: "En cours", color: "#ff9c4a" },
    locked: { label: "Acces restreint", color: "#ff6b6b" }
};

const state = {
    quests: [],
    history: [],
    filters: {
        search: "",
        type: "all",
        rank: "all",
        historyType: "all"
    },
    activeQuestId: null,
    activeImageIndex: 0,
    isAdmin: false,
    participant: null,
    editor: {
        questId: null,
        images: [],
        rewards: []
    },
    carousel: {
        x: 0,
        step: 0,
        minX: 0,
        maxX: 0,
        isDragging: false
    }
};

const dom = {
    typeFilter: document.getElementById("questTypeFilter"),
    rankFilter: document.getElementById("questRankFilter"),
    searchRoot: document.getElementById("questSearch"),
    searchInput: document.getElementById("questSearchInput"),
    searchToggle: document.getElementById("questSearchToggle"),
    searchClear: document.getElementById("questSearchClear"),
    searchHistory: document.getElementById("questSearchHistory"),
    prevBtn: document.getElementById("questPrevBtn"),
    nextBtn: document.getElementById("questNextBtn"),
    viewport: document.getElementById("questViewport"),
    track: document.getElementById("questTrack"),
    addBtn: document.getElementById("questAddBtn"),
    historyFilters: document.getElementById("questHistoryFilters"),
    historyMeta: document.getElementById("questHistoryMeta"),
    historyBody: document.getElementById("questHistoryBody"),
    detailModal: document.getElementById("questDetailModal"),
    detailTitle: document.getElementById("questDetailTitle"),
    detailType: document.getElementById("questDetailType"),
    detailRank: document.getElementById("questDetailRank"),
    detailStatus: document.getElementById("questDetailStatus"),
    detailLocations: document.getElementById("questDetailLocations"),
    detailRewards: document.getElementById("questDetailRewards"),
    detailDescription: document.getElementById("questDetailDescription"),
    detailParticipants: document.getElementById("questDetailParticipants"),
    detailParticipantsCount: document.getElementById("questDetailParticipantsCount"),
    detailNote: document.getElementById("questDetailNote"),
    detailPrev: document.getElementById("questDetailPrev"),
    detailNext: document.getElementById("questDetailNext"),
    mediaImage: document.getElementById("questMediaImage"),
    mediaFrame: document.querySelector(".quest-media-frame"),
    mediaDots: document.getElementById("questMediaDots"),
    mediaPrev: document.getElementById("questMediaPrev"),
    mediaNext: document.getElementById("questMediaNext"),
    joinBtn: document.getElementById("questJoinBtn"),
    editBtn: document.getElementById("questEditBtn"),
    validateBtn: document.getElementById("questValidateBtn"),
    editorModal: document.getElementById("questEditorModal"),
    editorTitle: document.getElementById("questEditorTitle"),
    editorForm: document.getElementById("questEditorForm"),
    nameInput: document.getElementById("questNameInput"),
    typeInput: document.getElementById("questTypeInput"),
    rankInput: document.getElementById("questRankInput"),
    statusInput: document.getElementById("questStatusInput"),
    statusDots: Array.from(document.querySelectorAll(".quest-editor-status-dot")),
    descInput: document.getElementById("questDescriptionInput"),
    maxParticipantsInput: document.getElementById("questMaxParticipantsInput"),
    repeatableInput: document.getElementById("questRepeatableInput"),
    locationsInput: document.getElementById("questLocationsInput"),
    imageUrlInput: document.getElementById("questImageUrlInput"),
    imageFileInput: document.getElementById("questImageFileInput"),
    addImageBtn: document.getElementById("questAddImageBtn"),
    imagesList: document.getElementById("questImagesList"),
    rewardNameInput: document.getElementById("questRewardNameInput"),
    rewardQtyInput: document.getElementById("questRewardQtyInput"),
    addRewardBtn: document.getElementById("questAddRewardBtn"),
    rewardsList: document.getElementById("questRewardsList"),
    imagePreview: document.querySelector(".quest-editor-image-preview")
};

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildParticipant(label, id) {
    const safeLabel = String(label || "Invite");
    const key = id ? `id:${id}` : `name:${normalize(safeLabel)}`;
    return { key, label: safeLabel };
}

function resolveParticipant() {
    const character = getActiveCharacter?.();
    if (character && character.id) {
        return buildParticipant(character.name || "Personnage", character.id);
    }
    if (character && character.name) {
        return buildParticipant(character.name);
    }
    const user = getCurrentUser?.();
    if (user && user.username) {
        return buildParticipant(user.username);
    }
    return null;
}

function getStatusMeta(status) {
    return STATUS_META[status] || STATUS_META.available;
}

function syncStatusDots(value) {
    if (!dom.statusDots.length) return;
    dom.statusDots.forEach((dot) => {
        dot.classList.toggle("is-active", dot.dataset.status === value);
    });
}

function seedData() {
    state.quests = [
        {
            id: "quest-1",
            name: "Sauvetage",
            type: "Expédition",
            rank: "F",
            status: "available",
            repeatable: false,
            description: "Retrouver les eclaireurs perdus dans les falaises d'Aethra.",
            locations: ["Falaises d'Aethra", "Refuge du Vent"],
            rewards: [{ name: "Potion de vitalite", qty: 2 }, { name: "Kaels", qty: 120 }],
            images: [
                "assets/images/objets/Fiole_de_vitalite.jpg",
                "assets/images/objets/Cape_de_lAube_Vermeille_on.jpg"
            ],
            participants: [buildParticipant("Seraphina"), buildParticipant("Eden")],
            maxParticipants: 5,
            completedBy: []
        },
        {
            id: "quest-2",
            name: "Oeil de Matera",
            type: "Investigation",
            rank: "C",
            status: "in_progress",
            repeatable: true,
            description: "Examiner les vestiges luminescents et retrouver l'origine des murmures.",
            locations: ["Sanctuaire Matera", "Crypte amethyste"],
            rewards: [{ name: "Eclat lumineux", qty: 1 }, { name: "Kaels", qty: 220 }],
            images: [
                "assets/images/objets/Larme_de_Matera.png",
                "assets/images/objets/Book_of_Aeris.png"
            ],
            participants: [buildParticipant("Lyra")],
            maxParticipants: 4,
            completedBy: []
        },
        {
            id: "quest-3",
            name: "Chasse au Colosse",
            type: "Chasse",
            rank: "D",
            status: "locked",
            repeatable: false,
            description: "Le colosse de pierre s'est eveille. Rassembler une equipe experimentee.",
            locations: ["Gorge de Vexarion"],
            rewards: [{ name: "Eclat de roche", qty: 3 }, { name: "Kaels", qty: 180 }],
            images: ["assets/images/objets/Armure_de_Vexarion.png"],
            participants: [],
            maxParticipants: 3,
            completedBy: []
        },
        {
            id: "quest-4",
            name: "Refuge des Brumes",
            type: "Assistance",
            rank: "E",
            status: "available",
            repeatable: false,
            description: "Secourir les voyageurs bloques dans la foret embrumee.",
            locations: ["Foret des Brumes"],
            rewards: [{ name: "Fruit Papooru", qty: 5 }],
            images: ["assets/images/objets/Fruit_Papooru.jpg"],
            participants: [buildParticipant("Mira")],
            maxParticipants: 5,
            completedBy: []
        },
        {
            id: "quest-5",
            name: "Echo d'Aeris",
            type: "Expédition",
            rank: "B",
            status: "available",
            repeatable: true,
            description: "Explorer les ruines suspendues et collecter les fragments mystiques.",
            locations: ["Ruines d'Aeris"],
            rewards: [{ name: "Livre d'Aeris", qty: 1 }, { name: "Kaels", qty: 420 }],
            images: ["assets/images/objets/Book_of_Aeris.png"],
            participants: [],
            maxParticipants: 5,
            completedBy: []
        },
        {
            id: "quest-6",
            name: "Ruines d'Onyx",
            type: "Investigation",
            rank: "S",
            status: "in_progress",
            repeatable: false,
            description: "Plonger dans les galeries d'Onyx pour retrouver les glyphes perdus.",
            locations: ["Canyon d'Onyx", "Laboratoire abandonne"],
            rewards: [{ name: "Cloche de Resonance", qty: 1 }, { name: "Kaels", qty: 620 }],
            images: ["assets/images/objets/Cloche_de_Resonnance.png"],
            participants: [buildParticipant("Orion"), buildParticipant("Naelis")],
            maxParticipants: 4,
            completedBy: [buildParticipant("Orion").key]
        }
    ];

    state.history = [
        {
            id: "history-1",
            date: "14/01/2026 17:54",
            type: "Expédition",
            rank: "F",
            name: "Sauvetage",
            gains: "Potion de vitalite x2"
        },
        {
            id: "history-2",
            date: "09/01/2026 10:35",
            type: "Assistance",
            rank: "F",
            name: "Refuge des Brumes",
            gains: "Fruit Papooru x3"
        }
    ];
}

function fillFilters() {
    const populateSelect = (select, options, placeholder) => {
        if (!select) return;
        select.innerHTML = "";
        if (placeholder) {
            const placeholderOption = document.createElement("option");
            placeholderOption.value = "";
            placeholderOption.textContent = placeholder;
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            select.appendChild(placeholderOption);
        }
        options.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
    };

    QUEST_TYPES.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        dom.typeFilter.appendChild(option);
    });

    QUEST_RANKS.forEach((rank) => {
        const option = document.createElement("option");
        option.value = rank;
        option.textContent = rank;
        dom.rankFilter.appendChild(option);
    });

    populateSelect(dom.typeInput, QUEST_TYPES, "Sélectionner (déroulant)");
    populateSelect(dom.rankInput, QUEST_RANKS, "Sélectionner (déroulant)");

    QUEST_TYPES.forEach((type, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `quest-history-filter${index === 0 ? " active" : ""}`;
        btn.textContent = type;
        btn.dataset.value = type;
        dom.historyFilters.appendChild(btn);
    });

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "quest-history-filter active";
    allBtn.textContent = "Toutes";
    allBtn.dataset.value = "all";
    dom.historyFilters.prepend(allBtn);
}

function getFilteredQuests() {
    const search = normalize(state.filters.search);
    return state.quests.filter((quest) => {
        if (state.filters.type !== "all" && quest.type !== state.filters.type) return false;
        if (state.filters.rank !== "all" && quest.rank !== state.filters.rank) return false;
        if (!search) return true;
        return normalize(quest.name).includes(search);
    });
}

function renderQuestList() {
    const filtered = getFilteredQuests();
    dom.track.innerHTML = "";
    filtered.forEach((quest, index) => {
        const meta = getStatusMeta(quest.status);
        const card = document.createElement("article");
        card.className = "quest-card";
        card.style.setProperty("--status-color", meta.color);
        card.style.setProperty("--delay", `${index * 120}ms`);
        card.innerHTML = `
            <div class="quest-card-content">
                <div class="quest-card-header">
                    <h3 class="quest-card-title">${escapeHtml(quest.name)}</h3>
                    <span class="quest-rank-badge">${escapeHtml(quest.rank)}</span>
                </div>
                <div class="quest-card-media">
                    <img src="${escapeHtml(quest.images[0])}" alt="Illustration ${escapeHtml(quest.name)}" draggable="false">
                </div>
                <div class="quest-card-meta">
                    <span class="quest-type-pill">${escapeHtml(quest.type)}</span>
                    <span class="quest-status-pill">${escapeHtml(meta.label)}</span>
                </div>
                <div class="quest-card-actions">
                    <button class="quest-details-btn" type="button" data-id="${escapeHtml(quest.id)}">Details</button>
                </div>
            </div>
        `;
        dom.track.appendChild(card);
    });

    dom.track.querySelectorAll(".quest-details-btn").forEach((btn) => {
        btn.addEventListener("click", () => openDetail(btn.dataset.id));
    });

    updateCarouselMetrics();
    const snaps = state.carousel.snaps || [];
    const initial = snaps.length > 1 ? snaps[1] : snaps[0] || 0;
    applyCarouselPosition(initial);
    updateCarouselParallax();
}

function renderHistory() {
    const filtered = state.filters.historyType === "all"
        ? state.history
        : state.history.filter((item) => item.type === state.filters.historyType);

    const plural = filtered.length !== 1;
    dom.historyMeta.textContent = `${filtered.length} Quête${plural ? "s" : ""} exécutée${plural ? "s" : ""}`;

    dom.historyBody.innerHTML = filtered.map((entry) => `
        <tr>
            <td>${escapeHtml(entry.date)}</td>
            <td>${escapeHtml(entry.type)}</td>
            <td>${escapeHtml(entry.rank)}</td>
            <td>${escapeHtml(entry.name)}</td>
            <td>${escapeHtml(entry.gains)}</td>
        </tr>
    `).join("");
}

function updateHistoryFilterButtons() {
    dom.historyFilters.querySelectorAll(".quest-history-filter").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.value === state.filters.historyType);
    });
}

function openDetail(questId) {
    const quest = state.quests.find((item) => item.id === questId);
    if (!quest) return;
    state.activeQuestId = questId;
    state.activeImageIndex = 0;
    renderDetail(quest);
    dom.detailModal.classList.add("open");
    dom.detailModal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}

function renderDetail(quest) {
    const meta = getStatusMeta(quest.status);
    dom.detailTitle.textContent = quest.name;
    dom.detailType.textContent = quest.type;
    dom.detailRank.textContent = quest.rank;
    dom.detailStatus.textContent = meta.label;
    dom.detailStatus.style.color = meta.color;
    dom.detailModal.querySelector(".quest-modal-card").style.setProperty("--status-color", meta.color);

    dom.detailLocations.innerHTML = quest.locations.map((loc) => `<li>${escapeHtml(loc)}</li>`).join("");
    dom.detailRewards.innerHTML = quest.rewards.map((reward) => `<li>${escapeHtml(reward.name)} x${reward.qty}</li>`).join("");
    dom.detailDescription.textContent = quest.description;

    renderParticipants(quest);
    renderMedia(quest);
    renderJoinButton(quest);
}

function renderParticipants(quest) {
    dom.detailParticipantsCount.textContent = `(${quest.participants.length}/${quest.maxParticipants})`;
    if (!quest.participants.length) {
        dom.detailParticipants.innerHTML = "<li>Aucun participant</li>";
    } else {
        dom.detailParticipants.innerHTML = quest.participants.map((participant) => `<li>${escapeHtml(participant.label)}</li>`).join("");
    }

    const note = buildJoinNote(quest);
    dom.detailNote.textContent = note || "";
}

function renderMedia(quest) {
    const images = quest.images || [];
    if (!images.length) {
        dom.mediaImage.removeAttribute("src");
        dom.mediaDots.innerHTML = "";
        return;
    }
    const index = Math.max(0, Math.min(state.activeImageIndex, images.length - 1));
    state.activeImageIndex = index;
    dom.mediaImage.src = images[index];
    dom.mediaImage.setAttribute("draggable", "false");
    dom.mediaDots.innerHTML = images.map((_, idx) => {
        const active = idx === index ? "active" : "";
        return `<span class="quest-media-dot ${active}"></span>`;
    }).join("");
}

function buildJoinNote(quest) {
    const participant = state.participant;
    if (!participant) {
        return "Selectionnez un personnage pour participer.";
    }
    if (!quest.repeatable && quest.completedBy.includes(participant.key)) {
        return "Quête déjà réalisée (non répétitive).";
    }
    if (quest.status === "locked") {
        return "Acces restreint par le staff.";
    }
    if (!isParticipant(quest) && quest.participants.length >= quest.maxParticipants) {
        return "Places complètes.";
    }
    return "";
}

function isParticipant(quest) {
    if (!state.participant) return false;
    return quest.participants.some((entry) => entry.key === state.participant.key);
}

function renderJoinButton(quest) {
    const already = isParticipant(quest);
    const note = buildJoinNote(quest);
    const canJoin = !note || already;

    dom.joinBtn.textContent = already ? "Annuler" : "Participer";
    dom.joinBtn.disabled = !canJoin;
}

function toggleParticipation() {
    const quest = state.quests.find((item) => item.id === state.activeQuestId);
    if (!quest || !state.participant) return;
    const already = isParticipant(quest);

    if (!already) {
        const note = buildJoinNote(quest);
        if (note) return;
        quest.participants.push(state.participant);
    } else {
        quest.participants = quest.participants.filter((entry) => entry.key !== state.participant.key);
    }

    renderDetail(quest);
    renderQuestList();
}

function validateQuest() {
    if (!state.isAdmin) return;
    const questId = dom.editorModal.classList.contains("open") && state.editor.questId
        ? state.editor.questId
        : state.activeQuestId;
    const quest = state.quests.find((item) => item.id === questId);
    if (!quest) return;

    const date = new Date().toLocaleString("fr-FR");
    const gains = quest.rewards.map((reward) => `${reward.name} x${reward.qty}`).join(", ");

    state.history.unshift({
        id: `history-${Date.now()}`,
        date,
        type: quest.type,
        rank: quest.rank,
        name: quest.name,
        gains: gains || "Aucun gain"
    });

    quest.participants.forEach((participant) => {
        if (!quest.completedBy.includes(participant.key)) {
            quest.completedBy.push(participant.key);
        }
    });
    quest.participants = [];

    if (state.activeQuestId === quest.id) {
        renderDetail(quest);
    }
    renderQuestList();
    renderHistory();
}

function navigateDetail(delta) {
    const filtered = getFilteredQuests();
    if (!filtered.length) return;
    const currentIndex = filtered.findIndex((quest) => quest.id === state.activeQuestId);
    const nextIndex = (currentIndex + delta + filtered.length) % filtered.length;
    openDetail(filtered[nextIndex].id);
}

function getTrackGap() {
    const styles = window.getComputedStyle(dom.track);
    return Number.parseFloat(styles.columnGap || styles.gap || 0) || 0;
}

function getTrackStep() {
    const card = dom.track.querySelector(".quest-card");
    if (!card) return dom.track.clientWidth || 0;
    const gap = getTrackGap();
    return card.getBoundingClientRect().width + gap;
}

function updateCarouselParallax() {
    const cards = Array.from(dom.track.querySelectorAll(".quest-card"));
    if (!cards.length) return;
    const trackRect = dom.track.getBoundingClientRect();
    cards.forEach((card) => {
        const img = card.querySelector("img");
        if (!img) return;
        const rect = card.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const offset = (center - (trackRect.left + trackRect.width / 2)) / trackRect.width;
        const translate = Math.max(-1, Math.min(1, offset)) * 16;
        img.style.transform = `translateX(${translate}px) scale(1.02)`;
    });
}

function getVisibleCount() {
    if (window.innerWidth <= 720) return 1;
    return 3;
}

function getCarouselViewportWidth() {
    if (!dom.viewport) return dom.track.clientWidth || 0;
    return dom.viewport.clientWidth || 0;
}

function scrollCarousel(direction, stepOverride) {
    const snaps = state.carousel.snaps || [];
    if (!snaps.length) return;
    let closestIndex = 0;
    let min = Math.abs(state.carousel.x - snaps[0]);
    snaps.forEach((snap, idx) => {
        const dist = Math.abs(state.carousel.x - snap);
        if (dist < min) {
            min = dist;
            closestIndex = idx;
        }
    });
    const step = stepOverride || 1;
    const nextIndex = Math.max(0, Math.min(snaps.length - 1, closestIndex + direction * step));
    applyCarouselPosition(snaps[nextIndex], true);
}

function snapCarousel() {
    const snaps = state.carousel.snaps || [];
    if (!snaps.length) return;
    let closest = snaps[0];
    let min = Math.abs(state.carousel.x - closest);
    for (const snap of snaps) {
        const dist = Math.abs(state.carousel.x - snap);
        if (dist < min) {
            min = dist;
            closest = snap;
        }
    }
    applyCarouselPosition(closest, true);
}

function updateCarouselMetrics() {
    const cards = Array.from(dom.track.querySelectorAll(".quest-card"));
    const gap = getTrackGap();
    const visible = getVisibleCount();
    const viewportWidth = getCarouselViewportWidth();
    const cardWidth = visible > 0
        ? Math.max(220, (viewportWidth - gap * (visible - 1)) / visible)
        : viewportWidth;

    cards.forEach((card) => {
        card.style.width = `${cardWidth}px`;
    });

    const step = cardWidth + gap;
    const trackWidth = cards.length ? (cards.length * step) - gap : viewportWidth;
    const centerOffset = (viewportWidth - cardWidth) / 2;
    state.carousel.step = step;
    state.carousel.maxX = centerOffset;
    state.carousel.minX = centerOffset - (step * (cards.length - 1));
    if (!Number.isFinite(state.carousel.minX)) state.carousel.minX = 0;
    state.carousel.x = Math.max(state.carousel.minX, Math.min(state.carousel.maxX, state.carousel.x));
    dom.track.style.width = `${trackWidth}px`;
    state.carousel.snaps = cards.map((_, idx) => centerOffset - idx * step);
}

function isEditableTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName ? target.tagName.toLowerCase() : "";
    return tag === "input" || tag === "textarea" || tag === "select";
}

function isCarouselFocused() {
    const active = document.activeElement;
    if (!active) return false;
    if (active === dom.track || active === dom.viewport) return true;
    return dom.track.contains(active) || active === dom.prevBtn || active === dom.nextBtn;
}

function applyCarouselPosition(nextX, animate = false) {
    const bounded = Math.max(state.carousel.minX, Math.min(state.carousel.maxX, nextX));
    state.carousel.x = bounded;
    if (animate) {
        dom.track.style.transition = "transform 0.35s ease";
    } else {
        dom.track.style.transition = "none";
    }
    dom.track.style.transform = `translateX(${bounded}px)`;
    updateCarouselParallax();
}

function bindCarouselDrag() {
    let startX = 0;
    let startPos = 0;
    let moved = false;
    let skipClick = false;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumId = null;

    const stopMomentum = () => {
        if (momentumId) cancelAnimationFrame(momentumId);
        momentumId = null;
    };

    const startMomentum = () => {
        stopMomentum();
        let momentumVelocity = velocity;
        let lastFrame = performance.now();

        const step = (time) => {
            const delta = time - lastFrame;
            lastFrame = time;
            momentumVelocity *= 0.92;
            applyCarouselPosition(state.carousel.x + momentumVelocity * delta, false);
            if (Math.abs(momentumVelocity) > 0.02) {
                momentumId = requestAnimationFrame(step);
            } else {
                momentumId = null;
                snapCarousel();
            }
        };

        if (Math.abs(momentumVelocity) > 0.04) {
            momentumId = requestAnimationFrame(step);
        } else {
            snapCarousel();
        }
    };

    dom.track.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button, a, input, select, textarea")) return;
        if (event.button !== 0) return;
        updateCarouselMetrics();
        state.carousel.isDragging = true;
        moved = false;
        skipClick = false;
        startX = event.clientX;
        startPos = state.carousel.x;
        lastX = event.clientX;
        lastTime = performance.now();
        velocity = 0;
        stopMomentum();
        dom.track.setPointerCapture(event.pointerId);
        dom.track.classList.add("is-dragging");
    });

    dom.track.addEventListener("pointermove", (event) => {
        if (!state.carousel.isDragging) return;
        const delta = event.clientX - startX;
        if (Math.abs(delta) > 6) moved = true;
        applyCarouselPosition(startPos + delta, false);
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
            velocity = (event.clientX - lastX) / dt;
            lastX = event.clientX;
            lastTime = now;
        }
    });

    function endDrag(event) {
        if (!state.carousel.isDragging) return;
        state.carousel.isDragging = false;
        dom.track.releasePointerCapture(event.pointerId);
        dom.track.classList.remove("is-dragging");
        if (moved) {
            skipClick = true;
            startMomentum();
            setTimeout(() => {
                skipClick = false;
            }, 0);
        }
    }

    dom.track.addEventListener("pointerup", endDrag);
    dom.track.addEventListener("pointercancel", endDrag);

    dom.track.addEventListener("click", (event) => {
        if (!skipClick) return;
        event.preventDefault();
        event.stopPropagation();
    });

    window.addEventListener("resize", () => {
        updateCarouselMetrics();
        applyCarouselPosition(state.carousel.x, false);
    });
}

function bindMediaDrag() {
    if (!dom.mediaFrame) return;
    let isDragging = false;
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;

    dom.mediaFrame.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        if (event.button !== 0) return;
        isDragging = true;
        startX = event.clientX;
        lastX = event.clientX;
        lastTime = performance.now();
        velocity = 0;
        dom.mediaFrame.setPointerCapture(event.pointerId);
        dom.mediaFrame.classList.add("is-dragging");
    });

    dom.mediaFrame.addEventListener("pointermove", (event) => {
        if (!isDragging) return;
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
            velocity = (event.clientX - lastX) / dt;
            lastX = event.clientX;
            lastTime = now;
        }
    });

    function endDrag(event) {
        if (!isDragging) return;
        isDragging = false;
        dom.mediaFrame.releasePointerCapture(event.pointerId);
        dom.mediaFrame.classList.remove("is-dragging");
        const delta = event.clientX - startX;
        const quest = state.quests.find((item) => item.id === state.activeQuestId);
        if (!quest) return;
        const threshold = dom.mediaFrame.clientWidth * 0.15;
        if (delta > threshold || velocity > 0.4) {
            state.activeImageIndex = (state.activeImageIndex - 1 + quest.images.length) % quest.images.length;
            renderMedia(quest);
        } else if (delta < -threshold || velocity < -0.4) {
            state.activeImageIndex = (state.activeImageIndex + 1) % quest.images.length;
            renderMedia(quest);
        }
    }

    dom.mediaFrame.addEventListener("pointerup", endDrag);
    dom.mediaFrame.addEventListener("pointercancel", endDrag);
}

function openEditor(quest) {
    state.editor.questId = quest ? quest.id : null;
    state.editor.images = quest ? [...quest.images] : [];
    state.editor.rewards = quest ? quest.rewards.map((reward) => ({ ...reward })) : [];
    dom.editorTitle.textContent = quest ? "Modifier la quête" : "Création de Quêtes";

    dom.nameInput.value = quest ? quest.name : "";
    dom.typeInput.value = quest ? quest.type : QUEST_TYPES[0];
    dom.rankInput.value = quest ? quest.rank : QUEST_RANKS[0];
    dom.statusInput.value = quest ? quest.status : "available";
    dom.descInput.value = quest ? quest.description : "";
    dom.maxParticipantsInput.value = quest ? quest.maxParticipants : 5;
    dom.repeatableInput.checked = quest ? quest.repeatable : false;
    dom.locationsInput.value = quest ? quest.locations.join(", ") : "";
    syncStatusDots(dom.statusInput.value);
    if (dom.validateBtn) {
        dom.validateBtn.disabled = !quest;
    }

    renderEditorLists();
    dom.editorModal.classList.add("open");
    dom.editorModal.setAttribute("aria-hidden", "false");
}

function renderEditorLists() {
    dom.imagesList.innerHTML = state.editor.images.map((src, idx) => `
        <div class="quest-editor-item">
            <span>${escapeHtml(src)}</span>
            <button type="button" data-remove-image="${idx}">Retirer</button>
        </div>
    `).join("");

    dom.rewardsList.innerHTML = state.editor.rewards.map((reward, idx) => `
        <div class="quest-editor-item">
            <span>${escapeHtml(reward.name)} x${reward.qty}</span>
            <button type="button" data-remove-reward="${idx}">Retirer</button>
        </div>
    `).join("");

    if (dom.imagePreview) {
        const previewSrc = state.editor.images[0];
        if (previewSrc) {
            dom.imagePreview.style.backgroundImage = `url(${previewSrc})`;
            dom.imagePreview.classList.add("has-image");
            dom.imagePreview.textContent = "";
        } else {
            dom.imagePreview.style.backgroundImage = "none";
            dom.imagePreview.classList.remove("has-image");
            dom.imagePreview.textContent = "Image";
        }
    }
}

function handleEditorSubmit(event) {
    event.preventDefault();
    const name = dom.nameInput.value.trim();
    if (!name) return;

    const locations = dom.locationsInput.value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

    const questData = {
        id: state.editor.questId || `quest-${Date.now()}`,
        name,
        type: dom.typeInput.value,
        rank: dom.rankInput.value,
        status: dom.statusInput.value,
        repeatable: dom.repeatableInput.checked,
        description: dom.descInput.value.trim() || "Description a definir.",
        locations,
        rewards: state.editor.rewards.length ? state.editor.rewards : [{ name: "Kaels", qty: 50 }],
        images: state.editor.images.length ? state.editor.images : ["assets/images/objets/Clef_Manndorf.png"],
        participants: [],
        maxParticipants: Math.min(5, Math.max(1, Number(dom.maxParticipantsInput.value) || 1)),
        completedBy: []
    };

    if (state.editor.questId) {
        const idx = state.quests.findIndex((quest) => quest.id === state.editor.questId);
        if (idx >= 0) state.quests[idx] = { ...state.quests[idx], ...questData };
    } else {
        state.quests.unshift(questData);
    }

    renderQuestList();
    closeModal(dom.editorModal);
}

function handleAddImage() {
    const url = dom.imageUrlInput.value.trim();
    if (url) {
        state.editor.images.push(url);
        dom.imageUrlInput.value = "";
        renderEditorLists();
        return;
    }
    if (dom.imageFileInput) {
        dom.imageFileInput.click();
    }
}

function handleImageFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const src = String(reader.result || "");
        if (src) {
            state.editor.images.push(src);
            renderEditorLists();
        }
    };
    reader.readAsDataURL(file);
    dom.imageFileInput.value = "";
}

function handleAddReward() {
    const name = dom.rewardNameInput.value.trim();
    const qty = Math.max(1, Number(dom.rewardQtyInput.value) || 1);
    if (!name) return;
    state.editor.rewards.push({ name, qty });
    dom.rewardNameInput.value = "";
    dom.rewardQtyInput.value = "1";
    renderEditorLists();
}

function bindEditorListEvents() {
    dom.imagesList.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-remove-image]");
        if (!btn) return;
        const idx = Number(btn.dataset.removeImage);
        state.editor.images.splice(idx, 1);
        renderEditorLists();
    });

    dom.rewardsList.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-remove-reward]");
        if (!btn) return;
        const idx = Number(btn.dataset.removeReward);
        state.editor.rewards.splice(idx, 1);
        renderEditorLists();
    });
}

function syncAdminUI() {
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
        if (state.isAdmin) {
            el.removeAttribute("hidden");
        } else {
            el.setAttribute("hidden", "true");
        }
    });
}

function bindEvents() {
    if (dom.searchRoot && dom.searchInput && window.astoriaSearchBar) {
        window.astoriaSearchBar.bind({
            root: dom.searchRoot,
            input: dom.searchInput,
            toggle: dom.searchToggle,
            clearButton: dom.searchClear,
            dropdown: dom.searchHistory,
            debounceWait: 200,
            onSearch: (value) => {
                state.filters.search = String(value || "");
                renderQuestList();
            }
        });
    } else {
        dom.searchInput.addEventListener("input", () => {
            state.filters.search = dom.searchInput.value;
            renderQuestList();
        });
    }
    dom.typeFilter.addEventListener("change", () => {
        state.filters.type = dom.typeFilter.value;
        renderQuestList();
    });
    dom.rankFilter.addEventListener("change", () => {
        state.filters.rank = dom.rankFilter.value;
        renderQuestList();
    });
    dom.statusInput.addEventListener("change", () => {
        syncStatusDots(dom.statusInput.value);
    });
    dom.statusDots.forEach((dot) => {
        dot.addEventListener("click", () => {
            const status = dot.dataset.status;
            if (!status) return;
            dom.statusInput.value = status;
            syncStatusDots(status);
        });
    });
    dom.prevBtn.addEventListener("click", () => {
        scrollCarousel(-1, getVisibleCount());
    });
    dom.nextBtn.addEventListener("click", () => {
        scrollCarousel(1, getVisibleCount());
    });
    window.addEventListener("keydown", (event) => {
        if (event.defaultPrevented) return;
        if (isEditableTarget(event.target)) return;
        if (dom.detailModal.classList.contains("open")) return;
        if (!isCarouselFocused()) return;
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollCarousel(-1, getVisibleCount());
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollCarousel(1, getVisibleCount());
        }
    });
    dom.detailPrev.addEventListener("click", () => navigateDetail(-1));
    dom.detailNext.addEventListener("click", () => navigateDetail(1));
    dom.mediaPrev.addEventListener("click", () => {
        const quest = state.quests.find((item) => item.id === state.activeQuestId);
        if (!quest) return;
        state.activeImageIndex -= 1;
        if (state.activeImageIndex < 0) state.activeImageIndex = quest.images.length - 1;
        renderMedia(quest);
    });
    dom.mediaNext.addEventListener("click", () => {
        const quest = state.quests.find((item) => item.id === state.activeQuestId);
        if (!quest) return;
        state.activeImageIndex += 1;
        if (state.activeImageIndex >= quest.images.length) state.activeImageIndex = 0;
        renderMedia(quest);
    });
    dom.joinBtn.addEventListener("click", toggleParticipation);
    dom.editBtn.addEventListener("click", () => {
        const quest = state.quests.find((item) => item.id === state.activeQuestId);
        if (quest) openEditor(quest);
    });
    dom.validateBtn.addEventListener("click", validateQuest);
    dom.addBtn.addEventListener("click", () => openEditor(null));

    dom.detailModal.addEventListener("click", (event) => {
        if (event.target.dataset.close === "true") {
            closeModal(dom.detailModal);
        }
    });
    dom.editorModal.addEventListener("click", (event) => {
        if (event.target.dataset.close === "true") {
            closeModal(dom.editorModal);
        }
    });

    dom.historyFilters.addEventListener("click", (event) => {
        const btn = event.target.closest(".quest-history-filter");
        if (!btn) return;
        state.filters.historyType = btn.dataset.value;
        updateHistoryFilterButtons();
        renderHistory();
    });

    dom.editorForm.addEventListener("submit", handleEditorSubmit);
    dom.addImageBtn.addEventListener("click", handleAddImage);
    dom.imageFileInput.addEventListener("change", handleImageFile);
    dom.addRewardBtn.addEventListener("click", handleAddReward);
    bindEditorListEvents();
    bindCarouselDrag();
    bindMediaDrag();
    dom.track.addEventListener("pointerdown", () => {
        dom.track.focus();
    });
}

async function init() {
    await refreshSessionUser?.();
    await initCharacterSummary({ enableDropdown: true, showKaels: true });
    state.isAdmin = Boolean(isAdmin?.());
    state.participant = resolveParticipant();

    seedData();
    fillFilters();
    syncAdminUI();
    bindEvents();
    renderQuestList();
    renderHistory();
}

init();


