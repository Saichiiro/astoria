(function () {
    const RARITY_META = Object.freeze({
        commun: { label: "Commun", color: "#d9d9df" },
        rare: { label: "Rare", color: "#4ea8ff" },
        epique: { label: "Epique", color: "#8b5bff" },
        mythique: { label: "Mythique", color: "#ff9a3d" },
        legendaire: { label: "Legendaire", color: "#ffd349" }
    });

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function normalizeRarity(value) {
        const key = normalizeText(value);
        if (!key) return "";
        if (key === "common") return "commun";
        if (key === "epic") return "epique";
        if (key === "mythic") return "mythique";
        if (key === "legendary") return "legendaire";
        return RARITY_META[key] ? key : "";
    }

    function getRarityMeta(value) {
        const key = normalizeRarity(value);
        if (!key) return null;
        return {
            key,
            label: RARITY_META[key].label,
            color: RARITY_META[key].color
        };
    }

    function getRank(value) {
        const rank = String(value || "").trim().toUpperCase();
        return rank || "";
    }

    function getAttributesSummary(item, limit = 4) {
        const tools = window.astoriaItemModifiers;
        if (!tools?.getModifiers || !tools?.aggregateModifiers || !tools?.formatModifier) {
            return [];
        }
        const modifiers = tools.getModifiers(item);
        const aggregated = tools.aggregateModifiers(modifiers);
        if (!Array.isArray(aggregated) || aggregated.length === 0) return [];
        return aggregated
            .slice(0, Math.max(1, Number(limit) || 4))
            .map((entry) => tools.formatModifier(entry))
            .filter(Boolean);
    }

    window.astoriaItemDisplayMeta = {
        normalizeRarity,
        getRarityMeta,
        getRank,
        getAttributesSummary
    };
})();

