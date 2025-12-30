const RARITY_ORDER = ["commun", "rare", "epique", "mythique", "legendaire"];
const RARITY_LABELS = {
    commun: "Commun",
    rare: "Rare",
    epique: "Épique",
    mythique: "Mythique",
    legendaire: "Légendaire"
};
const RARITY_COSTS = {
    commun: 45,
    rare: 60,
    epique: 100,
    mythique: 150
};
const BASE_CAPS = {
    commun: 5,
    rare: 10,
    epique: 20,
    mythique: 30,
    legendaire: 45
};
const UPGRADE_STEPS = {
    commun: 5,
    rare: 5,
    epique: 5,
    mythique: 6,
    legendaire: 10
};

const LUCKY_SOUL_ITEM = {
    key: "Lucky Soul",
    aliases: ["lucky_soul"],
    name: "Lucky Soul",
    image: "assets/nokorah/lucky-soul.svg",
    category: "consommable",
    description: "Ressource rare consommée pour invoquer et évoluer un Nokorah."
};

const PRESET_APPEARANCES = [
    { id: "sprout", label: "Sprout", src: "assets/nokorah/silhouette-1.svg" },
    { id: "puff", label: "Puff", src: "assets/nokorah/silhouette-2.svg" },
    { id: "bloom", label: "Bloom", src: "assets/nokorah/silhouette-3.svg" },
    { id: "glow", label: "Glow", src: "assets/nokorah/silhouette-4.svg" },
    { id: "twirl", label: "Twirl", src: "assets/nokorah/silhouette-5.svg" },
    { id: "spark", label: "Spark", src: "assets/nokorah/silhouette-6.svg" }
];

const MIN_FAREWELL_LENGTH = 80;

const dom = {
    invokeModal: null,
    invokeName: null,
    invokeGrid: null,
    invokeUpload: null,
    invokeCancel: null,
    invokeConfirm: null,
    farewellModal: null,
    farewellText: null,
    farewellCount: null,
    farewellCancel: null,
    farewellConfirm: null,
    appearanceModal: null,
    appearanceGrid: null,
    appearanceUpload: null,
    appearanceCancel: null,
    appearanceConfirm: null
};

const state = {
    luckySoulCount: 0,
    active: null,
    rarity: "commun",
    bonuses: [],
    upgradeLevel: 0,
    skills: [],
    inventory: null,
    storageKeys: null,
    nokorahService: null,
    characterId: null,
    mode: 'local', // 'local' or 'supabase'
    selectedAppearance: PRESET_APPEARANCES[0],
    uploadDataUrl: ""
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getCharacterKey() {
    const rawActive = localStorage.getItem("astoria_active_character");
    if (rawActive) {
        try {
            const parsed = JSON.parse(rawActive);
            if (parsed && parsed.id) return String(parsed.id);
        } catch {
            // ignore
        }
    }
    const rawLegacy = localStorage.getItem("astoria_character_summary");
    if (rawLegacy) {
        try {
            const parsed = JSON.parse(rawLegacy);
            if (parsed && parsed.id) return String(parsed.id);
        } catch {
            // ignore
        }
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("character") || "default";
}

function buildStorageKeys() {
    const suffix = getCharacterKey();
    return {
        active: `nokorahActive:${suffix}`,
        rarity: `nokorahRarity:${suffix}`,
        bonuses: `nokorahBonuses:${suffix}`,
        upgrade: `nokorahUpgradeLevel:${suffix}`
    };
}

async function loadState() {
    state.storageKeys = buildStorageKeys();

    // Try to load from Supabase first if we have service and characterId
    if (state.mode === 'supabase' && state.nokorahService && state.characterId) {
        try {
            const data = await state.nokorahService.getNokorahByCharacterId(state.characterId);
            if (data) {
                state.active = {
                    name: data.name,
                    rarity: data.rarity,
                    appearanceId: data.appearance_id,
                    appearanceSrc: data.appearance_src,
                    statusLabel: data.status_label,
                    isAccessory: data.is_accessory,
                    effectsAdmin: data.effects_admin || '',
                    rainbowFrame: data.rainbow_frame
                };
                state.rarity = data.rarity;
                state.bonuses = data.bonuses || [];
                state.upgradeLevel = data.upgrade_level || 0;

                // Also cache to localStorage
                writeJson(state.storageKeys.active, state.active);
                writeJson(state.storageKeys.rarity, state.rarity);
                writeJson(state.storageKeys.bonuses, state.bonuses);
                writeJson(state.storageKeys.upgrade, state.upgradeLevel);
                return;
            }
        } catch (error) {
            // Fallback to localStorage on error
        }
    }

    // Fallback to localStorage
    state.active = readJson(state.storageKeys.active, null);
    state.rarity = readJson(state.storageKeys.rarity, state.active?.rarity || "commun");
    state.bonuses = readJson(state.storageKeys.bonuses, []);
    state.upgradeLevel = Number(readJson(state.storageKeys.upgrade, 0)) || 0;

    if (!state.active) {
        state.rarity = "commun";
        state.bonuses = [];
        state.upgradeLevel = 0;
    }
}

async function saveState() {
    // Always save to localStorage as cache
    writeJson(state.storageKeys.active, state.active);
    writeJson(state.storageKeys.rarity, state.rarity);
    writeJson(state.storageKeys.bonuses, state.bonuses);
    writeJson(state.storageKeys.upgrade, state.upgradeLevel);

    // Save to Supabase if available
    if (state.mode === 'supabase' && state.nokorahService && state.characterId) {
        try {
            if (state.active) {
                await state.nokorahService.upsertNokorah(state.characterId, {
                    name: state.active.name,
                    appearanceId: state.active.appearanceId,
                    appearanceSrc: state.active.appearanceSrc,
                    rarity: state.rarity,
                    upgradeLevel: state.upgradeLevel,
                    bonuses: state.bonuses,
                    statusLabel: state.active.statusLabel,
                    isAccessory: state.active.isAccessory,
                    rainbowFrame: state.active.rainbowFrame,
                    effectsAdmin: state.active.effectsAdmin || ''
                });
            } else {
                // Nokorah was abandoned - delete from Supabase
                await state.nokorahService.deleteNokorah(state.characterId);
            }
        } catch (error) {
            // Silent fail - localStorage is already saved
        }
    }
}

function slugify(input) {
    return String(input || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .toLowerCase();
}

function flattenSkills(categories) {
    const list = [];
    (categories || []).forEach((category) => {
        (category.skills || []).forEach((skill) => {
            if (!skill || !skill.name) return;
            const id = skill.id || slugify(skill.name);
            list.push({
                id,
                name: skill.name,
                category: category.label || category.id || ""
            });
        });
    });
    return list;
}

async function loadSkills() {
    try {
        const response = await fetch("data/skills.sample.json", { cache: "no-store" });
        if (response.ok) {
            const payload = await response.json();
            if (Array.isArray(payload.skills)) {
                return payload.skills;
            }
        }
    } catch {
        // ignore
    }

    if (Array.isArray(window.skillsCategories)) {
        return flattenSkills(window.skillsCategories);
    }
    return [];
}

function getMaxTotalPoints(rarity, upgradeLevel) {
    const base = BASE_CAPS[rarity] || 0;
    const step = UPGRADE_STEPS[rarity] || 0;
    return base + Math.max(0, upgradeLevel) * step;
}

function getTotalBonusPoints() {
    return state.bonuses.reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
}

function formatLuckySoul(value) {
    return `${Math.max(0, Number(value) || 0)}`;
}

function getUpgradeCost(level) {
    const safeLevel = Math.max(0, Number(level) || 0);
    return Math.round(25 + safeLevel * 15 + safeLevel * safeLevel * 2);
}

function getNextRarity(rarity) {
    const idx = RARITY_ORDER.indexOf(rarity);
    if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
    return RARITY_ORDER[idx + 1];
}

function openModal(node) {
    if (!node) return;
    node.classList.add("open");
}

function closeModal(node) {
    if (!node) return;
    node.classList.remove("open");
}

function buildBonusChips() {
    if (!state.bonuses.length) {
        return "<span class=\"helper\">Aucun bonus pour le moment.</span>";
    }
    return state.bonuses
        .map((bonus) => `<span class="bonus-chip">+${bonus.points} ${bonus.name}</span>`)
        .join("");
}

function buildAccessoryTag(active) {
    if (!active?.isAccessory) return "";
    return `<span class="status-badge accessory">Accessoire</span>
        <span class="helper">Aucun effet en combat</span>`;
}

function renderEmpty(root) {
    root.innerHTML = `
        <div class="nokorah-empty">
            <img src="assets/nokorah/silhouette-1.svg" alt="Silhouette Nokorah">
            <h3>Aucun Nokorah actuellement.</h3>
            <p>Invoque un petit esprit pour commencer l'aventure. La rareté initiale est toujours Commun.</p>
            <button class="action-buttons focus-outline" data-action="invoke">Invoquer un Nokorah <span>25 Lucky Soul</span></button>
        </div>
    `;

    const invokeBtn = root.querySelector("[data-action='invoke']");
    if (invokeBtn) {
        invokeBtn.addEventListener("click", () => openInvokeModal());
    }
}

function renderActive(root) {
    const active = state.active;
    const rarity = state.rarity || "commun";
    const totalPoints = getTotalBonusPoints();
    const maxPoints = getMaxTotalPoints(rarity, state.upgradeLevel);
    const nextRarity = getNextRarity(rarity);
    const upgradeCost = getUpgradeCost(state.upgradeLevel);
    const rarityCost = nextRarity ? RARITY_COSTS[rarity] : null;
    const rarityClass = `rarity-frame rarity-${rarity}${active?.rainbowFrame ? " rainbow" : ""}`;
    const badgeClass = `rarity-badge rarity-${rarity}${active?.rainbowFrame ? " rainbow" : ""}`;

    root.innerHTML = `
        <div class="nokorah-card">
            <div class="nokorah-card-media ${rarityClass}">
                <img src="${active?.appearanceSrc || PRESET_APPEARANCES[0].src}" alt="Portrait Nokorah">
            </div>
            <div>
                <div class="nokorah-card-header">
                    <div>
                        <h3 class="nokorah-name">${active?.name || "Nokorah"}</h3>
                        <div class="nokorah-meta">
                            <span class="${badgeClass}">${RARITY_LABELS[rarity]}</span>
                            <span class="status-badge">${active?.statusLabel || "Combat"}</span>
                            ${buildAccessoryTag(active)}
                        </div>
                    </div>
                    <div class="lucky-soul-meter">Lucky Soul: <strong>${formatLuckySoul(state.luckySoulCount)}</strong></div>
                </div>

                <div class="nokorah-section-block">
                    <h4>Bonus cumulés</h4>
                    <div class="bonus-chips">${buildBonusChips()}</div>
                    <div class="bonus-total">Total: ${totalPoints} / ${maxPoints} pts (niveau ${state.upgradeLevel})</div>
                </div>

                <div class="nokorah-section-block">
                    <h4>Effets (admin)</h4>
                    <div class="admin-effects">${active?.effectsAdmin || "Non révélé."}</div>
                </div>

                <div class="nokorah-actions">
                    <button class="action-buttons focus-outline" data-action="rarity" ${!nextRarity ? "disabled" : ""}>
                        Améliorer la rareté <span>${rarityCost ? `${rarityCost} Lucky Soul` : "Max"}</span>
                    </button>
                    <button class="action-buttons secondary focus-outline" data-action="stats">
                        Améliorer les stats <span>${upgradeCost} Lucky Soul</span>
                    </button>
                    <button class="action-buttons secondary focus-outline" data-action="appearance">
                        Changer l'apparence <span>Gratuit</span>
                    </button>
                    <button class="action-buttons danger focus-outline" data-action="abandon">
                        Abandonner mon Nokorah <span>100 Lucky Soul</span>
                    </button>
                    ${rarity === "legendaire" ? `
                        <label class="helper">
                            <input type="checkbox" id="legendaryRainbowToggle" ${active?.rainbowFrame ? "checked" : ""}>
                            Contour arc-en-ciel
                        </label>` : ""}
                </div>

                <div class="nokorah-roulette" aria-live="polite">
                    <div class="roulette-track">
                        <div class="roulette-card" data-roulette="0">?</div>
                        <div class="roulette-card" data-roulette="1">?</div>
                        <div class="roulette-card" data-roulette="2">?</div>
                    </div>
                    <div class="roulette-result" data-roulette-result>Résultat de la roulette affiché ici.</div>
                </div>
            </div>
        </div>
    `;

    const rarityBtn = root.querySelector("[data-action='rarity']");
    const statsBtn = root.querySelector("[data-action='stats']");
    const appearanceBtn = root.querySelector("[data-action='appearance']");
    const abandonBtn = root.querySelector("[data-action='abandon']");
    const rainbowToggle = root.querySelector("#legendaryRainbowToggle");

    if (rarityBtn) rarityBtn.addEventListener("click", handleRarityUpgrade);
    if (statsBtn) statsBtn.addEventListener("click", handleStatsUpgrade);
    if (appearanceBtn) appearanceBtn.addEventListener("click", openAppearanceModal);
    if (abandonBtn) abandonBtn.addEventListener("click", openFarewellModal);
    if (rainbowToggle) {
        rainbowToggle.addEventListener("change", async (event) => {
            state.active.rainbowFrame = event.target.checked;
            await saveState();
            renderAll();
        });
    }
}

function renderAll() {
    document.querySelectorAll("[data-nokorah-root]").forEach((root) => {
        if (!state.active) {
            renderEmpty(root);
        } else {
            renderActive(root);
        }
    });
}

async function refreshLuckySoul() {
    if (!state.inventory) return;
    state.luckySoulCount = await state.inventory.getCount();
}

async function ensureLuckySoul(cost) {
    const current = await state.inventory.getCount();
    if (current < cost) {
        alert(`Lucky Soul insuffisantes (${current}/${cost}).`);
        return false;
    }
    const ok = await state.inventory.applyDelta(-cost);
    if (!ok) {
        alert("Impossible de consommer les Lucky Soul pour le moment.");
        return false;
    }
    state.luckySoulCount = current - cost;
    return true;
}

function openInvokeModal() {
    state.selectedAppearance = PRESET_APPEARANCES[0];
    state.uploadDataUrl = "";
    dom.invokeName.value = "";
    dom.invokeUpload.value = "";

    dom.invokeGrid.innerHTML = PRESET_APPEARANCES.map((appearance) => `
        <div class="appearance-option ${appearance.id === state.selectedAppearance.id ? "selected" : ""}" data-id="${appearance.id}">
            <img src="${appearance.src}" alt="${appearance.label}">
            <div>${appearance.label}</div>
        </div>
    `).join("");

    dom.invokeGrid.querySelectorAll(".appearance-option").forEach((el) => {
        el.addEventListener("click", () => {
            const id = el.getAttribute("data-id");
            const next = PRESET_APPEARANCES.find((item) => item.id === id);
            if (!next) return;
            state.selectedAppearance = next;
            dom.invokeGrid.querySelectorAll(".appearance-option").forEach((card) => {
                card.classList.toggle("selected", card === el);
            });
        });
    });

    dom.invokeUpload.onchange = () => {
        const file = dom.invokeUpload.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            state.uploadDataUrl = String(reader.result || "");
        };
        reader.readAsDataURL(file);
    };

    openModal(dom.invokeModal);
}

async function confirmInvoke() {
    const ok = await ensureLuckySoul(25);
    if (!ok) return;

    const name = dom.invokeName.value.trim() || "Nokorah";
    state.active = {
        name,
        rarity: "commun",
        appearanceId: state.selectedAppearance.id,
        appearanceSrc: state.uploadDataUrl || state.selectedAppearance.src,
        statusLabel: "Combat",
        isAccessory: false,
        effectsAdmin: "",
        rainbowFrame: false
    };
    state.rarity = "commun";
    state.bonuses = [];
    state.upgradeLevel = 0;
    await saveState();
    closeModal(dom.invokeModal);
    renderAll();
}

function openAppearanceModal() {
    if (!state.active) return;
    let selected = PRESET_APPEARANCES.find((item) => item.id === state.active.appearanceId) || PRESET_APPEARANCES[0];
    let uploadDataUrl = "";
    dom.appearanceUpload.value = "";

    dom.appearanceGrid.innerHTML = PRESET_APPEARANCES.map((appearance) => `
        <div class="appearance-option ${appearance.id === selected.id ? "selected" : ""}" data-id="${appearance.id}">
            <img src="${appearance.src}" alt="${appearance.label}">
            <div>${appearance.label}</div>
        </div>
    `).join("");

    dom.appearanceGrid.querySelectorAll(".appearance-option").forEach((el) => {
        el.addEventListener("click", () => {
            const id = el.getAttribute("data-id");
            const next = PRESET_APPEARANCES.find((item) => item.id === id);
            if (!next) return;
            selected = next;
            dom.appearanceGrid.querySelectorAll(".appearance-option").forEach((card) => {
                card.classList.toggle("selected", card === el);
            });
        });
    });

    dom.appearanceUpload.onchange = () => {
        const file = dom.appearanceUpload.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            uploadDataUrl = String(reader.result || "");
        };
        reader.readAsDataURL(file);
    };

    dom.appearanceConfirm.onclick = async () => {
        state.active.appearanceId = selected.id;
        state.active.appearanceSrc = uploadDataUrl || selected.src;
        await saveState();
        closeModal(dom.appearanceModal);
        renderAll();
    };

    openModal(dom.appearanceModal);
}

async function handleRarityUpgrade() {
    const next = getNextRarity(state.rarity);
    if (!next) return;
    const cost = RARITY_COSTS[state.rarity];
    const ok = await ensureLuckySoul(cost);
    if (!ok) return;
    state.rarity = next;
    if (state.active) state.active.rarity = next;
    await saveState();
    renderAll();
}

async function handleStatsUpgrade() {
    if (!state.skills.length) {
        alert("Aucune compétence disponible pour la roulette.");
        return;
    }
    const nextLevel = state.upgradeLevel + 1;
    const maxTotal = getMaxTotalPoints(state.rarity, nextLevel);
    const currentTotal = getTotalBonusPoints();
    if (currentTotal >= maxTotal) {
        alert("Plafond de points atteint pour ce niveau.");
        return;
    }

    const cost = getUpgradeCost(state.upgradeLevel);
    const ok = await ensureLuckySoul(cost);
    if (!ok) return;

    const available = maxTotal - currentTotal;
    const pointsToAdd = Math.min(available, 1 + Math.floor(Math.random() * Math.min(3, available)));
    const results = [];

    for (let i = 0; i < pointsToAdd; i += 1) {
        const choice = state.skills[Math.floor(Math.random() * state.skills.length)];
        if (!choice) continue;
        const entry = state.bonuses.find((bonus) => bonus.skillId === choice.id);
        if (entry) {
            entry.points += 1;
        } else {
            state.bonuses.push({ skillId: choice.id, name: choice.name, points: 1 });
        }
        results.push(choice.name);
    }

    state.upgradeLevel = nextLevel;
    await saveState();
    renderAll();
    animateRoulette(results);
}

function animateRoulette(finalResults) {
    document.querySelectorAll("[data-nokorah-root]").forEach((root) => {
        const cards = Array.from(root.querySelectorAll("[data-roulette]"));
        const resultEl = root.querySelector("[data-roulette-result]");
        if (!cards.length || !resultEl) return;

        cards.forEach((card) => card.classList.add("is-rolling"));
        let tick = 0;
        const interval = setInterval(() => {
            cards.forEach((card) => {
                const skill = state.skills[Math.floor(Math.random() * state.skills.length)];
                card.textContent = skill ? skill.name : "?";
            });
            tick += 1;
            if (tick > 8) {
                clearInterval(interval);
                cards.forEach((card, index) => {
                    card.classList.remove("is-rolling");
                    card.textContent = finalResults[index] || finalResults[0] || "?";
                });
                resultEl.textContent = `Bonus obtenu : ${finalResults.map((name) => `+1 ${name}`).join(", ")}`;
            }
        }, 140);
    });
}

function openFarewellModal() {
    dom.farewellText.value = "";
    dom.farewellCount.textContent = `0 / ${MIN_FAREWELL_LENGTH}`;
    dom.farewellConfirm.disabled = true;
    openModal(dom.farewellModal);
}

async function confirmFarewell() {
    const length = dom.farewellText.value.trim().length;
    if (length < MIN_FAREWELL_LENGTH) return;
    const ok = await ensureLuckySoul(100);
    if (!ok) return;
    state.active = null;
    state.rarity = "commun";
    state.bonuses = [];
    state.upgradeLevel = 0;
    await saveState();
    closeModal(dom.farewellModal);
    renderAll();
}

async function buildNokorahAdapter() {
    try {
        const auth = await import('./auth.js');
        if (typeof auth.refreshSessionUser === 'function') {
            await auth.refreshSessionUser();
        }
        const character = auth.getActiveCharacter?.();
        if (character?.id) {
            // Import Nokorah service
            const nokorahService = await import('./api/nokorah-service.js');
            state.nokorahService = nokorahService;
            state.characterId = character.id;
            state.mode = 'supabase';
        } else {
            state.mode = 'local';
        }
    } catch (error) {
        state.mode = 'local';
    }
}

async function buildInventoryAdapter() {
    let mode = "local";
    let characterId = null;
    let inventoryApi = null;
    let auth = null;

    try {
        auth = await import("./auth.js");
        if (typeof auth.refreshSessionUser === "function") {
            await auth.refreshSessionUser();
        }
        const character = auth.getActiveCharacter?.();
        if (character?.id) {
            characterId = character.id;
            inventoryApi = await import("./api/inventory-service.js");
            mode = "character";
        }
    } catch {
        mode = "local";
    }

    async function loadLocalInventory() {
        const raw = localStorage.getItem("astoriaInventory");
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && Array.isArray(parsed.items)) return parsed.items;
        } catch {
            return [];
        }
        return [];
    }

    async function saveLocalInventory(items) {
        localStorage.setItem("astoriaInventory", JSON.stringify(items));
    }

    async function getLocalEntry(items) {
        return items.find((item) =>
            item?.itemKey === LUCKY_SOUL_ITEM.key ||
            LUCKY_SOUL_ITEM.aliases.includes(item?.itemKey) ||
            item?.name === LUCKY_SOUL_ITEM.name
        ) || null;
    }

    async function getCount() {
        if (mode === "character" && inventoryApi && characterId) {
            try {
                const rows = await inventoryApi.getInventoryRows(characterId);
                const entry = rows.find((row) =>
                    row?.item_key === LUCKY_SOUL_ITEM.key ||
                    LUCKY_SOUL_ITEM.aliases.includes(row?.item_key) ||
                    row?.item_key === LUCKY_SOUL_ITEM.name
                ) ||
                    rows.find((row) => Number(row?.item_index) === 9999);
                return Math.max(0, Math.floor(Number(entry?.qty) || 0));
            } catch {
                return 0;
            }
        }
        const items = await loadLocalInventory();
        const entry = await getLocalEntry(items);
        return Math.max(0, Math.floor(Number(entry?.quantity) || 0));
    }

    async function applyDelta(delta) {
        const safeDelta = Math.trunc(Number(delta) || 0);
        if (!safeDelta) return true;

        if (mode === "character" && inventoryApi && characterId) {
            const current = await getCount();
            const next = current + safeDelta;
            if (next < 0) return false;
            try {
                await inventoryApi.setInventoryItem(characterId, LUCKY_SOUL_ITEM.key, 9999, next);
                return true;
            } catch {
                return false;
            }
        }

        const items = await loadLocalInventory();
        const entry = await getLocalEntry(items);
        const current = entry ? Math.floor(Number(entry.quantity) || 0) : 0;
        const next = current + safeDelta;
        if (next < 0) return false;

        if (entry) {
            entry.quantity = next;
        } else {
            items.push({
                id: Date.now(),
                name: LUCKY_SOUL_ITEM.name,
                itemKey: LUCKY_SOUL_ITEM.key,
                category: LUCKY_SOUL_ITEM.category,
                description: LUCKY_SOUL_ITEM.description,
                image: LUCKY_SOUL_ITEM.image,
                quantity: next
            });
        }

        if (entry && entry.quantity <= 0) {
            const idx = items.indexOf(entry);
            if (idx >= 0) items.splice(idx, 1);
        }

        await saveLocalInventory(items);
        return true;
    }

    return { mode, getCount, applyDelta };
}

function bindStaticEvents() {
    dom.invokeCancel.addEventListener("click", () => closeModal(dom.invokeModal));
    dom.invokeConfirm.addEventListener("click", () => void confirmInvoke());
    dom.farewellCancel.addEventListener("click", () => closeModal(dom.farewellModal));
    dom.farewellConfirm.addEventListener("click", () => void confirmFarewell());
    dom.appearanceCancel.addEventListener("click", () => closeModal(dom.appearanceModal));

    dom.farewellText.addEventListener("input", () => {
        const length = dom.farewellText.value.trim().length;
        dom.farewellCount.textContent = `${length} / ${MIN_FAREWELL_LENGTH}`;
        dom.farewellConfirm.disabled = length < MIN_FAREWELL_LENGTH;
    });
}

async function initNokorah() {
    const roots = document.querySelectorAll("[data-nokorah-root]");
    if (!roots.length) return;

    // Initialize static DOM references
    dom.invokeModal = document.getElementById("invokeModal");
    dom.invokeName = document.getElementById("nokorahName");
    dom.invokeGrid = document.getElementById("appearanceGrid");
    dom.invokeUpload = document.getElementById("appearanceUpload");
    dom.invokeCancel = document.getElementById("invokeCancelBtn");
    dom.invokeConfirm = document.getElementById("invokeConfirmBtn");
    dom.farewellModal = document.getElementById("farewellModal");
    dom.farewellText = document.getElementById("farewellText");
    dom.farewellCount = document.getElementById("farewellCount");
    dom.farewellCancel = document.getElementById("farewellCancelBtn");
    dom.farewellConfirm = document.getElementById("farewellConfirmBtn");
    dom.appearanceModal = document.getElementById("appearanceModal");
    dom.appearanceGrid = document.getElementById("appearanceEditGrid");
    dom.appearanceUpload = document.getElementById("appearanceEditUpload");
    dom.appearanceCancel = document.getElementById("appearanceCancelBtn");
    dom.appearanceConfirm = document.getElementById("appearanceConfirmBtn");

    if (!dom.invokeModal || !dom.farewellModal || !dom.appearanceModal) {
        return;
    }

    bindStaticEvents();
    await buildNokorahAdapter();
    await loadState();
    state.skills = await loadSkills();
    state.inventory = await buildInventoryAdapter();
    await refreshLuckySoul();
    renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
    void initNokorah();
});
