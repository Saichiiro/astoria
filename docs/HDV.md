# Hôtel de vente (HDV)

## Prérequis

- Un projet Supabase configuré dans `js/auth.js` (`SUPABASE_URL` + `SUPABASE_ANON_KEY`).
- Exécuter le schéma `supabase-schema.sql` dans l’éditeur SQL Supabase (il contient les tables HDV + la RPC `buy_listing`).

## Ouvrir la page

- Ouvrir `hdv.html` (idéalement via un serveur local type Live Server).
- Se connecter via `login.html` (ex: `player1` / `player123` si vous avez chargé les données d’exemple).

## Flux de test rapide

1. Aller dans `hdv.html` → onglet **Mes offres**.
2. Créer une offre : choisir un objet, quantité, prix/unité (pré-rempli avec le “flat” issu de `data.js` quand disponible).
3. Onglet **Rechercher** : retrouver l’offre, tester le tri “les moins chers” + pagination.
4. Cliquer **Acheter** : la RPC `buy_listing` débite/crédite les kaels, marque le listing `sold`, et écrit une ligne dans `market_transactions`.
5. Onglet **Historique** : vérifier l’entrée Achat/Vente.

## Kaels

- Les kaels sont stockés dans `profiles.kamas` (colonne DB conservée telle quelle) et affichés comme “kaels” côté UI.
- Pour ajuster manuellement :

```sql
update profiles set kamas = 50000 where user_id = '<uuid_user>';
```

## Notes sécurité

Ce repo utilise un login custom (`users` + localStorage) et ne s’appuie pas sur Supabase Auth. Les policies RLS sont donc permissives pour que l’app fonctionne avec la clé anon.
