import { getActiveCharacter, getAllItems, getCurrentUser, getSupabaseClient, isAdmin, refreshSessionUser } from "./auth.js";
import { initCharacterSummary } from "./ui/character-summary.js";
import { getInventoryRows, setInventoryItem } from "./api/inventory-service.js";
import { getCharacterById, updateCharacter } from "./api/characters-service.js";

const QUEST_TYPES = ["Exp\u00E9dition", "Chasse", "Assistance", "Investigation"];
const QUEST_RANKS = ["F", "E", "D", "C", "B", "A", "S", "S+", "SS", "SSS"];
const STATUS_META = {
    available: { label: "Disponible", color: "#6aa7ff" },
    in_progress: { label: "En cours", color: "#ff9c4a" },
    locked: { label: "Acces restreint", color: "#ff6b6b" }
};

const QUEST_STORAGE_KEY = "astoria_quests_state";
const QUEST_HISTORY_STORAGE_KEY = "astoria_quests_history";
const QUESTS_TABLE = "quests";
const QUEST_HISTORY_TABLE = "quest_history";
const REWARD_ELEMENTS = ["Feu", "Eau", "Vent", "Terre", "Glace", "Foudre", "Lumiere", "Ombre"];
const REWARD_ELEMENT_MAP = {
    feu: "feu",
    eau: "eau",
    vent: "vent",
    terre: "terre",
    roche: "roche",
    glace: "glace",
    cryo: "glace",
    foudre: "foudre",
    nature: "nature",
    osmose: "osmose",
    lumiere: "lumiere",
    ombre: "tenebres",
    tenebres: "tenebres"
};

const state = {
    quests: [],
    history: [],
    items: [],
    inventoryCache: new Map(),
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
    },
    cropper: {
        instance: null,
        pendingFile: null,
        previewUrl: ""
    },
    isValidating: false
};

const questStorage = (() => {
    const memory = new Map();
    const tryStore = (store) => {
        if (!store) return null;
        try {
            const key = "__astoria_quest_test__";
            store.setItem(key, "1");
            store.removeItem(key);
            return store;
        } catch {
            return null;
        }
    };
    const local = tryStore(window.localStorage);
    const session = local ? null : tryStore(window.sessionStorage);
    const backend = local || session;
    const mode = local ? "local" : session ? "session" : "memory";
    return {
        mode,
        getItem: (key) => (backend ? backend.getItem(key) : (memory.has(key) ? memory.get(key) : null)),
        setItem: (key, value) => {
            if (backend) {
                backend.setItem(key, value);
            } else {
                memory.set(key, value);
            }
        },
        removeItem: (key) => {
            if (backend) {
                backend.removeItem(key);
            } else {
                memory.delete(key);
            }
        }
    };
})();

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
    rewardSelect: document.getElementById("questRewardSelect"),
    rewardPicker: document.getElementById("questRewardPicker"),
    rewardTrigger: document.getElementById("questRewardTrigger"),
    rewardPopover: document.getElementById("questRewardPopover"),
    rewardOptions: document.getElementById("questRewardOptions"),
    rewardTooltip: document.getElementById("questRewardTooltip"),
    rewardQtyInput: document.getElementById("questRewardQtyInput"),
    addRewardBtn: document.getElementById("questAddRewardBtn"),
    rewardsList: document.getElementById("questRewardsList"),
    imagePreview: document.querySelector(".quest-editor-image-preview"),
    rewardPreview: document.getElementById("questRewardPreview"),
    cropperBackdrop: document.getElementById("questCropperBackdrop"),
    cropperImage: document.getElementById("questCropperImage"),
    cropperZoom: document.getElementById("questCropperZoom"),
    cropperClose: document.getElementById("questCropperClose"),
    cropperCancel: document.getElementById("questCropperCancel"),
    cropperConfirm: document.getElementById("questCropperConfirm")
};

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
    if (window.astoriaListHelpers?.normalizeText) {
        return window.astoriaListHelpers.normalizeText(value);
    }
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sanitizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function formatCategory(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getRewardInitial(item) {
    const name = String(item?.name || "").trim();
    return name ? name.charAt(0).toUpperCase() : "?";
}

function buildRewardMeta(item) {
    const meta = [];
    const category = formatCategory(item?.category);
    if (category) meta.push(category);
    const buy = String(item?.buyPrice || "").trim();
    const sell = String(item?.sellPrice || "").trim();
    if (buy) meta.push(`Achat: ${buy}`);
    if (sell) meta.push(`Vente: ${sell}`);
    return meta;
}

function getScrollTypesList() {
    const list = Array.isArray(window.astoriaScrollTypes) ? window.astoriaScrollTypes : [];
    if (list.length) {
        return list.map((entry) => ({
            key: String(entry?.key || entry?.label || "").trim(),
            label: String(entry?.label || entry?.key || "").trim()
        })).filter((entry) => entry.key || entry.label);
    }
    return REWARD_ELEMENTS.map((label) => ({
        key: normalizeText(label),
        label
    }));
}

function shouldRandomizeElement(itemOrName) {
    const helper = window.astoriaItemTags;
    if (helper?.isScrollItem) {
        return helper.isScrollItem(itemOrName);
    }
    const name = normalizeText(itemOrName?.name || itemOrName || "");
    return name.includes("parchemin") || name.includes("scroll");
}

function pickRewardElement() {
    const list = getScrollTypesList();
    if (!list.length) return { key: "", label: "" };
    const picked = list[Math.floor(Math.random() * list.length)] || {};
    return {
        key: String(picked.key || "").trim(),
        label: String(picked.label || picked.key || "").trim()
    };
}

function ensureRewardElement(reward) {
    if (!reward) return reward;
    if (shouldRandomizeElement(reward.name)) {
        if (!reward.element) {
            const picked = pickRewardElement();
            reward.element = picked.label || reward.element;
            if (picked.key) reward.elementKey = picked.key;
        }
        if (reward.element && !reward.elementKey) {
            const fallbackKey = getScrollTypeKeyForReward(reward);
            if (fallbackKey) reward.elementKey = fallbackKey;
        }
    }
    return reward;
}

function formatRewardLabel(reward) {
    if (!reward) return "";
    const name = String(reward.name || "");
    const element = reward.element ? ` (${reward.element})` : "";
    return `${name}${element}`;
}

function getScrollTypeKeyForReward(reward) {
    if (!reward) return "";
    if (reward.elementKey) return String(reward.elementKey);
    const element = normalizeText(reward.element || "");
    if (!element) return "";
    const list = getScrollTypesList();
    const match = list.find((entry) =>
        normalizeText(entry.key) === element || normalizeText(entry.label) === element
    );
    if (match && match.key) return match.key;
    return REWARD_ELEMENT_MAP[element] || "";
}

function buildScrollItemKey(item) {
    const sourceIndex = resolveSourceIndex(item);
    if (Number.isFinite(sourceIndex) && sourceIndex >= 0) {
        return `idx:${sourceIndex}`;
    }
    const name = item?.name ? normalizeText(item.name) : "";
    if (name) {
        return `name:${name}`;
    }
    return "";
}

function buildScrollRewardEntry(reward) {
    if (!reward || !reward.name) return null;
    const helper = window.astoriaItemTags;
    if (helper?.isScrollItem && !helper.isScrollItem(reward)) return null;
    if (!helper?.isScrollItem && !shouldRandomizeElement(reward.name)) return null;
    const item = resolveItemByName(reward.name) || { name: reward.name };
    const category = helper?.getScrollCategory ? helper.getScrollCategory(item) : null;
    if (!category) return null;
    const typeKey = getScrollTypeKeyForReward(reward);
    if (!typeKey) return null;
    const qty = Math.max(0, Math.floor(Number(reward.qty) || 0));
    if (!qty) return null;
    const itemKey = buildScrollItemKey(item);
    if (!itemKey) return null;
    return { category, itemKey, typeKey, qty };
}

function buildParticipant(label, id) {
    const safeLabel = String(label || "Invite");
    const key = id ? `id:${id}` : `name:${normalize(safeLabel)}`;
    return { key, label: safeLabel, id: id || null };
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

function parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function loadStoredState() {
    try {
        const questsRaw = questStorage.getItem(QUEST_STORAGE_KEY);
        const historyRaw = questStorage.getItem(QUEST_HISTORY_STORAGE_KEY);
        const quests = questsRaw ? JSON.parse(questsRaw) : null;
        const history = historyRaw ? JSON.parse(historyRaw) : null;
        if (Array.isArray(quests) && quests.length) {
            state.quests = quests.map((quest) => ({
                ...quest,
                participants: Array.isArray(quest.participants)
                    ? Array.from(new Map(quest.participants.map((entry) => [entry.key, entry])).values())
                    : []
            }));
        }
        if (Array.isArray(history)) {
            state.history = history;
        }
    } catch (error) {
        console.warn("[Quetes] Failed to load stored quests:", error);
    }
}

function persistState() {
    try {
        state.history = dedupeHistory(state.history);
        questStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(state.quests));
        questStorage.setItem(QUEST_HISTORY_STORAGE_KEY, JSON.stringify(state.history));
    } catch (error) {
        console.warn("[Quetes] Failed to persist quests:", error);
    }
}

function dedupeHistory(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const output = [];
    list.forEach((entry) => {
        const signature = entry?.id
            ? `id:${entry.id}`
            : `sig:${entry?.date}|${entry?.type}|${entry?.rank}|${entry?.name}|${entry?.gains}`;
        if (seen.has(signature)) return;
        seen.add(signature);
        output.push(entry);
    });
    return output;
}

function mapQuestRow(row) {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        rank: row.rank,
        status: row.status,
        repeatable: Boolean(row.repeatable),
        description: row.description || "",
        locations: parseJsonArray(row.locations),
        rewards: parseJsonArray(row.rewards),
        images: parseJsonArray(row.images),
        participants: parseJsonArray(row.participants),
        maxParticipants: Number(row.max_participants) || 1,
        completedBy: parseJsonArray(row.completed_by)
    };
}

function mapHistoryRow(row) {
    return {
        id: row.id,
        date: row.date,
        type: row.type,
        rank: row.rank,
        name: row.name,
        gains: row.gains
    };
}

async function loadQuestsFromDb() {
    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from(QUESTS_TABLE)
            .select("*")
            .order("created_at", { ascending: true });
        if (error) throw error;
        if (Array.isArray(data) && data.length) {
            state.quests = data.map(mapQuestRow);
            return true;
        }
    } catch (error) {
        console.warn("[Quetes] Failed to load quests from DB:", error);
    }
    return false;
}

async function loadHistoryFromDb() {
    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from(QUEST_HISTORY_TABLE)
            .select("*")
            .order("date", { ascending: false });
        if (error) throw error;
        if (Array.isArray(data) && data.length) {
            state.history = dedupeHistory(data.map(mapHistoryRow));
            return true;
        }
    } catch (error) {
        console.warn("[Quetes] Failed to load history from DB:", error);
    }
    return false;
}

async function upsertQuestToDb(quest) {
    if (!quest) return;
    try {
        const supabase = await getSupabaseClient();
        const payload = {
            id: quest.id,
            name: quest.name,
            type: quest.type,
            rank: quest.rank,
            status: quest.status,
            repeatable: quest.repeatable,
            description: quest.description,
            locations: quest.locations,
            rewards: quest.rewards,
            images: quest.images,
            participants: quest.participants,
            max_participants: quest.maxParticipants,
            completed_by: quest.completedBy
        };
        const { error } = await supabase
            .from(QUESTS_TABLE)
            .upsert([payload], { onConflict: "id" });
        if (error) throw error;
        return true;
    } catch (error) {
        console.warn("[Quetes] Failed to upsert quest:", error);
    }
    return false;
}

async function deleteQuestFromDb(questId) {
    if (!questId) return;
    try {
        const supabase = await getSupabaseClient();
        const { error } = await supabase
            .from(QUESTS_TABLE)
            .delete()
            .eq("id", questId);
        if (error) throw error;
    } catch (error) {
        console.warn("[Quetes] Failed to delete quest:", error);
    }
}

async function insertHistoryToDb(entry) {
    if (!entry) return;
    if (entry.synced) return;
    try {
        const supabase = await getSupabaseClient();
        const payload = {
            id: entry.id,
            date: entry.date,
            type: entry.type,
            rank: entry.rank,
            name: entry.name,
            gains: entry.gains
        };
        const { error } = await supabase
            .from(QUEST_HISTORY_TABLE)
            .upsert([payload], { onConflict: "id" });
        if (error) throw error;
        entry.synced = true;
    } catch (error) {
        console.warn("[Quetes] Failed to insert history:", error);
    }
}

async function syncLocalItemsToDb() {
    if (!state.isAdmin) return;
    const localItems = (typeof inventoryData !== "undefined" && Array.isArray(inventoryData))
        ? inventoryData
        : (Array.isArray(window.inventoryData) ? window.inventoryData : []);
    if (!localItems.length) return;

    try {
        const supabase = await getSupabaseClient();
        const dbItems = await getAllItems();
        const dbNames = new Set(dbItems.map((item) => normalizeText(item?.name)));

        const payload = localItems
            .filter((item) => item?.name)
            .filter((item) => !dbNames.has(normalizeText(item.name)))
            .map((item) => ({
                name: item.name,
                description: item.description || "",
                effect: item.effect || "",
                category: String(item.category || "").toLowerCase(),
                price_po: item.sellPrice || null,
                price_pa: item.buyPrice || null,
                images: item.image ? { primary: item.image } : null
            }));

        if (!payload.length) return;
        let { error } = await supabase.from("items").insert(payload);
        if (error) {
            const fallback = payload.map(({ name, description, effect, category }) => ({
                name,
                description,
                effect,
                category
            }));
            ({ error } = await supabase.from("items").insert(fallback));
        }
        if (error) throw error;
    } catch (error) {
        console.warn("[Quetes] Local items sync failed:", error);
    }
}

function resolveParticipantId(participant) {
    if (!participant) return null;
    if (participant.id) return participant.id;
    const key = String(participant.key || "");
    if (key.startsWith("id:")) {
        return key.slice(3);
    }
    return null;
}

async function loadItemCatalog() {
    const base = (typeof inventoryData !== "undefined" && Array.isArray(inventoryData))
        ? inventoryData
        : (Array.isArray(window.inventoryData) ? window.inventoryData : []);
    state.items = Array.isArray(base) ? base.map((item) => ({ ...item })) : [];

    if (typeof getAllItems !== "function") return;
    try {
        const rows = await getAllItems();
        if (!Array.isArray(rows) || rows.length === 0) return;
        rows.forEach((row) => {
            const name = String(row?.name || "").trim();
            if (!name) return;
            const existing = state.items.find((item) => normalizeText(item?.name) === normalizeText(name));
            if (existing) {
                existing.id = row.id ?? existing.id;
                existing.images = row.images ?? existing.images;
                return;
            }
            state.items.push({
                id: row.id,
                name,
                category: row.category,
                rarity: row.rarity,
                description: row.description,
                effect: row.effect,
                buyPrice: row.price_po,
                sellPrice: row.price_pa,
                images: row.images
            });
        });
    } catch (error) {
        console.warn("[Quetes] Items load failed:", error);
    }
}

function resolveItemImage(item) {
    if (!item) return "";
    if (typeof item.image === "string") return item.image;
    if (Array.isArray(item.images) && item.images.length) return item.images[0];
    return "";
}

function ensureKaelsItem() {
    const existing = state.items.find((item) => normalizeText(item?.name) === "kaels");
    if (existing) return;
    state.items.push({
        id: "kaels",
        name: "Kaels",
        category: "Monnaie",
        description: "Monnaie d'Astoria.",
        effect: "",
        images: []
    });
}

function getRewardItems() {
    ensureKaelsItem();
    return state.items
        .slice()
        .filter((item) => item?.name)
        .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "fr"));
}

function setRewardTriggerLabel(name) {
    if (!dom.rewardTrigger) return;
    const label = name || "S\u00E9lectionner un objet";
    dom.rewardTrigger.textContent = label;
    dom.rewardTrigger.title = label;
}

function renderRewardTooltip(item) {
    if (!dom.rewardTooltip) return;
    if (!item || normalizeText(item?.name) === "kaels") {
        dom.rewardTooltip.classList.add("is-empty");
        dom.rewardTooltip.textContent = "Survole un objet pour voir son apercu.";
        return;
    }
    dom.rewardTooltip.classList.remove("is-empty");
    const image = resolveItemImage(item);
    const description = sanitizeText(item.description || item.effect || "Pas de description disponible.");
    const meta = buildRewardMeta(item);
    const metaLine = meta.length ? `<div class="quest-reward-tooltip-meta">${escapeHtml(meta.join(" | "))}</div>` : "";
    dom.rewardTooltip.innerHTML = `
        <div class="quest-reward-tooltip-media">
            ${image
                ? `<img src="${escapeHtml(image)}" alt="Apercu ${escapeHtml(item.name)}">`
                : `<div class="quest-reward-tooltip-thumb">${escapeHtml(getRewardInitial(item))}</div>`}
        </div>
        <div class="quest-reward-tooltip-body">
            <div class="quest-reward-tooltip-title">${escapeHtml(item.name)}</div>
            ${metaLine}
            <div class="quest-reward-tooltip-desc">${escapeHtml(description)}</div>
        </div>
    `;
    dom.rewardTooltip.scrollTop = 0;
}

function renderRewardMenu(items) {
    if (!dom.rewardOptions) return;
    dom.rewardOptions.innerHTML = "";
    items.forEach((item) => {
        const option = document.createElement("div");
        option.className = "quest-reward-option";
        option.setAttribute("role", "option");
        option.dataset.rewardName = item.name;
        option.title = item.name;

        const thumb = document.createElement("span");
        thumb.className = "quest-reward-option-thumb";
        const image = resolveItemImage(item);
        if (image) {
            const img = document.createElement("img");
            img.src = image;
            img.alt = item.name;
            img.loading = "lazy";
            img.decoding = "async";
            thumb.appendChild(img);
        } else {
            thumb.textContent = getRewardInitial(item);
        }

        const info = document.createElement("span");
        info.className = "quest-reward-option-info";
        const title = document.createElement("span");
        title.className = "quest-reward-option-title";
        title.textContent = item.name;
        info.appendChild(title);

        const category = formatCategory(item.category);
        if (category) {
            const meta = document.createElement("span");
            meta.className = "quest-reward-option-meta";
            meta.textContent = category;
            info.appendChild(meta);
        }

        option.append(thumb, info);
        dom.rewardOptions.appendChild(option);
    });
    renderRewardTooltip(null);
}

function populateRewardSelect() {
    if (!dom.rewardSelect) return;
    const items = getRewardItems();
    dom.rewardSelect.value = "";
    renderRewardMenu(items);
    setRewardTriggerLabel("");
    updateRewardPreview();
}
function updateRewardPreview() {
    if (!dom.rewardPreview) return;
    const selectedName = dom.rewardSelect?.value || "";
    const item = resolveItemByName(selectedName);
    if (!item) {
        dom.rewardPreview.classList.add("empty");
        dom.rewardPreview.innerHTML = "S\u00E9lectionne un objet pour voir son aper\u00E7u.";
        return;
    }
    dom.rewardPreview.classList.remove("empty");
    const image = resolveItemImage(item);
    const description = sanitizeText(item.description || item.effect || "Pas de description disponible.");
    const category = formatCategory(item.category);
    const metaLine = category ? `<div class="quest-reward-preview-meta">${escapeHtml(category)}</div>` : "";
    dom.rewardPreview.innerHTML = `
        ${image
            ? `<img src="${escapeHtml(image)}" alt="Aper\u00E7u ${escapeHtml(item.name)}">`
            : `<div class="quest-reward-preview-thumb">${escapeHtml(getRewardInitial(item))}</div>`}
        <div class="quest-reward-preview-body">
            <div class="quest-reward-preview-title">${escapeHtml(item.name)}</div>
            ${metaLine}
            <div class="quest-reward-preview-desc">${escapeHtml(description)}</div>
        </div>
    `;
}
function updateRewardMenuActive(name) {
    if (!dom.rewardOptions) return;
    const activeKey = normalizeText(name);
    dom.rewardOptions.querySelectorAll(".quest-reward-option").forEach((option) => {
        const isActive = normalizeText(option.dataset.rewardName) === activeKey && activeKey;
        option.classList.toggle("is-active", Boolean(isActive));
    });
}

function openRewardPopover() {
    if (!dom.rewardPopover) return;
    dom.rewardPopover.hidden = false;
    dom.rewardTrigger?.setAttribute("aria-expanded", "true");
    const selected = resolveItemByName(dom.rewardSelect?.value || "");
    updateRewardMenuActive(dom.rewardSelect?.value || "");
    renderRewardTooltip(selected || null);
}

function closeRewardPopover() {
    if (!dom.rewardPopover) return;
    dom.rewardPopover.hidden = true;
    dom.rewardTrigger?.setAttribute("aria-expanded", "false");
}

function toggleRewardPopover() {
    if (!dom.rewardPopover) return;
    if (dom.rewardPopover.hidden) {
        openRewardPopover();
    } else {
        closeRewardPopover();
    }
}

function selectRewardItem(name) {
    if (!dom.rewardSelect) return;
    dom.rewardSelect.value = name || "";
    setRewardTriggerLabel(name);
    updateRewardPreview();
    updateRewardMenuActive(name);
    closeRewardPopover();
}

function resolveItemByName(name) {
    const key = normalizeText(name);
    if (!key) return null;
    const direct = state.items.find((item) => normalizeText(item?.name) === key);
    return direct || null;
}

function resolveSourceIndex(item) {
    if (!item) return null;
    const direct = Number(item.sourceIndex);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    const idx = state.items.findIndex((entry) => entry && entry.name === item.name);
    return idx >= 0 ? idx : null;
}

async function getInventoryCache(characterId) {
    if (state.inventoryCache.has(characterId)) {
        return state.inventoryCache.get(characterId);
    }
    try {
        const rows = await getInventoryRows(characterId);
        state.inventoryCache.set(characterId, rows);
        return rows;
    } catch (error) {
        console.warn("[Quetes] Inventory load failed:", error);
        return null;
    }
}

async function applyInventoryDelta(characterId, itemName, delta) {
    const safeDelta = Math.trunc(Number(delta) || 0);
    if (!characterId || !safeDelta) return false;
    const rows = await getInventoryCache(characterId);
    if (!Array.isArray(rows)) return false;

    const item = resolveItemByName(itemName) || { name: itemName };
    const sourceIndex = resolveSourceIndex(item);
    const normalized = normalizeText(itemName);
    const entry = rows.find((row) =>
        normalizeText(row?.item_key) === normalized ||
        normalizeText(row?.name) === normalized
    ) || null;
    const currentQty = entry ? Math.floor(Number(entry?.qty) || 0) : 0;
    const nextQty = currentQty + safeDelta;
    if (nextQty < 0) return false;

    const itemKey = item?.name ? String(item.name) : String(itemName || "");
    try {
        const updated = await setInventoryItem(characterId, itemKey, sourceIndex, nextQty);
        if (entry) {
            entry.qty = nextQty;
            entry.item_key = itemKey;
            entry.item_index = Number.isFinite(Number(sourceIndex)) ? Number(sourceIndex) : entry.item_index;
        } else if (updated) {
            rows.push({
                id: updated.id,
                item_key: updated.item_key,
                item_index: updated.item_index,
                qty: updated.qty
            });
        }
        return true;
    } catch (error) {
        console.warn("[Quetes] Inventory update failed:", error);
        return false;
    }
}

async function applyKaelsDelta(characterId, delta) {
    const safeDelta = Math.trunc(Number(delta) || 0);
    if (!characterId || !safeDelta) return false;
    let current = null;
    const active = getActiveCharacter?.();
    if (active && active.id === characterId && Number.isFinite(active.kaels)) {
        current = Number(active.kaels);
    }
    if (!Number.isFinite(current)) {
        const row = await getCharacterById(characterId);
        current = Number(row?.kaels);
    }
    if (!Number.isFinite(current)) {
        current = 0;
    }
    const next = current + safeDelta;
    if (next < 0) return false;
    const result = await updateCharacter(characterId, { kaels: next });
    if (result?.success && active && active.id === characterId) {
        document.dispatchEvent(new CustomEvent("astoria:character-updated", { detail: { kaels: next } }));
    }
    return Boolean(result?.success);
}

async function applyScrollTypeRewards(characterId, entries) {
    if (!characterId || !Array.isArray(entries) || entries.length === 0) return false;
    let profileData = null;
    const active = getActiveCharacter?.();
    if (active && active.id === characterId && active.profile_data) {
        profileData = active.profile_data;
    }
    if (!profileData) {
        const row = await getCharacterById(characterId);
        profileData = row?.profile_data || null;
    }

    const nextProfile = profileData && typeof profileData === "object" ? { ...profileData } : {};
    const inventory = { ...(nextProfile.inventory || {}) };
    const scrollTypes = { ...(inventory.scrollTypes || {}) };
    let updated = false;

    entries.forEach((entry) => {
        if (!entry || !entry.category || !entry.itemKey || !entry.typeKey || !entry.qty) return;
        const bucket = { ...(scrollTypes[entry.category] || {}) };
        const currentEntry = bucket[entry.itemKey] || {};
        const counts = { ...(currentEntry.counts || {}) };
        const current = Number(counts[entry.typeKey]) || 0;
        counts[entry.typeKey] = current + entry.qty;
        bucket[entry.itemKey] = { counts, updatedAt: Date.now() };
        scrollTypes[entry.category] = bucket;
        updated = true;
    });

    if (!updated) return false;
    inventory.scrollTypes = scrollTypes;
    nextProfile.inventory = inventory;

    const result = await updateCharacter(characterId, { profile_data: nextProfile });
    if (result?.success && active && active.id === characterId) {
        document.dispatchEvent(new CustomEvent("astoria:character-updated", { detail: { profile_data: nextProfile } }));
    }
    return Boolean(result?.success);
}

async function applyRewardsToParticipants(quest) {
    if (!quest || !Array.isArray(quest.rewards) || quest.rewards.length === 0) return;
    quest.rewards.forEach((reward) => ensureRewardElement(reward));
    for (const participant of quest.participants) {
        const characterId = resolveParticipantId(participant);
        if (!characterId) continue;
        const scrollEntries = [];
        for (const reward of quest.rewards) {
            const rewardName = String(reward?.name || "").trim();
            if (!rewardName) continue;
            if (normalizeText(rewardName) === "kaels") {
                await applyKaelsDelta(characterId, reward.qty || 0);
                continue;
            }
            const updated = await applyInventoryDelta(characterId, rewardName, reward.qty || 0);
            if (updated) {
                const entry = buildScrollRewardEntry(reward);
                if (entry) scrollEntries.push(entry);
            }
        }
        if (scrollEntries.length) {
            await applyScrollTypeRewards(characterId, scrollEntries);
        }
    }
}

function syncStatusDots(value) {
    if (!dom.statusDots.length) return;
    dom.statusDots.forEach((dot) => {
        dot.classList.toggle("is-active", dot.dataset.status === value);
    });
}

function seedData() {
    if (!state.quests.length) {
        state.quests = [
        {
            id: "quest-1",
            name: "Sauvetage",
            type: "Exp\u00E9dition",
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
            type: "Exp\u00E9dition",
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
    }

    if (!state.history.length) {
        state.history = [
        {
            id: "history-1",
            date: "14/01/2026 17:54",
            type: "Exp\u00E9dition",
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

    populateSelect(dom.typeInput, QUEST_TYPES, "S\u00E9lectionner (d\u00E9roulant)");
    populateSelect(dom.rankInput, QUEST_RANKS, "S\u00E9lectionner (d\u00E9roulant)");

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
    state.participant = resolveParticipant();
    const filtered = getFilteredQuests();
    dom.track.innerHTML = "";
    filtered.forEach((quest, index) => {
        const meta = getStatusMeta(quest.status);
        const joined = isParticipant(quest);
        const card = document.createElement("article");
        card.className = `quest-card${joined ? " is-joined" : ""}`;
        card.style.setProperty("--status-color", meta.color);
        card.style.setProperty("--delay", `${index * 120}ms`);
        const adminAction = state.isAdmin
            ? `<button class="quest-delete-btn" type="button" data-id="${escapeHtml(quest.id)}" aria-label="Supprimer la qu\u00EAte">&#128465;</button>`
            : "";
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
                    ${adminAction}
                </div>
                <div class="quest-card-participation">
                    ${joined ? "Vous participez" : "Non inscrit"}
                </div>
            </div>
        `;
        dom.track.appendChild(card);
    });

    dom.track.querySelectorAll(".quest-details-btn").forEach((btn) => {
        btn.addEventListener("click", () => openDetail(btn.dataset.id));
    });
    dom.track.querySelectorAll(".quest-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!state.isAdmin) return;
            const questId = btn.dataset.id;
            const quest = state.quests.find((item) => item.id === questId);
            if (!quest) return;
            if (!window.confirm(`Supprimer la qu\u00EAte "${quest.name}" ?`)) return;
            state.quests = state.quests.filter((item) => item.id !== questId);
            if (state.activeQuestId === questId) {
                closeModal(dom.detailModal);
                state.activeQuestId = null;
            }
            if (state.editor.questId === questId) {
                closeModal(dom.editorModal);
                state.editor.questId = null;
                state.editor.images = [];
                state.editor.rewards = [];
            }
            renderQuestList();
            persistState();
            await deleteQuestFromDb(questId);
        });
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
    dom.historyMeta.textContent = `${filtered.length} Qu\u00EAte${plural ? "s" : ""} ex\u00E9cut\u00E9e${plural ? "s" : ""}`;

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
    dom.detailModal.removeAttribute("inert");
}

function closeModal(modal) {
    if (!modal) return;
    const active = document.activeElement;
    if (active && modal.contains(active)) {
        active.blur();
    }
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
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
    quest.rewards.forEach((reward) => ensureRewardElement(reward));
    if (quest.rewards.length) {
        dom.detailRewards.innerHTML = quest.rewards
            .map((reward) => `<li>${escapeHtml(formatRewardLabel(reward))} x${reward.qty}</li>`)
            .join("");
    } else {
        dom.detailRewards.innerHTML = "<li>Aucune recompense</li>";
    }
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
        dom.mediaPrev.hidden = true;
        dom.mediaNext.hidden = true;
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
    const showControls = images.length > 1;
    dom.mediaPrev.hidden = !showControls;
    dom.mediaNext.hidden = !showControls;
}

function buildJoinNote(quest) {
    const participant = state.participant;
    if (!participant) {
        return "Selectionnez un personnage pour participer.";
    }
    if (!quest.repeatable && quest.completedBy.includes(participant.key)) {
        return "Qu\u00EAte d\u00E9j\u00E0 r\u00E9alis\u00E9e (non r\u00E9p\u00E9titive).";
    }
    if (quest.status === "locked") {
        return "Acces restreint par le staff.";
    }
    if (!isParticipant(quest) && quest.participants.length >= quest.maxParticipants) {
        return "Places compl\u00E8tes.";
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
        if (!isParticipant(quest)) {
            quest.participants.push(state.participant);
        }
    } else {
        quest.participants = quest.participants.filter((entry) => entry.key !== state.participant.key);
    }

    renderDetail(quest);
    renderQuestList();
    persistState();
    upsertQuestToDb(quest);
}

async function validateQuest() {
    if (!state.isAdmin) return;
    if (state.isValidating) return;
    state.isValidating = true;
    const questId = dom.editorModal.classList.contains("open") && state.editor.questId
        ? state.editor.questId
        : state.activeQuestId;
    const quest = state.quests.find((item) => item.id === questId);
    if (!quest) {
        state.isValidating = false;
        return;
    }

    const date = new Date().toLocaleString("fr-FR");
    quest.rewards.forEach((reward) => ensureRewardElement(reward));
    const gains = quest.rewards.map((reward) => `${formatRewardLabel(reward)} x${reward.qty}`).join(", ");

    state.history.unshift({
        id: `history-${Date.now()}`,
        date,
        type: quest.type,
        rank: quest.rank,
        name: quest.name,
        gains: gains || "Aucun gain"
    });

    await applyRewardsToParticipants(quest);

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
    persistState();
    await upsertQuestToDb(quest);
    await insertHistoryToDb(state.history[0]);
    state.isValidating = false;
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
    const styles = window.getComputedStyle(dom.viewport);
    const padLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const padRight = Number.parseFloat(styles.paddingRight) || 0;
    return Math.max(0, (dom.viewport.clientWidth || 0) - padLeft - padRight);
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
    state.editor.rewards = quest ? quest.rewards.map((reward) => ensureRewardElement(reward)) : [];
    dom.editorTitle.textContent = quest ? "Modifier la qu\u00EAte" : "Cr\u00E9ation de Qu\u00EAtes";

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
    if (dom.rewardSelect) {
        dom.rewardSelect.value = "";
        setRewardTriggerLabel("");
        updateRewardPreview();
        renderRewardTooltip(null);
    }

    renderEditorLists();
    dom.editorModal.classList.add("open");
    dom.editorModal.setAttribute("aria-hidden", "false");
    dom.editorModal.removeAttribute("inert");
}

function renderEditorLists() {
    dom.imagesList.innerHTML = state.editor.images.map((src, idx) => `
        <div class="quest-editor-item">
            <span>${escapeHtml(src)}</span>
            <button type="button" data-remove-image="${idx}">Retirer</button>
        </div>
    `).join("");

    dom.rewardsList.innerHTML = state.editor.rewards.map((reward, idx) => {
        const item = resolveItemByName(reward.name);
        const label = formatRewardLabel(reward);
        const tooltipParts = [];
        if (item?.description) tooltipParts.push(item.description);
        if (reward.element) tooltipParts.push(`Element: ${reward.element}`);
        const tooltip = tooltipParts.length ? ` data-tooltip="${escapeHtml(tooltipParts.join(" | "))}"` : "";
        return `
        <div class="quest-editor-item"${tooltip}>
            <span>${escapeHtml(label)} x${reward.qty}</span>
            <button type="button" data-remove-reward="${idx}">Retirer</button>
        </div>
        `;
    }).join("");

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

async function handleEditorSubmit(event) {
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
        rewards: state.editor.rewards.length ? state.editor.rewards : [],
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
    persistState();
    const saved = await upsertQuestToDb(questData);
    if (!saved && questStorage.mode === "memory") {
        console.warn("[Quetes] Quest saved in memory only (storage blocked).");
    }
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

function destroyCropper(keepPreview = false) {
    if (state.cropper.instance) {
        state.cropper.instance.destroy();
        state.cropper.instance = null;
    }
    if (!keepPreview && state.cropper.previewUrl) {
        URL.revokeObjectURL(state.cropper.previewUrl);
        state.cropper.previewUrl = "";
    }
}

function closeCropper(resetInput = true) {
    if (dom.cropperBackdrop) {
        dom.cropperBackdrop.classList.remove("open");
        dom.cropperBackdrop.setAttribute("aria-hidden", "true");
    }
    destroyCropper();
    if (resetInput && dom.imageFileInput) {
        dom.imageFileInput.value = "";
    }
    state.cropper.pendingFile = null;
}

function openCropper(file) {
    if (!dom.cropperBackdrop || !dom.cropperImage || !window.Cropper) {
        console.warn("[Quetes] Cropper unavailable, falling back to raw image.");
        const reader = new FileReader();
        reader.onload = () => {
            const src = String(reader.result || "");
            if (src) {
                state.editor.images.push(src);
                renderEditorLists();
            }
        };
        reader.readAsDataURL(file);
        return;
    }
    destroyCropper();
    state.cropper.pendingFile = file;
    state.cropper.previewUrl = URL.createObjectURL(file);
    dom.cropperImage.src = state.cropper.previewUrl;
    dom.cropperBackdrop.classList.add("open");
    dom.cropperBackdrop.setAttribute("aria-hidden", "false");
    state.cropper.instance = new Cropper(dom.cropperImage, {
        viewMode: 1,
        aspectRatio: 1,
        background: false,
        autoCropArea: 1,
        movable: true,
        zoomable: true,
        guides: false,
        ready() {
            if (dom.cropperZoom) {
                dom.cropperZoom.value = 1;
            }
        },
        zoom(event) {
            if (!dom.cropperZoom) return;
            dom.cropperZoom.value = event.detail.ratio.toFixed(2);
        }
    });
}

async function applyCropper() {
    if (!state.cropper.instance) {
        closeCropper();
        return;
    }
    const canvas = state.cropper.instance.getCroppedCanvas({
        width: 512,
        height: 512,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high"
    });
    const dataUrl = canvas?.toDataURL("image/png");
    if (dataUrl) {
        state.editor.images.push(dataUrl);
        renderEditorLists();
    }
    closeCropper(false);
}

function handleImageFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    openCropper(file);
}

function handleAddReward() {
    const name = dom.rewardSelect?.value || "";
    const qty = Math.max(1, Number(dom.rewardQtyInput.value) || 1);
    if (!name) return;
    state.editor.rewards.push(ensureRewardElement({ name, qty }));
    if (dom.rewardSelect) {
        dom.rewardSelect.value = "";
        setRewardTriggerLabel("");
        updateRewardPreview();
        renderRewardTooltip(null);
    }
    dom.rewardQtyInput.value = "1";
    renderEditorLists();
}

function bindEditorListEvents() {
    if (!dom.editorModal) return;
    dom.editorModal.addEventListener("click", (event) => {
        const removeImageBtn = event.target.closest("[data-remove-image]");
        if (removeImageBtn) {
            const idx = Number(removeImageBtn.dataset.removeImage);
            if (Number.isFinite(idx)) {
                state.editor.images.splice(idx, 1);
                renderEditorLists();
            }
            return;
        }
        const removeRewardBtn = event.target.closest("[data-remove-reward]");
        if (removeRewardBtn) {
            const idx = Number(removeRewardBtn.dataset.removeReward);
            if (Number.isFinite(idx)) {
                state.editor.rewards.splice(idx, 1);
                renderEditorLists();
            }
        }
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
        scrollCarousel(-1, 1);
    });
    dom.nextBtn.addEventListener("click", () => {
        scrollCarousel(1, 1);
    });
    window.addEventListener("keydown", (event) => {
        if (event.defaultPrevented) return;
        if (isEditableTarget(event.target)) return;
        if (dom.detailModal.classList.contains("open")) return;
        if (!isCarouselFocused()) return;
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollCarousel(-1, 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollCarousel(1, 1);
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
    dom.rewardTrigger?.addEventListener("click", (event) => {
        event.preventDefault();
        toggleRewardPopover();
    });
    dom.rewardOptions?.addEventListener("click", (event) => {
        const option = event.target.closest(".quest-reward-option");
        if (!option) return;
        selectRewardItem(option.dataset.rewardName);
    });
    dom.rewardOptions?.addEventListener("pointerover", (event) => {
        const option = event.target.closest(".quest-reward-option");
        if (!option) return;
        const item = resolveItemByName(option.dataset.rewardName);
        renderRewardTooltip(item);
    });
    dom.rewardOptions?.addEventListener("pointerleave", () => {
        const selected = resolveItemByName(dom.rewardSelect?.value || "");
        renderRewardTooltip(selected || null);
    });
    document.addEventListener("click", (event) => {
        if (!dom.rewardPicker || !dom.rewardPopover || dom.rewardPopover.hidden) return;
        if (!dom.rewardPicker.contains(event.target)) {
            closeRewardPopover();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeRewardPopover();
        }
    });
    dom.cropperClose?.addEventListener("click", () => closeCropper());
    dom.cropperCancel?.addEventListener("click", () => closeCropper());
    dom.cropperConfirm?.addEventListener("click", () => applyCropper());
    dom.cropperZoom?.addEventListener("input", () => {
        if (!state.cropper.instance) return;
        const value = Number(dom.cropperZoom.value);
        if (Number.isFinite(value)) {
            state.cropper.instance.zoomTo(value);
        }
    });
    bindEditorListEvents();
    bindCarouselDrag();
    bindMediaDrag();
    dom.track.addEventListener("pointerdown", () => {
        dom.track.focus();
    });
    dom.cropperBackdrop?.addEventListener("click", (event) => {
        if (event.target === dom.cropperBackdrop) {
            closeCropper();
        }
    });
}

async function initQuestPanelShortcuts() {
    try {
        const panelShortcuts = await import("./ui/panel-shortcuts.js");
        if (typeof panelShortcuts.initPanelShortcuts === "function") {
            panelShortcuts.initPanelShortcuts({
                selector: ".quest-page [data-panel]"
            });
        }
    } catch (error) {
        console.warn("[Quetes] Panel shortcuts failed:", error);
    }
}

async function init() {
    await refreshSessionUser?.();
    await initCharacterSummary({ enableDropdown: true, showKaels: true });
    state.isAdmin = Boolean(isAdmin?.());
    state.participant = resolveParticipant();

    const dbLoaded = await loadQuestsFromDb();
    const historyLoaded = await loadHistoryFromDb();
    if (!dbLoaded || !historyLoaded) {
        loadStoredState();
    }
    await loadItemCatalog();
    populateRewardSelect();
    seedData();
    state.history = dedupeHistory(state.history);
    fillFilters();
    syncAdminUI();
    bindEvents();
    await initQuestPanelShortcuts();
    renderQuestList();
    renderHistory();
    syncLocalItemsToDb();
}

init();







