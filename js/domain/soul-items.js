// Soul items of the inventory and the counter each one feeds (fiche > Eater).
// Matching works on a squashed form of the item name / item_key (no accents, case or
// punctuation), so "Âme Damnée (Corrompue – Format Progression)" and its item_key
// "amedamneecorrompueformatprogression" are recognised the same way.

const squash = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

// counter: "prog" = souls of progression, "conso" = souls of consumption.
export const SOUL_ITEM_RULES = Object.freeze([
    Object.freeze({ counter: "prog", all: Object.freeze(["amedamnee", "progression"]) }),
    Object.freeze({ counter: "conso", all: Object.freeze(["amedamnee", "consommation"]) })
]);

export function soulCounterFor(nameOrKey) {
    const text = squash(nameOrKey);
    if (!text) return null;
    const rule = SOUL_ITEM_RULES.find((entry) => entry.all.every((part) => text.includes(part)));
    return rule ? rule.counter : null;
}

// rows: inventory rows ({ item_key, qty }) -> { conso, prog } owned quantities.
export function sumSoulCounts(rows) {
    const totals = { conso: 0, prog: 0 };
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const counter = soulCounterFor(row?.item_key ?? row?.name);
        if (!counter) return;
        totals[counter] += Math.max(0, Math.floor(Number(row?.qty) || 0));
    });
    return totals;
}
