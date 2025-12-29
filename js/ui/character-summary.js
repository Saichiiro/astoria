const CHARACTER_STORAGE_KEY = "astoria_active_character";
const LEGACY_SUMMARY_KEY = "astoria_character_summary";

let authModule = null;

async function loadAuthModule() {
    if (authModule) return authModule;
    try {
        authModule = await import("../auth.js");
        return authModule;
    } catch (error) {
        console.error("Character-summary: Failed to load auth module:", error);
        return null;
    }
}

export function getActiveCharacterFromStorage() {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function getLegacySummary() {
    const raw = localStorage.getItem(LEGACY_SUMMARY_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function resolveCharacterContext({ includeQueryParam = false } = {}) {
    const character = getActiveCharacterFromStorage();
    if (character && character.id) {
        return { key: character.id, character };
    }
    const legacy = getLegacySummary();
    if (legacy && legacy.id) {
        return { key: legacy.id, character: null };
    }
    if (includeQueryParam) {
        const params = new URLSearchParams(window.location.search);
        const fallback = params.get("character");
        return { key: fallback || "default", character: null };
    }
    return { key: "default", character: null };
}

export function buildRoleText(character) {
    if (!character) return "Classe / Role / Surnom";
    const parts = [];
    if (character.race) parts.push(character.race);
    if (character.class) parts.push(character.class);
    return parts.length ? parts.join(" - ") : "Classe / Role / Surnom";
}

export function buildSummary(context) {
    if (context?.character) {
        const profileData = context.character.profile_data || {};
        const stored = profileData.fiche_summary;
        const base = {
            id: context.character.id,
            name: context.character.name || "Personnage",
            role: buildRoleText(context.character),
            avatar_url: profileData.avatar_url || ""
        };
        if (stored && typeof stored === "object") {
            return {
                ...base,
                ...stored,
                id: stored.id || base.id,
                name: stored.name || base.name,
                role: stored.role || base.role,
                avatar_url: stored.avatar_url || base.avatar_url
            };
        }
        return base;
    }
    return getLegacySummary();
}

export function getDefaultSummaryElements() {
    const nameEl = document.getElementById("characterSummaryName");
    return {
        nameEl,
        taglineEl: document.getElementById("characterSummaryTagline"),
        avatarImgEl: document.getElementById("characterSummaryAvatar"),
        initialEl: document.getElementById("characterSummaryInitial"),
        linkEl: nameEl && nameEl.tagName === "A" ? nameEl : null
    };
}

export function applySummaryToElements(elements, summary) {
    if (!elements) return;
    const { nameEl, taglineEl, avatarImgEl, initialEl, linkEl } = elements;
    if (!nameEl || !taglineEl || !initialEl) return;

    const name = summary?.name || "Personnage";
    const role = summary?.role || "Classe / Role / Surnom";
    const avatarUrl = summary?.avatar_url || "";

    nameEl.textContent = name;
    taglineEl.textContent = role;

    const linkTarget = linkEl || (nameEl.tagName === "A" ? nameEl : null);
    if (linkTarget) {
        linkTarget.setAttribute(
            "href",
            summary?.id ? `profil.html?character=${encodeURIComponent(summary.id)}` : "profil.html"
        );
    }

    if (avatarImgEl) {
        if (avatarUrl) {
            avatarImgEl.src = avatarUrl;
            avatarImgEl.hidden = false;
            initialEl.hidden = true;
        } else {
            avatarImgEl.hidden = true;
            avatarImgEl.removeAttribute("src");
            initialEl.hidden = false;
            initialEl.textContent = name ? name.charAt(0).toUpperCase() : "?";
        }
    } else {
        initialEl.hidden = false;
        initialEl.textContent = name ? name.charAt(0).toUpperCase() : "?";
    }
}

/**
 * Lit les compteurs d'âmes depuis localStorage (fiche-{characterId}-eater)
 */
function readSoulCounts(characterId) {
    if (!characterId) return { conso: 0, prog: 0 };
    const key = `fiche-${characterId}-eater`;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return { conso: 0, prog: 0 };
        const data = JSON.parse(raw);
        const conso = Number.parseInt(data?.eaterAmesConso ?? 0, 10);
        const prog = Number.parseInt(data?.eaterAmesProgression ?? 0, 10);
        return {
            conso: Number.isNaN(conso) ? 0 : conso,
            prog: Number.isNaN(prog) ? 0 : prog
        };
    } catch {
        return { conso: 0, prog: 0 };
    }
}

/**
 * Affiche les compteurs d'âmes si les éléments existent
 */
function updateSoulCounts(characterId) {
    const consoEl = document.getElementById("soulConsoValue");
    const progEl = document.getElementById("soulProgValue");
    const soulsContainer = document.getElementById("characterSouls");

    if (consoEl && progEl && characterId) {
        const counts = readSoulCounts(characterId);
        consoEl.textContent = String(counts.conso);
        progEl.textContent = String(counts.prog);
        if (soulsContainer) soulsContainer.hidden = false;
    }
}

/**
 * Construit le dropdown des personnages disponibles
 */
async function buildCharacterDropdown(dropdownEl, currentCharacterId) {
    if (!dropdownEl) return;

    const auth = await loadAuthModule();
    if (!auth || !auth.getCurrentUser || !auth.getUserCharacters) {
        console.warn("Character-summary: Auth module not available for dropdown");
        return;
    }

    const user = auth.getCurrentUser();
    if (!user || !user.id) {
        dropdownEl.hidden = true;
        return;
    }

    try {
        const characters = await auth.getUserCharacters(user.id);
        if (!characters || characters.length === 0) {
            dropdownEl.hidden = true;
            return;
        }

        dropdownEl.innerHTML = "";
        dropdownEl.className = "character-dropdown";

        characters.forEach((char) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "character-dropdown-item";
            if (char.id === currentCharacterId) {
                item.classList.add("character-dropdown-item--active");
            }

            const avatar = document.createElement("div");
            avatar.className = "character-dropdown-avatar";
            const profileData = char.profile_data || {};
            if (profileData.avatar_url) {
                const img = document.createElement("img");
                img.src = profileData.avatar_url;
                img.alt = char.name || "Avatar";
                avatar.appendChild(img);
            } else {
                avatar.textContent = (char.name || "?").charAt(0).toUpperCase();
            }

            const text = document.createElement("div");
            text.className = "character-dropdown-text";

            const name = document.createElement("div");
            name.className = "character-dropdown-name";
            name.textContent = char.name || "Sans nom";

            const role = document.createElement("div");
            role.className = "character-dropdown-role";
            const parts = [];
            if (char.race) parts.push(char.race);
            if (char.class) parts.push(char.class);
            role.textContent = parts.length ? parts.join(" - ") : "Personnage";

            text.appendChild(name);
            text.appendChild(role);

            item.appendChild(avatar);
            item.appendChild(text);

            item.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (char.id === currentCharacterId) {
                    dropdownEl.hidden = true;
                    return;
                }

                // Appeler la même fonction que app-dock
                if (auth.setActiveCharacter) {
                    const result = await auth.setActiveCharacter(char.id);
                    if (result && result.success) {
                        // Recharger la page pour appliquer le changement
                        window.location.reload();
                    }
                }
            });

            dropdownEl.appendChild(item);
        });
    } catch (error) {
        console.error("Character-summary: Error building dropdown:", error);
        dropdownEl.hidden = true;
    }
}

/**
 * Active le dropdown au clic sur l'avatar
 */
function wireDropdownToggle(avatarEl, dropdownEl) {
    if (!avatarEl || !dropdownEl) return;

    avatarEl.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownEl.hidden = !dropdownEl.hidden;
    });

    avatarEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            dropdownEl.hidden = !dropdownEl.hidden;
        }
    });

    // Fermer le dropdown si on clique ailleurs
    document.addEventListener("click", (e) => {
        if (!dropdownEl.hidden && !dropdownEl.contains(e.target) && !avatarEl.contains(e.target)) {
            dropdownEl.hidden = true;
        }
    });
}

export async function initCharacterSummary({ includeQueryParam = false, elements, enableDropdown = true } = {}) {
    const resolvedElements = elements || getDefaultSummaryElements();
    const context = resolveCharacterContext({ includeQueryParam });
    const summary = buildSummary(context);
    applySummaryToElements(resolvedElements, summary);

    // Update soul counts if character available
    if (context?.character?.id) {
        updateSoulCounts(context.character.id);
    }

    // Setup dropdown if enabled
    if (enableDropdown) {
        const avatarEl = document.getElementById("hdvCharacterAvatar") || document.querySelector(".character-avatar--clickable");
        const dropdownEl = document.getElementById("hdvCharacterDropdown") || document.querySelector(".character-dropdown");

        if (avatarEl && dropdownEl) {
            wireDropdownToggle(avatarEl, dropdownEl);
            await buildCharacterDropdown(dropdownEl, context?.character?.id);
        }
    }

    return { context, summary, elements: resolvedElements };
}
