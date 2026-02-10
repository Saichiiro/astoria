# UI Components - Reusable Building Blocks

This folder contains reusable UI components that can be used across the application instead of duplicating HTML/rendering code.

## 📁 File Structure

```
js/components/ui/
├── index.js              # Exports all components
├── ItemCard.js           # Reusable item card component
├── QuantityControl.js    # Quantity picker (+/- buttons)
├── CategoryFilter.js     # Category filter bar
├── ItemsModal.js         # Complete items selection modal
└── README.md            # This file
```

## 🎨 CSS

Import the component styles in your HTML:

```html
<link rel="stylesheet" href="css/components-ui.css">
```

## 🚀 Quick Start

### Using Individual Components

```javascript
import { ItemCard, QuantityControl, CategoryFilter } from './components/ui/index.js';

// Create an item card
const card = ItemCard.create({
    name: 'Épée Légendaire',
    category: 'equipement',
    description: 'Une épée puissante forgée dans les flammes.',
    image: 'assets/images/sword.png',
    price: 500
}, {
    onMoreClick: (item, btn) => showDetails(item),
    showPrice: true,
    showCategory: true
});

document.body.appendChild(card);

// Create a quantity control
const qtyControl = QuantityControl.create({
    value: 1,
    min: 0,
    max: 99,
    onChange: (newValue) => {
        console.log('New quantity:', newValue);
    }
});

document.body.appendChild(qtyControl.element);

// Create a category filter
const categoryFilter = CategoryFilter.create({
    categories: ['all', 'equipement', 'consommable', 'materiau'],
    activeCategory: 'all',
    onChange: (category) => {
        console.log('Selected category:', category);
    }
});

document.body.appendChild(categoryFilter.element);
```

### Using the Complete ItemsModal

```javascript
import { ItemsModal } from './components/ui/index.js';

// Create a modal instance
const itemsModal = new ItemsModal({
    backdropId: 'questItemsModalBackdrop',  // ID of your backdrop element
    title: 'Sélectionner des récompenses',
    onConfirm: (selectedItems) => {
        // selectedItems is a Map<itemName, quantity>
        selectedItems.forEach((qty, itemName) => {
            console.log(`${itemName}: ${qty}x`);
            addRewardToQuest(itemName, qty);
        });
    },
    onCancel: () => {
        console.log('Modal cancelled');
    },
    showPrice: true,
    persistSelection: true,  // Keep selection between opens
    categories: ['all', 'equipement', 'consommable'],  // Filter categories
});

// Open the modal
itemsModal.open();

// Close programmatically
itemsModal.close();

// Get current selection
const selection = itemsModal.getSelection();  // Map<string, number>

// Clear selection
itemsModal.clearSelection();
```

## 📖 Component API

### ItemCard

Static methods for creating item card elements.

```javascript
ItemCard.create(item, options)
```

**Parameters:**
- `item` (Object): Item data
  - `name` (string): Item name
  - `category` (string): Item category
  - `description` (string): Item description
  - `image` (string): Image URL (optional)
  - `price` (number): Price in kaels (optional)
- `options` (Object): Configuration
  - `onMoreClick` (Function): Callback for "Plus" button
  - `showPrice` (boolean): Show price (default: true)
  - `showCategory` (boolean): Show category (default: true)
  - `showMore` (boolean): Show "Plus" button (default: true)
  - `className` (string): Additional CSS classes

**Returns:** HTMLElement

```javascript
ItemCard.setSelected(cardElement, isSelected)
```

Updates the selected state of a card.

---

### QuantityControl

Create quantity picker controls.

```javascript
QuantityControl.create(options)
```

**Parameters:**
- `options` (Object):
  - `value` (number): Initial value (default: 0)
  - `min` (number): Minimum value (default: 0)
  - `max` (number): Maximum value (default: 999)
  - `onChange` (Function): Callback when value changes
  - `className` (string): Additional CSS classes

**Returns:** Object with:
- `element` (HTMLElement): The control element
- `setValue(value)`: Update value programmatically
- `getValue()`: Get current value
- `disable()`: Disable the control
- `enable()`: Enable the control

---

### CategoryFilter

Create category filter bars.

```javascript
CategoryFilter.create(options)
```

**Parameters:**
- `options` (Object):
  - `categories` (Array): Category keys to display (default: all)
  - `activeCategory` (string): Initially active category (default: 'all')
  - `onChange` (Function): Callback when category changes
  - `className` (string): Additional CSS classes

**Returns:** Object with:
- `element` (HTMLElement): The filter bar element
- `setActive(category)`: Set active category
- `getActive()`: Get currently active category

**Built-in categories:**
- `all` 📦 Tous
- `agricole` 🌾 Agricole
- `consommable` 🧪 Consommables
- `equipement` ⚔️ Équipements
- `materiau` ⚒️ Matériaux
- `quete` ✨ Quêtes
- `monnaie` 💰 Monnaies

Add custom categories:
```javascript
CategoryFilter.addCategory('magie', '🔮', 'Magie');
```

---

### ItemsModal

Complete modal for item selection.

```javascript
new ItemsModal(config)
```

**Parameters:**
- `config` (Object):
  - `backdropId` (string): ID of backdrop element
  - `title` (string): Modal title
  - `onConfirm` (Function): Called with Map<itemName, quantity>
  - `onCancel` (Function): Called when cancelled
  - `itemFilter` (Function): Filter function for items
  - `categories` (Array): Categories to show
  - `showPrice` (boolean): Show prices (default: true)
  - `persistSelection` (boolean): Keep selection between opens (default: true)

**Methods:**
- `open()` - Open the modal
- `close()` - Close the modal
- `clearSelection()` - Clear all selected items
- `getSelection()` - Get Map of selected items
- `setSelection(items)` - Set selected items programmatically

---

## 🔧 HTML Structure Required

For ItemsModal to work, your HTML needs this structure:

```html
<div id="questItemsModalBackdrop" class="quest-items-modal-backdrop" hidden>
    <div class="quest-items-modal">
        <!-- Header -->
        <div class="quest-items-modal-header">
            <h2 class="quest-items-modal-title" id="questItemsModalTitle">Title</h2>
            <button type="button" class="quest-items-modal-close" id="questItemsModalClose">×</button>
        </div>

        <!-- Search -->
        <div class="quest-items-modal-search">
            <input type="text" id="questItemsSearch" class="quest-items-search-input" placeholder="Rechercher...">
        </div>

        <!-- Categories (will be setup by ItemsModal or use existing HTML) -->
        <div class="quest-items-modal-categories">
            <button class="quest-items-category-btn active" data-category="all">
                <span class="quest-items-category-icon">📦</span>
                <span class="quest-items-category-label">Tous</span>
            </button>
            <!-- More category buttons... -->
        </div>

        <!-- Body (items rendered here) -->
        <div class="quest-items-modal-body" id="questItemsModalBody"></div>

        <!-- Footer -->
        <div class="quest-items-modal-footer">
            <div class="quest-items-selected-count" id="questItemsSelectedCount">0 objet(s) sélectionné(s)</div>
            <div class="quest-items-modal-actions">
                <button type="button" class="quest-items-modal-btn quest-items-modal-btn--cancel" id="questItemsModalCancel">Annuler</button>
                <button type="button" class="quest-items-modal-btn quest-items-modal-btn--confirm" id="questItemsModalConfirm">Ajouter</button>
            </div>
        </div>
    </div>
</div>
```

## ✅ Benefits

1. **No code duplication** - Write once, use everywhere
2. **Consistent UI** - Same look and feel across the app
3. **Easy maintenance** - Update in one place
4. **Flexible** - Customize with options and CSS classes
5. **Testable** - Isolated components are easier to test

## 🎯 Migration Guide

### Before (duplicated code):

```javascript
// In quetes.js
function renderItem(item) {
    const itemEl = document.createElement("div");
    itemEl.className = "quest-items-modal-item";
    // ... 100+ lines of rendering code
}

// In inventory.js
function renderInventoryItem(item) {
    const itemEl = document.createElement("div");
    itemEl.className = "inventory-item";
    // ... 100+ lines of SAME rendering code
}
```

### After (reusable components):

```javascript
// In both files:
import { ItemCard } from './components/ui/index.js';

const card = ItemCard.create(item, { showPrice: true });
```

## 📝 Examples

See `/js/inventory-items-modal.js` for a real usage example.
