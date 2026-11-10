(function () {
    const state = {
        cache: null,
        loadPromise: null,
    };

    function cloneCategories(categories) {
        return (Array.isArray(categories) ? categories : []).map((category) => ({
            ...category,
            skills: Array.isArray(category?.skills)
                ? category.skills.map((skill) => ({ ...skill }))
                : []
        }));
    }

    function slugify(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function getStaticCategories() {
        return cloneCategories(window.skillsCategories);
    }

    // Table access lives in the api layer (classic script, so a dynamic import).
    function getCatalogApi() {
        return import("../api/skills-catalog-service.js");
    }

    function mergeRowsIntoCategories(categories, rows) {
        const next = cloneCategories(categories);
        const byCategory = new Map(next.map((category) => [String(category.id || ""), category]));

        next.forEach((category) => {
            category.skills = [];
        });

        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const category = byCategory.get(String(row.category_id || ""));
            if (!category) return;
            category.skills.push({
                name: String(row.name || "").trim(),
                icon: String(row.icon || "").trim(),
                cap: Math.max(1, Number(row.cap) || 200),
                sortOrder: Number(row.sort_order) || 0
            });
        });

        next.forEach((category) => {
            category.skills.sort((a, b) => {
                const orderDiff = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
                if (orderDiff !== 0) return orderDiff;
                return String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" });
            });
        });

        return next;
    }

    function serializeCategories(categories) {
        const rows = [];
        cloneCategories(categories).forEach((category) => {
            (Array.isArray(category.skills) ? category.skills : []).forEach((skill, index) => {
                rows.push({
                    category_id: String(category.id || "").trim(),
                    slug: slugify(skill.name),
                    name: String(skill.name || "").trim(),
                    icon: String(skill.icon || "").trim(),
                    cap: Math.max(1, Number(skill.cap) || 200),
                    sort_order: Number(skill.sortOrder) || index,
                    is_active: true
                });
            });
        });
        return rows.filter((row) => row.category_id && row.slug && row.name);
    }

    async function seedCatalogIfNeeded(categories) {
        const api = await getCatalogApi();
        if ((await api.countCatalogRows()) > 0) return false;

        const rows = serializeCategories(categories);
        if (!rows.length) return false;
        await api.insertCatalogRows(rows);
        return true;
    }

    async function loadCategories({ seedIfEmpty = false, force = false, seedCategories = null } = {}) {
        if (!force && state.cache) {
            return cloneCategories(state.cache);
        }
        if (!force && state.loadPromise) {
            const cached = await state.loadPromise;
            return cloneCategories(cached);
        }

        state.loadPromise = (async () => {
            const staticCategories = getStaticCategories();
            const seedSource = Array.isArray(seedCategories) && seedCategories.length
                ? cloneCategories(seedCategories)
                : staticCategories;
            if (seedIfEmpty) {
                try {
                    await seedCatalogIfNeeded(seedSource);
                } catch (error) {
                    console.warn("[Skills Catalog] Seed failed:", error);
                }
            }

            let data = null;
            let error = null;
            try {
                const { fetchActiveCatalogRows } = await getCatalogApi();
                ({ data, error } = await fetchActiveCatalogRows());
            } catch (loadError) {
                error = loadError;
            }

            if (error) {
                console.warn("[Skills Catalog] Load failed, fallback to static data:", error);
                state.cache = staticCategories;
                return staticCategories;
            }

            const merged = Array.isArray(data) && data.length
                ? mergeRowsIntoCategories(staticCategories, data)
                : staticCategories;
            state.cache = merged;
            return merged;
        })();

        try {
            const loaded = await state.loadPromise;
            return cloneCategories(loaded);
        } finally {
            state.loadPromise = null;
        }
    }

    async function saveCategories(categories) {
        const api = await getCatalogApi();
        const rows = serializeCategories(categories);
        const current = await api.fetchCatalogKeys();

        const nextKeys = new Set(rows.map((row) => `${row.category_id}::${row.slug}`));
        const stale = current.filter((row) => !nextKeys.has(`${row.category_id}::${row.slug}`));

        if (stale.length) {
            for (const row of stale) {
                await api.deleteCatalogRow(row.category_id, row.slug);
            }
        }

        if (rows.length) {
            await api.upsertCatalogRows(rows);
        }

        state.cache = cloneCategories(categories);
        return cloneCategories(state.cache);
    }

    window.astoriaSkillsCatalog = {
        loadCategories,
        saveCategories,
        cloneCategories,
    };
})();
