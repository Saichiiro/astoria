# Migration vers Catégories Centralisées

Ce guide explique comment migrer toutes les pages pour utiliser les catégories depuis la base de données.

## État Actuel

| Page | État | Source des Catégories |
|------|------|----------------------|
| **hdv.html** | ✅ Migré | Base de données via `categories-service.js` |
| **inventaire.html** | ❌ À migrer | Hardcodé dans HTML |
| **codex.html** | ❌ À migrer | Hardcodé dans HTML |
| **quêtes.html** | ❌ À migrer | Hardcodé dans HTML |

## Avantages de la Migration

Après migration, **tous les changements de catégories dans la base de données se mettent à jour automatiquement** partout:

1. ✅ **Ajout d'une catégorie** → apparaît partout automatiquement
2. ✅ **Modification d'un nom/icône** → mise à jour partout
3. ✅ **Désactivation d'une catégorie** → disparaît partout
4. ✅ **Ordre des catégories** → respecté partout
5. ✅ **Aucune redondance** → une seule source de vérité

## Comment Migrer une Page

### Étape 1: Ajouter l'attribut `data-category-select`

**AVANT:**
```html
<select id="categorySelect" class="tw-input">
    <option value="all">📦 Toutes catégories</option>
    <option value="agricole">🌾 Agricole</option>
    <option value="consommable">🧪 Consommable</option>
    <!-- etc... -->
</select>
```

**APRÈS:**
```html
<select
    id="categorySelect"
    class="tw-input"
    data-category-select
    data-include-all="true"
    data-show-icons="true">
    <!-- Options seront générées automatiquement -->
</select>
```

### Étape 2: Importer et initialiser le gestionnaire

Au début du fichier HTML ou JS:

```javascript
import { initCategoriesOnPage } from './js/ui/categories-manager.js';

// Au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await initCategoriesOnPage(); // Initialise toutes les catégories
    // ... reste de l'init
});
```

### Étape 3: Utiliser les helpers pour afficher les catégories

```javascript
import { getCategoryName, getCategoryIcon } from './js/ui/categories-manager.js';

// Afficher le nom d'une catégorie
const categoryName = await getCategoryName('agricole'); // "Agricole"

// Afficher l'icône d'une catégorie
const categoryIcon = await getCategoryIcon('agricole'); // "🌾"
```

## Migration de Chaque Page

### 1. inventaire.html

**Fichier:** `inventaire.html` ligne 645

```html
<!-- AVANT -->
<select id="categorySelect" class="tw-input" required>
    <option value="all">📦 Toutes catégories</option>
    <option value="agricole">🌾 Agricole</option>
    <option value="consommable">🧪 Consommable</option>
    <option value="equipement">⚔️ Équipement</option>
    <option value="materiau">⚒️ Matériaux</option>
    <option value="quete">✨ Quêtes</option>
</select>

<!-- APRÈS -->
<select
    id="categorySelect"
    class="tw-input"
    required
    data-category-select
    data-include-all="true"
    data-show-icons="true">
</select>
```

Puis dans le `<script>` au bas de la page:

```html
<script type="module">
import { initCategoriesOnPage } from './js/ui/categories-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCategoriesOnPage();
    // Le reste de l'init existant
});
</script>
```

### 2. codex.html

**Fichier:** `codex.html` ligne 48

```html
<!-- AVANT -->
<select id="categoryFilter" class="category-dropdown tw-input">
    <option value="">Toutes catégories</option>
    <option value="agricole">🌾 Agricole</option>
    <option value="consommable">🧪 Consommables</option>
    <option value="equipement">⚔️ Équipements</option>
    <option value="materiau">⚒️ Matériaux</option>
    <option value="quete">✨ Quêtes</option>
</select>

<!-- APRÈS -->
<select
    id="categoryFilter"
    class="category-dropdown tw-input"
    data-category-select
    data-include-all="true"
    data-show-icons="true"
    data-default-value="">
</select>
```

Dans `js/pages/codex/codex.js`, ajouter:

```javascript
import { initCategoriesOnPage } from './ui/categories-manager.js';

// Dans la fonction d'init
await initCategoriesOnPage();
```

### 3. quêtes.html (boutons de catégories)

**Fichier:** `quetes.html` ligne 292

```html
<!-- AVANT -->
<div class="quest-items-modal-categories">
    <button class="quest-items-category-btn active tw-press" data-category="all">
        <span class="quest-items-category-icon">📦</span>
        <span class="quest-items-category-label">Tous</span>
    </button>
    <button class="quest-items-category-btn tw-press" data-category="agricole">
        <span class="quest-items-category-icon">🌾</span>
        <span class="quest-items-category-label">Agricole</span>
    </button>
    <!-- etc... -->
</div>

<!-- APRÈS -->
<div
    class="quest-items-modal-categories"
    id="questItemsCategories"
    data-category-buttons>
</div>
```

Dans `js/pages/quetes/quetes-items-modal.js`:

```javascript
import { renderCategoryButtons } from './ui/categories-manager.js';

async function openModal() {
    // ...

    // Render category buttons
    const categoryContainer = document.getElementById('questItemsCategories');
    await renderCategoryButtons(categoryContainer, {
        includeAll: true,
        allLabel: 'Tous',
        activeCategory: state.currentCategory,
        onCategoryChange: (category) => {
            state.currentCategory = category;
            renderItems();
        },
        buttonClass: 'quest-items-category-btn tw-press',
        activeClass: 'active'
    });

    // ...
}
```

## Tester la Migration

1. **Exécuter la migration SQL** (si pas déjà fait):
   ```sql
   -- Dans Supabase SQL Editor
   -- Copier/coller database/scripts/create-categories-table.sql
   ```

2. **Tester chaque page**:
   - Recharger la page
   - Vérifier que toutes les catégories apparaissent
   - Vérifier que les icônes s'affichent correctement
   - Tester le filtrage

3. **Tester la mise à jour dynamique**:
   ```sql
   -- Ajouter une nouvelle catégorie
   INSERT INTO categories (slug, name, icon, display_order)
   VALUES ('test', 'Test', '🧪', 6);

   -- Recharger la page → la catégorie "Test" devrait apparaître!
   ```

4. **Tester le fallback**:
   - Désactiver temporairement Supabase
   - Recharger → les catégories hardcodées devraient s'afficher
   - Réactiver → les catégories DB réapparaissent

## Rollback

Si un problème survient, il suffit de retirer les attributs `data-category-select` et remettre les options HTML hardcodées.

Les catégories hardcodées continueront de fonctionner normalement.

## Prochaines Étapes

Une fois toutes les pages migrées:

1. ✅ Toutes les pages utilisent la même source de catégories
2. ✅ Ajout d'une catégorie → visible partout instantanément
3. ✅ Modification d'une catégorie → mise à jour partout
4. ✅ Cache de 5 minutes pour performance optimale
5. ✅ Fallback automatique si base de données indisponible

## Support

Si vous avez des questions sur la migration:
- Consultez `js/ui/categories-manager.js` pour la documentation complète
- Regardez `js/pages/hdv/hdv.js` pour un exemple de migration réussie
