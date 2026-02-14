const CHARACTER_STORAGE_KEY = "astoria_active_character";
const LEGACY_SUMMARY_KEY = "astoria_character_summary";

let authModule = null;
let listenersBound = false;
let lastInitState = null;

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
 * Formate un montant de kaels avec séparateurs de milliers
 */
function formatKaels(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
}

/**
 * Affiche les kaels du personnage (appel API)
 */
async function updateKaels() {
    const kaelsBadge = document.getElementById("characterKaelsBadge");
    if (!kaelsBadge) return;

    try {
        const auth = await loadAuthModule();
        const user = auth?.getCurrentUser?.();
        const activeCharacter = auth?.getActiveCharacter?.();
        if (!user?.id || !activeCharacter?.id) {
            kaelsBadge.hidden = true;
            return;
        }

        // Import dynamique du module market
        const market = await import("../market.js");
        if (!market || !market.getMyProfile) {
            console.warn("Character-summary: market.getMyProfile not available");
            kaelsBadge.hidden = true;
            return;
        }

        const profile = await market.getMyProfile();
        if (profile && typeof profile.kaels === 'number') {
            kaelsBadge.textContent = `${formatKaels(profile.kaels)} kaels`;
            kaelsBadge.hidden = false;
        } else {
            kaelsBadge.hidden = true;
        }
    } catch (error) {
        console.warn("Character-summary: Could not load kaels", error);
        kaelsBadge.hidden = true;
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

    const adminMode = typeof auth.isAdmin === "function" && auth.isAdmin();
    document.body.dataset.admin = adminMode ? "true" : "false";

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

        if (characters.length < 5) {
            const createItem = document.createElement("button");
            createItem.type = "button";
            createItem.className = "character-dropdown-item character-dropdown-item--create";

            const avatar = document.createElement("div");
            avatar.className = "character-dropdown-avatar";
            avatar.textContent = "+";

            const text = document.createElement("div");
            text.className = "character-dropdown-text";

            const name = document.createElement("div");
            name.className = "character-dropdown-name";
            name.textContent = "Créer un nouveau personnage";

            const role = document.createElement("div");
            role.className = "character-dropdown-role";
            role.textContent = `${characters.length}/5 personnages`;

            text.appendChild(name);
            text.appendChild(role);
            createItem.appendChild(avatar);
            createItem.appendChild(text);

            createItem.addEventListener("click", (e) => {
                e.stopPropagation();
                window.location.href = "index.html";
            });

            dropdownEl.appendChild(createItem);
        }
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

    let isOpen = false;
    const originalParent = dropdownEl.parentElement;

    const positionDropdown = () => {
        if (dropdownEl.hidden) return;
        const rect = avatarEl.getBoundingClientRect();

        dropdownEl.style.position = "fixed";
        dropdownEl.style.visibility = "hidden";
        dropdownEl.style.left = `${rect.left}px`;
        dropdownEl.style.top = `${rect.bottom + 8}px`;

        const dropdownRect = dropdownEl.getBoundingClientRect();
        const margin = 8;
        let left = rect.left;
        let top = rect.bottom + 8;

        if (left + dropdownRect.width > window.innerWidth - margin) {
            left = Math.max(margin, window.innerWidth - dropdownRect.width - margin);
        }

        if (top + dropdownRect.height > window.innerHeight - margin) {
            const aboveTop = rect.top - dropdownRect.height - 8;
            if (aboveTop > margin) {
                top = aboveTop;
            }
        }

        dropdownEl.style.left = `${left}px`;
        dropdownEl.style.top = `${top}px`;
        dropdownEl.style.visibility = "visible";
    };

    const openDropdown = () => {
        if (isOpen) return;
        isOpen = true;
        dropdownEl.hidden = false;
        if (dropdownEl.parentElement !== document.body) {
            dropdownEl.dataset.originalParent = "character-avatar-wrapper";
            document.body.appendChild(dropdownEl);
        }
        positionDropdown();
    };

    const closeDropdown = () => {
        if (!isOpen) return;
        isOpen = false;
        dropdownEl.hidden = true;
        dropdownEl.style.position = "";
        dropdownEl.style.left = "";
        dropdownEl.style.top = "";
        dropdownEl.style.visibility = "";
        if (originalParent && dropdownEl.parentElement !== originalParent) {
            originalParent.appendChild(dropdownEl);
        }
    };

    const toggleDropdown = () => {
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    avatarEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    avatarEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDropdown();
        }
    });

    window.addEventListener("scroll", positionDropdown, true);
    window.addEventListener("resize", positionDropdown);

    document.addEventListener("click", (e) => {
        if (!isOpen) return;
        if (!dropdownEl.contains(e.target) && !avatarEl.contains(e.target)) {
            closeDropdown();
        }
    });
}

/**
 * Initialise le bouton de partage de profil
 */
function initShareButton(characterId) {
    const shareBtn = document.getElementById("shareProfileBtn");
    if (!shareBtn) return;

    if (characterId) {
        shareBtn.hidden = false;
        shareBtn.onclick = async () => {
            const url = `${window.location.origin}${window.location.pathname}?character=${encodeURIComponent(characterId)}`;
            try {
                await navigator.clipboard.writeText(url);
                const originalText = shareBtn.textContent;
                shareBtn.textContent = "Copie !";
                shareBtn.style.opacity = "1";
                setTimeout(() => {
                    shareBtn.textContent = originalText;
                    shareBtn.style.opacity = "0.7";
                }, 1500);
            } catch (error) {
                console.error("Failed to copy URL:", error);
                alert("Impossible de copier le lien. URL: " + url);
            }
        };
        shareBtn.onmouseenter = () => shareBtn.style.opacity = "1";
        shareBtn.onmouseleave = () => shareBtn.style.opacity = "0.7";
    } else {
        shareBtn.hidden = true;
    }
}

export async function initCharacterSummary({ includeQueryParam = false, elements, enableDropdown = true, showKaels = false } = {}) {
    const resolvedElements = elements || getDefaultSummaryElements();
    const context = resolveCharacterContext({ includeQueryParam });
    const summary = buildSummary(context);
    applySummaryToElements(resolvedElements, summary);

    const auth = await loadAuthModule();
    if (auth && typeof auth.isAdmin === "function") {
        document.body.dataset.admin = auth.isAdmin() ? "true" : "false";
    }

    // Update soul counts if character available
    if (context?.character?.id) {
        updateSoulCounts(context.character.id);
    }

    // Update kaels if enabled
    if (showKaels) {
        await updateKaels();
    }

    // Initialize share button
    initShareButton(context?.character?.id);

    // Setup dropdown if enabled
    if (enableDropdown) {
        const avatarEl = document.getElementById("hdvCharacterAvatar") || document.querySelector(".character-avatar--clickable");
        const dropdownEl = document.getElementById("hdvCharacterDropdown") || document.querySelector(".character-dropdown");

        if (avatarEl && dropdownEl) {
            wireDropdownToggle(avatarEl, dropdownEl);
            await buildCharacterDropdown(dropdownEl, context?.character?.id);
        }
    }

    lastInitState = { includeQueryParam, elements: resolvedElements, enableDropdown, showKaels };

    if (!listenersBound) {
        listenersBound = true;
        const refreshFromState = async () => {
            if (!lastInitState) return;
            const {
                includeQueryParam: includeQuery,
                elements: latestElements,
                enableDropdown: allowDropdown,
                showKaels: allowKaels
            } = lastInitState;
            const nextContext = resolveCharacterContext({ includeQueryParam: includeQuery });
            const nextSummary = buildSummary(nextContext);
            applySummaryToElements(latestElements, nextSummary);

            const auth = await loadAuthModule();
            if (auth && typeof auth.isAdmin === "function") {
                document.body.dataset.admin = auth.isAdmin() ? "true" : "false";
            }

            if (nextContext?.character?.id) {
                updateSoulCounts(nextContext.character.id);
            }
            if (allowKaels) {
                await updateKaels();
            }

            if (allowDropdown) {
                const avatarEl = document.getElementById("hdvCharacterAvatar") || document.querySelector(".character-avatar--clickable");
                const dropdownEl = document.getElementById("hdvCharacterDropdown") || document.querySelector(".character-dropdown");
                if (avatarEl && dropdownEl) {
                    await buildCharacterDropdown(dropdownEl, nextContext?.character?.id);
                }
            }
        };

        window.addEventListener("astoria:character-changed", () => {
            void refreshFromState();
        });
        window.addEventListener("astoria:character-updated", () => {
            void refreshFromState();
        });
        window.addEventListener("storage", (event) => {
            if (!event.key) return;
            if (![CHARACTER_STORAGE_KEY, LEGACY_SUMMARY_KEY, "astoria_session"].includes(event.key)) return;
            void refreshFromState();
        });
    }

    return { context, summary, elements: resolvedElements };
}
