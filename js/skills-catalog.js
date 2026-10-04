(function () {
    const TABLE_NAME = "skills_catalog";
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

    async function getSupabase() {
        const auth = await import("./auth.js");
        return auth.getSupabaseClient?.();
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
        const supabase = await getSupabase();
        const { count, error } = await supabase
            .from(TABLE_NAME)
            .select("id", { count: "exact", head: true });
        if (error) throw error;
        if ((Number(count) || 0) > 0) return false;

        const rows = serializeCategories(categories);
        if (!rows.length) return false;
        const insert = await supabase.from(TABLE_NAME).insert(rows);
        if (insert.error) throw insert.error;
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
            const supabase = await getSupabase();
            if (!supabase) {
                state.cache = staticCategories;
                return staticCategories;
            }

            if (seedIfEmpty) {
                try {
                    await seedCatalogIfNeeded(seedSource);
                } catch (error) {
                    console.warn("[Skills Catalog] Seed failed:", error);
                }
            }

            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select("category_id, slug, name, icon, cap, sort_order, is_active")
                .eq("is_active", true)
                .order("category_id", { ascending: true })
                .order("sort_order", { ascending: true })
                .order("name", { ascending: true });

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
        const supabase = await getSupabase();
        const rows = serializeCategories(categories);
        const current = await supabase
            .from(TABLE_NAME)
            .select("category_id, slug");
        if (current.error) throw current.error;

        const nextKeys = new Set(rows.map((row) => `${row.category_id}::${row.slug}`));
        const stale = (current.data || []).filter((row) => !nextKeys.has(`${row.category_id}::${row.slug}`));

        if (stale.length) {
            for (const row of stale) {
                const remove = await supabase
                    .from(TABLE_NAME)
                    .delete()
                    .eq("category_id", row.category_id)
                    .eq("slug", row.slug);
                if (remove.error) throw remove.error;
            }
        }

        if (rows.length) {
            const upsert = await supabase
                .from(TABLE_NAME)
                .upsert(rows, { onConflict: "category_id,slug" });
            if (upsert.error) throw upsert.error;
        }

        state.cache = cloneCategories(categories);
        return cloneCategories(state.cache);
    }

    window.astoriaSkillsCatalog = {
        loadCategories,
        saveCategories,
        cloneCategories,
        tableName: TABLE_NAME,
    };
})();
