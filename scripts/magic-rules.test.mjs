// npm test  (node --test scripts/)
// Checks the progression rules against the numbers written in issue #14.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// magic-rules.js is a classic browser script: run it with a fake window.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL('../js/domain/magic-rules.js', import.meta.url), 'utf8'), sandbox);
const rules = sandbox.window.astoriaMagicRules;
// Objects built inside the vm have another prototype: compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));

test('Alice: every 5 points a spell/upgrade, every 10 an ultimate', () => {
    assert.deepEqual(plain(rules.aliceTotals(0, 0)), { puissanceMinor: 0, puissanceUltimate: 0, controleMinor: 0, controleUltimate: 0 });
    assert.deepEqual(plain(rules.aliceTotals(9, 4)), { puissanceMinor: 1, puissanceUltimate: 0, controleMinor: 0, controleUltimate: 0 });
    assert.deepEqual(plain(rules.aliceTotals(40, 40)), { puissanceMinor: 8, puissanceUltimate: 4, controleMinor: 8, controleUltimate: 4 });
});

test('Meister: every 5 points of Maîtrise', () => {
    assert.equal(rules.meisterTotals({ maitrise: 4 }).maitrise, 0);
    assert.equal(rules.meisterTotals({ maitrise: 40 }).maitrise, 8);
    assert.equal(rules.meisterTotals({ resonance: 25 }).resonance, 2);
});

test('Weapon: every 10 points of Maîtrise, souls at the listed thresholds', () => {
    assert.equal(rules.weaponTotals({ maitrise: 40 }).maitrise, 4);
    assert.equal(rules.weaponTotals({ maitrise: 9 }).maitrise, 0);
    assert.deepEqual([...rules.WEAPON_SOULS_MINOR_THRESHOLDS], [40, 80, 120, 200, 250, 375, 425]);
    assert.deepEqual([...rules.WEAPON_SOULS_ULTIMATE_THRESHOLDS], [150, 325, 475]);
    assert.equal(rules.weaponTotals({ souls: 39 }).soulsMinor, 0);
    assert.equal(rules.weaponTotals({ souls: 40 }).soulsMinor, 1);
    assert.equal(rules.weaponTotals({ souls: 425 }).soulsMinor, 7);
    assert.equal(rules.weaponTotals({ souls: 149 }).soulsUltimate, 0);
    assert.equal(rules.weaponTotals({ souls: 475 }).soulsUltimate, 3);
});

test('Sorcellerie: awakening and ascension scroll costs', () => {
    assert.deepEqual(plain(['primary', 'secondary', 'hidden', 'none'].map(rules.getEveilCost)), [5, 10, 20, 40]);
    assert.equal(rules.getEveilCost('unknown'), 40);
    assert.equal(rules.getAscensionCost('primary', 1), 5);
    assert.equal(rules.getAscensionCost('primary', 10), 50);
    assert.equal(rules.getAscensionCost('secondary', 10), 55);
    assert.equal(rules.getAscensionCost('hidden', 10), 60);
    assert.equal(rules.getAscensionCost('none', 10), 70);
    assert.equal(rules.getAscensionCost('primary', 11), null);
    assert.equal(rules.getUltimeAscensionCost(1), 100);
    assert.equal(rules.getUltimeAscensionCost(3), 200);
});
