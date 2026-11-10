// Repository sanity check (no dependencies): node scripts/check.mjs  |  npm run check
//  - text files are valid UTF-8, without BOM, without mojibake (double-encoded accents) or U+FFFD
//  - relative imports and src/href in the JS and HTML files point to files that exist
// Exits with code 1 when something is wrong, so it can gate a build or a commit.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.json', '.md', '.sql', '.svg', '.txt', '.yml', '.yaml']);
// Typical double-encoded UTF-8: a lead character (Ã, Â, â) followed by a Windows-1252 / Latin-1 continuation.
const MOJIBAKE = /[ÂÃâ][\u0080-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
const JS_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"`])(\.{1,2}\/[^'"`\n$]+?)\1/g;
const HTML_REFERENCE = /\b(?:src|href)=(["'])([^"']+)\1/g;
// Also skips "$1"-style placeholders found in regex replacement strings.
const EXTERNAL = /^(?:https?:|\/\/|\/|#|data:|mailto:|javascript:|\$\d)/;

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
    .filter((file) => existsSync(file));
const problems = [];
const report = (file, line, message) => problems.push(`${file}${line ? `:${line}` : ''}  ${message}`);

const decoder = new TextDecoder('utf-8', { fatal: true });
const texts = new Map();
for (const file of files) {
    if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase())) continue;
    const bytes = readFileSync(file);
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) report(file, 0, 'BOM at start of file');
    let text;
    try {
        text = decoder.decode(bytes);
    } catch {
        report(file, 0, 'not valid UTF-8');
        continue;
    }
    texts.set(file, text);
    text.split('\n').forEach((line, index) => {
        if (MOJIBAKE.test(line)) report(file, index + 1, `mojibake: ${JSON.stringify(line.trim().slice(0, 80))}`);
        else if (line.includes(REPLACEMENT_CHARACTER)) report(file, index + 1, 'replacement character U+FFFD');
    });
}

const exists = (path) => existsSync(path) || existsSync(`${path}.js`);
const isCommentLine = (line) => /^\s*(?:\/\/|\*|<!--)/.test(line);

for (const [file, text] of texts) {
    const extension = extname(file).toLowerCase();
    const isHtml = extension === '.html';
    if (extension !== '.js' && extension !== '.mjs' && !isHtml) continue;
    // Pages in html/ use <base href="../">; admin/ resolves from its own folder.
    const base = isHtml ? (file.startsWith('admin/') ? 'admin' : '.') : dirname(file);
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        for (const match of line.matchAll(JS_SPECIFIER)) {
            const target = normalize(join(base, match[2].split(/[?#]/)[0]));
            if (!exists(target)) report(file, index + 1, `broken import ${match[2]}`);
        }
        if (!isHtml) return;
        for (const match of line.matchAll(HTML_REFERENCE)) {
            const value = match[2];
            if (EXTERNAL.test(value) || value.includes('${')) continue;
            const target = normalize(join(base, value.split(/[?#]/)[0]));
            if (!target.endsWith('.html') && !exists(target)) report(file, index + 1, `broken reference ${value}`);
        }
    });
}

if (problems.length) {
    console.error(`${problems.length} problem(s):`);
    problems.forEach((problem) => console.error(`  ${problem}`));
    process.exit(1);
}
console.log(`OK: ${texts.size} text files checked (UTF-8, BOM, mojibake, references).`);
