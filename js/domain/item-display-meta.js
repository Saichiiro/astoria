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

    function firstNonEmpty(...values) {
        for (let i = 0; i < values.length; i += 1) {
            const value = values[i];
            if (value === null || value === undefined) continue;
            const text = String(value).trim();
            if (text) return text;
        }
        return "";
    }

    function normalizeEffectText(value) {
        return String(value || "")
            .replace(/^(?:effets?\s*:\s*)+/i, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function getName(item) {
        return firstNonEmpty(item?.name, item?.nom);
    }

    function getDescription(item) {
        return firstNonEmpty(item?.description, item?.desc);
    }

    function getEffectText(item) {
        const raw = firstNonEmpty(item?.effect, item?.effet, item?.effects);
        return normalizeEffectText(raw);
    }

    function getEffectEntries(item) {
        const normalized = getEffectText(item);
        if (!normalized) return [];
        const chunks = normalized
            .split(/\n+|\u2022|;/g)
            .map((part) => part.trim())
            .filter(Boolean);
        return chunks.length > 1 ? chunks : [normalized];
    }

    function getCategory(item) {
        return firstNonEmpty(item?.category, item?.categorie).toLowerCase();
    }

    function getEquipmentSlot(item) {
        return firstNonEmpty(item?.equipment_slot, item?.equipmentSlot);
    }

    function getPriceMeta(item) {
        const buy = firstNonEmpty(item?.buyPrice, item?.buy_price, item?.buy);
        const sell = firstNonEmpty(item?.sellPrice, item?.sell_price, item?.sell);
        if (buy || sell) {
            return {
                buy,
                sell,
                summary: [buy ? `${buy} (achat)` : "", sell ? `${sell} (vente)` : ""].filter(Boolean).join(" | ")
            };
        }

        const kaels = Number(item?.price_kaels);
        if (Number.isFinite(kaels) && kaels > 0) {
            return {
                buy: `${kaels} kaels`,
                sell: `${kaels} kaels`,
                summary: `${kaels} kaels`
            };
        }

        return { buy: "", sell: "", summary: "" };
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

    function getDisplayModel(item, options = {}) {
        const attrsLimit = Math.max(1, Number(options.attrsLimit) || 4);
        const rarity = getRarityMeta(item?.rarity || item?.rarete || item?.item_rarity || "");
        const rank = getRank(item?.rank || item?.rank_required || item?.required_rank || item?.requiredRank || "");
        const attrs = getAttributesSummary(item, attrsLimit);
        const price = getPriceMeta(item);
        return {
            name: getName(item),
            description: getDescription(item),
            effectText: getEffectText(item),
            effectEntries: getEffectEntries(item),
            category: getCategory(item),
            equipmentSlot: getEquipmentSlot(item),
            rarity,
            rank,
            attrs,
            price
        };
    }

    window.astoriaItemDisplayMeta = {
        normalizeRarity,
        getRarityMeta,
        getRank,
        getAttributesSummary,
        getName,
        getDescription,
        getEffectText,
        getEffectEntries,
        getCategory,
        getEquipmentSlot,
        getPriceMeta,
        getDisplayModel
    };
})();
