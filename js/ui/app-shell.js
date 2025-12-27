function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

async function loadAuthModule() {
  try {
    return await import("../auth.js");
  } catch (error) {
    console.error("App shell auth load error:", error);
    return null;
  }
}

function ensureTopbarStyles() {
  if (document.getElementById("appShellTopbarStyles")) return;

  const probe = document.createElement("div");
  probe.className = "app-dock";
  probe.style.position = "static";
  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  document.body.removeChild(probe);

  const hasStyles =
    computed.borderTopWidth !== "0px" || computed.backgroundColor !== "rgba(0, 0, 0, 0)";
  if (hasStyles) return;

  const style = document.createElement("style");
  style.id = "appShellTopbarStyles";
  style.textContent = `
.app-dock{position:fixed;top:var(--space-4,8px);right:var(--space-4,8px);display:flex;align-items:center;gap:var(--space-2,6px);padding:var(--space-2,6px) var(--space-3,8px);border-radius:var(--radius-lg,8px);background:rgba(255,255,255,.75);border:1px solid rgba(216,27,96,.25);box-shadow:0 10px 26px rgba(0,0,0,.12);backdrop-filter:blur(12px);z-index:999;max-width:min(92vw,820px);flex-wrap:wrap}
.app-dock .character-selector{min-width:min(220px,42vw);height:38px;padding:0 var(--space-3,6px);border-radius:var(--radius-lg,8px);border:2px solid rgba(216,27,96,.55);background:rgba(255,255,255,.85);font-family:var(--font-family,system-ui);font-size:var(--text-sm-plus,.82rem);font-weight:600;color:var(--color-primary,#d81b60);box-sizing:border-box}
.app-dock .character-selector--admin{min-width:min(200px,34vw)}
.app-dock .character-selector:focus{outline:none;box-shadow:0 0 0 3px rgba(216,27,96,.22)}
.app-dock .user-badge{padding:var(--space-2,4px) var(--space-3,8px);border-radius:999px;background:var(--color-primary,#d81b60);color:#fff;font-weight:600;font-size:var(--text-sm,.8rem);letter-spacing:var(--letter-spacing-wide,.08em);white-space:nowrap}
.app-dock-label{color:var(--color-gray-800,#444);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px}
.app-dock-souls{display:flex;gap:var(--space-2,4px);align-items:center;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.8);border:1px solid rgba(216,27,96,.2)}
.app-dock-soul{display:flex;flex-direction:column;align-items:center;line-height:1}
.app-dock-soul-label{font-size:.6rem;color:#666;text-transform:uppercase;letter-spacing:.06em}
.app-dock-soul-value{font-weight:700;color:var(--color-primary,#d81b60);font-size:.78rem}
.app-dock .auth-button{padding:var(--space-2,4px) var(--space-3,8px);border-radius:var(--radius-md,6px);border:2px solid rgba(216,27,96,.55);background:rgba(255,255,255,.9);color:var(--color-primary,#d81b60);font-family:var(--font-family,system-ui);font-size:var(--text-sm-plus,.82rem);font-weight:600;cursor:pointer;transition:transform .12s ease,background .12s ease;white-space:nowrap}
.app-dock .auth-button:hover{background:rgba(255,255,255,1);transform:translateY(-1px)}
.app-dock .auth-button:active{transform:translateY(0)}
@media (max-width:720px){.app-dock .character-selector--admin,.app-dock-souls,.app-dock-label{display:none}}
`;
  document.head.appendChild(style);
}

async function run() {
  // profil.html already renders its own auth controls for now.
  if (document.getElementById("authControls")) return;

  const auth = await loadAuthModule();
  if (!auth) return;

  const {
    getCurrentUser,
    getUserCharacters,
    getAllCharacters,
    getActiveCharacter,
    setActiveCharacter,
    logout,
    isAdmin,
    refreshSessionUser,
  } = auth;

  try {
    if (typeof refreshSessionUser === "function") {
      await refreshSessionUser();
    }
  } catch {}

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user) return;

  const adminMode = typeof isAdmin === "function" && isAdmin();
  document.body.dataset.admin = adminMode ? "true" : "false";

  let characters = [];
  try {
    if (typeof getUserCharacters === "function") {
      characters = await getUserCharacters(user.id);
    }
  } catch {
    characters = [];
  }

  const mount = el("div", "app-dock");
  ensureTopbarStyles();

  const selector = el("select", "character-selector");
  selector.setAttribute("aria-label", "Sélectionner un personnage");

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Sélectionner un personnage...";
  selector.appendChild(placeholder);

  characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = character.name;
    selector.appendChild(option);
  });

  const badge = el("span", "user-badge", adminMode ? "ADMIN" : "JOUEUR");
  const label = el("span", "app-dock-label");
  const souls = el("div", "app-dock-souls");
  const soulConso = el("div", "app-dock-soul");
  const soulConsoLabel = el("span", "app-dock-soul-label", "Ames conso");
  const soulConsoValue = el("span", "app-dock-soul-value", "0");
  soulConso.append(soulConsoLabel, soulConsoValue);
  const soulProg = el("div", "app-dock-soul");
  const soulProgLabel = el("span", "app-dock-soul-label", "Ames prog");
  const soulProgValue = el("span", "app-dock-soul-value", "0");
  soulProg.append(soulProgLabel, soulProgValue);
  souls.append(soulConso, soulProg);

  const logoutBtn = el("button", "auth-button secondary", "Déconnexion");
  logoutBtn.type = "button";

  let adminSelect = null;
  if (adminMode) {
    adminSelect = el("select", "character-selector character-selector--admin");
    adminSelect.setAttribute("aria-label", "MJ : sélectionner un personnage");
    const adminPlaceholder = document.createElement("option");
    adminPlaceholder.value = "";
    adminPlaceholder.textContent = "MJ: choisir un personnage...";
    adminSelect.appendChild(adminPlaceholder);

    try {
      if (typeof getAllCharacters === "function") {
        const allCharacters = await getAllCharacters();
        allCharacters.forEach((character) => {
          const option = document.createElement("option");
          option.value = character.id;
          const shortId = character.user_id ? String(character.user_id).slice(0, 8) : "????";
          option.textContent = `${character.name || "Sans nom"} — ${shortId}`;
          adminSelect.appendChild(option);
        });
      }
    } catch {}

    adminSelect.addEventListener("change", async () => {
      const nextId = adminSelect.value;
      if (!nextId) return;

      if (typeof window.astoriaBeforeCharacterChange === "function") {
        try {
          await window.astoriaBeforeCharacterChange();
        } catch {}
      }

      if (typeof setActiveCharacter !== "function") return;
      const res = await setActiveCharacter(nextId);
      if (!res || !res.success) return;
      window.location.reload();
    });
  }

  function readSoulCounts(active) {
    if (!active || !active.id) return { conso: 0, prog: 0 };
    const key = `fiche-${active.id}-eater`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { conso: 0, prog: 0 };
      const data = JSON.parse(raw);
      const conso = Number.parseInt(data?.eaterAmesConso ?? 0, 10);
      const prog = Number.parseInt(data?.eaterAmesProgression ?? 0, 10);
      return {
        conso: Number.isNaN(conso) ? 0 : conso,
        prog: Number.isNaN(prog) ? 0 : prog
      };
    } catch {
      return { conso: 0, prog: 0 };
    }
  }

  function renderSoulCounts(active) {
    const counts = readSoulCounts(active);
    soulConsoValue.textContent = String(counts.conso);
    soulProgValue.textContent = String(counts.prog);
    souls.title = "Compteur d'ames (stub, base sur la fiche)";
  }

  function syncFromActive() {
    const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
    if (active && active.id) {
      selector.value = active.id;
      label.textContent = active.name || user.username;
    } else {
      selector.value = "";
      label.textContent = user.username;
    }
    renderSoulCounts(active);
  }

  syncFromActive();

  selector.addEventListener("change", async () => {
    const nextId = selector.value;
    if (!nextId) return;

    if (typeof window.astoriaBeforeCharacterChange === "function") {
      try {
        await window.astoriaBeforeCharacterChange();
      } catch {}
    }

    if (typeof setActiveCharacter !== "function") return;
    const res = await setActiveCharacter(nextId);
    if (!res || !res.success) return;

    // Simplest + safest v1: reload so every page gets consistent data.
    window.location.reload();
  });

  logoutBtn.addEventListener("click", () => {
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.removeItem("astoria_session");
    }
    window.location.href = "login.html";
  });

  if (adminSelect) {
    mount.append(selector, adminSelect, badge, label, souls, logoutBtn);
  } else {
    mount.append(selector, badge, label, souls, logoutBtn);
  }
  document.body.append(mount);

  setInterval(() => {
    const active = typeof getActiveCharacter === "function" ? getActiveCharacter() : null;
    renderSoulCounts(active);
  }, 1200);
}

run();
