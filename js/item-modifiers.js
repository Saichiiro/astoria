(function () {
    function normalizeKey(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
    }

    function toNumber(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function normalizeModifier(raw) {
        if (!raw || typeof raw !== "object") return null;
        const stat = String(raw.stat || raw.skill || "").trim();
        if (!stat) return null;
        const value = toNumber(raw.value);
        if (!Number.isFinite(value) || value === 0) return null;
        const type = String(raw.type || "").toLowerCase() === "percent" ? "percent" : "flat";
        return {
            stat,
            value,
            type,
            source: raw.source ? String(raw.source) : "",
            durationTurns: Number.isFinite(Number(raw.durationTurns)) ? Math.max(0, Math.floor(Number(raw.durationTurns))) : null
        };
    }

    function parseEffectModifiers(effect) {
        const text = String(effect || "");
        if (!text) return [];

        const result = [];
        const regex = /([+-]\d+)\s*(%|pour\s*cent|points?)?\s*(?:de|d'|en)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,40})/gi;
        let match;
        while ((match = regex.exec(text))) {
            const signedValue = toNumber(match[1]);
            if (!signedValue) continue;
            const unit = String(match[2] || "").toLowerCase();
            const statRaw = String(match[3] || "").trim();
            const stat = statRaw
                .replace(/\s+(pendant|dur[eé]e|tour|tours|recharge|rayon).*/i, "")
                .trim();
            if (!stat) continue;
            result.push({
                stat,
                value: signedValue,
                type: unit.includes("%") || unit.includes("pour") ? "percent" : "flat",
                source: "effect"
            });
        }
        return dedupeModifiers(result);
    }

    function dedupeModifiers(modifiers) {
        const seen = new Set();
        const out = [];
        (Array.isArray(modifiers) ? modifiers : []).forEach((modifier) => {
            const normalized = normalizeModifier(modifier);
            if (!normalized) return;
            const key = `${normalizeKey(normalized.stat)}|${normalized.type}|${normalized.value}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push(normalized);
        });
        return out;
    }

    function getModifiers(item) {
        if (!item || typeof item !== "object") return [];

        // Priority 1: Read from modifiers field (structured JSONB data)
        if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
            return dedupeModifiers(item.modifiers);
        }

        // Priority 2: Parse modifiers from string if it's a JSON string
        if (typeof item.modifiers === 'string' && item.modifiers !== '[]' && item.modifiers !== '') {
            try {
                const parsed = JSON.parse(item.modifiers);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return dedupeModifiers(parsed);
                }
            } catch (e) {
                // Not valid JSON, continue to fallback
            }
        }

        // Priority 3: Fallback to parsing effect text (backward compatibility)
        return parseEffectModifiers(item.effect || item.effet || "");
    }

    function formatModifier(modifier) {
        const m = normalizeModifier(modifier);
        if (!m) return "";
        const sign = m.value > 0 ? "+" : "";
        const suffix = m.type === "percent" ? "%" : "";
        return `${sign}${m.value}${suffix} ${m.stat}`;
    }

    function toBadgeModel(modifiers) {
        return dedupeModifiers(modifiers).map((modifier) => ({
            key: `${normalizeKey(modifier.stat)}-${modifier.type}-${modifier.value}`,
            label: formatModifier(modifier),
            positive: modifier.value > 0
        }));
    }

    function aggregateModifiers(modifiers) {
        const map = new Map();
        (Array.isArray(modifiers) ? modifiers : []).forEach((raw) => {
            const modifier = normalizeModifier(raw);
            if (!modifier) return;
            const key = `${normalizeKey(modifier.stat)}|${modifier.type}`;
            const current = map.get(key) || { stat: modifier.stat, type: modifier.type, value: 0 };
            current.value += modifier.value;
            map.set(key, current);
        });
        return Array.from(map.values()).filter((entry) => entry.value !== 0);
    }

    window.astoriaItemModifiers = {
        normalizeKey,
        getModifiers,
        parseEffectModifiers,
        dedupeModifiers,
        aggregateModifiers,
        formatModifier,
        toBadgeModel
    };
})();
