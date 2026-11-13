import { getInventoryRows } from './inventory-service.js';
import { sumSoulCounts } from '../domain/soul-items.js';

// The soul counters of the fiche (Eater tab) are derived from the inventory.
// Other readers (header badge, profile) read them from the fiche-{id}-eater cache,
// so every fresh computation refreshes that cache.

const eaterCacheKey = (characterId) => `fiche-${characterId}-eater`;

/** Computes { conso, prog } from inventory rows and refreshes the local cache. */
export function cacheSoulCounts(characterId, rows) {
    const counts = sumSoulCounts(rows);
    if (!characterId) return counts;
    try {
        const key = eaterCacheKey(characterId);
        const raw = localStorage.getItem(key);
        if (raw || counts.conso > 0 || counts.prog > 0) {
            const data = raw ? JSON.parse(raw) : {};
            if (data.eaterAmesConso !== counts.conso || data.eaterAmesProgression !== counts.prog) {
                localStorage.setItem(key, JSON.stringify({
                    ...data,
                    eaterAmesConso: counts.conso,
                    eaterAmesProgression: counts.prog
                }));
            }
        }
    } catch {
        // storage unavailable: the counts are still returned
    }
    return counts;
}

/** Reads the inventory of the character and returns its soul counts. */
export async function loadSoulCounts(characterId) {
    const rows = await getInventoryRows(characterId);
    return cacheSoulCounts(characterId, rows);
}
