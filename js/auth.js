export { getSupabaseClient } from './api/supabase-client.js';
export {
    login,
    register,
    logout,
    isAuthenticated,
    getCurrentUser,
    isAdmin,
    refreshSessionUser,
    setUserRoleByUsername,
    resetUserPassword,
    createAdminUser
} from './api/auth-service.js';
export {
    getUserCharacters,
    getAllCharacters,
    getCharacterById,
    createCharacter,
    setActiveCharacter,
    updateCharacter
} from './api/characters-service.js';
export { getActiveCharacter } from './api/session-store.js';
export { toggleItemState, getAllItems } from './api/items-service.js';
