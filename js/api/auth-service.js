import { getSupabaseClient } from "./supabase-client.js";
import {
    clearActiveCharacter,
    clearSession,
    readSession,
    refreshSessionTimestamp,
    writeSession
} from "./session-store.js";
import { ActionTypes, logActivity } from "./activity-logger.js";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isExpired(session) {
    if (!session || !session.timestamp) return true;
    return Date.now() - session.timestamp > SESSION_MAX_AGE_MS;
}

function normalizeUsername(username) {
    return String(username || "").trim();
}

async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(str || ""));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readPublicUserByUsername(supabase, username) {
    const { data, error } = await supabase
        .from("users")
        .select("id, username, role, is_active, password_hash, auth_user_id, auth_email")
        .eq("username", username)
        .limit(1);

    if (error) return { user: null, error };
    return { user: Array.isArray(data) && data.length ? data[0] : null, error: null };
}

async function readPublicUserByAuthId(supabase, authUserId) {
    const { data, error } = await supabase
        .from("users")
        .select("id, username, role, is_active, password_hash, auth_user_id, auth_email")
        .eq("auth_user_id", authUserId)
        .limit(1);

    if (error) return { user: null, error };
    return { user: Array.isArray(data) && data.length ? data[0] : null, error: null };
}

async function ensureAnonAuthSession(supabase) {
    const current = await supabase.auth.getSession();
    const sessionUser = current?.data?.session?.user || null;
    if (sessionUser) return { user: sessionUser, created: false };

    const signed = await supabase.auth.signInAnonymously();
    if (signed.error || !signed.data?.user) {
        return { user: null, error: signed.error || new Error("anonymous-auth-failed") };
    }
    return { user: signed.data.user, created: true };
}

async function linkPublicUserToAuth(supabase, publicUserId, authUserId, authProvider = "anonymous") {
    if (!publicUserId || !authUserId) return;
    await supabase
        .from("users")
        .update({
            auth_user_id: authUserId,
            auth_provider: authProvider,
            last_login: new Date().toISOString()
        })
        .eq("id", publicUserId);
}

function writeAppSession(user) {
    const session = {
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            auth_user_id: user.auth_user_id || null,
            auth_email: user.auth_email || null
        },
        timestamp: Date.now()
    };
    writeSession(session);
    return session.user;
}

export async function login(username, password) {
    try {
        const cleanUsername = normalizeUsername(username);
        if (!cleanUsername || !password) {
            return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
        }

        const supabase = await getSupabaseClient();
        const { user: userRow, error: userError } = await readPublicUserByUsername(supabase, cleanUsername);
        if (userError) {
            console.error("[Auth] read user error:", userError);
            return { success: false, error: "Erreur de connexion" };
        }
        if (!userRow) return { success: false, error: "Nom d'utilisateur incorrect" };
        if (userRow.is_active === false) return { success: false, error: "Compte desactive" };

        const passwordHash = await simpleHash(password);
        if (passwordHash !== userRow.password_hash) {
            return { success: false, error: "Mot de passe incorrect" };
        }

        const anon = await ensureAnonAuthSession(supabase);
        if (anon.error || !anon.user?.id) {
            console.error("[Auth] anonymous sign-in error:", anon.error);
            return { success: false, error: "Session anonyme Supabase impossible" };
        }

        await linkPublicUserToAuth(supabase, userRow.id, anon.user.id, "anonymous");

        const finalUser = {
            ...userRow,
            auth_user_id: anon.user.id
        };
        const sessionUser = writeAppSession(finalUser);

        await logActivity({
            actionType: ActionTypes.USER_LOGIN,
            actionData: {
                username: sessionUser.username,
                role: sessionUser.role,
                auth_mode: "anonymous"
            },
            userId: sessionUser.id
        });

        return { success: true, user: sessionUser };
    } catch (error) {
        console.error("[Auth] login error:", error);
        return { success: false, error: "Erreur de connexion" };
    }
}

export async function register(username, password) {
    try {
        const cleanUsername = normalizeUsername(username);
        if (!cleanUsername || !password) {
            return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
        }

        const supabase = await getSupabaseClient();
        const existing = await readPublicUserByUsername(supabase, cleanUsername);
        if (existing.user) return { success: false, error: "Nom d'utilisateur deja utilise" };

        const anon = await ensureAnonAuthSession(supabase);
        if (anon.error || !anon.user?.id) {
            console.error("[Auth] anonymous sign-in error during register:", anon.error);
            return { success: false, error: "Session anonyme Supabase impossible" };
        }

        const passwordHash = await simpleHash(password);
        const { data, error } = await supabase
            .from("users")
            .insert([
                {
                    username: cleanUsername,
                    password_hash: passwordHash,
                    role: "player",
                    is_active: true,
                    auth_user_id: anon.user.id,
                    auth_provider: "anonymous"
                }
            ])
            .select("id, username, role, is_active, auth_user_id, auth_email")
            .single();

        if (error || !data) {
            console.error("[Auth] register insert error:", error);
            return { success: false, error: "Impossible de creer le compte" };
        }

        const sessionUser = writeAppSession(data);
        clearActiveCharacter();

        await logActivity({
            actionType: ActionTypes.USER_REGISTER,
            actionData: {
                username: sessionUser.username,
                role: sessionUser.role,
                auth_mode: "anonymous"
            },
            userId: sessionUser.id
        });

        return { success: true, user: sessionUser };
    } catch (error) {
        console.error("[Auth] register error:", error);
        return { success: false, error: "Impossible de creer le compte" };
    }
}

export async function logout() {
    const session = readSession();
    const user = session?.user;

    try {
        const supabase = await getSupabaseClient();
        await supabase.auth.signOut();
    } catch {}

    clearSession();
    clearActiveCharacter();

    if (user) {
        await logActivity({
            actionType: ActionTypes.USER_LOGOUT,
            actionData: {
                username: user.username,
                role: user.role
            },
            userId: user.id
        });
    }
}

export function isAuthenticated() {
    const session = readSession();
    if (!session) return false;
    if (isExpired(session)) return false;
    refreshSessionTimestamp();
    return true;
}

export function getCurrentUser() {
    const session = readSession();
    if (!session || isExpired(session)) return null;
    return session.user || null;
}

export function isAdmin() {
    const user = getCurrentUser();
    return Boolean(user && user.role === "admin");
}

export async function refreshSessionUser() {
    try {
        const supabase = await getSupabaseClient();
        const anon = await ensureAnonAuthSession(supabase);
        if (anon.error || !anon.user?.id) {
            clearSession();
            return { success: false };
        }

        const localSession = readSession();
        const localUser = localSession?.user || null;

        // Priority 1: keep logged app user and relink auth uid.
        if (localUser?.id) {
            await linkPublicUserToAuth(supabase, localUser.id, anon.user.id, "anonymous");
            const { data, error } = await supabase
                .from("users")
                .select("id, username, role, is_active, auth_user_id, auth_email")
                .eq("id", localUser.id)
                .single();
            if (!error && data) {
                const sessionUser = writeAppSession(data);
                return { success: true, user: sessionUser };
            }
        }

        // Priority 2: resolve by auth_user_id.
        const mapped = await readPublicUserByAuthId(supabase, anon.user.id);
        if (mapped.error) {
            console.error("[Auth] refresh by auth id error:", mapped.error);
            clearSession();
            return { success: false };
        }

        if (!mapped.user) {
            return { success: false };
        }

        const sessionUser = writeAppSession(mapped.user);
        return { success: true, user: sessionUser };
    } catch (error) {
        console.error("[Auth] refresh session error:", error);
        return { success: false };
    }
}

export async function setUserRoleByUsername(username, role) {
    if (!isAdmin()) {
        return { success: false, error: "Acces non autorise" };
    }

    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername) {
        return { success: false, error: "Nom d'utilisateur requis" };
    }

    const nextRole = role === "admin" ? "admin" : "player";

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from("users")
            .update({ role: nextRole })
            .eq("username", cleanUsername)
            .select("id, username, role, auth_user_id, auth_email")
            .single();

        if (error) {
            console.error("Error updating user role:", error);
            return { success: false, error: "Impossible de modifier le role" };
        }

        const current = getCurrentUser();
        if (current && current.id === data.id) {
            writeAppSession(data);
        }

        return { success: true, user: data };
    } catch (error) {
        console.error("Error in setUserRoleByUsername:", error);
        return { success: false, error: "Impossible de modifier le role" };
    }
}

export async function resetUserPassword(username, newPassword) {
    if (!isAdmin()) {
        return { success: false, error: "Acces non autorise" };
    }

    const cleanUsername = normalizeUsername(username);
    const cleanPassword = String(newPassword || "").trim();
    if (!cleanUsername || !cleanPassword) {
        return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
    }

    try {
        const supabase = await getSupabaseClient();
        const { user, error } = await readPublicUserByUsername(supabase, cleanUsername);
        if (error || !user) {
            return { success: false, error: "Utilisateur introuvable" };
        }

        const passwordHash = await simpleHash(cleanPassword);
        const update = await supabase
            .from("users")
            .update({ password_hash: passwordHash })
            .eq("id", user.id)
            .select("id, username")
            .single();

        if (update.error) {
            console.error("Error resetting password:", update.error);
            return { success: false, error: "Impossible de reinitialiser le mot de passe" };
        }

        return { success: true, user: update.data };
    } catch (error) {
        console.error("Error in resetUserPassword:", error);
        return { success: false, error: "Impossible de reinitialiser le mot de passe" };
    }
}

export async function resetUserPasswordPublic(username, newPassword) {
    const cleanUsername = normalizeUsername(username);
    const cleanPassword = String(newPassword || "").trim();
    if (!cleanUsername || !cleanPassword) {
        return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
    }

    try {
        const supabase = await getSupabaseClient();
        const { user, error } = await readPublicUserByUsername(supabase, cleanUsername);
        if (error || !user) {
            return { success: false, error: "Utilisateur introuvable" };
        }

        const passwordHash = await simpleHash(cleanPassword);
        const update = await supabase
            .from("users")
            .update({ password_hash: passwordHash })
            .eq("id", user.id)
            .select("id, username")
            .single();

        if (update.error) {
            console.error("Error resetting password (public):", update.error);
            return { success: false, error: "Impossible de reinitialiser le mot de passe" };
        }

        return { success: true, user: update.data };
    } catch (error) {
        console.error("Error in resetUserPasswordPublic:", error);
        return { success: false, error: "Impossible de reinitialiser le mot de passe" };
    }
}

export async function createAdminUser(username, password) {
    try {
        const cleanUsername = normalizeUsername(username);
        const cleanPassword = String(password || "").trim();
        if (!cleanUsername || !cleanPassword) {
            return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
        }

        const supabase = await getSupabaseClient();
        const anon = await ensureAnonAuthSession(supabase);
        const authUserId = anon?.user?.id || null;

        const { user: existing } = await readPublicUserByUsername(supabase, cleanUsername);
        const passwordHash = await simpleHash(cleanPassword);

        if (existing) {
            const updated = await supabase
                .from("users")
                .update({
                    role: "admin",
                    password_hash: passwordHash,
                    auth_user_id: authUserId || existing.auth_user_id || null,
                    auth_provider: "anonymous"
                })
                .eq("id", existing.id)
                .select("id, username, role")
                .single();

            if (updated.error) {
                console.error("Error updating admin role:", updated.error);
                return { success: false };
            }
            return { success: true, user: updated.data };
        }

        const created = await supabase
            .from("users")
            .insert([
                {
                    username: cleanUsername,
                    password_hash: passwordHash,
                    role: "admin",
                    is_active: true,
                    auth_user_id: authUserId,
                    auth_provider: "anonymous"
                }
            ])
            .select("id, username, role")
            .single();

        if (created.error || !created.data) {
            console.error("Error creating admin:", created.error);
            return { success: false };
        }

        return { success: true, user: created.data };
    } catch (error) {
        console.error("Error in createAdminUser:", error);
        return { success: false };
    }
}
