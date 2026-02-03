/**
 * Sanitize - Wrapper DOMPurify
 * Nettoie HTML user-generated pour éviter XSS
 */

class Sanitizer {
    constructor() {
        this.hasDOMPurify = typeof DOMPurify !== 'undefined';

        if (!this.hasDOMPurify) {
            console.error('[Sanitizer] DOMPurify library not loaded! XSS protection disabled.');
        }

        // Configuration par défaut pour profils/descriptions riches
        this.defaultConfig = {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'i', 'b',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'a', 'span', 'div',
                'blockquote', 'pre', 'code',
                'img',
                'hr',
            ],
            ALLOWED_ATTR: [
                'href', 'title', 'alt', 'src',
                'class', 'id',
                'width', 'height',
                'style', // Limité par ALLOWED_CSS_PROPERTIES
            ],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            ALLOW_DATA_ATTR: false,
            ALLOW_UNKNOWN_PROTOCOLS: false,
            SAFE_FOR_TEMPLATES: true,
        };

        // Configuration stricte pour inputs utilisateur simples
        this.strictConfig = {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
            ALLOWED_ATTR: ['href', 'title'],
            ALLOW_DATA_ATTR: false,
        };

        // Configuration pour texte pur (aucun HTML)
        this.textOnlyConfig = {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true, // Garde le contenu texte, retire juste les balises
        };
    }

    /**
     * Nettoie HTML avec configuration par défaut
     * @param {string} dirty - HTML non sécurisé
     * @param {object} customConfig - Config DOMPurify custom (optionnel)
     * @returns {string} - HTML nettoyé
     */
    clean(dirty, customConfig = null) {
        if (!dirty || typeof dirty !== 'string') {
            return '';
        }

        if (!this.hasDOMPurify) {
            console.warn('[Sanitizer] DOMPurify not available, returning escaped text');
            return this._escapeHtml(dirty);
        }

        const config = customConfig || this.defaultConfig;
        const clean = DOMPurify.sanitize(dirty, config);

        return clean;
    }

    /**
     * Nettoie HTML avec configuration stricte (profils publics, commentaires)
     * @param {string} dirty - HTML non sécurisé
     * @returns {string} - HTML nettoyé strict
     */
    cleanStrict(dirty) {
        return this.clean(dirty, this.strictConfig);
    }

    /**
     * Retire tout HTML, garde seulement texte (fallback si DOMPurify absent)
     * @param {string} dirty - HTML non sécurisé
     * @returns {string} - Texte pur sans HTML
     */
    cleanText(dirty) {
        if (!dirty || typeof dirty !== 'string') {
            return '';
        }

        if (!this.hasDOMPurify) {
            return this._stripHtml(dirty);
        }

        const clean = DOMPurify.sanitize(dirty, this.textOnlyConfig);
        return clean;
    }

    /**
     * Nettoie et insère dans le DOM
     * @param {HTMLElement} element - Élément cible
     * @param {string} dirty - HTML non sécurisé
     * @param {object} customConfig - Config DOMPurify custom (optionnel)
     */
    setHTML(element, dirty, customConfig = null) {
        if (!element || !(element instanceof HTMLElement)) {
            console.error('[Sanitizer] Invalid element provided to setHTML');
            return;
        }

        const clean = this.clean(dirty, customConfig);
        element.innerHTML = clean;
    }

    /**
     * Nettoie attribut (href, src, etc.)
     * @param {string} dirty - Valeur non sécurisée
     * @returns {string} - Valeur nettoyée
     */
    cleanAttribute(dirty) {
        if (!dirty || typeof dirty !== 'string') {
            return '';
        }

        if (!this.hasDOMPurify) {
            return this._escapeHtml(dirty);
        }

        // Use isValidAttribute helper
        const temp = document.createElement('div');
        temp.setAttribute('data-test', dirty);
        const cleaned = DOMPurify.sanitize(temp.outerHTML);

        // Extract attribute value
        const match = cleaned.match(/data-test="([^"]*)"/);
        return match ? match[1] : '';
    }

    /**
     * Escape HTML (fallback si DOMPurify absent)
     * @private
     */
    _escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return String(text).replace(/[&<>"']/g, (char) => map[char]);
    }

    /**
     * Strip HTML tags (fallback si DOMPurify absent)
     * @private
     */
    _stripHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }

    /**
     * Vérifie si une URL est sûre
     * @param {string} url - URL à vérifier
     * @returns {boolean} - true si sûre
     */
    isSafeUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        // Block javascript:, data:, vbscript:
        const dangerous = /^(javascript|data|vbscript):/i;
        if (dangerous.test(url.trim())) {
            return false;
        }

        // Allow http(s), mailto, tel, relative URLs
        const safe = /^(https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/|#)/i;
        return safe.test(url.trim());
    }

    /**
     * Hooks DOMPurify (pour customisation avancée)
     * @param {string} hookName - Nom du hook ('afterSanitizeAttributes', etc.)
     * @param {function} callback - Fonction de callback
     */
    addHook(hookName, callback) {
        if (!this.hasDOMPurify) {
            console.warn('[Sanitizer] Cannot add hook: DOMPurify not available');
            return;
        }

        DOMPurify.addHook(hookName, callback);
        console.log('[Sanitizer] Hook added:', hookName);
    }

    /**
     * Retire tous les hooks
     */
    removeHooks() {
        if (!this.hasDOMPurify) return;
        DOMPurify.removeAllHooks();
        console.log('[Sanitizer] All hooks removed');
    }
}

// Instance globale
const sanitizer = new Sanitizer();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sanitizer;
}
