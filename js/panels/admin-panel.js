import { el } from "./panel-utils.js";
import { getSupabaseClient, getAllCharacters, setActiveCharacter } from "../auth.js";

export const adminPanel = {
  id: "admin",
  title: "Admin",
  renderPanel(ctx) {
    const wrapper = el("div", "panel-card");
    wrapper.appendChild(el("h3", "panel-card-title", "Overview"));

    if (!ctx?.isAdmin) {
      wrapper.appendChild(el("p", "panel-muted", "Admin access required."));
      return wrapper;
    }

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

    const hint = el("p", "panel-admin-hint", "Read-only view. Use profile tools for edits.");

    actions.append(selectLabel, select, hint);
    wrapper.appendChild(actions);

    select.addEventListener("change", async () => {
      const value = select.value;
      if (!value) return;
      const res = await setActiveCharacter(value);
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent("astoria:character-changed"));
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

    return wrapper;
  },
};
