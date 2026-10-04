// Catalogue d'objets : résolution par id/nom/index, objets supprimés localement, mapping des lignes DB.
// Extrait de inventaire.html sans modification de logique ; exposé via window.astoriaInventoryCatalog.
(function () {
        function safeJson(value) {



            if (!value) return {};



            if (typeof value === 'object') return value;



            if (typeof value === 'string') {



                try {



                    return JSON.parse(value);



                } catch {



                    return {};



                }



            }



            return {};



        }

        function normalizeItemName(name) {



            return String(name || '')



                .normalize('NFD')



                .replace(/[\u0300-\u036f]/g, '')



                .replace(/[^a-zA-Z0-9]+/g, '')



                .toLowerCase();



        }

        const ITEM_TOMBSTONES_KEY = 'astoriaItemTombstones';

        function getItemTombstones() {



            try {



                const raw = localStorage.getItem(ITEM_TOMBSTONES_KEY);



                const parsed = raw ? JSON.parse(raw) : [];



                return Array.isArray(parsed) ? parsed : [];



            } catch {



                return [];



            }



        }

        function isLocalItemTombstoned(item) {



            if (!item || item._dbId || item.source === 'db') return false;



            const key = normalizeItemName(item.name || item.nom || '');



            if (!key) return false;



            const tombstones = getItemTombstones();



            return tombstones.includes(key);



        }

        function resolveItemByKey(itemKey, itemIndex, itemId) {
            // Use the full source list for stable index mapping.
            const sourceItems = Array.isArray(window.inventoryData) ? window.inventoryData : [];

            const normalizedItemId = String(itemId || '').trim().toLowerCase();
            if (normalizedItemId) {
                const byId = sourceItems.findIndex((entry) =>
                    String(entry?.id || '').trim().toLowerCase() === normalizedItemId
                );
                if (byId >= 0) {
                    return { item: sourceItems[byId], index: byId };
                }
            }

            // item_key is the canonical identifier: prefer it over index.
            const normalizedKey = normalizeItemName(itemKey);
            if (normalizedKey) {
                const byName = sourceItems.findIndex((entry) =>
                    normalizeItemName(entry?.name || entry?.nom || '') === normalizedKey
                );
                if (byName >= 0) {
                    return { item: sourceItems[byName], index: byName };
                }
            }

            // Legacy fallback: old rows may only have a numeric index.
            const numericIndex = Number.isFinite(Number(itemIndex)) ? Number(itemIndex) : null;
            if (numericIndex != null && numericIndex >= 0 && sourceItems[numericIndex]) {
                return { item: sourceItems[numericIndex], index: numericIndex };
            }

            const numericKey = Number.isFinite(Number(itemKey)) ? Number(itemKey) : null;
            if (numericKey != null && numericKey >= 0 && sourceItems[numericKey]) {
                return { item: sourceItems[numericKey], index: numericKey };
            }

            return { item: null, index: -1 };
        }

        function mapDbItem(row) {



            const images = safeJson(row.images);



            const modifiers = safeJson(row.modifiers);



            const primary = images.primary || images.url || row.image || row.image_url || '';



            const priceText = row.price_kaels ? `${row.price_kaels} kaels` : '';



            return {



                _dbId: row.id,



                source: 'db',



                name: row.name || '',



                description: row.description || '',



                effect: row.effect || '',



                category: row.category || '',



                buyPrice: priceText,



                sellPrice: priceText,



                modifiers: Array.isArray(modifiers) ? modifiers : [],



                image: primary,



                images: images,
                rarity: row.rarity || row.rarete || '',
                rank: row.rank || row.rank_required || row.required_rank || '',



                equipment_slot: row.equipment_slot || ''



            };



        }

    window.astoriaInventoryCatalog = Object.freeze({
        safeJson,
        normalizeItemName,
        ITEM_TOMBSTONES_KEY,
        getItemTombstones,
        isLocalItemTombstoned,
        resolveItemByKey,
        mapDbItem
    });
})();
