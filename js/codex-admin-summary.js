import { initCharacterSummary } from "./ui/character-summary.js";
import { isAdmin, refreshSessionUser } from "./auth.js";

function initCodexAdminSummary() {
    return Promise.resolve(refreshSessionUser?.())
        .then(() => initCharacterSummary({ enableDropdown: true, showKaels: true }))
        .then(() => {
            const adminStatus = isAdmin();
            window.astoriaIsAdmin = adminStatus;
            if (!window.astoriaIsAdmin) {
                const adminAddBtn = document.getElementById("adminAddItemBtn");
                if (adminAddBtn) adminAddBtn.hidden = true;
                const adminActions = document.getElementById("modalAdminActions");
                if (adminActions) adminActions.hidden = true;
                return;
            }

            const adminAddBtn = document.getElementById("adminAddItemBtn");
            if (adminAddBtn) {
                adminAddBtn.hidden = false;
            }
            const adminActions = document.getElementById("modalAdminActions");
            if (adminActions) {
                adminActions.hidden = false;
            }
            if (window.astoriaCodex && typeof window.astoriaCodex.refresh === "function") {
                window.astoriaCodex.refresh();
            }
        })
        .catch((error) => {
            console.warn("Codex admin/character summary init failed:", error);
        });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initCodexAdminSummary());
} else {
    initCodexAdminSummary();
}
