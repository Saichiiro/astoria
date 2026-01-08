import { el } from "./panel-utils.js";
import {
  getSupabaseClient,
  getAllCharacters,
  setActiveCharacter,
  getActiveCharacter,
  updateCharacter,
} from "../auth.js";

export const adminPanel = {
  id: "admin",
  title: "Admin",
  renderPanel(ctx) {
    const wrapper = el("div", "panel-card");

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.appendChild(el("h3", "panel-card-title", "Overview"));
    header.appendChild(el("span", "panel-admin-badge", "ADMIN"));
    wrapper.appendChild(header);

    if (!ctx?.isAdmin) {
      wrapper.appendChild(el("p", "panel-muted", "Admin access required."));
      return wrapper;
    }

    const adminContext = el("div", "panel-admin-stub");
    const adminContextTitle = el("h4", "panel-admin-stub-title", "Admin view");
    const adminContextBody = el("p", "panel-muted", "No active character selected.");
    const adminContextHint = el(
      "p",
      "panel-admin-hint",
      "You are in admin mode. Actions apply to the selected character."
    );
    adminContext.append(adminContextTitle, adminContextBody, adminContextHint);
    wrapper.appendChild(adminContext);

    const status = el("p", "panel-muted", "Loading admin data...");
    wrapper.appendChild(status);

    const kv = document.createElement("dl");
    kv.className = "panel-kv panel-admin-kv";

    const userLabel = el("dt", "", "Users");
    const userValue = el("dd", "", "-");
    const charLabel = el("dt", "", "Characters");
    const charValue = el("dd", "", "-");

    kv.append(userLabel, userValue, charLabel, charValue);
    wrapper.appendChild(kv);

    const actions = el("div", "panel-admin-actions");
    const selectLabel = document.createElement("label");
    selectLabel.textContent = "View character";
    selectLabel.setAttribute("for", "adminPanelSelect");

    const select = document.createElement("select");
    select.id = "adminPanelSelect";
    select.className = "panel-select";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a character...";
    select.appendChild(placeholder);

    const hint = el("p", "panel-admin-hint", "Admin view. Use profile tools for detailed edits.");

    actions.append(selectLabel, select, hint);
    wrapper.appendChild(actions);

    const editSection = el("div", "panel-admin-actions");
    const kaelsLabel = document.createElement("label");
    kaelsLabel.textContent = "Kaels (admin)";
    kaelsLabel.setAttribute("for", "adminPanelKaels");

    const kaelsInput = document.createElement("input");
    kaelsInput.type = "number";
    kaelsInput.id = "adminPanelKaels";
    kaelsInput.min = "0";
    kaelsInput.step = "1";
    kaelsInput.className = "panel-select";
    kaelsInput.placeholder = "Kaels";
    kaelsInput.disabled = true;

    const kaelsSave = document.createElement("button");
    kaelsSave.type = "button";
    kaelsSave.className = "auth-button secondary";
    kaelsSave.textContent = "Mettre a jour";
    kaelsSave.disabled = true;

    const kaelsStatus = el("p", "panel-admin-hint", "");
    editSection.append(kaelsLabel, kaelsInput, kaelsSave, kaelsStatus);
    wrapper.appendChild(editSection);

    const futureSection = el("div", "panel-admin-placeholder");
    const placeholderTitle = el("h4", "panel-admin-placeholder-title", "Future Features");
    const placeholderBody = el(
      "p",
      "panel-muted",
      "User management coming soon (Issue #18)"
    );
    const timestamp = el(
      "p",
      "panel-admin-timestamp",
      `Accessed: ${new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
    );
    futureSection.append(placeholderTitle, placeholderBody, timestamp);
    wrapper.appendChild(futureSection);

    function updateAdminContext(activeCharacter) {
      if (!activeCharacter || !activeCharacter.id) {
        adminContextBody.textContent = "No active character selected.";
        kaelsInput.value = "";
        kaelsInput.disabled = true;
        kaelsSave.disabled = true;
        return;
      }
      const shortId = activeCharacter.user_id
        ? String(activeCharacter.user_id).slice(0, 8)
        : "????";
      adminContextBody.textContent = `Acting as: ${activeCharacter.name || "Sans nom"} (${shortId})`;
      kaelsInput.value = Number.isFinite(activeCharacter.kaels) ? String(activeCharacter.kaels) : "";
      kaelsInput.disabled = false;
      kaelsSave.disabled = false;
    }

    select.addEventListener("change", async () => {
      const value = select.value;
      if (!value) return;
      const res = await setActiveCharacter(value);
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent("astoria:character-changed"));
      }
    });

    kaelsSave.addEventListener("click", async () => {
      const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
      if (!active || !active.id) {
        kaelsStatus.textContent = "Selectionnez un personnage d'abord.";
        return;
      }
      const nextKaels = Number.parseInt(kaelsInput.value, 10);
      if (!Number.isFinite(nextKaels) || nextKaels < 0) {
        kaelsStatus.textContent = "Valeur de kaels invalide.";
        return;
      }
      try {
        const result = await updateCharacter(active.id, { kaels: nextKaels });
        if (!result || !result.success) {
          kaelsStatus.textContent = "Mise a jour impossible.";
          return;
        }
        kaelsStatus.textContent = "Kaels mis a jour.";
        window.dispatchEvent(
          new CustomEvent("astoria:character-updated", { detail: { kaels: nextKaels } })
        );
        const badge = document.getElementById("characterKaelsBadge");
        if (badge) {
          badge.textContent = `${nextKaels} kaels`;
          badge.hidden = false;
        }
      } catch (error) {
        console.error("Admin panel kaels update error:", error);
        kaelsStatus.textContent = "Erreur pendant la mise a jour.";
      }
    });

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        const { count: userCount } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true });

        const characters = await getAllCharacters();
        userValue.textContent = userCount ?? "-";
        charValue.textContent = characters.length;

        characters.forEach((char) => {
          const option = document.createElement("option");
          option.value = char.id;
          option.textContent = `${char.name} - ${char.user_id.slice(0, 6)}...`;
          select.appendChild(option);
        });

        status.textContent = "Select a character to preview their profile.";
      } catch (error) {
        console.error("Admin panel error:", error);
        status.textContent = "Unable to load admin data.";
      }
    })();

    const syncAdminState = () => {
      const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
      if (active && active.id) {
        select.value = active.id;
      }
      updateAdminContext(active);
    };

    syncAdminState();

    window.addEventListener("astoria:character-changed", syncAdminState);

    return wrapper;
  },
};
