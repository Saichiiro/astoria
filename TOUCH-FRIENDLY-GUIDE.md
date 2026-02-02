# 📱 Guide Touch-Friendly (44px minimum)

## 🎯 Principe de Base

**Règle d'or**: Tous les éléments interactifs (boutons, liens, inputs) doivent avoir **minimum 44x44px** pour être confortablement utilisables au doigt.

**Sources**:
- Apple Human Interface Guidelines: 44pt minimum
- Material Design: 48dp minimum
- WCAG 2.1 (2.5.5): 44x44px minimum

---

## 🛠️ Variables CSS Disponibles

```css
--touch-target-min: 44px;          /* Minimum recommandé */
--touch-target-comfortable: 48px;  /* Plus confortable */
--touch-target-large: 56px;        /* Actions importantes */
--touch-spacing: 8px;              /* Espacement entre targets */
```

---

## 📦 Classes Utilitaires

### 1️⃣ Touch Targets Génériques

```html
<!-- Minimum (44px) -->
<div class="touch-target">Icon</div>

<!-- Confortable (48px) -->
<div class="touch-target-comfortable">Icon</div>

<!-- Large (56px) -->
<div class="touch-target-large">Icon</div>
```

### 2️⃣ Boutons Touch-Friendly

```html
<!-- Bouton standard touch -->
<button class="btn-touch">Cliquez ici</button>

<!-- Bouton confortable -->
<button class="btn-touch-comfortable">Action importante</button>

<!-- Grand bouton -->
<button class="btn-touch-large">CTA Principal</button>
```

**Styles appliqués automatiquement:**
- `min-height: 44px` (ou plus)
- `padding` adapté
- `display: inline-flex` (pour centrer contenu)
- `gap: 8px` (si icône + texte)
- Désactive highlight bleu iOS

### 3️⃣ Icon Buttons (carrés)

```html
<!-- Bouton icône 44x44 -->
<button class="icon-btn-touch">
    <span>❌</span>
</button>

<!-- Bouton icône 48x48 -->
<button class="icon-btn-touch-comfortable">
    <span>🔍</span>
</button>

<!-- Bouton icône 56x56 -->
<button class="icon-btn-touch-large">
    <span>➕</span>
</button>
```

### 4️⃣ Espacement Touch

```html
<!-- Espacement horizontal entre éléments -->
<div class="touch-spacing">
    <button class="icon-btn-touch">A</button>
    <button class="icon-btn-touch">B</button>
    <button class="icon-btn-touch">C</button>
    <!-- Margin-left: 8px automatique entre chaque -->
</div>

<!-- Espacement vertical -->
<div class="touch-spacing-y">
    <button class="btn-touch">Action 1</button>
    <button class="btn-touch">Action 2</button>
    <!-- Margin-top: 8px automatique -->
</div>
```

### 5️⃣ Feedback Tactile

```html
<!-- Effet "press" au touch -->
<button class="btn-touch touch-feedback">
    Appuyez-moi
</button>
<!-- Scale(0.95) + opacity(0.8) au :active -->
```

### 6️⃣ Zone de Clic Étendue

```html
<!-- Augmente la zone cliquable sans changer le visuel -->
<a href="#" class="touch-area-extend">
    <small>Petit lien</small>
</a>
<!-- Zone de clic étendue de 8px autour -->
```

### 7️⃣ Full-Width Mobile

```html
<!-- Prend toute la largeur sur mobile -->
<button class="btn-touch btn-touch-full-mobile">
    Confirmer
</button>
```

---

## ✅ Exemples d'Application

### Header avec boutons touch-friendly

```html
<header class="page-header">
    <button class="icon-btn-touch touch-feedback">
        <span>☰</span>
    </button>

    <h1>Titre Page</h1>

    <button class="icon-btn-touch touch-feedback">
        <span>🔔</span>
    </button>
</header>
```

### Modal avec actions touch-friendly

```html
<div class="modal-actions touch-spacing">
    <button class="btn-touch touch-feedback">
        Annuler
    </button>
    <button class="btn-touch-comfortable touch-feedback" style="background: var(--color-primary); color: white;">
        Confirmer
    </button>
</div>
```

### Navigation bottom bar mobile

```html
<nav class="bottom-nav" style="display: flex; justify-content: space-around;">
    <button class="icon-btn-touch-comfortable touch-feedback">
        <span>🏠</span>
        <small>Accueil</small>
    </button>
    <button class="icon-btn-touch-comfortable touch-feedback">
        <span>🎒</span>
        <small>Inventaire</small>
    </button>
    <button class="icon-btn-touch-comfortable touch-feedback">
        <span>⚔️</span>
        <small>Quêtes</small>
    </button>
    <button class="icon-btn-touch-comfortable touch-feedback">
        <span>👤</span>
        <small>Profil</small>
    </button>
</nav>
```

### Cards avec actions touch

```html
<div class="card">
    <div class="card-content">
        <!-- Contenu -->
    </div>
    <div class="card-actions touch-spacing">
        <button class="btn-touch">Voir détails</button>
        <button class="icon-btn-touch">❤️</button>
        <button class="icon-btn-touch">🗑️</button>
    </div>
</div>
```

---

## 🎨 Combiner avec le Design Existant

### Bouton primaire touch-friendly

```html
<button class="btn-touch-comfortable touch-feedback"
        style="background: var(--color-primary);
               color: white;
               border: none;
               border-radius: var(--radius-lg);
               box-shadow: var(--shadow-primary);">
    Action Principale
</button>
```

### Icon button avec style custom

```html
<button class="icon-btn-touch-comfortable touch-feedback"
        style="background: var(--color-primary-lighter);
               color: var(--color-primary);
               border: 2px solid var(--color-primary);
               border-radius: var(--radius-full);">
    ➕
</button>
```

---

## 📏 Checklist Avant de Retaper une Page

- [ ] Tous les `<button>` ont `class="btn-touch"` (ou variante)
- [ ] Tous les icon buttons ont `class="icon-btn-touch"` (ou variante)
- [ ] Groupes de boutons utilisent `class="touch-spacing"`
- [ ] Feedback tactile avec `class="touch-feedback"` sur actions importantes
- [ ] Links petits utilisent `class="touch-area-extend"`
- [ ] Boutons mobile full-width ont `class="btn-touch-full-mobile"`
- [ ] Inputs ont `min-height: var(--touch-target-comfortable)`
- [ ] Checkboxes/radios ont label avec `min-height: var(--touch-target-min)`

---

## 🚫 Désactiver le Highlight Bleu iOS

Déjà appliqué automatiquement sur `.btn-touch` et `.icon-btn-touch`, mais si besoin:

```css
.mon-element {
    -webkit-tap-highlight-color: transparent;
}
```

Ou classe:
```html
<a href="#" class="no-tap-highlight">Lien</a>
```

---

## 📱 Testing Touch-Friendly

1. **Chrome DevTools**: Mode device responsive (iPhone, Android)
2. **Firefox**: Mode design responsive
3. **Test réel**: Sur vrai mobile si possible
4. **Règle**: Pointer avec le doigt, pas la souris

**Minimum acceptable**:
- Peut cliquer sans louper
- Pas de clics accidentels sur éléments adjacents
- Feedback visuel au touch

---

## 💡 Tips

✅ **DO:**
- Utiliser `btn-touch-comfortable` pour actions principales
- Espacer les boutons de 8px minimum
- Tester sur vrai device
- Feedback visuel au :active

❌ **DON'T:**
- Jamais de boutons < 44px
- Jamais de liens texte < 44px sans padding
- Pas de boutons collés (min 8px gap)
- Pas de double-tap requis

---

**Bonne refonte!** 🎨
