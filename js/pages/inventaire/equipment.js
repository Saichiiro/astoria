// Équipement : emplacements, armes une/deux mains, objets équipés.
// Extrait de inventaire.html sans modification de logique ; exposé via window.astoriaInventoryEquipment.
(function () {
    const { resolveItemByKey } = window.astoriaInventoryCatalog;

        const EQUIPMENT_SLOT_DEFS = [
            { key: 'head', label: 'Casque', icon: '🪖' },
            { key: 'cape', label: 'Cape', icon: '🧣' },
            { key: 'shoulders', label: 'Epaulettes', icon: '🎖️' },
            { key: 'amulet', label: 'Collier', icon: '📿' },
            { key: 'chest', label: 'Plastron', icon: '🎽' },
            { key: 'gloves', label: 'Gantelets', icon: '🧤' },
            { key: 'belt', label: 'Ceinture', icon: '🎗️' },
            { key: 'ring1', label: 'Anneau', icon: '💍' },
            { key: 'boots', label: 'Bottes', icon: '🥾' },
            { key: 'ring2', label: 'Anneau', icon: '💍' },
            { key: 'artifact', label: 'Artefact', icon: '🔮' },
            { key: 'weapon', label: 'Arme', icon: '⚔️' },
            { key: 'offhand', label: 'Arme secondaire', icon: '🛡️' },
            { key: 'companion', label: 'Familier', icon: '🐾' },
            { key: 'mount', label: 'Monture', icon: '🐴' }
        ];

        function getStableItemRef(item) {
            if (!item) return '';
            return String(
                item.item_id ||
                item._dbId ||
                item.dbItemId ||
                item.id ||
                item.itemKey ||
                item.name ||
                ''
            ).trim().toLowerCase();
        }

        function isSameItemRef(a, b) {
            const left = getStableItemRef(a);
            const right = getStableItemRef(b);
            return Boolean(left && right && left === right);
        }

        function isItemEquippable(item) {



            return Boolean(item && !item.isCurrency && item.category === 'equipement');



        }

        /**
         * Map codex equipment_slot values (French) to inventory slot keys (English)
         * Weapons: 'arme'/'arme-une-main' can go in weapon OR offhand
         *          'arme-deux-mains' goes in weapon only and blocks offhand
         */
        const SLOT_MAP = {
            'casque': 'head',
            'cape': 'cape',
            'epaulettes': 'shoulders',
            'collier': 'amulet',
            'plastron': 'chest',
            'ceinture': 'belt',
            'gantelets': 'gloves',
            'anneau': 'anneau',
            'bottes': 'boots',
            'arme': 'weapon',
            'arme-principale': 'weapon',
            'arme-une-main': 'weapon',
            'arme-deux-mains': 'weapon',
            'arme-secondaire': 'offhand',
            'artefact': 'artifact',
            'familier': 'companion',
            'monture': 'mount'
        };

        // Weapon types
        const TWO_HANDED_SLOT = 'arme-deux-mains';

        const ONE_HANDED_WEAPONS = ['arme', 'arme-principale', 'arme-une-main'];

        function isTwoHandedWeapon(rawSlot) {
            return rawSlot === TWO_HANDED_SLOT;
        }

        function isOneHandedWeapon(rawSlot) {
            return ONE_HANDED_WEAPONS.includes(rawSlot);
        }

        function getRawSlot(item) {
            return item?.equipment_slot || item?.equipmentSlot || null;
        }

        const SLOT_DISPLAY_NAMES = {
            'casque': 'Casque',
            'cape': 'Cape',
            'epaulettes': 'Épaulettes',
            'collier': 'Collier',
            'plastron': 'Plastron',
            'ceinture': 'Ceinture',
            'gantelets': 'Gantelets',
            'anneau': 'Anneau',
            'bottes': 'Bottes',
            'arme': 'Arme',
            'arme-principale': 'Arme principale',
            'arme-une-main': 'Arme (une main)',
            'arme-deux-mains': 'Arme (deux mains)',
            'arme-secondaire': 'Arme secondaire',
            'artefact': 'Artefact',
            'familier': 'Familier',
            'monture': 'Monture'
        };

        function getSlotDisplayName(rawSlot) {
            if (!rawSlot) return '';
            return SLOT_DISPLAY_NAMES[rawSlot] || rawSlot;
        }

        function normalizeSlot(rawSlot) {
            if (!rawSlot) return null;
            return SLOT_MAP[rawSlot] || rawSlot;
        }

        /**
         * Get the normalized equipment slot from an item
         * Checks both equipment_slot (DB) and equipmentSlot (JS) fields
         */
        function getItemSlot(item) {
            const raw = item?.equipment_slot || item?.equipmentSlot || null;
            return normalizeSlot(raw);
        }

        function buildEquippedItem(itemKey, itemIndex, itemId) {



            const resolved = resolveItemByKey(itemKey, itemIndex, itemId);



            const sourceItem = resolved?.item;



            if (!sourceItem) return null;



            return {



                sourceIndex: Number.isFinite(resolved.index) ? resolved.index : null,
                item_id: sourceItem?.id || itemId || null,



                name: sourceItem.name,



                category: sourceItem.category,



                image: sourceItem.image,



                images: sourceItem.images,



                description: sourceItem.description,



                effect: sourceItem.effect,
                rarity: sourceItem.rarity || sourceItem.rarete || '',
                rank: sourceItem.rank || sourceItem.rank_required || sourceItem.required_rank || '',



                modifiers: Array.isArray(sourceItem.modifiers) ? sourceItem.modifiers : [],
                buyPrice: sourceItem.buyPrice,
                sellPrice: sourceItem.sellPrice,
                equipment_slot: sourceItem.equipment_slot || '',
                quantity: 1
            };



        }

        function normalizeEquippedSlots(rawSlots) {



            if (!rawSlots || typeof rawSlots !== 'object') return {};



            const normalized = {};



            EQUIPMENT_SLOT_DEFS.forEach((slot) => {



                const entry = rawSlots[slot.key];



                if (!entry) return;



                const equippedItem = buildEquippedItem(
                    entry.item_key || entry.name,
                    entry.item_index ?? entry.sourceIndex,
                    entry.item_id || null
                );



                if (!equippedItem || !isItemEquippable(equippedItem)) return;



                normalized[slot.key] = equippedItem;



            });



            return normalized;



        }

    window.astoriaInventoryEquipment = Object.freeze({
        EQUIPMENT_SLOT_DEFS,
        SLOT_MAP,
        TWO_HANDED_SLOT,
        ONE_HANDED_WEAPONS,
        isTwoHandedWeapon,
        isOneHandedWeapon,
        getRawSlot,
        SLOT_DISPLAY_NAMES,
        getSlotDisplayName,
        normalizeSlot,
        getItemSlot,
        isItemEquippable,
        getStableItemRef,
        isSameItemRef,
        buildEquippedItem,
        normalizeEquippedSlots
    });
})();
