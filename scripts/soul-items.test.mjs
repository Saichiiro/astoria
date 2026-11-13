// npm test  (node --test scripts/)
// The Âme Damnée items of the inventory feed the soul counters of the fiche.
import test from 'node:test';
import assert from 'node:assert/strict';
import { soulCounterFor, sumSoulCounts } from '../js/domain/soul-items.js';

test('recognises the two Âme Damnée formats by item name or item_key', () => {
    assert.equal(soulCounterFor('Âme Damnée (Corrompue – Format Progression)'), 'prog');
    assert.equal(soulCounterFor('Âme Damnée Corrompue – Format Consommation'), 'conso');
    assert.equal(soulCounterFor('amedamneecorrompueformatprogression'), 'prog');
    assert.equal(soulCounterFor('amedamneecorrompueformatconsommation'), 'conso');
});

test('other souls and items are not counted', () => {
    assert.equal(soulCounterFor('Âme Saine (Âme Pure – Humain)'), null);
    assert.equal(soulCounterFor('Âme Chance'), null);
    assert.equal(soulCounterFor('Parchemin d\'Éveil'), null);
    assert.equal(soulCounterFor(''), null);
});

test('sums owned quantities per counter and ignores bad rows', () => {
    const rows = [
        { item_key: 'amedamneecorrompueformatprogression', qty: 14 },
        { item_key: 'amedamneecorrompueformatconsommation', qty: 16 },
        { item_key: 'amedamneecorrompueformatprogression', qty: 2 },
        { item_key: 'kaels', qty: 30 },
        { item_key: 'amedamneecorrompueformatconsommation', qty: -5 },
        null
    ];
    assert.deepEqual(sumSoulCounts(rows), { conso: 16, prog: 16 });
    assert.deepEqual(sumSoulCounts(undefined), { conso: 0, prog: 0 });
});
