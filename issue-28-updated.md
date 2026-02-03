# 🔍 Audit Complet du Site Astoria

Cette issue regroupe un audit complet ergonomique et gameplay du site pour préparer l'accueil des joueurs. L'objectif est d'identifier et corriger tous les problèmes avant le lancement officiel, s'assurer que tout est bien synchronisé en base de données, et qu'il n'y a pas de reliquats de développement.

---

## 🚨 PROBLÈMES CRITIQUES (À CORRIGER IMMÉDIATEMENT)

### 🔴 Back-end

#### 1. Tables Quêtes Manquantes en Base de Données
- **CRITIQUE** : Créer la table `quests` en base de données
- **CRITIQUE** : Créer la table `quest_history` en base de données
- **Impact** : Le système de quêtes est complètement non-fonctionnel
- **Fichier** : `supabase-schema.sql` - tables absentes
- **Code affecté** : `js/quetes.js` lignes 543, 561, 595, 610, 638 - toutes les requêtes échouent silencieusement
- **Schéma requis** :
  ```sql
  CREATE TABLE IF NOT EXISTS quests (...)
  CREATE TABLE IF NOT EXISTS quest_history (...)
  ```

#### 2. Politiques RLS Incompatibles avec l'Auth Personnalisée
- **CRITIQUE** : Corriger les politiques RLS des Nokorahs pour fonctionner avec l'auth personnalisée
- **Problème** : Les politiques utilisent `auth.uid()` mais l'app utilise une auth custom
- **Fichier** : `supabase/migrations/create_nokorahs_table.sql` lignes 58-91
- **Résultat** : Accès refusé car `auth.uid()` est toujours NULL

#### 3. Points de Compétences de Départ Non Attribués
- **CRITIQUE** : Initialiser les compétences lors de la création de personnage
- Définir les points de départ par catégorie dans `profile_data.competences`
- **Problème** : Les nouveaux personnages n'ont AUCUNE donnée de compétences jusqu'à ce qu'ils visitent `competences.html`
- **Fichier** : `js/api/characters-service.js` lignes 50-81
- **Points par défaut définis mais non appliqués** :
  ```javascript
  arts: 75, connaissances: 75, combat: 25, pouvoirs: 5,
  social: 75, artisanat: 10, nature: 60, physique: 55, reputation: 25
  ```

---

## 🎛️ BACK-END

### Intégrité des Données

#### Structure Base de Données
- Synchroniser les compétences de localStorage vers `profile_data` en DB
- Synchroniser les compétences personnalisées vers la DB
- S'assurer que les quêtes se sauvegardent bien (après création des tables)
- Vérifier que l'inventaire HDV se synchronise correctement

#### Structure profile_data
- Valider la structure de `profile_data` (actuellement fragmentée)
  + `competences`, `inventory`, `alice`, `eater`, `[tabName]` pour magie
- Créer un schéma de validation pour éviter la corruption
- Documenter la structure attendue

#### Nettoyage Base de Données
- Créer un script de nettoyage pour les items avec `qty=0`
- Supprimer les entrées dupliquées dans `character_inventory`
- Vérifier que les items supprimés sont bien retirés de la DB
- Supprimer les données de quêtes orphelines

#### Données Orphelines
- Nettoyer les entrées d'inventaire avec qty=0
- Supprimer les données de quêtes orphelines en localStorage
- Créer un script de migration pour nettoyer les anciennes données

### Gestion des Erreurs

#### Logging & Monitoring
- Ajouter la gestion d'erreurs pour toutes les requêtes DB
- Logger les erreurs côté serveur
- **Exemple** : `quetes.js` ligne 543 - requête échoue silencieusement
- Créer un système de monitoring pour les erreurs critiques

### Sécurité

#### Permissions & Autorisation
- Renforcer le gating des fonctionnalités admin côté serveur
- Valider les permissions côté serveur pour toutes les actions admin
- S'assurer que les endpoints admin sont protégés
- Vérifier la sécurité des politiques RLS sur toutes les tables

### API & Services

#### Système de Quêtes (Back-end)
- Activer la validation des quêtes côté serveur
- Créer les endpoints pour la création/modification de quêtes
- Implémenter la logique de complétion des quêtes
- Tester tout le cycle de vie d'une quête (création, participation, complétion)

#### Système d'Inventaire (Back-end)
- Valider les transactions d'inventaire côté serveur
- Sécuriser les endpoints de l'Hôtel des Ventes
- Vérifier l'intégrité des quantités d'items

#### Système Nokorah (Back-end)
- Tester la lecture/écriture après correction des RLS
- Vérifier que les nokorahs se créent correctement
- Valider les permissions d'accès aux nokorahs

### Synchronisation & Stockage

#### LocalStorage ↔ Base de Données
- Créer un mécanisme de sync automatique localStorage ↔ DB
- Documenter la hiérarchie des sources de données
- Unifier la synchronisation entre localStorage, sessionStorage, mémoire et DB

#### Gestion localStorage
- Créer un mécanisme de nettoyage pour les données abandonnées
- Lister toutes les clés localStorage utilisées
- Vérifier le risque d'épuisement du quota localStorage
- **Clés actuelles** :
  + `skillsPointsByCategory`, `skillsAllocationsByCategory`, `skillsBaseValuesByCategory`, `skillsLocksByCategory`, `skillsCustomByCategory`
  + `astoria_quests_state`, `astoria_quests_history`, `astoria_quest_admin_notes`
  + `astoria_session`, `astoria_active_character`, `astoria_character_summary`
  + Historiques de recherche, préférences thème, données debug

### Migrations & Setup

#### Scripts de Migration Requis
- Migration pour créer les tables `quests` et `quest_history`
- Migration pour initialiser les compétences des personnages existants
- Migration pour nettoyer les données d'inventaire orphelines
- Migration pour corriger les politiques RLS des Nokorahs

#### Seed Data
- Créer des seeds pour les compétences par défaut
- Créer des seeds pour les items de départ
- Créer des seeds pour les quêtes de test
- Documenter comment ajouter de nouvelles données initiales

---

## 🎨 FRONT-END

### Interface & Cohérence Visuelle

#### Standardisation des Headers
- Standardiser les headers de page (actuellement incohérents)
  + `inventaire.html` : utilise `inventory-header` → changer vers `page-header`
  + `magie.html` : utilise `magic-header` → changer vers `page-header`
  + `nokorah.html` : utilise `nokorah-header` → changer vers `page-header`
  + `profil.html` : utilise `profile-header` → changer vers `page-header`
  + `quetes.html` : utilise `quest-header` → changer vers `page-header`

#### Nettoyage Interface
- **Dégager tous les commentaires** (hors placeholders sur champs inputs) qui cassent le dynamisme et l'ergonomie du site
- Supprimer les éléments de debug visibles en production
- Nettoyer le code HTML/CSS inutilisé

### Boutons Admin & Visibilité

#### Gating des Fonctionnalités Admin
- Appliquer la validation `data-admin-only` en JavaScript
  + `quetes.html` ligne 42 : bouton "+ Ajouter"
  + `quetes.html` ligne 165 : bouton "Modifier"
  + `competences.html` ligne 837 : boutons admin
- S'assurer que les non-admins ne voient pas ces boutons
- Masquer/désactiver les interfaces admin pour les joueurs normaux

### États de Chargement & Feedback

#### UX des États de Chargement
- Ajouter des états de chargement visibles pour l'utilisateur
- Remplacer les attributs `hidden` par des animations de chargement
- Améliorer le feedback visuel quand des données sont en cours de chargement
- Ajouter des spinners ou skeletons pour les chargements longs

#### Messages d'Erreur
- Afficher des messages d'erreur clairs à l'utilisateur
- Créer des toasts/notifications pour les erreurs non-critiques
- Implémenter des messages d'erreur contextuels

### Responsive Design

#### Compatibilité Mobile
- Vérifier que toutes les pages s'affichent correctement sur mobile
- Tester les cartes de personnages sur petits écrans
- S'assurer que les modals fonctionnent bien sur mobile
- Optimiser la navigation tactile

#### Breakpoints & Layout
- Vérifier les breakpoints CSS sur toutes les pages
- Tester sur différentes résolutions (mobile, tablette, desktop)
- Optimiser les grids et flexbox pour le responsive

### Système de Compétences (Front-end)

#### Affichage des Points
- Afficher les stats/points disponibles sur chaque page de compétences
  + Points totaux par catégorie
  + Points alloués vs restants
  + Barres de progression ou caps
- Afficher clairement les limites de points par catégorie

#### Interface Compétences
- Améliorer la lisibilité des compétences personnalisées
- Créer une UI pour la liaison compétences ↔ système de magie
- Ajouter des tooltips explicatifs sur les compétences

### Système de Quêtes (Front-end)

#### Interface Quêtes
- Réparer le carousel de quêtes (dépend de la table `quests`)
- Réparer l'affichage de l'historique des quêtes
- Améliorer la visibilité de l'état des quêtes (en cours, complétées, échouées)
- Ajouter des filtres pour les quêtes

#### Feedback Quêtes
- Ajouter des animations pour la complétion de quêtes
- Créer des notifications visuelles pour les nouvelles quêtes
- Améliorer le feedback de progression des quêtes

### Système d'Inventaire (Front-end)

#### Interface Inventaire
- Améliorer l'affichage des items
- Ajouter des filtres/tri pour l'inventaire
- Optimiser l'affichage des quantités et descriptions

#### Hôtel des Ventes
- Améliorer l'interface de l'HDV
- Ajouter des confirmations pour les transactions
- Afficher clairement les prix et disponibilités

### Accueil des Joueurs / Onboarding

#### Flow d'Accueil
- Créer un écran de bienvenue pour les nouveaux joueurs
- Implémenter un wizard de configuration initiale
- Ajouter un walkthrough des fonctionnalités principales de l'interface
- Créer un tutoriel interactif pour les premières actions

#### Initialisation Interface Personnage
- Afficher clairement les Kaels de départ (5000 au lieu de 0)
- Guider le joueur vers la page de compétences
- Afficher les items de départ dans l'inventaire
- Montrer les compteurs d'âmes initialisés

### Performance Front-end

#### Optimisation Chargement
- Optimiser le chargement des assets (images, fonts, scripts)
- Implémenter du lazy loading pour les images
- Minifier les fichiers CSS/JS en production
- Réduire le nombre de requêtes HTTP

#### Optimisation Rendering
- Optimiser les animations CSS
- Réduire les reflows/repaints
- Améliorer les performances des listes longues (virtualisation)

---

## 🎯 PRIORITÉS DE RÉSOLUTION

### 🔴 Immédiat (Jour 1) - BACK-END
1. Créer les tables `quests` et `quest_history`
2. Corriger les politiques RLS des Nokorahs
3. Initialiser les compétences lors de la création de personnage
4. S'assurer que la structure `profile_data` est créée

### 🟠 Court Terme (Semaine 1)

#### BACK-END
5. Créer les scripts de nettoyage/migration
6. Implémenter la validation côté serveur pour les quêtes
7. Sécuriser les endpoints admin

#### FRONT-END
8. Afficher les points disponibles dans l'UI des compétences
9. Standardiser les noms de headers sur toutes les pages
10. Appliquer le gating des boutons admin en JS
11. Ajouter les états de chargement visibles

### 🟡 Moyen Terme (Semaines 2-3)

#### BACK-END
12. Créer le mécanisme de sync localStorage ↔ DB
13. Valider le schéma de `profile_data`
14. Ajouter la gestion d'erreurs pour toutes les requêtes DB
15. Implémenter le système de logging

#### FRONT-END
16. Implémenter le flow d'onboarding
17. Améliorer le responsive design sur mobile
18. Optimiser les performances front-end
19. Créer les animations et feedback visuels

### 🟢 Long Terme (Mois 1)

#### BACK-END
20. Mettre en place des tests automatisés côté serveur
21. Implémenter un système de monitoring avancé
22. Optimiser les requêtes DB

#### FRONT-END
23. Créer une documentation complète pour les admins
24. Implémenter des tests E2E
25. Optimiser l'accessibilité (WCAG)
26. Améliorer les animations et micro-interactions

---

## 📊 Localisation des Problèmes Critiques

| Problème | Type | Fichier | Ligne(s) | Gravité |
| --- | --- | --- | --- | --- |
| Tables quêtes manquantes | BACK | supabase-schema.sql | N/A | 🔴 CRITIQUE |
| Requêtes quêtes échouent | BACK | quetes.js | 543, 561, 595, 610, 638 | 🔴 CRITIQUE |
| Conflit RLS auth | BACK | create_nokorahs_table.sql | 58-91 | 🟠 HAUTE |
| Compétences non initialisées | BACK | characters-service.js | 50-81 | 🟠 HAUTE |
| profile_data incomplet | BACK | competences.js | 315-342 | 🟠 HAUTE |
| Headers incohérents | FRONT | Multiples HTML | Divers | 🟡 MOYENNE |
| Gates admin non appliqués | FRONT | Multiples HTML | Divers | 🟡 MOYENNE |
| Risque overflow localStorage | FRONT | competences.js | Multiple | 🟡 MOYENNE |
| États de chargement absents | FRONT | Multiples JS | Divers | 🟡 MOYENNE |

---

**Dernière mise à jour** : 2026-02-02  
**Audit réalisé par** : Claude Sonnet 4.5  
**État** : En cours - Nécessite review deep complète du site

Cette issue évoluera avec des sub-issues pour chaque catégorie de problèmes identifiés.
