import { el } from "./panel-utils.js";
import {
  getSupabaseClient,
  getAllCharacters,
  setActiveCharacter,
  getActiveCharacter,
  updateCharacter,
  getCurrentUser,
  setUserRoleByUsername,
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

    // Link to full admin panel
    const adminLink = document.createElement("a");
    adminLink.href = "admin/index.html";
    adminLink.className = "panel-admin-full-link";
    adminLink.innerHTML = `<span class="panel-admin-full-link-icon">⚙️</span> Ouvrir le panneau admin complet`;
    wrapper.appendChild(adminLink);

    const deprecationNotice = el("p", "panel-admin-deprecation", "Ce panneau latéral sera remplacé. Utilisez le panneau admin complet.");
    wrapper.appendChild(deprecationNotice);

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

    const disabledUsersKey = "astoria_admin_disabled_users";
    const disabledCharactersKey = "astoria_admin_disabled_characters";

    const loadDisabledMap = (key) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
      } catch (error) {
        console.warn("Admin panel: unable to load disabled map.", error);
        return {};
      }
    };

    const saveDisabledMap = (key, map) => {
      try {
        localStorage.setItem(key, JSON.stringify(map));
      } catch (error) {
        console.warn("Admin panel: unable to save disabled map.", error);
      }
    };

    const disabledUsers = loadDisabledMap(disabledUsersKey);
    const disabledCharacters = loadDisabledMap(disabledCharactersKey);

    const status = el("p", "panel-muted", "Loading admin data...");
    wrapper.appendChild(status);

    const kv = document.createElement("dl");
    kv.className = "panel-kv panel-admin-kv";

    const usersLabel = el("dt", "", "Users");
    const userValue = el("dd", "", "-");
    const charLabel = el("dt", "", "Characters");
    const charValue = el("dd", "", "-");

    kv.append(usersLabel, userValue, charLabel, charValue);
    wrapper.appendChild(kv);

    const characterSection = el("div", "panel-admin-actions");
    const characterLabel = document.createElement("label");
    characterLabel.textContent = "Recherche personnage";
    characterLabel.setAttribute("for", "adminCharacterSearch");

    const characterInput = document.createElement("input");
    characterInput.type = "search";
    characterInput.id = "adminCharacterSearch";
    characterInput.className = "panel-select";
    characterInput.placeholder = "Nom du personnage...";

    const characterHint = el(
      "p",
      "panel-admin-hint",
      "Tapez au moins 2 lettres."
    );
    const characterList = el("div", "panel-user-list panel-character-list");

    characterSection.append(characterLabel, characterInput, characterHint, characterList);
    wrapper.appendChild(characterSection);

    const accountSection = el("div", "panel-admin-actions");
    const accountLabel = document.createElement("label");
    accountLabel.textContent = "Compte joueur";
    accountLabel.setAttribute("for", "adminAccountStatus");

    const accountStatus = el("div", "panel-admin-status", "Aucun compte selectionne.");
    accountStatus.id = "adminAccountStatus";

    const accountToggle = document.createElement("button");
    accountToggle.type = "button";
    accountToggle.className = "auth-button secondary";
    accountToggle.textContent = "Desactiver le compte";
    accountToggle.disabled = true;

    const characterToggle = document.createElement("button");
    characterToggle.type = "button";
    characterToggle.className = "auth-button secondary";
    characterToggle.textContent = "Desactiver le personnage";
    characterToggle.disabled = true;

    const accountHint = el(
      "p",
      "panel-admin-hint",
      "Stub local: ces actions sont enregistrees en local en attendant le back-end."
    );

    accountSection.append(accountLabel, accountStatus, accountToggle, characterToggle, accountHint);
    wrapper.appendChild(accountSection);

    const staffSection = el("div", "panel-admin-actions");
    const staffLabel = document.createElement("label");
    staffLabel.textContent = "Droits staff";
    const staffUser = el("div", "panel-admin-status", "Utilisateur: -");
    const staffRole = el("div", "panel-admin-status", "Role: -");
    const staffToggle = document.createElement("button");
    staffToggle.type = "button";
    staffToggle.className = "auth-button secondary";
    staffToggle.textContent = "Donner admin";
    staffToggle.disabled = true;
    const staffHint = el(
      "p",
      "panel-admin-hint",
      "Ce role donne l'acces a toutes les actions admin."
    );
    staffSection.append(staffLabel, staffUser, staffRole, staffToggle, staffHint);
    wrapper.appendChild(staffSection);

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

    const kaelsDeltaLabel = document.createElement("label");
    kaelsDeltaLabel.textContent = "Ajouter kaels";
    kaelsDeltaLabel.setAttribute("for", "adminPanelKaelsDelta");

    const kaelsDeltaInput = document.createElement("input");
    kaelsDeltaInput.type = "number";
    kaelsDeltaInput.id = "adminPanelKaelsDelta";
    kaelsDeltaInput.step = "1";
    kaelsDeltaInput.className = "panel-select";
    kaelsDeltaInput.placeholder = "Delta";
    kaelsDeltaInput.disabled = true;

    const kaelsDeltaSave = document.createElement("button");
    kaelsDeltaSave.type = "button";
    kaelsDeltaSave.className = "auth-button secondary";
    kaelsDeltaSave.textContent = "Ajouter";
    kaelsDeltaSave.disabled = true;

    const kaelsStatus = el(
      "p",
      "panel-admin-hint",
      "Valeur exacte ou ajout rapide."
    );
    editSection.append(
      kaelsLabel,
      kaelsInput,
      kaelsSave,
      kaelsDeltaLabel,
      kaelsDeltaInput,
      kaelsDeltaSave,
      kaelsStatus
    );
    wrapper.appendChild(editSection);



    let activeUser = null;

    function updateStaffUi() {
      if (!activeUser) {
        staffUser.textContent = "Utilisateur: -";
        staffRole.textContent = "Role: -";
        staffToggle.disabled = true;
        return;
      }
      staffUser.textContent = `Utilisateur: ${activeUser.username}`;
      staffRole.textContent = `Role: ${activeUser.role === "admin" ? "admin" : "joueur"}`;
      staffToggle.textContent = activeUser.role === "admin" ? "Retirer admin" : "Donner admin";
      staffToggle.disabled = false;
    }

    async function refreshActiveUser(userId) {
      if (!userId) {
        activeUser = null;
        updateStaffUi();
        return;
      }
      try {
        if (!supabaseRef) {
          supabaseRef = await getSupabaseClient();
        }
        const { data, error } = await supabaseRef
          .from("users")
          .select("id, username, role")
          .eq("id", userId)
          .single();
        if (error) {
          console.error("Admin panel: unable to load user.", error);
          activeUser = null;
        } else {
          activeUser = data;
        }
      } catch (error) {
        console.error("Admin panel: unable to load user.", error);
        activeUser = null;
      }
      updateStaffUi();
    }

    function updateAdminContext(activeCharacter) {
      if (!activeCharacter || !activeCharacter.id) {
        adminContextBody.textContent = "No active character selected.";
        kaelsInput.value = "";
        kaelsInput.disabled = true;
        kaelsSave.disabled = true;
        kaelsDeltaInput.disabled = true;
        kaelsDeltaSave.disabled = true;
        accountStatus.textContent = "Aucun compte selectionne.";
        accountToggle.disabled = true;
        characterToggle.disabled = true;
        activeUser = null;
        updateStaffUi();
        return;
      }
      const shortId = activeCharacter.user_id
        ? String(activeCharacter.user_id).slice(0, 8)
        : "????";
      adminContextBody.textContent = `Acting as: ${activeCharacter.name || "Sans nom"} (${shortId})`;
      kaelsInput.value = Number.isFinite(activeCharacter.kaels) ? String(activeCharacter.kaels) : "";
      kaelsInput.disabled = false;
      kaelsSave.disabled = false;
      kaelsDeltaInput.disabled = false;
      kaelsDeltaSave.disabled = false;
      kaelsDeltaInput.value = "";

      const userId = activeCharacter.user_id;
      const accountDisabled = Boolean(userId && disabledUsers[userId]);
      accountStatus.textContent = accountDisabled ? "Compte: desactive" : "Compte: actif";
      accountStatus.dataset.state = accountDisabled ? "disabled" : "active";
      accountToggle.textContent = accountDisabled ? "Activer le compte" : "Desactiver le compte";
      accountToggle.disabled = !userId;

      const characterDisabled = Boolean(disabledCharacters[activeCharacter.id]);
      characterToggle.textContent = characterDisabled ? "Activer le personnage" : "Desactiver le personnage";
      characterToggle.disabled = false;

      void refreshActiveUser(userId);
    }

    staffToggle.addEventListener("click", async () => {
      if (!activeUser?.username) return;
      const nextRole = activeUser.role === "admin" ? "player" : "admin";
      const result = await setUserRoleByUsername(activeUser.username, nextRole);
      if (!result || !result.success) {
        staffHint.textContent = "Impossible de modifier le role.";
        return;
      }
      staffHint.textContent = "Role mis a jour.";
      activeUser = { ...activeUser, role: nextRole };
      updateStaffUi();
    });

    accountToggle.addEventListener("click", () => {
      const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
      if (!active?.user_id) return;
      const userId = active.user_id;
      const nextValue = !disabledUsers[userId];
      disabledUsers[userId] = nextValue;
      saveDisabledMap(disabledUsersKey, disabledUsers);
      updateAdminContext(active);
    });

    characterToggle.addEventListener("click", () => {
      const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
      if (!active?.id) return;
      const nextValue = !disabledCharacters[active.id];
      disabledCharacters[active.id] = nextValue;
      saveDisabledMap(disabledCharactersKey, disabledCharacters);
      updateAdminContext(active);
      renderCharacters(characterInput.value);
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
        kaelsStatus.textContent = `Kaels definis a ${nextKaels}.`;
        window.dispatchEvent(
          new CustomEvent("astoria:character-updated", { detail: { kaels: nextKaels } })
        );
        const badge = document.getElementById("characterKaelsBadge");
        if (badge) {
          badge.textContent = `${nextKaels} kaels`;
          badge.hidden = false;
        }
        kaelsDeltaInput.value = "";
      } catch (error) {
        console.error("Admin panel kaels update error:", error);
        kaelsStatus.textContent = "Erreur pendant la mise a jour.";
      }
    });

    kaelsDeltaSave.addEventListener("click", async () => {
      const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
      if (!active || !active.id) {
        kaelsStatus.textContent = "Selectionnez un personnage d'abord.";
        return;
      }
      const delta = Number.parseInt(kaelsDeltaInput.value, 10);
      if (!Number.isFinite(delta)) {
        kaelsStatus.textContent = "Valeur d'ajout invalide.";
        return;
      }
      const base = Number.isFinite(active.kaels) ? active.kaels : 0;
      const nextKaels = Math.max(0, base + delta);
      try {
        const result = await updateCharacter(active.id, { kaels: nextKaels });
        if (!result || !result.success) {
          kaelsStatus.textContent = "Mise a jour impossible.";
          return;
        }
        kaelsStatus.textContent = `Ajoute ${delta}. Total: ${nextKaels}.`;
        window.dispatchEvent(
          new CustomEvent("astoria:character-updated", { detail: { kaels: nextKaels } })
        );
        const badge = document.getElementById("characterKaelsBadge");
        if (badge) {
          badge.textContent = `${nextKaels} kaels`;
          badge.hidden = false;
        }
        kaelsInput.value = String(nextKaels);
        kaelsDeltaInput.value = "";
      } catch (error) {
        console.error("Admin panel kaels delta error:", error);
        kaelsStatus.textContent = "Erreur pendant la mise a jour.";
      }
    });


    let characterSearchTimer = null;
    let supabaseRef = null;
    let allCharacters = [];

    const deleteBackdrop = el("div", "panel-admin-modal");
    deleteBackdrop.innerHTML = `
      <div class="panel-admin-modal-card" role="dialog" aria-modal="true">
        <div class="panel-admin-modal-header">
          <h4 class="panel-admin-modal-title">Supprimer le personnage</h4>
          <button type="button" class="panel-admin-modal-close" aria-label="Fermer">x</button>
        </div>
        <div class="panel-admin-modal-body">
          <div class="panel-character-card">
            <div class="panel-character-avatar" id="adminDeleteAvatar"></div>
            <div class="panel-character-info">
              <div class="panel-character-name" id="adminDeleteName"></div>
              <div class="panel-character-meta" id="adminDeleteMeta"></div>
            </div>
          </div>
        </div>
        <div class="panel-admin-modal-actions">
          <button type="button" class="auth-button secondary" id="adminDeleteCancel">Annuler</button>
          <button type="button" class="auth-button" id="adminDeleteConfirm">Supprimer</button>
        </div>
      </div>
    `;
    wrapper.appendChild(deleteBackdrop);

    const deleteNameEl = deleteBackdrop.querySelector("#adminDeleteName");
    const deleteMetaEl = deleteBackdrop.querySelector("#adminDeleteMeta");
    const deleteAvatarEl = deleteBackdrop.querySelector("#adminDeleteAvatar");
    const deleteClose = deleteBackdrop.querySelector(".panel-admin-modal-close");
    const deleteCancel = deleteBackdrop.querySelector("#adminDeleteCancel");
    const deleteConfirm = deleteBackdrop.querySelector("#adminDeleteConfirm");
    let pendingDelete = null;

    const openDeleteModal = (character) => {
      pendingDelete = character;
      if (deleteNameEl) deleteNameEl.textContent = character?.name || "Sans nom";
      if (deleteMetaEl) {
        const metaText = `${character?.race || ''} ${character?.class || ''}`.trim();
        deleteMetaEl.textContent = metaText || "Infos indisponibles";
      }
      if (deleteAvatarEl) {
        deleteAvatarEl.innerHTML = "";
        const avatarUrl = character?.profile_data?.avatar_url || "";
        if (avatarUrl) {
          const img = document.createElement("img");
          img.src = avatarUrl;
          img.alt = character?.name || "Avatar";
          deleteAvatarEl.appendChild(img);
        } else {
          deleteAvatarEl.textContent = (character?.name || "?").charAt(0).toUpperCase();
        }
      }
      deleteBackdrop.classList.add("open");
    };

    const closeDeleteModal = () => {
      pendingDelete = null;
      deleteBackdrop.classList.remove("open");
    };

    deleteClose?.addEventListener("click", closeDeleteModal);
    deleteCancel?.addEventListener("click", closeDeleteModal);
    deleteBackdrop.addEventListener("click", (event) => {
      if (event.target === deleteBackdrop) closeDeleteModal();
    });

    async function updateCounts() {
      if (!supabaseRef) {
        supabaseRef = await getSupabaseClient();
      }
      const { count: userCount } = await supabaseRef
        .from("users")
        .select("id", { count: "exact", head: true });

      const characters = await getAllCharacters();
      allCharacters = Array.isArray(characters) ? characters : [];
      userValue.textContent = userCount ?? "-";
      charValue.textContent = allCharacters.length;
    }

    function renderCharacters(query = "") {
      const term = String(query || "").trim().toLowerCase();
      const filtered = term.length >= 2
        ? allCharacters.filter((character) => String(character?.name || "").toLowerCase().includes(term))
        : allCharacters.slice();

      if (!filtered.length) {
        characterList.innerHTML = "";
        characterHint.textContent = "Aucun resultat.";
        return;
      }

      characterHint.textContent = `${filtered.length} personnage(s)`;
      characterList.innerHTML = "";
      filtered.slice(0, 8).forEach((character) => {
        const row = document.createElement("div");
        const characterDisabled = Boolean(disabledCharacters[character.id]);
        row.className = `panel-user-row panel-character-card${characterDisabled ? " panel-character-card--disabled" : ""}`;

        const avatar = document.createElement("div");
        avatar.className = "panel-character-avatar";
        const avatarUrl = character?.profile_data?.avatar_url || "";
        if (avatarUrl) {
          const img = document.createElement("img");
          img.src = avatarUrl;
          img.alt = character.name || "Avatar";
          avatar.appendChild(img);
        } else {
          avatar.textContent = (character.name || "?").charAt(0).toUpperCase();
        }

        const info = document.createElement("div");
        info.className = "panel-character-info";
        const nameEl = document.createElement("div");
        nameEl.className = "panel-character-name";
        nameEl.textContent = character.name || "Sans nom";
        const metaEl = document.createElement("div");
        metaEl.className = "panel-character-meta";
        const shortId = character.user_id ? character.user_id.slice(0, 8) : "????";
        metaEl.textContent = `${character.race || ''} ${character.class || ''}`.trim() || `Utilisateur ${shortId}`;
        info.append(nameEl, metaEl);

        const actions = document.createElement("div");
        actions.className = "panel-character-actions";
        const statusPill = document.createElement("span");
        statusPill.className = `panel-admin-pill${characterDisabled ? " is-disabled" : ""}`;
        statusPill.textContent = characterDisabled ? "Desactive" : "Actif";
        const activateBtn = document.createElement("button");
        activateBtn.type = "button";
        activateBtn.className = "auth-button secondary";
        activateBtn.textContent = "Activer";
        activateBtn.addEventListener("click", async () => {
          const res = await setActiveCharacter(character.id);
          if (res && res.success) {
            window.dispatchEvent(new CustomEvent("astoria:character-changed"));
          }
        });
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "auth-button secondary";
        deleteBtn.textContent = "Supprimer";
        deleteBtn.addEventListener("click", () => openDeleteModal(character));
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "auth-button secondary";
        toggleBtn.textContent = characterDisabled ? "Activer" : "Desactiver";
        toggleBtn.addEventListener("click", () => {
          const nextValue = !disabledCharacters[character.id];
          disabledCharacters[character.id] = nextValue;
          saveDisabledMap(disabledCharactersKey, disabledCharacters);
          renderCharacters(characterInput.value);
          const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
          if (active?.id === character.id) {
            updateAdminContext(active);
          }
        });
        actions.append(statusPill, activateBtn, toggleBtn, deleteBtn);

        row.append(avatar, info, actions);
        characterList.appendChild(row);
      });
    }

    characterInput.addEventListener("input", () => {
      window.clearTimeout(characterSearchTimer);
      characterSearchTimer = window.setTimeout(() => {
        renderCharacters(characterInput.value);
      }, 200);
    });

    deleteConfirm?.addEventListener("click", async () => {
      if (!pendingDelete || !supabaseRef) return;
      try {
        const { error } = await supabaseRef
          .from("characters")
          .delete()
          .eq("id", pendingDelete.id);
        if (error) {
          console.error("Admin panel delete character error:", error);
          return;
        }
        allCharacters = allCharacters.filter((c) => c.id != pendingDelete.id);
        renderCharacters(characterInput.value);
        await updateCounts();
        closeDeleteModal();
      } catch (error) {
        console.error("Admin panel delete character error:", error);
      }
    });

    (async () => {
      try {
        await updateCounts();
        renderCharacters(characterInput.value);
        status.textContent = "Recherchez un personnage pour basculer le contexte.";
      } catch (error) {
        console.error("Admin panel error:", error);
        status.textContent = "Unable to load admin data.";
      }
    })();
    const syncAdminState = () => {
      const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
      updateAdminContext(active);
    };

    syncAdminState();

    window.addEventListener("astoria:character-changed", syncAdminState);

    return wrapper;
  },
};
