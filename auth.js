/**
 * Authentication and Supabase integration
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your project credentials
 * 3. Run the SQL schema in supabase-schema.sql to create tables
 */

// ============================================================================
// SUPABASE CONFIGURATION (Replace with your actual values)
// ============================================================================
const SUPABASE_URL = 'https://eibfahbctgzqnmubrhzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYmZhaGJjdGd6cW5tdWJyaHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODM1OTksImV4cCI6MjA4MTA1OTU5OX0.2Xc1oqi_UPhnFqJsFRO-eAHpiCLpjF16JQAGyIrl18E';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
let supabase = null;

// Initialize Supabase client (will load from CDN)
async function initSupabase() {
    if (supabase) return supabase;

    // Load Supabase client from CDN
    if (!window.supabase) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(script);

        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Login with username and password
 */
export async function login(username, password) {
    try {
        await initSupabase();

        // Query users table for matching username
        const { data: users, error: queryError } = await supabase
            .from('users')
            .select('id, username, password_hash, role')
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

        // Simple password check (in production, use proper hashing like bcrypt)
        // For now, we'll use a simple hash comparison
        const passwordHash = await simpleHash(password);

        if (passwordHash !== user.password_hash) {
            return { success: false, error: 'Mot de passe incorrect' };
        }

        // Store session
        const session = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            timestamp: Date.now()
        };

        localStorage.setItem('astoria_session', JSON.stringify(session));

        return { success: true, user: session.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Erreur de connexion' };
    }
}

/**
 * Logout current user
 */
export function logout() {
    localStorage.removeItem('astoria_session');
    localStorage.removeItem('astoria_active_character');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    const session = localStorage.getItem('astoria_session');
    if (!session) return false;

    try {
        const data = JSON.parse(session);
        // Session expires after 7 days
        const isExpired = (Date.now() - data.timestamp) > (7 * 24 * 60 * 60 * 1000);
        return !isExpired;
    } catch {
        return false;
    }
}

/**
 * Get current logged-in user
 */
export function getCurrentUser() {
    if (!isAuthenticated()) return null;

    try {
        const session = JSON.parse(localStorage.getItem('astoria_session'));
        return session.user;
    } catch {
        return null;
    }
}

/**
 * Check if current user is admin
 */
export function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// ============================================================================
// CHARACTER FUNCTIONS
// ============================================================================

/**
 * Get all characters for a user
 */
export async function getUserCharacters(userId) {
    try {
        await initSupabase();

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching characters:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getUserCharacters:', error);
        return [];
    }
}

/**
 * Create a new character
 */
export async function createCharacter(userId, characterData) {
    try {
        await initSupabase();

        // Check if user already has 5 characters
        const characters = await getUserCharacters(userId);
        if (characters.length >= 5) {
            return { success: false, error: 'Limite de 5 personnages atteinte' };
        }

        const { data, error } = await supabase
            .from('characters')
            .insert([{
                user_id: userId,
                name: characterData.name,
                race: characterData.race,
                class: characterData.class,
                profile_data: characterData.profileData || {}
            }])
            .select();

        if (error) {
            console.error('Error creating character:', error);
            return { success: false, error: 'Erreur lors de la création du personnage' };
        }

        return { success: true, character: data[0] };
    } catch (error) {
        console.error('Error in createCharacter:', error);
        return { success: false, error: 'Erreur lors de la création du personnage' };
    }
}

/**
 * Get active character
 */
export function getActiveCharacter() {
    const characterData = localStorage.getItem('astoria_active_character');
    if (!characterData) return null;

    try {
        return JSON.parse(characterData);
    } catch {
        return null;
    }
}

/**
 * Set active character
 */
export async function setActiveCharacter(characterId) {
    try {
        await initSupabase();

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .single();

        if (error) {
            console.error('Error fetching character:', error);
            return { success: false };
        }

        localStorage.setItem('astoria_active_character', JSON.stringify(data));
        return { success: true };
    } catch (error) {
        console.error('Error in setActiveCharacter:', error);
        return { success: false };
    }
}

/**
 * Update character data
 */
export async function updateCharacter(characterId, updates) {
    try {
        await initSupabase();

        const { data, error } = await supabase
            .from('characters')
            .update(updates)
            .eq('id', characterId)
            .select();

        if (error) {
            console.error('Error updating character:', error);
            return { success: false };
        }

        // Update local cache if this is the active character
        const activeChar = getActiveCharacter();
        if (activeChar && activeChar.id === characterId) {
            localStorage.setItem('astoria_active_character', JSON.stringify(data[0]));
        }

        return { success: true, character: data[0] };
    } catch (error) {
        console.error('Error in updateCharacter:', error);
        return { success: false };
    }
}

// ============================================================================
// ITEM MANAGEMENT (Admin only)
// ============================================================================

/**
 * Toggle item enabled/disabled state (admin only)
 */
export async function toggleItemState(itemId, enabled) {
    if (!isAdmin()) {
        return { success: false, error: 'Accès non autorisé' };
    }

    try {
        await initSupabase();

        const { data, error } = await supabase
            .from('items')
            .update({ enabled })
            .eq('id', itemId)
            .select();

        if (error) {
            console.error('Error toggling item:', error);
            return { success: false };
        }

        return { success: true, item: data[0] };
    } catch (error) {
        console.error('Error in toggleItemState:', error);
        return { success: false };
    }
}

/**
 * Get all items with their enabled state
 */
export async function getAllItems() {
    try {
        await initSupabase();

        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching items:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getAllItems:', error);
        return [];
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Simple hash function for passwords
 * NOTE: This is NOT secure for production! Use bcrypt or similar on the backend
 * This is just for the prototype
 */
async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create initial admin user (run once in browser console)
 * Example: await createAdminUser('admin', 'password123')
 */
export async function createAdminUser(username, password) {
    try {
        await initSupabase();

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
