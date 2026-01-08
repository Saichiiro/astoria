import { el } from "./panel-utils.js";

function buildStubPanel({ id, title, fullPageHref, fullPageLabel, blurb, load }) {
  return {
    id,
    title,
    fullPageHref,
    fullPageLabel,
    renderPanel() {
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
        void load(summary).catch((error) => {
          console.warn("Panel stub load failed:", error);
        });
      }
      return wrapper;
    },
  };
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
});

export const hdvPanel = buildStubPanel({
  id: "hdv",
  title: "Hotel de vente",
  fullPageHref: "hdv.html",
  fullPageLabel: "Ouvrir le marche",
  blurb: "Panel en preparation. Suivi des ventes et alertes a venir.",
  load: async (summary) => {
    try {
      const marketApi = await import("../api/market-service.js");
      if (!marketApi?.getMyListings || !marketApi?.getMyHistory) return;
      const listings = await marketApi.getMyListings();
      const history = await marketApi.getMyHistory();
      if (!Array.isArray(listings) || !Array.isArray(history)) return;
      summary.textContent = `${listings.length} offre(s) active(s) - ${history.length} vente(s)`;
    } catch {
      // keep fallback text
    }
  },
});

export const magiePanel = buildStubPanel({
  id: "magie",
  title: "Magie",
  fullPageHref: "magie.html",
  fullPageLabel: "Ouvrir la magie",
  blurb: "Panel en preparation. Acces rapide aux notes et validations.",
});

export const nokorahPanel = buildStubPanel({
  id: "nokorah",
  title: "Nokorah",
  fullPageHref: "nokorah.html",
  fullPageLabel: "Ouvrir Nokorah",
  blurb: "Panel en preparation. Apercu des effets et ressources.",
});
