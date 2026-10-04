# Categories Table Setup

This document explains how to set up the categories table for better category management across the application.

## Why Categories Table?

Instead of hardcoding categories in JavaScript, we now have a dedicated database table that:
- ✅ Makes categories consistent across HDV, Inventaire, Codex, and Quêtes
- ✅ Allows easy addition of new categories without code changes
- ✅ Provides icons and display order configuration
- ✅ Enables filtering and sorting
- ✅ Works even if database is unavailable (fallback to hardcoded)

## Setup Instructions

### 1. Run the SQL Migration

Open your Supabase SQL Editor and run the migration:

```bash
# Copy the contents of create-categories-table.sql
# Paste into Supabase SQL Editor
# Click "Run"
```

Or use the Supabase CLI:

```bash
supabase db execute -f scripts/create-categories-table.sql
```

### 2. Verify the Table

Check that the table was created successfully:

```sql
SELECT * FROM categories ORDER BY display_order;
```

You should see 5 categories:
- 🌾 Agricole
- 🧪 Consommable
- ⚔️ Équipement
- ⚒️ Matériaux
- ✨ Quêtes

### 3. Test the Integration

The categories are automatically loaded in HDV (and can be integrated into other pages):

1. Open [hdv.html](../hdv.html)
2. Check browser console for: `[HDV] Loaded 5 categories from database`
3. Verify all categories appear in the sidebar with icons
4. Test category filtering

## Files Modified

- **js/api/categories-service.js** - New service for fetching categories
- **js/hdv.js** - Updated to use database categories instead of hardcoded
- **scripts/create-categories-table.sql** - Database schema and initial data

## Adding a New Category

To add a new category:

```sql
INSERT INTO categories (slug, name, icon, display_order)
VALUES ('nouvelle', 'Nouvelle Catégorie', '🆕', 6);
```

The category will automatically appear in HDV on next page load!

## Category Structure

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| slug | TEXT | URL-safe identifier (e.g., 'agricole') |
| name | TEXT | Display name (e.g., 'Agricole') |
| icon | TEXT | Emoji or icon (e.g., '🌾') |
| description | TEXT | Optional description |
| display_order | INTEGER | Sort order (lower = first) |
| is_active | BOOLEAN | Whether to show this category |

## Rollback

If you need to remove the categories table:

```sql
DROP TABLE IF EXISTS categories CASCADE;
```

The application will fallback to hardcoded categories automatically.

## Next Steps

Consider integrating categories into:
- [ ] Inventaire dropdown
- [ ] Codex filter
- [ ] Quêtes modal categories
- [ ] Admin panel for category management

All of these can now use the same `categories-service.js` for consistency!
