/**
 * Card-based spell renderer for magie.html
 * Cleaner, more scannable design grouped by rank
 */

function buildSpellCard(cap, options = {}) {
    const { isAdmin, canEdit, ascensionCost, showUpgrades } = options;

    const level = cap.level || 1;
    const rankLabel = cap.rank === "mineur" ? "Mineur" : cap.rank === "ultime" ? "Ultime" : "Signature";
    const typeLabel = cap.type === "offensif" ? "Offensif" :
                      cap.type === "defensif" ? "Défensif" :
                      cap.type === "soutien" ? "Soutien" : "Utilitaire";

    // Build tag pills
    const tags = [];
    if (cap.target) tags.push(`<span class="spell-pill spell-pill--target">${cap.target}</span>`);
    if (cap.distance) tags.push(`<span class="spell-pill spell-pill--distance">${cap.distance}</span>`);
    if (cap.cost) tags.push(`<span class="spell-pill spell-pill--cost">${cap.cost}</span>`);

    return `
        <article class="spell-card" data-spell-id="${cap.id}" data-rank="${cap.rank}">
            <div class="spell-card-header">
                <div class="spell-card-title-row">
                    <h4 class="spell-card-name">${cap.name || "Sans nom"}</h4>
                    <span class="spell-card-level">Niv. ${level}</span>
                </div>
                <div class="spell-card-meta">
                    <span class="spell-badge spell-badge--type">${typeLabel}</span>
                    <span class="spell-badge spell-badge--rank">${rankLabel}</span>
                </div>
            </div>

            <div class="spell-card-summary">
                ${cap.summary || "Aucune description"}
            </div>

            ${tags.length ? `<div class="spell-card-tags">${tags.join('')}</div>` : ''}

            ${showUpgrades ? `
                <div class="spell-card-actions">
                    <button type="button"
                            class="spell-btn spell-btn--upgrade${canEdit ? '' : ' is-disabled'}"
                            data-action="upgrade"
                            ${canEdit ? '' : 'disabled'}>
                        Améliorer
                    </button>
                    <button type="button"
                            class="spell-btn spell-btn--edit${canEdit ? '' : ' is-disabled'}"
                            data-action="edit"
                            ${canEdit ? '' : 'disabled'}>
                        Modifier
                    </button>
                </div>
            ` : ''}
        </article>
    `;
}

function groupSpellsByRank(capacities) {
    const groups = {
        signature: [],
        mineur: [],
        ultime: []
    };

    capacities.forEach(cap => {
        const rank = cap.rank || "mineur";
        if (groups[rank]) {
            groups[rank].push(cap);
        }
    });

    return groups;
}

function renderSpellSection(rank, spells, options) {
    if (!spells.length) return '';

    const rankLabels = {
        signature: "Sorts Signature",
        mineur: "Sorts Mineurs",
        ultime: "Sorts Ultimes"
    };

    const cardsHtml = spells.map(spell => buildSpellCard(spell, options)).join('');

    return `
        <section class="spell-section" data-rank="${rank}">
            <h3 class="spell-section-title">${rankLabels[rank]}</h3>
            <div class="spell-card-grid">
                ${cardsHtml}
            </div>
        </section>
    `;
}

export { buildSpellCard, groupSpellsByRank, renderSpellSection };
