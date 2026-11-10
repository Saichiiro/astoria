// Text that comes from players or the database (item names, character names,
// picture URLs...) must never be parsed as HTML when it goes into a template
// string. Escapes text, including quotes, so it is safe in content and in attributes.
// (Classic scripts use window.sanitizer.escapeHtml from js/utils/sanitize.js.)
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
