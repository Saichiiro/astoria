/**
 * Inventory Stats Calculator
 * Calculates total stat bonuses from all items in inventory
 */

(function() {
    'use strict';

    /**
     * Calculate total stats from inventory items
     * @param {Array} items - Array of inventory items
     * @returns {Object} Total stats by category
     */
    function calculateTotalStats(items) {
        if (!items || !Array.isArray(items)) {
            return getEmptyStats();
        }

        // Collect all modifiers from all items
        const allModifiers = [];

        items.forEach(item => {
            if (!item) return;

            // Get modifiers for this item using the existing system
            const itemMods = window.astoriaItemModifiers?.getModifiers(item) || [];

            // Add source information for tracking
            itemMods.forEach(mod => {
                allModifiers.push({
                    ...mod,
                    itemName: item.name || 'Item inconnu',
                    quantity: item.quantity || 1
                });
            });
        });

        // Aggregate modifiers using the existing system
        const aggregated = window.astoriaItemModifiers?.aggregateModifiers(allModifiers) || [];

        // Group by stat type
        const stats = {
            // Combat stats
            attaque: 0,
            defense: 0,
            magie: 0,

            // Secondary stats
            vitesse: 0,
            critique: 0,
            force: 0,

            // Additional stats
            agilite: 0,
            resistance: 0,
            intelligence: 0,
            endurance: 0,

            // HP/Mana
            hp: 0,
            hpMax: 0,
            mana: 0,
            manaMax: 0,

            // Detailed breakdown for tooltips
            breakdown: {}
        };

        aggregated.forEach(mod => {
            const statKey = normalizeStatKey(mod.stat);
            const value = mod.value || 0;

            // Add to total
            if (stats.hasOwnProperty(statKey)) {
                stats[statKey] += value;
            }

            // Track breakdown for tooltips
            if (!stats.breakdown[statKey]) {
                stats.breakdown[statKey] = [];
            }
            stats.breakdown[statKey].push({
                value: value,
                type: mod.type,
                source: mod.itemName || mod.source
            });
        });

        return stats;
    }

    /**
     * Normalize stat names to consistent keys
     */
    function normalizeStatKey(stat) {
        const normalized = String(stat || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z]/g, '');

        // Map variations to standard keys
        const mapping = {
            'attaque': 'attaque',
            'attack': 'attaque',
            'atk': 'attaque',

            'defense': 'defense',
            'defence': 'defense',
            'def': 'defense',

            'magie': 'magie',
            'magic': 'magie',
            'mag': 'magie',

            'vitesse': 'vitesse',
            'speed': 'vitesse',
            'spd': 'vitesse',

            'critique': 'critique',
            'crit': 'critique',
            'critical': 'critique',

            'force': 'force',
            'strength': 'force',
            'str': 'force',

            'agilite': 'agilite',
            'agility': 'agilite',
            'agi': 'agilite',

            'resistance': 'resistance',
            'resist': 'resistance',
            'res': 'resistance',

            'intelligence': 'intelligence',
            'int': 'intelligence',

            'endurance': 'endurance',
            'end': 'endurance',

            'hp': 'hp',
            'pv': 'hp',
            'vie': 'hp',

            'hpmax': 'hpMax',
            'pvmax': 'hpMax',
            'viemax': 'hpMax',

            'mana': 'mana',
            'mp': 'mana',

            'manamax': 'manaMax',
            'mpmax': 'manaMax'
        };

        return mapping[normalized] || normalized;
    }

    /**
     * Get empty stats object
     */
    function getEmptyStats() {
        return {
            attaque: 0,
            defense: 0,
            magie: 0,
            vitesse: 0,
            critique: 0,
            force: 0,
            agilite: 0,
            resistance: 0,
            intelligence: 0,
            endurance: 0,
            hp: 0,
            hpMax: 0,
            mana: 0,
            manaMax: 0,
            breakdown: {}
        };
    }

    /**
     * Update stats display in the UI
     */
    function updateStatsDisplay(stats) {
        if (!stats) stats = getEmptyStats();

        // Update stat values in the UI
        const updates = {
            'statAttack': stats.attaque,
            'statDefense': stats.defense,
            'statMagic': stats.magie,
            'statSpeed': stats.vitesse,
            'statCrit': stats.critique + '%',
            'statStrength': stats.force
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;

                // Add visual feedback for bonuses
                if (typeof value === 'number' && value > 0) {
                    element.classList.add('stat-bonus');
                } else {
                    element.classList.remove('stat-bonus');
                }
            }
        });

        // Update HP/Mana if bonuses exist
        if (stats.hpMax > 0) {
            const hpValue = document.getElementById('hpValue');
            if (hpValue) {
                const currentText = hpValue.textContent;
                const match = currentText.match(/(\d+)\s*\/\s*(\d+)/);
                if (match) {
                    const current = parseInt(match[1]);
                    const newMax = parseInt(match[2]) + stats.hpMax;
                    hpValue.textContent = `${current} / ${newMax}`;
                }
            }
        }

        if (stats.manaMax > 0) {
            const manaValue = document.getElementById('manaValue');
            if (manaValue) {
                const currentText = manaValue.textContent;
                const match = currentText.match(/(\d+)\s*\/\s*(\d+)/);
                if (match) {
                    const current = parseInt(match[1]);
                    const newMax = parseInt(match[2]) + stats.manaMax;
                    manaValue.textContent = `${current} / ${newMax}`;
                }
            }
        }

        // Show breakdown tooltip (optional enhancement)
        displayStatsBreakdown(stats.breakdown);
    }

    /**
     * Display detailed stats breakdown (for hover tooltips)
     */
    function displayStatsBreakdown(breakdown) {
        // This can be enhanced later to show tooltips like:
        // Force: 5 (+2 épaulettes, +3 plastron)
        // For now, just log it for debugging
        if (Object.keys(breakdown).length > 0) {
            console.log('[Inventory Stats] Breakdown:', breakdown);
        }
    }

    /**
     * Format stat breakdown for display
     * Example: "Force: 5 (+2 épaulettes, +3 plastron)"
     */
    function formatStatBreakdown(statName, breakdown) {
        if (!breakdown || breakdown.length === 0) return null;

        const total = breakdown.reduce((sum, item) => sum + item.value, 0);
        const details = breakdown
            .filter(item => item.value !== 0)
            .map(item => {
                const sign = item.value > 0 ? '+' : '';
                return `${sign}${item.value} ${item.source}`;
            })
            .join(', ');

        return `${statName}: ${total} (${details})`;
    }

    // Export functions to global scope
    window.InventoryStats = {
        calculateTotalStats,
        updateStatsDisplay,
        formatStatBreakdown,
        getEmptyStats
    };

    console.log('[Inventory Stats] Module loaded');
})();
