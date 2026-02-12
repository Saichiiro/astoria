/**
 * Inventory Stats Calculator
 * Calculates total stat bonuses from equipped items.
 */

(function () {
    'use strict';

    const HIDDEN_STATS = new Set(['hp', 'hpmax', 'mana', 'manamax']);

    function calculateTotalStats(items) {
        if (!Array.isArray(items) || !items.length) {
            return getEmptyStats();
        }

        const allModifiers = [];

        items.forEach((item) => {
            if (!item) return;
            const itemMods = window.astoriaItemModifiers?.getModifiers(item) || [];
            itemMods.forEach((mod) => {
                allModifiers.push({
                    ...mod,
                    itemName: item.name || 'Item inconnu',
                    quantity: item.quantity || 1
                });
            });
        });

        const aggregated = window.astoriaItemModifiers?.aggregateModifiers(allModifiers) || [];
        const stats = getEmptyStats();

        aggregated.forEach((mod) => {
            const statKey = normalizeStatKey(mod.stat);
            const value = Number(mod.value) || 0;
            if (!statKey || !Number.isFinite(value)) return;

            if (!Object.prototype.hasOwnProperty.call(stats, statKey)) {
                stats[statKey] = 0;
            }
            stats[statKey] += value;

            if (mod.type !== 'percent') {
                stats.totalPoints += value;
            }

            if (!stats.breakdown[statKey]) {
                stats.breakdown[statKey] = [];
            }
            stats.breakdown[statKey].push({
                value,
                type: mod.type,
                source: mod.itemName || mod.source,
                rawStat: mod.stat
            });
        });

        return stats;
    }

    function normalizeStatKey(stat) {
        const normalized = String(stat || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z]/g, '');

        const mapping = {
            attaque: 'attaque',
            attack: 'attaque',
            atk: 'attaque',
            defense: 'defense',
            defence: 'defense',
            def: 'defense',
            magie: 'magie',
            magic: 'magie',
            mag: 'magie',
            vitesse: 'vitesse',
            speed: 'vitesse',
            spd: 'vitesse',
            critique: 'critique',
            crit: 'critique',
            critical: 'critique',
            force: 'force',
            strength: 'force',
            str: 'force',
            agilite: 'agilite',
            agility: 'agilite',
            agi: 'agilite',
            resistance: 'resistance',
            resist: 'resistance',
            res: 'resistance',
            intelligence: 'intelligence',
            int: 'intelligence',
            endurance: 'endurance',
            end: 'endurance',
            durance: 'endurance',
            hp: 'hp',
            pv: 'hp',
            vie: 'hp',
            hpmax: 'hpMax',
            pvmax: 'hpMax',
            viemax: 'hpMax',
            mana: 'mana',
            mp: 'mana',
            manamax: 'manaMax',
            mpmax: 'manaMax',
            glace: 'glace',
            ice: 'glace',
            puissance: 'puissance',
            power: 'puissance',
            pow: 'puissance',
            charme: 'charme',
            charm: 'charme',
            cha: 'charme',
            prestance: 'prestance',
            presence: 'prestance',
            pre: 'prestance'
        };

        return mapping[normalized] || normalized;
    }

    function getEmptyStats() {
        return {
            breakdown: {},
            totalPoints: 0
        };
    }

    function isHiddenStat(statKey) {
        return HIDDEN_STATS.has(String(statKey || '').toLowerCase());
    }

    function getStatLabel(statKey, breakdown) {
        const raw = breakdown?.[0]?.rawStat ? String(breakdown[0].rawStat) : String(statKey || '');
        const clean = raw.replace(/\s+/g, ' ').trim();
        if (!clean) return String(statKey || '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    function getStatIcon() {
        return '*';
    }

    function formatStatValue(statKey, value) {
        const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
        const sign = rounded > 0 ? '+' : '';
        if (statKey === 'critique') {
            return `${sign}${rounded}%`;
        }
        return `${sign}${rounded}`;
    }

    function sortStatEntries(entries) {
        entries.sort((a, b) => {
            const labelCmp = a.label.localeCompare(b.label, 'fr');
            if (labelCmp !== 0) return labelCmp;
            return String(a.key).localeCompare(String(b.key), 'fr');
        });
        return entries;
    }

    function updateStatsDisplay(stats) {
        if (!stats) stats = getEmptyStats();

        const dynamicContainer = document.getElementById('statsDynamicList');
        if (dynamicContainer) {
            const entries = Object.entries(stats)
                .filter(([key]) => key !== 'breakdown' && key !== 'totalPoints')
                .filter(([, value]) => typeof value === 'number' && value !== 0 && Number.isFinite(value))
                .filter(([key]) => !isHiddenStat(key))
                .map(([key, value]) => ({
                    key,
                    value,
                    label: getStatLabel(key, stats.breakdown?.[key]),
                    icon: getStatIcon(key)
                }));

            sortStatEntries(entries);

            if (!entries.length) {
                dynamicContainer.innerHTML = '<div class="stats-dynamic-empty">Aucun bonus d\'equipement actif.</div>';
            } else {
                dynamicContainer.innerHTML = entries
                    .map((entry) => `
                        <div class="stat-row">
                            <span class="stat-label"><span class="stat-icon">${entry.icon}</span> ${entry.label}</span>
                            <span class="stat-value stat-bonus">${formatStatValue(entry.key, entry.value)}</span>
                        </div>
                    `)
                    .join('');
            }
        }

        displayStatsBreakdown(stats.breakdown);
    }

    function displayStatsBreakdown() {
        // Reserved for future tooltip details.
    }

    function formatStatBreakdown(statName, breakdown) {
        if (!breakdown || !breakdown.length) return null;

        const total = breakdown.reduce((sum, item) => sum + item.value, 0);
        const details = breakdown
            .filter((item) => item.value !== 0)
            .map((item) => {
                const sign = item.value > 0 ? '+' : '';
                return `${sign}${item.value} ${item.source}`;
            })
            .join(', ');

        return `${statName}: ${total} (${details})`;
    }

    window.InventoryStats = {
        calculateTotalStats,
        updateStatsDisplay,
        formatStatBreakdown,
        getEmptyStats
    };

    console.log('[Inventory Stats] Module loaded');
})();
