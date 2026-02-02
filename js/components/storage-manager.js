/**
 * Storage Manager - Wrapper localForage
 * Gère le stockage offline (IndexedDB/localStorage/WebSQL)
 */

class StorageManager {
    constructor() {
        if (!window.localforage) {
            console.error('[StorageManager] localForage library not loaded!');
            this.fallback = true;
            return;
        }

        this.fallback = false;

        // Configuration localForage
        localforage.config({
            driver: [
                localforage.INDEXEDDB,
                localforage.WEBSQL,
                localforage.LOCALSTORAGE
            ],
            name: 'astoria',
            version: 1.0,
            storeName: 'astoria_data',
            description: 'Astoria application storage'
        });
    }

    /**
     * Sauvegarde une valeur
     * @param {string} key - Clé
     * @param {any} value - Valeur (sera automatiquement sérialisée)
     * @returns {Promise<any>}
     */
    async set(key, value) {
        if (this.fallback) {
            localStorage.setItem(key, JSON.stringify(value));
            return value;
        }
        return localforage.setItem(key, value);
    }

    /**
     * Récupère une valeur
     * @param {string} key - Clé
     * @returns {Promise<any>}
     */
    async get(key) {
        if (this.fallback) {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
        return localforage.getItem(key);
    }

    /**
     * Supprime une valeur
     * @param {string} key - Clé
     * @returns {Promise<void>}
     */
    async remove(key) {
        if (this.fallback) {
            localStorage.removeItem(key);
            return;
        }
        return localforage.removeItem(key);
    }

    /**
     * Vide tout le storage
     * @returns {Promise<void>}
     */
    async clear() {
        if (this.fallback) {
            localStorage.clear();
            return;
        }
        return localforage.clear();
    }

    /**
     * Récupère toutes les clés
     * @returns {Promise<string[]>}
     */
    async keys() {
        if (this.fallback) {
            return Object.keys(localStorage);
        }
        return localforage.keys();
    }

    /**
     * Nombre d'items stockés
     * @returns {Promise<number>}
     */
    async length() {
        if (this.fallback) {
            return localStorage.length;
        }
        return localforage.length();
    }

    /**
     * Sauvegarde un draft (avec timestamp)
     * @param {string} draftKey - Clé du draft (ex: 'profile_draft', 'fiche_draft')
     * @param {any} data - Données à sauvegarder
     * @returns {Promise<object>}
     */
    async saveDraft(draftKey, data) {
        const draft = {
            data,
            timestamp: Date.now(),
            version: 1
        };
        await this.set(`draft_${draftKey}`, draft);
        return draft;
    }

    /**
     * Récupère un draft
     * @param {string} draftKey - Clé du draft
     * @returns {Promise<object|null>}
     */
    async getDraft(draftKey) {
        return this.get(`draft_${draftKey}`);
    }

    /**
     * Supprime un draft
     * @param {string} draftKey - Clé du draft
     * @returns {Promise<void>}
     */
    async removeDraft(draftKey) {
        return this.remove(`draft_${draftKey}`);
    }

    /**
     * Cache une réponse API
     * @param {string} cacheKey - Clé du cache
     * @param {any} data - Données à cacher
     * @param {number} ttl - Durée de vie en ms (default: 5min)
     * @returns {Promise<object>}
     */
    async cache(cacheKey, data, ttl = 5 * 60 * 1000) {
        const cached = {
            data,
            expiry: Date.now() + ttl
        };
        await this.set(`cache_${cacheKey}`, cached);
        return cached;
    }

    /**
     * Récupère un cache (null si expiré)
     * @param {string} cacheKey - Clé du cache
     * @returns {Promise<any|null>}
     */
    async getCache(cacheKey) {
        const cached = await this.get(`cache_${cacheKey}`);
        if (!cached) return null;

        if (Date.now() > cached.expiry) {
            await this.remove(`cache_${cacheKey}`);
            return null;
        }

        return cached.data;
    }

    /**
     * Nettoie les caches expirés
     * @returns {Promise<number>} Nombre de caches nettoyés
     */
    async cleanExpiredCaches() {
        const keys = await this.keys();
        const cacheKeys = keys.filter(k => k.startsWith('cache_'));
        let cleaned = 0;

        for (const key of cacheKeys) {
            const cached = await this.get(key);
            if (cached && Date.now() > cached.expiry) {
                await this.remove(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

// Instance globale
const storageManager = new StorageManager();

// Auto-cleanup au démarrage (optionnel)
storageManager.cleanExpiredCaches().catch(console.error);

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageManager;
}
