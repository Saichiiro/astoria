# Astoria Consistency Audit & Fix Plan

## Issues Found:

### 1. **Header Inconsistency**
- ❌ inventaire.html: uses `inventory-header`, `inventory-title`
- ❌ magie.html: uses `magic-header`, `magic-title`  
- ❌ nokorah.html: uses `nokorah-header`, `nokorah-title`
- ❌ profil.html: uses `profile-header`, `profile-title`
- ❌ quetes.html: uses `quest-header`, `quest-title`
- ✅ fiche.html: uses `page-header`, `page-title` (CORRECT)
- ✅ hdv.html: uses `page-header`, `page-title` (CORRECT)
- ✅ competences.html: has custom layout (OK - unique design)

**Fix:** Standardize to `page-header`, `page-title` for all main pages

### 2. **Background Blending**
- Check each page for proper tw-panel/tw-surface removal
- Ensure headers have NO background
- Ensure content cards have proper separation

### 3. **Visual Separation**
- All tables/grids need proper borders/shadows
- Cards should stand out from background
- No "blended" elements

### 4. **Common Widgets**
- Character avatar dropdown (already consistent)
- Back button styling (tw-back)
- Search bars
- Action buttons

## Pages to Fix:

1. inventaire.html - Standardize header
2. magie.html - Standardize header  
3. nokorah.html - Standardize header
4. profil.html - Standardize header
5. quetes.html - Standardize header

## Files to Update:

- HTML files (headers)
- CSS files (remove redundant classes)
- Ensure all use style.css standards

