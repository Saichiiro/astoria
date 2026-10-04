import { resolve } from 'path';
import { createLogger, defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const root = resolve(__dirname);

// Pages also load classic (non-module) scripts from js/ that rely on globals.
// They are copied verbatim to dist (see viteStaticCopy), so Vite's notice that it
// cannot bundle them is expected and only hides real warnings.
const logger = createLogger();
const baseWarn = logger.warn;
logger.warn = (msg, options) => {
    if (String(msg).includes("can't be bundled without type=\"module\" attribute")) return;
    baseWarn(msg, options);
};

export default defineConfig({
    root,
    customLogger: logger,
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            // Game pages live in html/ and rely on <base href="../">: they are
            // copied verbatim (see viteStaticCopy) like the classic js/ scripts.
            input: {
                index: resolve(root, 'index.html'),
                admin: resolve(root, 'admin/index.html'),
            },
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'assets', dest: '.' },
                { src: 'js', dest: '.' },
                { src: 'css', dest: '.' },
                { src: 'html', dest: '.' },
                { src: 'data', dest: '.' },
                // Unknown URLs (GitHub Pages / static hosts): redirects old root page links
                { src: '404.html', dest: '.' },
            ],
        }),
    ],
    server: {
        port: 5173,
        open: '/index.html',
    },
});
