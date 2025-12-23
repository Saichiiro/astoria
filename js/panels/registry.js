import { inventairePanel } from "./inventaire-panel.js";
import { fichePanel } from "./fiche-panel.js";
import { adminPanel } from "./admin-panel.js";

export function getProfilePanels() {
  return [inventairePanel, fichePanel, adminPanel];
}

export function getPanelById(panelId) {
  return getProfilePanels().find((panel) => panel.id === panelId) || null;
}
