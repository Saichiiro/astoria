(function () {
    const basePath = "assets/images/objets/";
    const preloadCache = new Map();

    function normalizeName(name) {
        return (name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
    }

    const overridesByKey = {
        [normalizeName("Poudre de Traçage")]: basePath + "Poudre_de_Tracage.png",
        [normalizeName("Fiole de vitalité")]: basePath + "Fiole_de_vitalite.jpg",
        [normalizeName("Larme de Matera")]: basePath + "Larme_de_Matera.png",
        [normalizeName("Armure de Vexarion")]: basePath + "Armure_de_Vexarion.png",
        [normalizeName("Clef Manndorf")]: basePath + "Clef_Manndorf.png",
        [normalizeName("Parchemin d'Éveil")]: basePath + "Parchemin_Eveil.jpg",
        [normalizeName("Parchemin d'Ascension")]: basePath + "Parchemin_Ascension.jpg",
        [normalizeName("Sceptre de Krythus")]: basePath + "Sceptre_de_Krythus.png",
        [normalizeName("Cape de l'Aube Vermeille [Exclu saison]")]:
            basePath + "Cape_de_lAube_Vermeille_off.jpg",
        [normalizeName("Book Of Aeris")]: basePath + "Book_of_Aeris.png",
        [normalizeName("The Queen's Poison")]: basePath + "The_Queens_Poison.png",
        [normalizeName("Cloche de Résonnance")]: basePath + "Cloche_de_Resonnance.png",
        [normalizeName("Veille'Nuit")]: basePath + "VeilleNuit.png"
    };

    const galleriesByKey = {
        [normalizeName("Cape de l'Aube Vermeille [Exclu saison]")]: [
            basePath + "Cape_de_lAube_Vermeille_off.jpg",
            basePath + "Cape_de_lAube_Vermeille_on.jpg"
        ]
    };

    const largePlaceholder =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>" +
                "<rect width='200' height='200' fill='#fce4ec'/>" +
                "<text x='50%' y='50%' text-anchor='middle' fill='#d81b60' font-family='Segoe UI, Arial' font-size='16'>Image</text>" +
            "</svg>"
        );

    const smallPlaceholder =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>" +
                "<rect width='80' height='80' fill='#f0f0f0'/>" +
                "<text x='50%' y='50%' text-anchor='middle' dy='0.3em' fill='#d81b60' font-family='Arial' font-size='14'>?</text>" +
            "</svg>"
        );

    function resolveItemImages(item) {
        const name = item && (item.name || item.nom || "");
        const key = normalizeName(name);
        const override = overridesByKey[key];
        const gallery = galleriesByKey[key];
    const rawImage =
        (item && (item.image || item.img)) ||
        (item && item.images && (item.images.primary || item.images.url)) ||
        "";
    const normalizedRawImage =
        rawImage && rawImage.startsWith("assets/images/") && !rawImage.startsWith(basePath)
            ? basePath + rawImage.replace(/^assets\/images\//, "")
            : rawImage;

    const primaryCandidate = (gallery && gallery[0]) || override || normalizedRawImage;
        const primary = primaryCandidate || largePlaceholder;

        const galleryList =
            (gallery && gallery.length ? gallery : []).length > 0
                ? gallery
                : (primaryCandidate ? [primaryCandidate] : [largePlaceholder]);

        return {
            primary,
            gallery: galleryList.map((src) => src || largePlaceholder)
        };
    }

    function preloadImage(src) {
        const url = String(src || "");
        if (!url) return Promise.resolve(null);

        if (preloadCache.has(url)) return preloadCache.get(url);

        const promise = new Promise((resolve) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });

        preloadCache.set(url, promise);
        return promise;
    }

    function preloadMany(list, limit = 24) {
        const uniq = [];
        const seen = new Set();

        for (const src of list || []) {
            const url = String(src || "");
            if (!url) continue;
            if (seen.has(url)) continue;
            seen.add(url);
            uniq.push(url);
            if (uniq.length >= limit) break;
        }

        uniq.forEach((url) => preloadImage(url));
    }

    /**
     * Get aspect ratio for a given display context
     * @param {string} context - Display context identifier
     * @returns {string} CSS aspect-ratio value
     */
    function getContainerAspect(context) {
        const aspects = {
            'inventory-grid': '1 / 1',      // Square thumbnails
            'quest-carousel': 'auto',       // Free aspect (preserves image ratio)
            'character-slot': '1 / 1',      // Square/circular slots
            'item-detail': '4 / 3',         // Detail view
            'item-popover': '1 / 1',        // Popover images
            'free': 'auto'                  // No constraint
        };
        return aspects[context] || 'auto';
    }

    /**
     * Apply consistent image styling for a given context
     * @param {HTMLImageElement} imgElement - Image element to style
     * @param {string} context - Display context identifier
     * @param {object} options - Additional styling options
     */
    function applyImageStyle(imgElement, context, options = {}) {
        const {
            objectFit = 'cover',
            objectPosition = 'center',
            applyAspectRatio = true
        } = options;

        if (applyAspectRatio) {
            imgElement.style.aspectRatio = getContainerAspect(context);
        }
        imgElement.style.objectFit = objectFit;
        imgElement.style.objectPosition = objectPosition;
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
    }

    /**
     * Create an image element with consistent styling for a context
     * @param {string} src - Image source URL
     * @param {string} context - Display context identifier
     * @param {object} options - Additional options
     * @returns {HTMLImageElement}
     */
    function createStyledImage(src, context, options = {}) {
        const {
            alt = '',
            loading = 'lazy',
            className = '',
            ...styleOptions
        } = options;

        const img = document.createElement('img');
        img.src = src || largePlaceholder;
        img.alt = alt;
        img.loading = loading;
        if (className) img.className = className;

        applyImageStyle(img, context, styleOptions);
        return img;
    }

    window.astoriaImageHelpers = {
        basePath,
        normalizeName,
        overridesByKey,
        galleriesByKey,
        largePlaceholder,
        smallPlaceholder,
        resolveItemImages,
        preloadImage,
        preloadMany,
        getContainerAspect,
        applyImageStyle,
        createStyledImage
    };
})();
