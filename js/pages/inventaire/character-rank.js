// Rang du personnage : lecture des compétences et calcul.
// Extrait de inventaire.html sans modification de logique ; exposé via window.astoriaInventoryRank.
(function () {
        function normalizeRankText(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
        }

        function loadScopedJson(rawKey, characterId) {
            const scoped = characterId ? `astoria_competences_${characterId}:${rawKey}` : rawKey;
            const candidates = [scoped, rawKey];
            for (const key of candidates) {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                        return parsed;
                    }
                } catch {}
            }
            return {};
        }

        function getCategoryCompetenceTotal(snapshot, categoryId) {
            const baseValues = snapshot?.baseValuesByCategory?.[categoryId];
            const allocations = snapshot?.allocationsByCategory?.[categoryId];
            const baseObj = (baseValues && typeof baseValues === 'object') ? baseValues : {};
            const allocObj = (allocations && typeof allocations === 'object') ? allocations : {};
            const keys = new Set([...Object.keys(baseObj), ...Object.keys(allocObj)]);

            let total = 0;
            keys.forEach((skillName) => {
                const base = Number(baseObj[skillName]) || 0;
                const alloc = Number(allocObj[skillName]) || 0;
                const value = base + alloc;
                if (Number.isFinite(value) && value > 0) {
                    total += value;
                }
            });
            return total;
        }

        function hasRankCompetenceData(snapshot, categoryIds) {
            return categoryIds.some((categoryId) => {
                const base = snapshot?.baseValuesByCategory?.[categoryId];
                const alloc = snapshot?.allocationsByCategory?.[categoryId];
                return (
                    base && typeof base === 'object' && Object.keys(base).length > 0
                ) || (
                    alloc && typeof alloc === 'object' && Object.keys(alloc).length > 0
                );
            });
        }

    window.astoriaInventoryRank = Object.freeze({
        normalizeRankText,
        loadScopedJson,
        getCategoryCompetenceTotal,
        hasRankCompetenceData
    });
})();
