(function () {
  const api = window.astoriaHamburger || {};

  function resolveTarget(root, options) {
    if (options && options.target) return options.target;
    const selector = root.getAttribute('data-hamburger-target') || root.getAttribute('aria-controls');
    if (!selector) return null;
    if (selector.startsWith('#')) {
      return document.querySelector(selector);
    }
    return document.getElementById(selector) || document.querySelector(selector);
  }

  function bindHamburger(options) {
    const root = options && options.root ? options.root : null;
    if (!root) return null;

    const openClass = options && options.openClass ? options.openClass : 'open';
    const targetOpenClass = options && options.targetOpenClass ? options.targetOpenClass : 'is-open';
    const onToggle = options && typeof options.onToggle === 'function' ? options.onToggle : null;
    const target = resolveTarget(root, options);

    let isOpen = root.classList.contains(openClass);

    function setExpanded(nextOpen) {
      root.classList.toggle(openClass, nextOpen);
      root.setAttribute('aria-expanded', String(nextOpen));
      if (target) {
        target.classList.toggle(targetOpenClass, nextOpen);
        target.setAttribute('aria-hidden', String(!nextOpen));
      }
      if (onToggle) onToggle(nextOpen, root, target);
      isOpen = nextOpen;
    }

    root.addEventListener('click', (event) => {
      event.preventDefault();
      setExpanded(!isOpen);
    });

    return {
      setOpen: (nextOpen) => setExpanded(Boolean(nextOpen)),
      toggle: () => setExpanded(!isOpen),
      isOpen: () => isOpen
    };
  }

  function bindAll(options) {
    const selector = options && options.selector ? options.selector : '[data-hamburger]';
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes.map((root) => bindHamburger({
      root,
      openClass: options && options.openClass ? options.openClass : undefined,
      targetOpenClass: options && options.targetOpenClass ? options.targetOpenClass : undefined,
      onToggle: options && options.onToggle ? options.onToggle : undefined
    }));
  }

  function init() {
    bindAll({});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  api.bind = bindHamburger;
  api.bindAll = bindAll;
  window.astoriaHamburger = api;
})();
