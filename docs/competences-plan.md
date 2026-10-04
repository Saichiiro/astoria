# Plan d'amélioration ciblé — competences.html (Priorité 4 > 1 > 3 > 5, priorité 2 mise de côté)

## État d'avancement rapide
- ✅ P4 — Conserver la structure existante (aucun nouveau dossier créé) et rester KISS.
- ✅ P4 — Extraire les données `skillsCategories` vers `data.js` et la logique JS vers `competences.js` avec `<script defer>`.
- ✅ P4 — Ajouter `<main>` + conteneur `role="navigation"` harmonisés sur toutes les pages.
- ✅ P1 — Externaliser le bloc `<script>` de `competences.html` vers `competences.js`.
- ✅ P1 — Accessibilité/clavier : rôles tablist/tab, aria-selected, navigation fléchée, aria-live sur le compteur.
- ✅ P1 — Points à répartir : règles admin/joueur, +/− par compétence selon compteur, bouton de validation/lock.
- ✅ P1 — Persistance simple par onglet + bouton de réinitialisation dédié (localStorage, reset) sans sur-ingénierie.
- ✅ P3 — Lien de retour vers `categories.html` et nettoyage DOM (icônes non inline, escapeHtml si nécessaire).
- ✅ P5 — Rappel navigateurs modernes uniquement (ajouté dans le code).
- ⬜ P2 — Nice-to-have (micro-interactions, recherche live, etc.) volontairement non traités.

## Rappel de priorisation
- **P4** : Points transverses simples appliqués en premier (DRY/KISS)
- **P1** : Améliorations spécifiques à `competences.html`
- **P3** : Quick wins supplémentaires
- **P5** : Compatibilité navigateurs modernes (rappel seulement)
- **P2** : UX nice-to-have **mis de côté** (voir section dédiée en fin de document)

## P4 — Points transverses (appliquer avant le reste)
- **Conserver la structure de fichiers actuelle (KISS)**
  - Pas de création de nouveaux dossiers (`assets/js`, `assets/css`, etc.) pour cette phase afin de préserver les références existantes.
  - Si extraction nécessaire, rester dans les fichiers actuels (`data.js` pour les données, un seul nouveau fichier JS à la racine si indispensable) et garder les balises `<script>` natives.
- **Extraire uniquement le minimum utile**
  - Déplacer `skillsCategories` (lignes ~427-512 et suivantes) vers `data.js` sous `window.skillsCategories` et le charger avant le script dédié à la page (toujours via `<script src="data.js" defer></script>`).
  - Sortir la logique JS (lignes ~539-658) dans un simple `competences.js` à la racine, chargé avec `defer` (pas de `type="module"` pour éviter tout changement de scope ou de chemin).
- **Structure sémantique minimale partagée**
  - Ajouter `<main>` et un conteneur `role="navigation"` cohérents sur toutes les pages en reprenant le pattern déjà présent dans `competences.html` (lignes 400-419) afin d’harmoniser les landmarks.

## P1 — Améliorations ciblées competences.html
- **Scripts externalisés et chargés proprement**
  - Remplacer le bloc `<script>` inline (lignes ~423-659) par l’inclusion de `competences.js` (à la racine) avec `defer` pour ne pas bloquer le rendu, sans déplacer d’autres ressources.
- **Accessibilité & clavier**
  - Ajouter gestion clavier sur onglets : `keydown` flèches gauche/droite et `Home/End` pour naviguer entre boutons `.skills-tab-btn`, focus visible et réordonnancement de l’activation via `space/enter` (sur les éléments créés dans `renderSkillsTabs`).
  - Définir `role="tablist"` sur `#skillsTabs`, `role="tab"` sur les boutons et `aria-selected` synchronisé dans `renderSkillsTabs` / `setActiveSkillsCategory`.
  - Encapsuler la liste dans `<section aria-labelledby="skillsCategoryTitle">` (déjà présent) et ajouter `role="status"` ou `aria-live="polite"` sur le conteneur de points (lignes 404-413) pour annoncer les changements.
- **Points à répartir : logique admin / joueur**
  - Admin uniquement : garder les boutons `+` / `−` du compteur global "points à répartir" pour l’allocation initiale (boutons non rendus côté joueur).
  - Joueur : afficher le compteur "points à répartir" (en lecture seule) par onglet, sans les boutons `+` / `−` globaux.
  - Par catégorie (par ex. Arts, Connaissance…) : afficher des `+` / `−` à côté de chaque compétence uniquement si le compteur de la catégorie > 0 ; griser/désactiver sinon (classe `is-disabled`, `aria-disabled="true"`).
  - Lorsque le joueur répartit ses points dans une catégorie, décrémenter le compteur propre à l’onglet ; si le compteur atteint 0, désactiver les `+` ; empêcher toute baisse sous 0 avec garde dans le gestionnaire `onDecrement`.
  - Ajouter un bouton de confirmation/validation par onglet (ex. "Valider mes points") qui :
    - bloque les `+` / `−` après validation (classe `is-locked`),
    - déclenche un message de feedback (`role="status"`, aria-live) confirmant l’enregistrement,
    - reste KISS : aucune persistance pour l’instant, simple verrouillage en mémoire.
- **Pas d’animations supplémentaires**
  - Ne pas introduire de nouvelles animations ou transitions ; conserver la rapidité d’action. Retirer/ignorer la mention `prefers-reduced-motion` de cette phase.

## P3 — Quick wins supplémentaires
- **Navigation cohérente**
  - Ajouter dans `competences.html` un lien de retour vers `categories.html` dans l’entête pour sortir l’état d’orphelin (KISS : un simple `<a>` stylé).
- **Nettoyage DOM**
  - Remplacer les images inline d’icônes (ex : `icon: '<img ...>'`) par des références à des classes utilitaires ou emojis stockés dans les données pour éviter l’injection HTML dans `innerHTML`.
- **Protection XSS minimale**
  - Si un utilitaire commun devient nécessaire, l’ajouter dans le même fichier JS (pas de nouveau dossier) avec `escapeHtml` pour la génération des labels.

## P5 — Compatibilité (rappel)
- Navigateurs modernes uniquement ; pas de transpilation ni polyfills. Conserver les API DOM standards, privilégier `classList`, `dataset`, `aria-*`.

## P2 — Nice-to-have UX (non planifiés dans cette phase)
- Micro-interactions sur les boutons d’onglet (hover/active) et feedback sonore optionnel (à repousser pour ne pas casser la rapidité d’action).
- Filtres ou recherche live dans les compétences (à envisager seulement si besoin utilisateur confirmé).
- Persistance des points à répartir dans `localStorage` avec un bouton "Réinitialiser" dédié.
