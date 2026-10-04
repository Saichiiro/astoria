// Affichage d'objet : modificateurs, métadonnées, tri, prix, échappement HTML.
// Extrait de inventaire.html sans modification de logique ; exposé via window.astoriaInventoryDisplay.
(function () {
        function getItemModifierTools() {



            return window.astoriaItemModifiers || null;



        }

        function getItemModifiers(item) {



            const tools = getItemModifierTools();



            if (tools?.getModifiers) {



                return tools.getModifiers(item);



            }



            return [];



        }

        function renderModifierBadges(modifiers, limit = 3) {



            const tools = getItemModifierTools();



            const badgeModels = tools?.toBadgeModel ? tools.toBadgeModel(modifiers) : [];



            if (!badgeModels.length) return '';



            const shown = badgeModels.slice(0, Math.max(1, limit));



            const badges = shown.map((badge) => {



                const stateClass = badge.positive ? 'is-positive' : 'is-negative';



                return `<span class="item-modifier-badge ${stateClass}">${escapeHtml(badge.label)}</span>`;



            }).join('');



            const remaining = badgeModels.length - shown.length;



            const more = remaining > 0 ? `<span class="item-modifier-more">+${remaining}</span>` : '';



            return `<div class="item-modifiers-inline">${badges}${more}</div>`;



        }

        function renderModifierLines(modifiers) {



            const tools = getItemModifierTools();



            const badgeModels = tools?.toBadgeModel ? tools.toBadgeModel(modifiers) : [];



            if (!badgeModels.length) return '';



            const rows = badgeModels.map((badge) => {



                const stateClass = badge.positive ? 'is-positive' : 'is-negative';



                return `<li class="item-modifier-line ${stateClass}">${escapeHtml(badge.label)}</li>`;



            }).join('');



            return `<div class="detail-section"><span class="detail-label">Modificateurs</span><ul class="item-modifiers-list">${rows}</ul></div>`;



        }

        function getItemDisplayMeta(item) {
            const helper = window.astoriaItemDisplayMeta;
            const shared = helper?.getDisplayModel ? helper.getDisplayModel(item, { attrsLimit: 4 }) : null;

            const rankRaw = shared?.rank || (helper?.getRank ? helper.getRank(item?.rank || item?.rank_required || item?.required_rank || item?.requiredRank || '') : String(item?.rank || '').trim().toUpperCase());
            const rankLabel = rankRaw && rankRaw !== 'AUCUN' ? rankRaw : '';
            const rarity = shared?.rarity || (helper?.getRarityMeta ? helper.getRarityMeta(item?.rarity || item?.rarete || item?.item_rarity || '') : null);
            const attrs = Array.isArray(shared?.attrs)
                ? shared.attrs
                : (helper?.getAttributesSummary ? helper.getAttributesSummary(item, 4) : []);

            return {
                name: shared?.name || String(item?.name || ''),
                description: shared?.description || String(item?.description || ''),
                category: shared?.category || String(item?.category || ''),
                effectText: shared?.effectText || String(item?.effect || ''),
                effectEntries: Array.isArray(shared?.effectEntries) ? shared.effectEntries : [],
                equipmentSlot: shared?.equipmentSlot || item?.equipment_slot || item?.equipmentSlot || '',
                buy: shared?.price?.buy || String(item?.buyPrice || ''),
                sell: shared?.price?.sell || String(item?.sellPrice || ''),
                rankLabel,
                rarity,
                attrs: Array.isArray(attrs) ? attrs : []
            };
        }

        function sortInventoryItems(items, sortKey) {
            const sorted = [...items];
            switch (sortKey) {
                case 'name-asc':
                    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
                    break;
                case 'name-desc':
                    sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'fr'));
                    break;
                case 'price-desc':
                    sorted.sort((a, b) => parsePrice(b.buyPrice) - parsePrice(a.buyPrice));
                    break;
                case 'price-asc':
                    sorted.sort((a, b) => parsePrice(a.buyPrice) - parsePrice(b.buyPrice));
                    break;
                case 'qty-desc':
                    sorted.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
                    break;
            }
            return sorted;
        }

        function parsePrice(priceStr) {
            if (!priceStr) return 0;
            const num = parseInt(String(priceStr).replace(/[^\d]/g, ''), 10);
            return Number.isFinite(num) ? num : 0;
        }

        function escapeHtml(str) {



            if (!str) return '';



            return String(str)



                .replace(/&/g, '&amp;')



                .replace(/</g, '&lt;')



                .replace(/>/g, '&gt;')



                .replace(/"/g, '&quot;')



                .replace(/'/g, '&#039;');



        }

    window.astoriaInventoryDisplay = Object.freeze({
        getItemModifierTools,
        getItemModifiers,
        renderModifierBadges,
        renderModifierLines,
        getItemDisplayMeta,
        escapeHtml,
        parsePrice,
        sortInventoryItems
    });
})();
