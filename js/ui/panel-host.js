export function createPanelHost({ root = document.body, variant = "drawer" } = {}) {
  if (!root) throw new Error("createPanelHost: root is required");

  const previousFocusStack = [];
  const normalizeVariant = (value) => (value === "modal" ? "modal" : "drawer");
  let currentVariant = normalizeVariant(variant);

  const backdrop = document.createElement("div");
  backdrop.className = "panel-backdrop";
  backdrop.hidden = true;

  const drawer = document.createElement("aside");
  drawer.className = "panel-drawer";
  drawer.classList.add(`panel-variant-${currentVariant}`);
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-hidden", "true");

  const header = document.createElement("div");
  header.className = "panel-header";

  const title = document.createElement("div");
  title.className = "panel-title";
  title.id = "panelTitle";
  drawer.setAttribute("aria-labelledby", title.id);

  const actions = document.createElement("div");
  actions.className = "panel-actions";

  const openFullLink = document.createElement("a");
  openFullLink.className = "panel-open-full";
  openFullLink.target = "_self";
  openFullLink.rel = "noopener";
  openFullLink.hidden = true;
  openFullLink.textContent = "Ouvrir la page complete";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "panel-close";
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.textContent = "x";

  actions.appendChild(openFullLink);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);

  const content = document.createElement("div");
  content.className = "panel-content";

  drawer.appendChild(header);
  drawer.appendChild(content);

  root.appendChild(backdrop);
  root.appendChild(drawer);

  let isOpen = false;
  let currentPanelId = null;

  function setOpenFullPage({ href, label } = {}) {
    if (!href) {
      openFullLink.hidden = true;
      openFullLink.removeAttribute("href");
      openFullLink.textContent = "Ouvrir la page complete";
      return;
    }

    openFullLink.hidden = false;
    openFullLink.href = href;
    openFullLink.textContent = label || "Ouvrir la page complete";
  }

  function setTitle(text) {
    title.textContent = text || "";
  }

  function buildFallbackContent(titleText, messageText = "Aucun contenu disponible.") {
    const wrapper = document.createElement("div");
    wrapper.className = "panel-card";
    const heading = document.createElement("h3");
    heading.className = "panel-card-title";
    heading.textContent = titleText || "Panel";
    const message = document.createElement("p");
    message.className = "panel-muted";
    message.textContent = messageText;
    wrapper.append(heading, message);
    return wrapper;
  }

  function normalizeNode(node, titleText) {
    if (node && typeof node === "object" && "nodeType" in node) {
      const childCount = node.childNodes ? node.childNodes.length : 0;
      if (childCount === 0) {
        const fallback = buildFallbackContent(
          titleText,
          "Ce panneau est vide pour le moment."
        );
        if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          return fallback;
        }
        node.appendChild(fallback);
      }
      return node;
    }
    if (typeof node === "string") {
      return buildFallbackContent(titleText, node);
    }
    return buildFallbackContent(titleText);
  }

  function setContent(node) {
    content.replaceChildren();
    if (node) content.appendChild(node);
  }

  function setVariant(nextVariant) {
    const normalized = normalizeVariant(nextVariant);
    if (normalized === currentVariant) return;
    drawer.classList.remove(`panel-variant-${currentVariant}`);
    currentVariant = normalized;
    drawer.classList.add(`panel-variant-${currentVariant}`);
  }

  function open({ panelId, titleText, fullPageHref, fullPageLabel, node, variant: openVariant } = {}) {
    const safeTitle = String(titleText || "").trim() || "Panel";
    const safeNode = normalizeNode(node, safeTitle);
    if (openVariant) {
      setVariant(openVariant);
    }

    if (isOpen) {
      setTitle(safeTitle);
      setOpenFullPage({ href: fullPageHref, label: fullPageLabel });
      setContent(safeNode);
      currentPanelId = panelId || null;
      return;
    }

    previousFocusStack.push(document.activeElement);

    setTitle(safeTitle);
    setOpenFullPage({ href: fullPageHref, label: fullPageLabel });
    setContent(safeNode);
    currentPanelId = panelId || null;

    isOpen = true;
    document.documentElement.classList.add("panel-open");
    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    currentPanelId = null;

    document.documentElement.classList.remove("panel-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    setContent(null);
    setOpenFullPage({ href: null });

    const previous = previousFocusStack.pop();
    if (previous && typeof previous.focus === "function") {
      previous.focus({ preventScroll: true });
    }
  }

  backdrop.addEventListener("click", close);
  closeBtn.addEventListener("click", close);

  window.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  return {
    open,
    close,
    isOpen: () => isOpen,
    getCurrentPanelId: () => currentPanelId,
    getVariant: () => currentVariant,
    setVariant,
    setTitle,
    setContent,
    setOpenFullPage,
    elements: { backdrop, drawer, header, content, title, actions, closeBtn, openFullLink },
  };
}
