// Parchemins : répartition par type, stockée dans profile_data.inventory.scrollTypes.
// Format : scrollTypes[category][itemKey] = { counts: { typeKey: n }, updatedAt }
// Module partagé par inventaire, HDV, quêtes, magie et fiche pour que toutes les
// pages lisent/écrivent la même entrée. Dépend du catalogue window.inventoryData
// (js/data.js, à charger avant).

(() => {
    const normalizeText = (value) =>
        String(value || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .trim();

    const normalizeName = (value) => normalizeText(value).replace(/[^a-z0-9]+/g, "");

    // Index in the shared catalogue (js/data.js, DB items merged in place or
    // appended). Static entries never move, so the key is the same on every page;
    // a page-specific list (e.g. sorted by name) must never be used for it.
    const getCatalogIndex = (item) => {
        const name = normalizeName(item?.name || item?.nom || item?.itemKey || item?.item_key);
        if (!name) return -1;
        const source = Array.isArray(window.inventoryData) ? window.inventoryData : [];
        return source.findIndex((entry) => normalizeName(entry?.name || entry?.nom) === name);
    };

    const getCanonicalKey = (item) => {
        const idx = getCatalogIndex(item);
        if (idx >= 0) return `idx:${idx}`;
        const name = normalizeText(item?.name);
        return name ? `name:${name}` : "unknown";
    };

    const getCandidateKeys = (item) => {
        const keys = [getCanonicalKey(item)];
        const sourceIndex = Number(item?.sourceIndex);
        if (Number.isFinite(sourceIndex) && sourceIndex >= 0) keys.push(`idx:${sourceIndex}`);
        const name = normalizeText(item?.name);
        if (name) keys.push(`name:${name}`);
        return [...new Set(keys)];
    };

    const hasCounts = (entry) =>
        Boolean(entry?.counts) && Object.values(entry.counts).some((value) => Number(value) > 0);

    const sumCounts = (counts) =>
        Object.values(counts || {}).reduce((sum, value) => sum + (Math.max(0, Number(value) || 0)), 0);

    // Finds the stored entry for an item, tolerating legacy keys written with a
    // page-specific index (e.g. HDV's sorted list gave idx:100 instead of idx:5).
    // With `expectedQty` (the owned quantity), alias entries split across several
    // keys are merged back when together they account for exactly that quantity.
    const findEntry = (bucket, item, expectedQty = null) => {
        if (!bucket || typeof bucket !== "object") return null;
        const populated = Object.entries(bucket).filter(([, entry]) => hasCounts(entry));
        const qty = Math.floor(Number(expectedQty));
        if (populated.length > 1 && Number.isFinite(qty) && qty > 0) {
            const total = populated.reduce((sum, [, entry]) => sum + sumCounts(entry.counts), 0);
            if (total === qty) {
                const counts = {};
                let updatedAt = 0;
                populated.forEach(([, entry]) => {
                    Object.entries(entry.counts).forEach(([typeKey, value]) => {
                        counts[typeKey] = (counts[typeKey] || 0) + Math.max(0, Number(value) || 0);
                    });
                    updatedAt = Math.max(updatedAt, Number(entry.updatedAt) || 0);
                });
                return { key: getCanonicalKey(item), entry: { counts, updatedAt }, merged: true };
            }
        }
        for (const key of getCandidateKeys(item)) {
            if (hasCounts(bucket[key])) return { key, entry: bucket[key] };
        }
        if (populated.length === 1) {
            const [key, entry] = populated[0];
            return { key, entry };
        }
        return null;
    };

    const getCounts = (scrollTypes, category, item) => {
        const found = findEntry(scrollTypes?.[category], item);
        return found ? { ...found.entry.counts } : null;
    };

    // Returns a new scrollTypes object with counts written under the canonical key
    // and any alias key for the same item removed.
    const setCounts = (scrollTypes, category, item, counts) => {
        const next = { ...(scrollTypes || {}) };
        const bucket = { ...(next[category] || {}) };
        const found = findEntry(bucket, item);
        if (found) delete bucket[found.key];
        getCandidateKeys(item).forEach((key) => delete bucket[key]);
        const cleanCounts = {};
        Object.entries(counts || {}).forEach(([typeKey, value]) => {
            const qty = Math.floor(Number(value) || 0);
            if (qty > 0) cleanCounts[typeKey] = qty;
        });
        if (Object.keys(cleanCounts).length) {
            bucket[getCanonicalKey(item)] = { counts: cleanCounts, updatedAt: Date.now() };
        }
        if (Object.keys(bucket).length) next[category] = bucket;
        else delete next[category];
        return next;
    };

    window.astoriaScrollStore = {
        getCanonicalKey,
        getCandidateKeys,
        findEntry,
        getCounts,
        setCounts
    };
})();
