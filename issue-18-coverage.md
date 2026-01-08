# Issue 18 Coverage (draft)

Legend: [x] covered, [ ] missing, [ ] with "partial" note = partially covered

## Type d'amélioration
- [x] Comportement / interactions

## Résumé de la demande
- [ ] Ajouter un admin panel permettant aux admins de se connecter et de gérer le contenu et/ou la modération, avec un système de rôles et permissions pour limiter l'accès "à ce qu'il faut". (partial: front-end admin panel stub + `admin` role in `supabase-schema.sql` + auth checks in `js/api/auth-service.js`)

## Pourquoi / cas d'usage
- [ ] Permettre à plusieurs personnes de contribuer (contenu, modération, configuration) sans accès technique (DB, serveur, etc.).
- [ ] Tracer qui fait quoi (audit) et simplifier le support (désactiver un compte, retirer un rôle, etc.).

## Idée de solution

### Architecture
- [ ] Panel accessible via `/admin` avec authentification sécurisée (session/JWT). (partial: admin panel exists but is a sidebar panel, no `/admin` route, session stored in `localStorage` via `js/api/session-store.js`)
- [x] Un seul profil admin (pas de hiérarchie multi-rôles). (roles are `admin`/`player` only in `supabase-schema.sql`)
- [x] Pas de système d'email (réinitialisation mot de passe manuelle si nécessaire).

### Fonctionnalités principales

#### 1. Dashboard
- [ ] Stats en temps réel: nombre d'utilisateurs (total, actifs, inactifs, bannis). (partial: total user count only in `js/panels/admin-panel.js`)
- [ ] Nombre de contenus par type (fiches, codex, objets).
- [ ] Graphiques d'évolution sur 30 jours.
- [ ] Timeline des dernières actions.

#### 2. Gestion utilisateurs
- [ ] Liste paginée avec recherche (nom/email) et filtres (statut, date).
- [ ] Actions: Créer, éditer, désactiver/activer, bannir, supprimer. (partial: role change + password reset functions exist in `js/api/auth-service.js`, no UI/workflow)
- [ ] Détails utilisateur: infos, stats, historique d'actions.
- [ ] Export CSV.

#### 3. Gestion contenu
- [ ] Interface CRUD pour fiches personnages, codex, objets. (partial: codex items CRUD exists in `js/codex-admin.js`)
- [ ] Filtres avancés (royaume, type Alice, affection).
- [ ] Prévisualisation de contenu.
- [ ] Modération et validation.
- [ ] Export JSON/CSV.

#### 4. Gestion tags
- [ ] Interface pour gérer les tags de profil (CRUD).
- [ ] Association tags ↔ catégories.
- [ ] Statistiques d'utilisation.

#### 5. Audit trail
- [ ] Logs de toutes les actions administratives (qui a fait quoi et quand).
- [ ] Filtrage par action et date.
- [ ] Export des logs.
- [ ] Rétention configurable (30/60/90 jours).

#### 6. Configuration
- [ ] Mode maintenance.
- [ ] Messages d'annonce globaux.
- [ ] Paramètres de sécurité (durée session, rate limiting).
- [ ] Changement mot de passe admin. (partial: `resetUserPassword` exists in `js/api/auth-service.js`, no admin UI)

### Sécurité
- [ ] Protection brute force (rate limiting sur login).
- [ ] CSRF/XSS protection.
- [ ] Hashage sécurisé des mots de passe (bcrypt/argon2). (current: SHA-256 in `js/api/auth-service.js`)
- [ ] SQL injection prevention.
- [x] Session timeout automatique. (`SESSION_MAX_AGE_MS` in `js/api/auth-service.js`)

### Phases de déploiement
- [ ] Phase 1 (MVP): Auth + dashboard basique + liste utilisateurs + actions simples.
- [ ] Phase 2: CRUD complet utilisateurs + bannissement + export.
- [ ] Phase 3: Gestion contenu (fiches, codex, objets).
- [ ] Phase 4: Audit logs + statistiques avancées.
- [ ] Phase 5: Configuration + tests sécurité + documentation.

## Notes / maquettes

### Stack technique proposée
- [ ] Backend: Node.js/Express + API REST.
- [ ] Frontend: React + React Router + Tailwind ou Material-UI.
- [ ] DB: Nouvelles tables (admin_user, audit_logs, admin_sessions, system_settings).
- [ ] Auth: JWT ou session cookies.

### Routes API
- [ ] `/api/admin/auth` (login, logout, change-password)
- [ ] `/api/admin/users` (CRUD + toggle-status, ban, reset-password)
- [ ] `/api/admin/content` (fiches, codex, objets)
- [ ] `/api/admin/tags` (gestion tags profil)
- [ ] `/api/admin/audit` (logs, stats)
- [ ] `/api/admin/settings` (configuration système)

### Critères d'acceptance MVP
- [ ] Login admin avec protection brute force. (partial: login exists in `js/api/auth-service.js`, no rate limit)
- [ ] Dashboard avec stats de base. (partial: user + character count + character select in `js/panels/admin-panel.js`)
- [ ] Liste utilisateurs paginée + recherche.
- [ ] Désactivation/activation compte.
- [ ] Suppression avec confirmation.
- [ ] Audit trail fonctionnel.
- [ ] Interface responsive.
- [ ] Tests sécurité OWASP Top 10 passent.

## Risques (suivi)
- [ ] Vulnérabilités potentielles → Tests sécurité obligatoires.
- [ ] Logs en croissance → Purge automatique.
- [ ] RGPD (logs avec IP) → Anonymisation après 30j.
- [ ] Admin unique → Pas de délégation possible.
- [ ] Pas d'email → Reset mot de passe manuel via console/CLI si oubli.

## Inspirations
- [ ] Laravel Nova (design moderne)
- [ ] Strapi Admin (React, UX fluide)
- [ ] WordPress Admin (simplicité)
- [ ] Django Admin (fonctionnalités complètes)

## Librairies utiles
- [ ] Backend: express-rate-limit, helmet, bcryptjs, jsonwebtoken, winston
- [ ] Frontend: react-table, react-query, formik + yup, chart.js/recharts

## Issue #18 references in code
- [x] Admins view all characters in admin panel selector. (handled in `js/panels/admin-panel.js`)
- [x] Show `user_id` for admin in admin panel selector. (handled in `js/panels/admin-panel.js`)
