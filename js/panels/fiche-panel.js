import { el } from "./panel-utils.js";

export const fichePanel = {
  id: "fiche",
  title: "Fiche personnage",
  fullPageHref: "html/fiche.html",
  fullPageLabel: "Ouvrir la fiche",
  renderPanel(ctx) {
    const wrapper = el("div", "panel-card");
    wrapper.appendChild(el("h3", "panel-card-title", "Identité"));

    const character = ctx?.character || null;
    if (!character) {
      wrapper.appendChild(el("p", "panel-muted", "Sélectionnez un personnage pour voir sa fiche."));
      return wrapper;
    }

    const list = el("dl", "panel-kv");

    function addRow(label, value) {
      list.appendChild(el("dt", "panel-muted", label));
      list.appendChild(el("dd", "panel-muted", value || "—"));
    }

    addRow("Nom", character.name);

    if (ctx?.isAdmin) {
      addRow("Race", character.race);
      addRow("Classe", character.class);
    }

    wrapper.appendChild(list);
    wrapper.appendChild(
      el("p", "panel-muted panel-spacer", "Mini-écran V1 : le contenu complet reste sur la page fiche.")
    );

    return wrapper;
  },
};

