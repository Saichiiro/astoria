import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const root = resolve(__dirname);

export default defineConfig({
    root,
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index:       resolve(root, 'index.html'),
                login:       resolve(root, 'login.html'),
                profil:      resolve(root, 'profil.html'),
                fiche:       resolve(root, 'fiche.html'),
                competences: resolve(root, 'competences.html'),
                inventaire:  resolve(root, 'inventaire.html'),
                hdv:         resolve(root, 'hdv.html'),
                quetes:      resolve(root, 'quetes.html'),
                magie:       resolve(root, 'magie.html'),
                codex:       resolve(root, 'codex.html'),
                craft:       resolve(root, 'craft.html'),
                nokorah:     resolve(root, 'nokorah.html'),
                admin:       resolve(root, 'admin/index.html'),
            },
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [{ src: 'assets', dest: '.' }],
        }),
    ],
    server: {
        port: 5173,
        open: '/index.html',
    },
});
