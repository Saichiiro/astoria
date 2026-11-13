import { getInventoryRows } from './inventory-service.js';
import { patchCharacterProfile } from './profile-patch-service.js';
import { sumSoulCounts } from '../domain/soul-items.js';

// Soul counters of the fiche (Eater tab, Weapon class):
// - consommation: consumable souls, always the quantity currently in the inventory
//   (they are gained and spent regularly);
// - progression: never lost by itself. It is a high-water mark stored in
//   profile_data.eater.eaterAmesProgression and only goes up with the inventory.
//   Losing them all (a roleplay event) is an admin edit of that field.
// Other readers (header badge, profile) read the fiche-{id}-eater cache, so every
// fresh computation refreshes it.

const eaterCacheKey = (characterId) => `fiche-${characterId}-eater`;

function writeCache(characterId, counts) {
    if (!characterId) return;
    try {
        const key = eaterCacheKey(characterId);
        const raw = localStorage.getItem(key);
        if (!raw && counts.conso <= 0 && counts.prog <= 0) return;
        const data = raw ? JSON.parse(raw) : {};
        if (data.eaterAmesConso === counts.conso && data.eaterAmesProgression === counts.prog) return;
        localStorage.setItem(key, JSON.stringify({
            ...data,
            eaterAmesConso: counts.conso,
            eaterAmesProgression: counts.prog
        }));
    } catch {
        // storage unavailable: the counts are still returned
    }
}

/**
 * Soul counters from inventory rows (no network). `storedProg` is the progression
 * already saved on the profile; the result never goes below it.
 */
export function cacheSoulCounts(characterId, rows, storedProg = 0) {
    const owned = sumSoulCounts(rows);
    const counts = { conso: owned.conso, prog: Math.max(owned.prog, Number(storedProg) || 0) };
    writeCache(characterId, counts);
    return counts;
}

/**
 * Reads the inventory of the character and returns { conso, prog }. When the
 * inventory holds more progression souls than the profile remembers, the profile is
 * raised (optimistic patch); otherwise nothing is written.
 */
export async function loadSoulCounts(characterId, { storedProg = 0 } = {}) {
    const rows = await getInventoryRows(characterId);
    const owned = sumSoulCounts(rows);
    let stored = Number(storedProg) || 0;
    if (owned.prog > 0) {
        const result = await patchCharacterProfile(characterId, (profileData) => {
            const current = Number(profileData?.eater?.eaterAmesProgression) || 0;
            if (owned.prog <= current) return null;
            profileData.eater = { ...(profileData.eater || {}), eaterAmesProgression: owned.prog };
            return profileData;
        });
        const fresh = Number(result?.profileData?.eater?.eaterAmesProgression);
        if (Number.isFinite(fresh)) stored = Math.max(stored, fresh);
    }
    return cacheSoulCounts(characterId, rows, stored);
}
