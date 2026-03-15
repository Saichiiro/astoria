const SESSION_KEY = 'astoria_session';
const ACTIVE_CHARACTER_KEY = 'astoria_active_character';
let sessionCache = null;
let activeCharacterCache = null;

function pickDefined(source, keys) {
    const out = {};
    (Array.isArray(keys) ? keys : []).forEach((key) => {
        if (source && source[key] !== undefined) {
            out[key] = source[key];
        }
    });
    return out;
}

function buildCharacterStorageSnapshot(character) {
    if (!character || typeof character !== 'object') return null;

    const profileData = character.profile_data && typeof character.profile_data === 'object'
        ? character.profile_data
        : {};
    const ficheSummary = profileData.fiche_summary && typeof profileData.fiche_summary === 'object'
        ? profileData.fiche_summary
        : null;

    const profileSnapshot = {
        ...pickDefined(profileData, [
            'avatar_url',
            'avatarUrl',
            'rank',
            'current_rank',
            'rank_label',
            'role',
            'surnom',
            'title'
        ])
    };

    if (ficheSummary) {
        profileSnapshot.fiche_summary = {
            ...pickDefined(ficheSummary, ['id', 'name', 'role', 'avatar_url', 'avatarUrl'])
        };
    }

    return {
        ...pickDefined(character, [
            'id',
            'user_id',
            'name',
            'race',
            'class',
            'kaels',
            'is_active',
            'avatar_url',
            'rank',
            'role',
            'surnom'
        ]),
        profile_data: profileSnapshot
    };
}

function readJson(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function readSession() {
    const stored = readJson(SESSION_KEY);
    if (stored) {
        sessionCache = stored;
        try {
            if (window) window.astoriaSessionUser = stored?.user || null;
        } catch {}
        return stored;
    }
    if (sessionCache) return sessionCache;
    try {
        if (window && window.astoriaSessionUser) {
            const fallback = { user: window.astoriaSessionUser, timestamp: Date.now() };
            sessionCache = fallback;
            return fallback;
        }
    } catch {}
    return null;
}

export function writeSession(session) {
    sessionCache = session;
    writeJson(SESSION_KEY, session);
    try {
        if (window) window.astoriaSessionUser = session?.user || null;
    } catch {}
}

/**
 * Refresh session timestamp to extend expiration (sliding session)
 * Call this on page load when user is authenticated
 */
export function refreshSessionTimestamp() {
    const session = readSession();
    if (session && session.user) {
        session.timestamp = Date.now();
        writeSession(session);
        return true;
    }
    return false;
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionCache = null;
    try {
        if (window) window.astoriaSessionUser = null;
    } catch {}
}

export function getActiveCharacter() {
    if (activeCharacterCache) return activeCharacterCache;
    const stored = readJson(ACTIVE_CHARACTER_KEY);
    if (stored) {
        try {
            if (window && !window.astoriaActiveCharacter) {
                window.astoriaActiveCharacter = stored || null;
            }
        } catch {}
        return stored;
    }
    try {
        if (window && window.astoriaActiveCharacter) {
            activeCharacterCache = window.astoriaActiveCharacter;
            return window.astoriaActiveCharacter;
        }
    } catch {}
    return null;
}

export function setActiveCharacterLocal(character) {
    activeCharacterCache = character;
    const snapshot = buildCharacterStorageSnapshot(character);
    if (snapshot) {
        writeJson(ACTIVE_CHARACTER_KEY, snapshot);
    } else {
        localStorage.removeItem(ACTIVE_CHARACTER_KEY);
    }
    try {
        if (window) window.astoriaActiveCharacter = character || null;
    } catch {}
}

export function clearActiveCharacter() {
    localStorage.removeItem(ACTIVE_CHARACTER_KEY);
    activeCharacterCache = null;
    try {
        if (window) window.astoriaActiveCharacter = null;
    } catch {}
}

try {
    if (window) {
        window.astoriaSessionStore = {
            readSession,
            writeSession,
            clearSession,
            getActiveCharacter,
            setActiveCharacterLocal,
            clearActiveCharacter
        };
    }
} catch {}
