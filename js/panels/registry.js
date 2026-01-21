import { inventairePanel } from "./inventaire-panel.js";
import { fichePanel } from "./fiche-panel.js";
import { adminPanel } from "./admin-panel.js";
import {
  codexPanel,
  competencesPanel,
  hdvPanel,
  quetesPanel,
  magiePanel,
  nokorahPanel,
} from "./stub-panels.js";

export function getProfilePanels() {
  return [
    inventairePanel,
    fichePanel,
    adminPanel,
    codexPanel,
    competencesPanel,
    hdvPanel,
    quetesPanel,
    magiePanel,
    nokorahPanel,
  ];
}

export function getPanelById(panelId) {
  return getProfilePanels().find((panel) => panel.id === panelId) || null;
}
