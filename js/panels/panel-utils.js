export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

export function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

