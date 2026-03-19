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
    resetUserPasswordPublic,
    createAdminUser
} from './api/auth-service.js';
export {
    getUserCharacters,
    getAllCharacters,
    getCharacterById,
    createCharacter,
    deleteCharacter,
    setActiveCharacter,
    updateCharacter
} from './api/characters-service.js?v=20260319';
export { getActiveCharacter } from './api/session-store.js?v=20260319';
export { toggleItemState, getAllItems } from './api/items-service.js';
