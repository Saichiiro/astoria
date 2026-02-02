# 📚 Libraries Setup - Astoria

Stack complète pour rendre le site responsive, dynamique et professionnel sans overkill.

## ✅ Librairies Essentielles (À Intégrer Maintenant)

### 1. **Floating UI** (v1.6+)
- **Usage:** Popovers, tooltips, dropdowns, menus
- **Pourquoi:** Positionnement intelligent qui gère overflow, mobile, collision
- **Où:** Character summary dropdown, inventory tooltips, skill tooltips
- **CDN:** `https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.1/dist/floating-ui.dom.min.js`
- **Taille:** ~10KB gzipped

### 2. **DOMPurify** (v3.0+)
- **Usage:** Sanitize HTML user-generated (profil, présentations)
- **Pourquoi:** CRITIQUE - évite XSS attacks
- **Où:** profil.html (éditeur riche), partout où HTML custom
- **CDN:** `https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js`
- **Taille:** ~20KB gzipped

### 3. **Notyf** (v3.10+)
- **Usage:** Toast notifications (succès, erreur, info)
- **Pourquoi:** Feedback utilisateur unifié et élégant
- **Où:** Toutes les pages (save, delete, error, success)
- **CDN:**
  - JS: `https://cdn.jsdelivr.net/npm/notyf@3.10.0/notyf.min.js`
  - CSS: `https://cdn.jsdelivr.net/npm/notyf@3.10.0/notyf.min.css`
- **Taille:** ~6KB gzipped

### 4. **body-scroll-lock** (v4.0+)
- **Usage:** Empêcher scroll body quand modal ouvert
- **Pourquoi:** UX mobile (évite scroll behind modal)
- **Où:** Tous les modals
- **CDN:** `https://cdn.jsdelivr.net/npm/body-scroll-lock@4.0.0-beta.0/lib/bodyScrollLock.min.js`
- **Taille:** ~2KB gzipped

### 5. **localForage** (v1.10+)
- **Usage:** Storage offline (IndexedDB wrapper)
- **Pourquoi:** Autosave drafts, cache data, offline-friendly
- **Où:** fiche.html (draft), profil.html (draft), inventaire (cache)
- **CDN:** `https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js`
- **Taille:** ~10KB gzipped

### 6. **Cropper.js** (Déjà installé)
- **Usage:** Crop/zoom images (avatar, silhouette, quêtes, codex)
- **Pourquoi:** Pro, mobile-friendly, rotate support
- **Où:** profil, inventaire, quêtes, codex, nokorah
- **Déjà:** `https://cdn.jsdelivr.net/npm/cropperjs@1.6.1/dist/cropper.min.js`
- **Taille:** ~40KB gzipped
- **Enhancement:** Support rotate pour mode paysage

---

## 🎯 Librairies Recommandées (Intégration Progressive)

### 7. **Shoelace** (v2.12+) - Web Components
- **Usage:** Composants UI standardisés (tabs, dialog, drawer, select, tooltip)
- **Pourquoi:** Accessibles, responsive, customizable, sans framework
- **Où:** Standardiser tabs (hdv, magie, fiche), modals, selects
- **CDN:**
  - CSS: `https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.12.0/cdn/themes/light.css`
  - JS: `https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.12.0/cdn/shoelace-autoloader.js`
- **Taille:** ~50KB initial + lazy load components
- **Note:** Import seulement les composants utilisés

### 8. **Day.js** (v1.11+)
- **Usage:** Manipulation dates (lightweight Moment.js alternative)
- **Pourquoi:** Petit, moderne, i18n support
- **Où:** Historique HDV, quêtes (dates), timestamps
- **CDN:** `https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js`
- **Taille:** ~7KB gzipped

---

## 🔧 Librairies Optionnelles (Si Besoin Spécifique)

### 9. **SortableJS** (v1.15+)
- **Usage:** Drag & drop, reorder lists
- **Pourquoi:** Fluide, touch-friendly, accessible
- **Où:** Inventaire (reorder), présentations (blocs custom)
- **Quand:** Si on veut step up l'UX inventaire/profil
- **CDN:** `https://cdn.jsdelivr.net/npm/sortablejs@1.15.1/Sortable.min.js`
- **Taille:** ~15KB gzipped

### 10. **Tabulator** (v5.5+)
- **Usage:** Tables riches (tri, filtres, pagination, responsive)
- **Pourquoi:** Pro, mobile-friendly, export CSV/JSON
- **Où:** HDV (offres), Codex (items), Quêtes (historique)
- **Quand:** Si on veut upgrade tables
- **CDN:**
  - JS: `https://cdn.jsdelivr.net/npm/tabulator-tables@5.5.2/dist/js/tabulator.min.js`
  - CSS: `https://cdn.jsdelivr.net/npm/tabulator-tables@5.5.2/dist/css/tabulator_simple.min.css`
- **Taille:** ~100KB gzipped

### 11. **Quill** (v1.3+)
- **Usage:** Rich text editor (WYSIWYG)
- **Pourquoi:** Clean, extensible, mobile-friendly
- **Où:** profil.html (remplacer éditeur actuel)
- **Quand:** Si on veut enhance l'éditeur
- **CDN:**
  - JS: `https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js`
  - CSS: `https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css`
- **Taille:** ~50KB gzipped

### 12. **Fuse.js** (v7.0+)
- **Usage:** Fuzzy search (recherche floue)
- **Pourquoi:** Recherche intelligente (typos, approximations)
- **Où:** Codex search, Inventaire search, Quêtes search
- **Quand:** Pour améliorer les searchbars
- **CDN:** `https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js`
- **Taille:** ~15KB gzipped

---

## 🌟 Librairies Bonus (Confort/Qualité)

### 13. **VanillaJS Datepicker** (v1.3+)
- **Usage:** Date picker accessible
- **Où:** Filtres dates HDV, quêtes
- **CDN:**
  - JS: `https://cdn.jsdelivr.net/npm/vanillajs-datepicker@1.3.4/dist/js/datepicker-full.min.js`
  - CSS: `https://cdn.jsdelivr.net/npm/vanillajs-datepicker@1.3.4/dist/css/datepicker.min.css`
- **Taille:** ~20KB gzipped

### 14. **Chart.js** (v4.4+)
- **Usage:** Graphiques (stats, progression)
- **Où:** Stats personnage, économie HDV, progression compétences
- **Quand:** Si dashboard/stats souhaités
- **CDN:** `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`
- **Taille:** ~70KB gzipped

### 15. **Swiper** (v11.0+)
- **Usage:** Carousels/sliders mobile-friendly
- **Où:** Galerie images quêtes, showcase inventaire
- **Quand:** Si carousel souhaité
- **CDN:**
  - JS: `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js`
  - CSS: `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css`
- **Taille:** ~35KB gzipped

### 16. **Zod** (v3.22+)
- **Usage:** Validation schémas (forms, API)
- **Où:** Formulaires création perso, fiche, offres HDV
- **Quand:** Pour validation robuste
- **CDN:** `https://cdn.jsdelivr.net/npm/zod@3.22.4/lib/index.umd.js`
- **Taille:** ~20KB gzipped

### 17. **hotkeys-js** (v3.12+)
- **Usage:** Keyboard shortcuts
- **Où:** Navigation rapide, actions clavier power users
- **Quand:** Pour confort utilisateurs avancés
- **CDN:** `https://cdn.jsdelivr.net/npm/hotkeys-js@3.12.2/dist/hotkeys.min.js`
- **Taille:** ~5KB gzipped

### 18. **Tippy.js** (v6.3+)
- **Usage:** Tooltips élégants (basé sur Floating UI)
- **Où:** Infos compétences, items, skills
- **Note:** Alternative à Floating UI pur (plus simple)
- **CDN:** `https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/dist/tippy-bundle.umd.min.js`
- **Taille:** ~15KB gzipped

### 19. **Plyr** (v3.7+)
- **Usage:** Lecteur vidéo/audio customizable
- **Où:** Si tutoriels vidéo, musiques ambiance
- **Quand:** Contenu multimédia futur
- **CDN:**
  - JS: `https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.min.js`
  - CSS: `https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css`
- **Taille:** ~30KB gzipped

### 20. **imask** (v7.1+)
- **Usage:** Input masking (formats automatiques)
- **Où:** Inputs prix HDV, quantités, dates
- **Quand:** Pour UX inputs
- **CDN:** `https://cdn.jsdelivr.net/npm/imask@7.1.3/dist/imask.min.js`
- **Taille:** ~15KB gzipped

---

## 📦 Structure Recommandée

```
astoria/
├── index.html
├── css/
│   ├── style.css (global)
│   ├── components/ (nouveau)
│   │   ├── modal.css
│   │   ├── tabs.css
│   │   ├── cards.css
│   │   ├── tables.css
│   │   └── forms.css
│   └── pages/ (existant)
├── js/
│   ├── libs/ (nouveau - vendor scripts si local)
│   ├── components/ (nouveau)
│   │   ├── modal-manager.js
│   │   ├── toast-manager.js
│   │   ├── uploader-cropper.js
│   │   ├── tabs-manager.js
│   │   └── storage-manager.js
│   ├── utils/ (nouveau)
│   │   ├── sanitize.js (wrapper DOMPurify)
│   │   ├── floating.js (wrapper Floating UI)
│   │   └── validation.js
│   ├── services/ (nouveau ou renommer api/)
│   │   ├── character-service.js
│   │   ├── inventory-service.js
│   │   └── quest-service.js
│   └── pages/ (scripts pages existants)
└── assets/
```

---

## 🚀 Plan d'Intégration (Ordre Recommandé)

### Phase 1: Fondations (Jour 1)
1. Créer structure `/js/components/` et `/js/utils/`
2. Importer librairies essentielles (CDN dans `<head>`)
3. Créer `toast-manager.js` (wrapper Notyf)
4. Créer `storage-manager.js` (wrapper localForage)

### Phase 2: Composants Core (Jour 2-3)
5. Créer `modal-manager.js` (body-scroll-lock + accessible)
6. Créer `uploader-cropper.js` (wrapper Cropper.js unifié)
7. Standardiser DOMPurify dans `sanitize.js`
8. Créer `floating.js` (wrapper tooltips/popovers)

### Phase 3: Integration Pages (Jour 4-7)
9. Refactor profil.html (modal, crop, sanitize, toast, autosave)
10. Refactor codex.html (modal, crop, toast, table)
11. Refactor inventaire.html (modal, crop, tooltip, autosave)
12. Refactor quetes.html (modal, crop, toast)
13. Refactor fiche.html (autosave, validation)
14. Refactor hdv.html (tabs, table, validation)

### Phase 4: Enhancements (Semaine 2)
15. Ajouter Shoelace (tabs, dialogs standardisés)
16. Ajouter Fuse.js (recherches intelligentes)
17. Optionnels selon besoin (Quill, Tabulator, SortableJS)

---

## 💾 Installation CDN (Quick Start)

Ajouter dans `<head>` de chaque page ou dans un template commun:

```html
<!-- Essentiels -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/notyf@3.10.0/notyf.min.css">
<script src="https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.1/dist/floating-ui.dom.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/notyf@3.10.0/notyf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/body-scroll-lock@4.0.0-beta.0/lib/bodyScrollLock.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>

<!-- Recommandés -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.12.0/cdn/themes/light.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.12.0/cdn/shoelace-autoloader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
```

Total essentiels: **~50KB gzipped** (négligeable)
Total avec recommandés: **~110KB gzipped** (raisonnable)

---

## ✅ Checklist Intégration

- [ ] Structure dossiers créée
- [ ] CDN essentiels ajoutés dans templates
- [ ] toast-manager.js créé et testé
- [ ] storage-manager.js créé et testé
- [ ] modal-manager.js créé et testé
- [ ] uploader-cropper.js créé et testé
- [ ] sanitize.js wrapper créé
- [ ] floating.js wrapper créé
- [ ] profil.html refactoré
- [ ] codex.html refactoré
- [ ] inventaire.html refactoré
- [ ] quetes.html refactoré
- [ ] Documentation composants
- [ ] Tests responsive mobile/tablet/desktop

---

**Prêt à commencer l'intégration!** 🚀
