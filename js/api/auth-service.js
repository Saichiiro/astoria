import { getSupabaseClient } from './supabase-client.js';
import {
    clearActiveCharacter,
    clearSession,
    readSession,
    writeSession,
    refreshSessionTimestamp
} from './session-store.js';
import { logActivity, ActionTypes } from './activity-logger.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isExpired(session) {
    if (!session || !session.timestamp) return true;
    return (Date.now() - session.timestamp) > SESSION_MAX_AGE_MS;
}

export async function login(username, password) {
    try {
        const supabase = await getSupabaseClient();

        const { data: users, error: queryError } = await supabase
            .from('users')
            .select('id, username, password_hash, role, is_active')
            .eq('username', username)
            .limit(1);

        if (queryError) {
            console.error('Query error:', queryError);
            return { success: false, error: 'Erreur de connexion' };
        }

        if (!users || users.length === 0) {
            return { success: false, error: 'Nom d\'utilisateur incorrect' };
        }

        const user = users[0];

        // Check if account is active
        if (user.is_active === false) {
            return { success: false, error: 'Compte désactivé' };
        }

        const passwordHash = await simpleHash(password);
        if (passwordHash !== user.password_hash) {
            return { success: false, error: 'Mot de passe incorrect' };
        }

        // Update last_login timestamp
        const { error: updateError } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        if (updateError) {
            console.error('[Auth] Failed to update last_login:', updateError);
        } else {
            console.log('[Auth] Updated last_login for user:', user.id);
        }

        const session = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            timestamp: Date.now()
        };

        writeSession(session);

        // Log login activity
        await logActivity({
            actionType: ActionTypes.USER_LOGIN,
            actionData: {
                username: user.username,
                role: user.role
            },
            userId: user.id
        });

        return { success: true, user: session.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Erreur de connexion' };
    }
}

export async function register(username, password) {
    try {
        const supabase = await getSupabaseClient();

        const cleanUsername = String(username || '').trim();
        if (!cleanUsername) {
            return { success: false, error: "Nom d'utilisateur requis" };
        }

        const passwordHash = await simpleHash(password || '');

        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username: cleanUsername,
                    password_hash: passwordHash,
                    role: 'player'
                }
            ])
            .select('id, username, role')
            .single();

        if (error) {
            const code = error.code || error.details || '';
            const message = (error.message || '').toLowerCase();
            const isDuplicate =
                String(code).includes('23505') ||
                message.includes('duplicate') ||
                message.includes('unique') ||
                message.includes('already exists');

            if (isDuplicate) {
                return { success: false, error: "Nom d'utilisateur déjà utilisé" };
            }

            console.error('Register error:', error);
            return { success: false, error: "Impossible de créer le compte" };
        }

        const session = {
            user: {
                id: data.id,
                username: data.username,
                role: data.role
            },
            timestamp: Date.now()
        };

        writeSession(session);
        clearActiveCharacter();

        // Log registration activity
        await logActivity({
            actionType: ActionTypes.USER_REGISTER,
            actionData: {
                username: data.username,
                role: data.role
            },
            userId: data.id
        });

        return { success: true, user: session.user };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: "Impossible de créer le compte" };
    }
}

export async function logout() {
    const session = readSession();
    const user = session?.user;

    clearSession();
    clearActiveCharacter();

    // Log logout activity
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
    // Sliding session: refresh timestamp on each visit
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
    return user && user.role === 'admin';
}

export async function refreshSessionUser() {
    if (!isAuthenticated()) return { success: false };

    const session = readSession();
    const userId = session?.user?.id;
    if (!userId) return { success: false };

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error refreshing session user:', error);
            return { success: false };
        }

        const nextSession = {
            user: {
                id: data.id,
                username: data.username,
                role: data.role
            },
            timestamp: Date.now()
        };
        writeSession(nextSession);
        return { success: true, user: nextSession.user };
    } catch (error) {
        console.error('Error refreshing session user:', error);
        return { success: false };
    }
}

export async function setUserRoleByUsername(username, role) {
    if (!isAdmin()) {
        return { success: false, error: 'Accès non autorisé' };
    }

    const cleanUsername = String(username || '').trim();
    if (!cleanUsername) {
        return { success: false, error: "Nom d'utilisateur requis" };
    }

    const nextRole = role === 'admin' ? 'admin' : 'player';

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('users')
            .update({ role: nextRole })
            .eq('username', cleanUsername)
            .select('id, username, role')
            .single();

        if (error) {
            console.error('Error updating user role:', error);
            return { success: false, error: 'Impossible de modifier le rôle' };
        }

        const current = getCurrentUser();
        if (current && current.id === data.id) {
            writeSession({
                user: { id: data.id, username: data.username, role: data.role },
                timestamp: Date.now()
            });
        }

        return { success: true, user: data };
    } catch (error) {
        console.error('Error in setUserRoleByUsername:', error);
        return { success: false, error: 'Impossible de modifier le rôle' };
    }
}

export async function resetUserPassword(username, newPassword) {
    if (!isAdmin()) {
        return { success: false, error: 'Accès non autorisé' };
    }

    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(newPassword || '').trim();
    if (!cleanUsername || !cleanPassword) {
        return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
    }

    try {
        const supabase = await getSupabaseClient();
        const passwordHash = await simpleHash(cleanPassword);
        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('username', cleanUsername)
            .select('id, username')
            .single();

        if (error) {
            console.error('Error resetting user password:', error);
            return { success: false, error: 'Impossible de réinitialiser le mot de passe' };
        }

        return { success: true, user: data };
    } catch (error) {
        console.error('Error in resetUserPassword:', error);
        return { success: false, error: 'Impossible de réinitialiser le mot de passe' };
    }
}

export async function resetUserPasswordPublic(username, newPassword) {
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(newPassword || '').trim();
    if (!cleanUsername || !cleanPassword) {
        return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
    }

    try {
        const supabase = await getSupabaseClient();
        const passwordHash = await simpleHash(cleanPassword);
        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('username', cleanUsername)
            .select('id, username');

        if (error) {
            console.error('Error resetting user password (public):', error);
            return { success: false, error: 'Impossible de reinitialiser le mot de passe' };
        }

        if (!data || !data.length) {
            return { success: false, error: "Utilisateur introuvable" };
        }

        return { success: true, user: data[0] };
    } catch (error) {
        console.error('Error in resetUserPasswordPublic:', error);
        return { success: false, error: 'Impossible de reinitialiser le mot de passe' };
    }
}

async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function toggleUserActive(userId, isActive) {
    if (!isAdmin()) {
        return { success: false, error: 'Accès non autorisé' };
    }

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: isActive })
            .eq('id', userId)
            .select('id, username, is_active')
            .single();

        if (error) {
            console.error('Error toggling user active status:', error);
            return { success: false, error: 'Impossible de modifier le statut' };
        }

        return { success: true, user: data };
    } catch (error) {
        console.error('Error in toggleUserActive:', error);
        return { success: false, error: 'Impossible de modifier le statut' };
    }
}

export async function toggleCharacterActive(characterId, isActive) {
    if (!isAdmin()) {
        return { success: false, error: 'Accès non autorisé' };
    }

    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('characters')
            .update({ is_active: isActive })
            .eq('id', characterId)
            .select('id, name, is_active')
            .single();

        if (error) {
            console.error('Error toggling character active status:', error);
            return { success: false, error: 'Impossible de modifier le statut' };
        }

        return { success: true, character: data };
    } catch (error) {
        console.error('Error in toggleCharacterActive:', error);
        return { success: false, error: 'Impossible de modifier le statut' };
    }
}

export async function createAdminUser(username, password) {
    try {
        const supabase = await getSupabaseClient();

        const passwordHash = await simpleHash(password);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                username,
                password_hash: passwordHash,
                role: 'admin'
            }])
            .select();

        if (error) {
            console.error('Error creating admin:', error);
            return { success: false };
        }

        console.log('Admin created:', data[0]);
        return { success: true, user: data[0] };
    } catch (error) {
        console.error('Error in createAdminUser:', error);
        return { success: false };
    }
}
