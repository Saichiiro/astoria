// Magic progression rules, shared by the fiche (Sorcellerie unlock) and the magic
// page (capacities & spells). Pure data and arithmetic: no DOM, no storage, so
// they can be tested with `node --test` and changed in one place.
// Loaded as a classic script (window.astoriaMagicRules) and as a CommonJS module.
(function (root, factory) {
    const rules = factory();
    if (typeof module === 'object' && module.exports) module.exports = rules;
    if (root) root.astoriaMagicRules = rules;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    // Sorcellerie: awakening scrolls to unlock a magic, by affinity type.
    const EVEIL_COSTS = Object.freeze({ primary: 5, secondary: 10, hidden: 20, none: 40 });

    // Sorcellerie: ascension scrolls for each new ascension level, by affinity type.
    const ASCENSION_COSTS = Object.freeze({
        primary: Object.freeze([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]),
        secondary: Object.freeze([10, 15, 20, 25, 30, 35, 40, 45, 50, 55]),
        hidden: Object.freeze([15, 20, 25, 30, 35, 40, 45, 50, 55, 60]),
        none: Object.freeze([25, 30, 35, 40, 45, 50, 55, 60, 65, 70])
    });

    // Ultimate spells for sorcellerie: 100 scrolls, then +50 per level.
    const ULTIME_BASE_COST = 100;
    const ULTIME_COST_STEP = 50;

    // Weapon: souls of progression needed for each new minor / ultimate fragment.
    const WEAPON_SOULS_MINOR_THRESHOLDS = Object.freeze([40, 80, 120, 200, 250, 375, 425]);
    const WEAPON_SOULS_ULTIMATE_THRESHOLDS = Object.freeze([150, 325, 475]);

    // Points of a competence per unlock.
    const STEPS = Object.freeze({
        aliceMinor: 5,       // Contrôle / Puissance Alice: new spell / upgrade
        aliceUltimate: 10,   // ... ultimate spell / upgrade
        meisterMaitrise: 5,  // Maîtrise de la capacité unique (Meister)
        meisterPuissance: 5, // Puissance de la capacité unique (Meister)
        meisterResonance: 10,// Résonnance des Âmes (Meister): ultimate upgrade
        weaponMaitrise: 10,  // Maîtrise de la capacité unique (Weapon)
        weaponPuissance: 5   // Puissance de la capacité unique (Weapon)
    });

    const count = (value, step) => Math.floor((Number(value) || 0) / step);
    const reached = (value, thresholds) => thresholds.filter((threshold) => (Number(value) || 0) >= threshold).length;

    function getEveilCost(type) {
        return EVEIL_COSTS[type] ?? EVEIL_COSTS.none;
    }

    // Cost of reaching `level` (1-based); null past the last level.
    function getAscensionCost(type, level) {
        const list = ASCENSION_COSTS[type] || ASCENSION_COSTS.none;
        return list[level - 1] ?? null;
    }

    function getUltimeAscensionCost(level) {
        return ULTIME_BASE_COST + Math.max(0, Number(level) - 1) * ULTIME_COST_STEP;
    }

    // Totals earned (before subtracting what was already spent).
    function aliceTotals(puissance, controle) {
        return {
            puissanceMinor: count(puissance, STEPS.aliceMinor),
            puissanceUltimate: count(puissance, STEPS.aliceUltimate),
            controleMinor: count(controle, STEPS.aliceMinor),
            controleUltimate: count(controle, STEPS.aliceUltimate)
        };
    }

    function weaponTotals({ puissance, maitrise, souls }) {
        return {
            puissance: count(puissance, STEPS.weaponPuissance),
            maitrise: count(maitrise, STEPS.weaponMaitrise),
            soulsMinor: reached(souls, WEAPON_SOULS_MINOR_THRESHOLDS),
            soulsUltimate: reached(souls, WEAPON_SOULS_ULTIMATE_THRESHOLDS)
        };
    }

    function meisterTotals({ resonance, puissance, maitrise }) {
        return {
            resonance: count(resonance, STEPS.meisterResonance),
            puissance: count(puissance, STEPS.meisterPuissance),
            maitrise: count(maitrise, STEPS.meisterMaitrise)
        };
    }

    return Object.freeze({
        EVEIL_COSTS,
        ASCENSION_COSTS,
        WEAPON_SOULS_MINOR_THRESHOLDS,
        WEAPON_SOULS_ULTIMATE_THRESHOLDS,
        STEPS,
        getEveilCost,
        getAscensionCost,
        getUltimeAscensionCost,
        aliceTotals,
        weaponTotals,
        meisterTotals
    });
});
