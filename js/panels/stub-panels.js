import { el } from "./panel-utils.js";

function readJson(key, fallback = null) {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function sumValues(map) {
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).reduce((sum, value) => {
    const n = Number(value);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function buildStubPanel({ id, title, fullPageHref, fullPageLabel, blurb, load }) {
  return {
    id,
    title,
    fullPageHref,
    fullPageLabel,
    renderPanel(ctx) {
      const wrapper = el("div", "panel-card");
      wrapper.appendChild(el("h3", "panel-card-title", "Apercu"));
      const summary = el("p", "panel-muted", blurb);
      wrapper.appendChild(summary);
      wrapper.appendChild(
        el(
          "p",
          "panel-muted panel-spacer",
          "Ouvrez la page complete pour les actions et les details."
        )
      );

      if (typeof load === "function") {
        void load(summary, ctx).catch((error) => {
          console.warn("Panel stub load failed:", error);
        });
      }
      return wrapper;
    },
  };
}

function ensureStyleLink(href) {
  const head = document.head;
  if (!head) return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  head.appendChild(link);
}

function ensureNokorahModals() {
  if (document.getElementById("invokeModal")) return;
  const markup = `
    <div class="modal" id="invokeModal">
      <div class="modal-content">
        <h3>Invoquer un Nokorah</h3>
        <input type="text" id="nokorahName" placeholder="Nom du Nokorah" maxlength="24">
        <p style="font-size: 0.85rem; color: #666; margin: 0.5rem 0;">Choisissez une apparence (style Cookie Run):</p>
        <div class="appearance-grid" id="appearanceGrid"></div>
        <label style="font-size: 0.85rem; color: #666;">Ou televerser (optionnel)</label>
        <input type="file" id="appearanceUpload" accept="image/*">
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button class="btn btn-secondary" id="invokeCancelBtn" style="width: auto;">Annuler</button>
          <button class="btn btn-primary" id="invokeConfirmBtn">Confirmer <span>25 LS</span></button>
        </div>
      </div>
    </div>

    <div class="modal" id="farewellModal">
      <div class="modal-content">
        <h3>Scene d'adieux</h3>
        <p style="font-size: 0.85rem; color: #666;">Explique pourquoi tu abandonnes ton Nokorah (min 80 caracteres):</p>
        <textarea id="farewellText" placeholder="Ecris un message sincere..."></textarea>
        <p style="font-size: 0.85rem; color: #666;" id="farewellCount">0 / 80</p>
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button class="btn btn-secondary" id="farewellCancelBtn" style="width: auto;">Annuler</button>
          <button class="btn btn-danger" id="farewellConfirmBtn">Abandonner <span>100 LS</span></button>
        </div>
      </div>
    </div>

    <div class="modal" id="appearanceModal">
      <div class="modal-content">
        <h3>Changer l'apparence</h3>
        <p style="font-size: 0.85rem; color: #666; margin: 0.5rem 0;">Choisissez une apparence (style Cookie Run):</p>
        <div class="appearance-grid" id="appearanceEditGrid"></div>
        <label style="font-size: 0.85rem; color: #666;">Ou televerser (optionnel)</label>
        <input type="file" id="appearanceEditUpload" accept="image/*">
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button class="btn btn-secondary" id="appearanceCancelBtn" style="width: auto;">Annuler</button>
          <button class="btn btn-primary" id="appearanceConfirmBtn">Confirmer</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", markup);
}

export const codexPanel = buildStubPanel({
  id: "codex",
  title: "Codex",
  fullPageHref: "codex.html",
  fullPageLabel: "Ouvrir le Codex",
  blurb: "Panel en preparation. Recap des objets et recherches a venir.",
  load: async (summary) => {
    try {
      const itemsApi = await import("../api/items-service.js");
      if (!itemsApi?.getAllItems) return;
      const items = await itemsApi.getAllItems();
      if (!Array.isArray(items)) return;
      const enabled = items.filter((item) => item?.enabled !== false).length;
      summary.textContent = `${items.length} objet(s) - ${enabled} actif(s)`;
    } catch {
      // keep fallback text
    }
  },
});

export const competencesPanel = buildStubPanel({
  id: "competences",
  title: "Competences",
  fullPageHref: "competences.html",
  fullPageLabel: "Ouvrir les competences",
  blurb: "Panel en preparation. Statistiques et validation seront centralisees ici.",
  load: async (summary, ctx) => {
    const character = ctx?.character || null;
    if (!character?.id) {
      summary.textContent = "Selectionnez un personnage pour voir les competences.";
      return;
    }

    const profileData = character.profile_data || {};
    let competences = profileData.competences || null;

    if (!competences) {
      const prefix = `astoria_competences_${character.id}:`;
      competences = {
        pointsByCategory: readJson(`${prefix}skillsPointsByCategory`, {}),
        allocationsByCategory: readJson(`${prefix}skillsAllocationsByCategory`, {}),
        baseValuesByCategory: readJson(`${prefix}skillsBaseValuesByCategory`, {}),
        locksByCategory: readJson(`${prefix}skillsLocksByCategory`, {}),
      };
    }

    const pointsByCategory = competences?.pointsByCategory || {};
    const allocationsByCategory = competences?.allocationsByCategory || {};
    const baseValuesByCategory = competences?.baseValuesByCategory || {};
    const locksByCategory = competences?.locksByCategory || {};

    const categoryCount = Object.keys(pointsByCategory).length;
    const pointsLeft = sumValues(pointsByCategory);
    const lockedCount = Object.values(locksByCategory || {}).filter(Boolean).length;

    let allocated = 0;
    Object.values(allocationsByCategory || {}).forEach((category) => {
      allocated += sumValues(category);
    });
    Object.values(baseValuesByCategory || {}).forEach((category) => {
      allocated += sumValues(category);
    });

    if (!categoryCount) {
      summary.textContent = "Aucune competence enregistree.";
      return;
    }

    summary.textContent = `${categoryCount} categories - ${pointsLeft} points dispo - ${allocated} investis`;
    if (lockedCount > 0) {
      summary.textContent += ` - ${lockedCount} verrouillee(s)`;
    }
  },
});

function formatKaels(value) {
  const safe = Number(value);
  if (!Number.isFinite(safe)) return "-";
  return safe.toLocaleString("fr-FR");
}

function formatRarity(value) {
  const raw = String(value || "").toLowerCase();
  const labels = {
    commun: "Commun",
    rare: "Rare",
    epique: "Epique",
    mythique: "Mythique",
    legendaire: "Legendaire",
  };
  return labels[raw] || (value ? String(value) : "Inconnu");
}

export const hdvPanel = {
  id: "hdv",
  title: "Hotel de vente",
  fullPageHref: "hdv.html",
  fullPageLabel: "Ouvrir le marche",
  renderPanel(ctx) {
    const wrapper = el("div", "panel-card");
    wrapper.appendChild(el("h3", "panel-card-title", "Hotel de vente"));
    const summary = el("p", "panel-muted", "Chargement des offres...");
    wrapper.appendChild(summary);

    const list = el("div", "panel-mini-list");
    wrapper.appendChild(list);
    wrapper.appendChild(
      el(
        "p",
        "panel-muted panel-spacer",
        "Ouvrez la page complete pour gerer les ventes."
      )
    );

    const renderEmpty = (text) => {
      list.replaceChildren();
      list.appendChild(el("div", "panel-mini-empty", text));
    };

    const renderSection = (titleText) => {
      const title = el("div", "panel-mini-section", titleText);
      list.appendChild(title);
    };

    const renderRow = (labelText, valueText) => {
      const row = el("div", "panel-mini-item");
      row.appendChild(el("span", "panel-mini-label", labelText));
      row.appendChild(el("span", "panel-mini-value", valueText));
      list.appendChild(row);
    };

    void (async () => {
      try {
        const marketApi = await import("../api/market-service.js");
        if (!marketApi?.getMyListings || !marketApi?.getMyHistory) {
          renderEmpty("Aucune donnee HDV disponible.");
          return;
        }
        const listings = await marketApi.getMyListings();
        const history = await marketApi.getMyHistory();
        if (!Array.isArray(listings) || !Array.isArray(history)) {
          renderEmpty("Aucune activite recente.");
          return;
        }

        summary.textContent = `${listings.length} offre(s) active(s) • ${history.length} vente(s)`;
        list.replaceChildren();

        const recentListings = listings.slice(0, 3);
        if (recentListings.length) {
          renderSection("Offres actives");
          recentListings.forEach((entry) => {
            const name = entry.item_name || entry.item_id || "Objet";
            const total =
              entry.total_price != null
                ? entry.total_price
                : Number(entry.unit_price || 0) * Number(entry.quantity || 1);
            renderRow(name, `${formatKaels(total)} kaels`);
          });
        }

        const recentHistory = history.slice(0, 2);
        if (recentHistory.length) {
          renderSection("Dernieres ventes");
          recentHistory.forEach((entry) => {
            const name = entry.item_name || entry.item_id || "Objet";
            const total =
              entry.total_price != null
                ? entry.total_price
                : Number(entry.unit_price || 0) * Number(entry.quantity || 1);
            const isSeller = entry.seller_character_id === ctx?.character?.id;
            const verb = isSeller ? "Vendu" : "Achete";
            renderRow(`${verb}: ${name}`, `${formatKaels(total)} kaels`);
          });
        }

        if (!recentListings.length && !recentHistory.length) {
          renderEmpty("Aucune activite recente.");
        }
      } catch (error) {
        console.warn("HDV panel load failed:", error);
        summary.textContent = "Impossible de charger l'HDV.";
        renderEmpty("Aucune activite recente.");
      }
    })();

    return wrapper;
  },
};

export const quetesPanel = buildStubPanel({
  id: "quetes",
  title: "Quetes",
  fullPageHref: "quetes.html",
  fullPageLabel: "Ouvrir les quetes",
  blurb: "Panel en preparation. Apercu des quetes en cours.",
  load: async (summary) => {
    const quests = readJson("astoria_quests_state", []);
    const history = readJson("astoria_quests_history", []);
    const questCount = Array.isArray(quests) ? quests.length : 0;
    const historyCount = Array.isArray(history) ? history.length : 0;

    if (!questCount && !historyCount) {
      summary.textContent = "Aucune quete enregistree.";
      return;
    }

    if (questCount && historyCount) {
      summary.textContent = `${questCount} quete(s) - ${historyCount} historique(s)`;
      return;
    }

    summary.textContent = questCount
      ? `${questCount} quete(s) enregistree(s)`
      : `${historyCount} historique(s) de quete`;
  },
});

export const magiePanel = buildStubPanel({
  id: "magie",
  title: "Magie",
  fullPageHref: "magie.html",
  fullPageLabel: "Ouvrir la magie",
  blurb: "Panel en preparation. Acces rapide aux notes et validations.",
  load: async (summary, ctx) => {
    const character = ctx?.character || null;
    if (!character?.id) {
      summary.textContent = "Selectionnez un personnage pour voir la magie.";
      return;
    }

    const profilePayload = character.profile_data?.magic_sheet || null;
    const key = `magicSheetPages-${character.id}`;
    const stored = readJson(key, null) || readJson("magicSheetPages", null);
    const payload = stored && Array.isArray(stored.pages) ? stored : profilePayload;

    const pages = Array.isArray(payload?.pages) ? payload.pages : [];
    const pageCount = pages.length;
    const capCount = pages.reduce(
      (sum, page) => sum + (Array.isArray(page?.capacities) ? page.capacities.length : 0),
      0
    );

    if (!pageCount) {
      summary.textContent = "Aucune page de magie.";
      return;
    }

    summary.textContent = `${pageCount} page(s) - ${capCount} capacite(s)`;
  },
});

function getNokorahUpgradeCost(level) {
  const safeLevel = Math.max(0, Number(level) || 0);
  return Math.round(25 + safeLevel * 15 + safeLevel * safeLevel * 2);
}

function getNextRarityGate(level) {
  const safeLevel = Math.max(0, Number(level) || 0);
  const nextGate = Math.ceil((safeLevel + 1) / 5) * 5;
  return nextGate || 5;
}

export const nokorahPanel = {
  id: "nokorah",
  title: "Nokorah",
  fullPageHref: "nokorah.html",
  fullPageLabel: "Ouvrir Nokorah",
  renderPanel(ctx) {
    ensureStyleLink("css/nokorah.css");
    ensureNokorahModals();

    const wrapper = el("div", "panel-card");
    wrapper.appendChild(el("h3", "panel-card-title", "Nokorah"));
    const root = el("div", "nokorah-panel-root");
    root.setAttribute("data-nokorah-root", "panel");
    wrapper.appendChild(root);

    void (async () => {
      try {
        const module = await import("../nokorah.js");
        if (typeof module.initNokorah === "function") {
          await module.initNokorah();
        } else if (typeof window.initNokorah === "function") {
          await window.initNokorah();
        }
      } catch (error) {
        console.warn("Nokorah panel init failed:", error);
        root.textContent = "Impossible de charger le Nokorah.";
      }
    })();

    return wrapper;
  },
};
