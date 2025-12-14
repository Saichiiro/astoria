# Inventory Page Integration Guide

## What was added

### Files
1. **inventaire.html** - New inventory page
2. **css/style.css** - Added inventory-specific styles (lines ~725-1054)
3. **INVENTORY_INTEGRATION.md** - This guide

## How it works

### Data Source
The inventory page uses the existing `inventoryData` array from `data.js`. Each item already has a `category` field that matches the 3 supported categories:
- `equipement` (⚔️)
- `consommable` (🧪)
- `agricole` (🌾)

### Layout Structure

```
inventaire.html
├── Header (back link + title + item count)
├── Category Filter Bar (4 buttons: all, equipement, consommable, agricole)
└── Main Content
    ├── Item Grid (left) - shows filtered items
    └── Detail Panel (right) - shows selected item details
```

### Key Features

1. **Category Filtering**
   - Click category buttons to filter items
   - Active category is highlighted
   - "Tous" shows all items

2. **Item Selection**
   - Click any item card in the grid
   - Selected item gets visual feedback (border + background)
   - Detail panel updates with full item info

3. **Empty States**
   - Shows friendly message when no items in category
   - Placeholder text when no item selected

4. **Responsive**
   - Desktop: Grid + side panel
   - Tablet/Mobile: Grid stacks above detail panel

## CSS Integration

All styles use your existing CSS variables from the design system:
- Colors: `var(--color-primary)`, `var(--color-gray-*)`, etc.
- Spacing: `var(--space-*)`
- Typography: `var(--text-*)`, `var(--font-*)`
- Borders: `var(--radius-*)`
- Shadows: `var(--shadow-*)`

No new variables were added - everything reuses what you already have.

## JavaScript Structure

### Module Pattern
```javascript
window.InventoryModule = {
    renderInventory,      // Re-render the entire grid
    filterByCategory,     // Switch to a category
    items: inventoryItems // Current inventory data
};
```

### Functions

**initInventory()**
- Loads data from `inventoryData`
- Adds dummy `quantity` field (1-5) for demo
- Calls `renderInventory()`

**filterByCategory(category)**
- Updates active button
- Filters items by category
- Re-renders grid

**renderInventory()**
- Filters items based on `currentCategory`
- Creates item cards with `createItemCard()`
- Handles empty state

**selectItem(item, cardElement)**
- Marks item as selected
- Calls `showItemDetail(item)`

**showItemDetail(item)**
- Renders detail panel with full item info
- Shows image, description, effect, price, quantity

## How to extend

### Add Real Data
Replace the dummy initialization:

```javascript
function initInventory() {
    // OLD: Dummy data
    // inventoryItems = inventoryData.map(...)

    // NEW: Fetch from API or localStorage
    fetch('/api/player/inventory')
        .then(res => res.json())
        .then(data => {
            inventoryItems = data;
            renderInventory();
        });
}
```

### Add Actions
Add action buttons to the detail panel:

```javascript
function showItemDetail(item) {
    detailPanel.innerHTML = `
        ... existing detail HTML ...
        <div class="detail-actions">
            <button onclick="useItem(${item.id})">Utiliser</button>
            <button onclick="dropItem(${item.id})">Jeter</button>
        </div>
    `;
}
```

### Add Sorting
Add a sort dropdown in the header:

```html
<select onchange="sortInventory(this.value)">
    <option value="name">Nom</option>
    <option value="category">Catégorie</option>
    <option value="quantity">Quantité</option>
</select>
```

### Persist Selection
Save selected item to URL or localStorage:

```javascript
function selectItem(item) {
    // ... existing selection code ...

    // Save to URL
    const url = new URL(window.location);
    url.searchParams.set('item', item.id);
    window.history.pushState({}, '', url);
}
```

## Navigation

### To Inventory Page
Add links in your main pages:

```html
<a href="inventaire.html">Inventaire</a>
```

### From Inventory Page
The back link already points to `index.html`:

```html
<a href="index.html" class="back-link">←</a>
```

## Testing

1. Open `inventaire.html` in browser
2. Click category buttons - grid should filter
3. Click an item - detail panel should update
4. Try different categories - empty state should show if no items
5. Check responsive: resize window to see mobile layout

## Wasteland 3 Style Notes

Following the reference screenshot:
- ✅ Grid-based item layout
- ✅ Item cards with images
- ✅ Category filtering
- ✅ Selected item highlight
- ✅ Detail panel on the side
- ✅ Clean, organized UI

Missing features you might want to add:
- [ ] Drag & drop to rearrange
- [ ] Grid-based positioning (Tetris-style)
- [ ] Weight/capacity system
- [ ] Item stacking logic
- [ ] Context menu (right-click)

## Questions?

The code is heavily commented. Look for:
- `// --- STATE ---` - Global variables
- `// --- INITIALIZATION ---` - Setup code
- `// --- RENDERING ---` - Display logic
- `// --- UTILITIES ---` - Helper functions

Each function has a comment explaining what it does.
