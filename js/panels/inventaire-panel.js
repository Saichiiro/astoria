import { el, safeNumber } from "./panel-utils.js";

export const inventairePanel = {
  id: "inventaire",
  title: "Inventaire",
  fullPageHref: "inventaire.html",
  fullPageLabel: "Ouvrir l'inventaire",
  renderPanel(ctx) {
    const wrapper = el("div", "panel-card");
    wrapper.appendChild(el("h3", "panel-card-title", "Resume"));

    const character = ctx?.character || null;
    if (!character) {
      wrapper.appendChild(
        el("p", "panel-muted", "Selectionnez un personnage pour afficher un resume d'inventaire.")
      );
      return wrapper;
    }

    const summary = el("p", "panel-muted", "Chargement...");
    wrapper.appendChild(summary);

    const grid = el("div", "panel-inventory-grid");
    wrapper.appendChild(grid);

    const footerHint = el(
      "p",
      "panel-muted panel-spacer",
      "Ce panneau est un apercu. Les details restent sur la page inventaire."
    );
    wrapper.appendChild(footerHint);

    (async () => {
      try {
        const inventoryApi = await import("../api/inventory-service.js");
        const rows = await inventoryApi.getInventoryRows(character.id);
        const itemCount = Array.isArray(rows) ? rows.length : 0;
        const totalQty = Array.isArray(rows)
          ? rows.reduce((sum, entry) => sum + (safeNumber(entry?.qty) || 0), 0)
          : 0;

        const pieces = [];
        if (typeof itemCount === "number") pieces.push(`${itemCount} type(s)`);
        if (typeof totalQty === "number") pieces.push(`${totalQty} total`);

        summary.textContent = pieces.length ? pieces.join(" - ") : "Inventaire vide.";

        grid.innerHTML = "";
        const helpers = window?.astoriaImageHelpers;
        const placeholder = helpers?.smallPlaceholder || "";
        let baseItems = Array.isArray(window?.inventoryData) ? window.inventoryData : [];
        if (!baseItems.length) {
          try {
            const existing = document.querySelector('script[src="js/data.js"]');
            if (!existing) {
              await new Promise((resolve) => {
                const script = document.createElement("script");
                script.src = "js/data.js";
                script.onload = resolve;
                script.onerror = resolve;
                document.head.appendChild(script);
              });
            }
          } catch {}
          baseItems = Array.isArray(window?.inventoryData) ? window.inventoryData : [];
        }
        let dbItemsByName = null;

        if (!baseItems.length) {
          try {
            const itemsApi = await import("../api/items-service.js");
            const dbItems = await itemsApi.getAllItems();
            if (Array.isArray(dbItems)) {
              dbItemsByName = new Map(
                dbItems
                  .filter((item) => item?.name)
                  .map((item) => [String(item.name).toLowerCase(), item])
              );
            }
          } catch (error) {
            console.warn("Inventaire panel items lookup failed:", error);
          }
        }

        const previewRows = Array.isArray(rows) ? rows.slice(0, 12) : [];
        const normalizeName = (value) =>
          String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
        previewRows.forEach((row) => {
          const qty = Math.max(0, Math.floor(safeNumber(row?.qty) || 0));
          if (!Number.isFinite(qty) || qty <= 0) return;

          let item = null;
          const keyNorm = normalizeName(row?.item_key);
          if (keyNorm && Array.isArray(baseItems) && baseItems.length) {
            item = baseItems.find((entry) => normalizeName(entry?.name || entry?.nom || "") === keyNorm) || null;
          }
          if (!item) {
            const idx = Number(row?.item_index);
            item = Number.isFinite(idx) ? baseItems[idx] : null;
          }
          if (!item && dbItemsByName && row?.item_key) {
            item = dbItemsByName.get(String(row.item_key).toLowerCase()) || null;
          }

          const name = item?.name || (row?.item_key ? String(row.item_key) : "Objet");
          let img = placeholder;
          if (item) {
            if (helpers?.resolveItemImages) {
              img = helpers.resolveItemImages(item)?.primary || placeholder;
            } else if (item.images?.primary) {
              img = item.images.primary;
            } else if (item.image) {
              img = item.image;
            }
          }

          const tile = el("div", "panel-inventory-item");
          tile.title = `${name} x${qty}`;

          const thumb = el("div", "panel-inventory-thumb");
          const image = document.createElement("img");
          image.src = img;
          image.alt = name;
          image.loading = "lazy";
          image.decoding = "async";
          if (placeholder) {
            image.onerror = () => {
              image.src = placeholder;
            };
          }
          thumb.appendChild(image);

          const qtyBadge = el("div", "panel-inventory-qty", `x${qty}`);
          tile.append(thumb, qtyBadge);
          grid.appendChild(tile);
        });

        if (Array.isArray(rows) && rows.length > previewRows.length) {
          const remaining = rows.length - previewRows.length;
          const more = el("p", "panel-inventory-more", `+ ${remaining} autres`);
          grid.appendChild(more);
        }
      } catch (error) {
        console.error("Inventaire panel error:", error);
        summary.textContent = "Impossible de charger l'inventaire.";
        grid.innerHTML = "";
      }
    })();

    return wrapper;
  },
};
