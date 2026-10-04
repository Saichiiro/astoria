# Astoria: Split Site Public vs Gameplay

## Objectif

Séparer clairement:

- le `site public` de découverte, lisible pour les non-joueurs
- l'`app gameplay` connectée, orientée exécution et gestion de personnage

Le but n'est pas de refaire tout le projet d'un coup, mais d'introduire une séparation progressive et cohérente.

## Principe de découpe

### Site public

Le site public sert à:

- présenter Astoria
- montrer ce qui existe vraiment en jeu
- donner envie à de nouveaux joueurs
- éviter de noyer les visiteurs sous les interfaces de gestion

Pages visées:

- `index.html`: accueil public
- `univers.html`: vision du monde, ton, promesse RP
- `royaumes.html`: hub des royaumes
- `gameplay.html`: systèmes réellement disponibles
- `prochainement.html`: contenus prévus, non live
- `rejoindre.html`: comment entrer, créer un personnage, se connecter

### App gameplay

L'app gameplay sert à:

- sélectionner un personnage
- gérer son profil, sa fiche et ses systèmes
- jouer

Pages existantes à conserver côté app:

- `login.html`
- `profil.html`
- `fiche.html`
- `inventaire.html`
- `competences.html`
- `magie.html`
- `craft.html`
- `quetes.html`
- `hdv.html`
- `nokorah.html`
- `codex.html`
- `admin/index.html`

## Règle d'information architecture

### Public

Le public doit répondre vite à:

- C'est quoi Astoria ?
- Quel est le ton du monde ?
- Qu'est-ce qu'on peut y jouer ?
- Qu'est-ce qui est déjà disponible ?
- Comment rejoindre ?

### Gameplay

Le gameplay doit répondre vite à:

- Quel personnage je joue ?
- Quelles sont mes ressources ?
- Quelles actions puis-je faire maintenant ?
- Où est la donnée serveur de référence ?

## Arborescence cible

```text
Public
├── Accueil
├── Univers
├── Royaumes
├── Gameplay
├── Prochainement
└── Rejoindre

App
├── Connexion
├── Hub personnage
├── Profil
├── Fiche
├── Inventaire
├── Compétences
├── Magie
├── Quêtes
├── Craft
├── HDV
├── Nokorah
├── Codex
└── Admin
```

## Migration progressive

### Phase 1

- stabiliser les routes avec `js/config/routes.js`
- conserver les pages existantes côté app
- documenter le split

### Phase 2

- transformer `index.html` en vraie home publique
- déplacer le hub personnage actuel vers une route app dédiée
- connecter la navigation publique aux routes déjà prévues

### Phase 3

- migrer le contenu Google Sites utile vers les pages publiques custom
- séparer clairement `gameplay live` et `contenu lore`
- isoler les `archives vivantes` du lore fixe

### Phase 4

- harmoniser UX public/app
- clarifier les CTA:
  - découvrir
  - voir le gameplay
  - rejoindre
  - se connecter

## Contenus à ne plus mélanger

À garder séparés:

- `lore fixe`
- `gameplay live`
- `archives vivantes`
- `roadmap / prévu`

Exemples:

- `royaumes`, `races`, `factions` -> public / univers
- `inventaire`, `compétences`, `magie` -> app gameplay
- `liens du sang`, `pactes`, `registres` -> archives vivantes
- `fonctionnalités futures` -> prochainement

## Risques à éviter

- utiliser la sidebar app comme navigation publique
- mélanger promesse marketing et écrans de gestion
- afficher des systèmes non disponibles comme s'ils étaient live
- dupliquer les mêmes infos entre public et gameplay

## Lot suivant recommandé

1. Créer la vraie home publique.
2. Déplacer le hub personnage dans une route app dédiée.
3. Ajouter la navigation publique minimale.
4. Migrer ensuite le contenu des royaumes.
