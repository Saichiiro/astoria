# Refactor Test Checklist

## 🧪 Testing Guide for Library Integration

Test all refactored functionality to ensure nothing broke during the library migration.

---

## ✅ Phase 1: Storage (StorageManager)

### Test: Search History (search-history.js)
**Location:** codex.html

- [ ] Open codex.html in browser
- [ ] Search for an item (e.g., "épée")
- [ ] Check console - should see `[StorageManager]` logs (not localStorage errors)
- [ ] Open DevTools → Application → IndexedDB → Check for `localforage` database
- [ ] Should see recent searches stored in IndexedDB
- [ ] Search again - recent searches should appear in dropdown
- [ ] Click "Clear recent searches" - should remove from IndexedDB

**Expected:** Search history works, data in IndexedDB instead of localStorage

---

### Test: Admin Session & Tombstones (codex.js + codex-admin.js)
**Location:** codex.html (admin only)

- [ ] Login as admin
- [ ] Check console - should see `[Codex] initAdminFlag` loading from StorageManager
- [ ] Create/edit an item in codex
- [ ] Delete an item (marks as disabled)
- [ ] Check console - should see `[CodexAdmin] getItemTombstones` using StorageManager
- [ ] Refresh page - deleted item should stay hidden (tombstone persisted)

**Expected:** Admin session and tombstones use IndexedDB

---

## ✅ Phase 2: Popover (FloatingManager)

### Test: Item Details Popover (item-details-popover.js)
**Location:** quetes.html (quest items modal)

- [ ] Open quetes.html
- [ ] Click "Ajouter des items" button to open quest items modal
- [ ] Click on any item card to see details popover
- [ ] **Positioning Test:**
  - [ ] Popover should appear to the right of the item (if space available)
  - [ ] If no space on right, should flip to left/top/bottom automatically
  - [ ] Resize browser window - popover should reposition intelligently
- [ ] Click outside popover - should close
- [ ] Press ESC - should close
- [ ] Click close button (×) - should close
- [ ] Open popover near screen edge - should NOT overflow viewport

**Expected:** Smart positioning with no manual calculation, no viewport overflow

**Before Refactor:** 87 lines of custom positioning code
**After Refactor:** FloatingManager handles everything

---

## ✅ Phase 3: Modals (ModalManager)

### Test: Quest Items Modal (quetes-items-modal.js)
**Location:** quetes.html

- [ ] Open quetes.html
- [ ] Click "Ajouter des items" to open modal
- [ ] **Scroll Lock Test:**
  - [ ] While modal is open, try scrolling background page
  - [ ] Background should NOT scroll (body-scroll-lock active)
  - [ ] Check console - should see `[ModalManager] Modal opened`
- [ ] **ESC Key Test:**
  - [ ] Press ESC - modal should close
  - [ ] Check console - should see `[ModalManager] Modal closed`
- [ ] **Backdrop Click Test:**
  - [ ] Open modal again
  - [ ] Click on the dark backdrop (outside modal)
  - [ ] Modal should close
- [ ] **Focus Management Test:**
  - [ ] Open modal
  - [ ] Search field should auto-focus
  - [ ] Close modal
  - [ ] Focus should return to trigger button

**Expected:** Professional modal behavior with scroll lock, ESC, backdrop click

**Before Refactor:** Manual `overflow: hidden`, custom ESC handler, custom backdrop click
**After Refactor:** ModalManager + body-scroll-lock handle everything

---

## ✅ Phase 4: CDN Libraries Loaded

### Test: Library Availability
**Location:** profil.html, codex.html, quetes.html

Open browser DevTools → Console and run:

```javascript
// Check library globals
console.log('FloatingUI:', typeof FloatingUIDOM);          // should be "object"
console.log('DOMPurify:', typeof DOMPurify);               // should be "object"
console.log('Notyf:', typeof Notyf);                       // should be "function"
console.log('bodyScrollLock:', typeof bodyScrollLock);     // should be "object"
console.log('localforage:', typeof localforage);           // should be "object"
console.log('Cropper:', typeof Cropper);                   // should be "function"

// Check wrapper managers
console.log('toastManager:', typeof toastManager);         // should be "object"
console.log('storageManager:', typeof storageManager);     // should be "object"
console.log('modalManager:', typeof modalManager);         // should be "object"
console.log('uploaderCropper:', typeof uploaderCropper);   // should be "object"
console.log('sanitizer:', typeof sanitizer);               // should be "object"
console.log('floatingManager:', typeof floatingManager);   // should be "object"
```

**Expected:** All should be defined (not "undefined")

---

### Test: Toast Notifications (ToastManager)
**Location:** Any page with CDN imports

Open Console and run:

```javascript
// Test success toast
toastManager.success('Test success message!');

// Test error toast
toastManager.error('Test error message!');

// Test info toast
toastManager.info('Test info message!');

// Test warning toast
toastManager.warning('Test warning message!');
```

**Expected:**
- Toasts appear in top-right corner
- Auto-dismiss after 3 seconds
- Styled with Notyf theme
- Dismissible with click

---

### Test: Sanitizer (DOMPurify)
**Location:** Any page with CDN imports

Open Console and run:

```javascript
// Test HTML sanitization
const dirty = '<script>alert("XSS")</script><p>Safe text</p>';
const clean = sanitizer.clean(dirty);
console.log('Cleaned:', clean); // Should be: '<p>Safe text</p>'

// Test text-only
const textOnly = sanitizer.cleanText('<b>Bold</b> text');
console.log('Text only:', textOnly); // Should be: 'Bold text'

// Test URL safety
console.log('Safe URL:', sanitizer.isSafeUrl('https://example.com')); // true
console.log('Unsafe URL:', sanitizer.isSafeUrl('javascript:alert(1)')); // false
```

**Expected:** XSS attempts blocked, only safe content allowed

---

## 🐛 Bug Fixes

### Test: Agricole/Materiau Edit Modal
**Location:** codex.html (admin only)

- [ ] Login as admin
- [ ] Filter by "agricole" category
- [ ] Click "Modifier" on any item
- [ ] Edit modal should open (NOT undefined!)
- [ ] Filter by "materiau" category
- [ ] Click "Modifier" on any item
- [ ] Edit modal should open

**Before Fix:** `getItemByIndex()` returned `undefined` for filtered categories
**After Fix:** Uses `allItems[index]` instead of `currentData[index]`

---

## 📊 Performance Check

### Network Tab Test
**Location:** profil.html, codex.html, quetes.html

- [ ] Open DevTools → Network tab
- [ ] Refresh page
- [ ] Check CDN library sizes:
  - [ ] Floating UI: ~5KB
  - [ ] DOMPurify: ~20KB
  - [ ] Notyf: ~6KB
  - [ ] body-scroll-lock: ~2KB
  - [ ] localForage: ~17KB
  - [ ] Cropper.js: Already loaded
  - [ ] **Total new: ~50KB gzipped**
- [ ] All libraries should load from CDN (fast, cached)
- [ ] No 404 errors for wrapper scripts

---

## ✨ Final Integration Test

### Complete User Flow Test
**Location:** quetes.html

1. [ ] Open quetes.html
2. [ ] Click "Ajouter des items" (ModalManager should lock scroll)
3. [ ] Search for "épée" (StorageManager saves to IndexedDB)
4. [ ] Click an item card (FloatingManager shows popover)
5. [ ] Popover should position smartly, no overflow
6. [ ] Press ESC (closes popover, then modal if pressed again)
7. [ ] Reopen modal - search history should persist
8. [ ] Click backdrop to close (ModalManager handles)
9. [ ] Background scroll should unlock

**Expected:** Seamless experience, all libraries working together

---

## 🚨 Common Issues & Fixes

### Issue: `storageManager is not defined`
**Fix:** Check that `storage-manager.js` loads BEFORE files that use it

### Issue: `FloatingUIDOM is not defined`
**Fix:** Floating UI CDN script must load before `floating.js` wrapper

### Issue: Modal scroll lock not working
**Fix:** Check `body-scroll-lock` CDN loaded, check console for errors

### Issue: Popover positioning broken
**Fix:** Floating UI needs to load before item-details-popover.js

### Issue: Toast notifications not appearing
**Fix:** Check Notyf CSS is loaded (stylesheet link), check Notyf.js loaded

---

## 📝 Test Results

**Date:** _____________

**Tester:** _____________

| Test Category | Status | Notes |
|--------------|--------|-------|
| Search History (StorageManager) | ☐ Pass ☐ Fail | |
| Admin Tombstones (StorageManager) | ☐ Pass ☐ Fail | |
| Item Details Popover (FloatingManager) | ☐ Pass ☐ Fail | |
| Quest Items Modal (ModalManager) | ☐ Pass ☐ Fail | |
| CDN Libraries Loaded | ☐ Pass ☐ Fail | |
| Toast Notifications | ☐ Pass ☐ Fail | |
| HTML Sanitization | ☐ Pass ☐ Fail | |
| Agricole/Materiau Bug Fix | ☐ Pass ☐ Fail | |
| Performance (Network) | ☐ Pass ☐ Fail | |
| Complete User Flow | ☐ Pass ☐ Fail | |

---

## 🎯 Success Criteria

**All tests pass when:**
- ✅ No console errors related to undefined libraries
- ✅ Search history persists in IndexedDB
- ✅ Modals lock scroll and close on ESC/backdrop click
- ✅ Popovers position intelligently without viewport overflow
- ✅ All CDN libraries load successfully (<100ms each)
- ✅ Total added payload: ~50KB gzipped
- ✅ Agricole/materiau categories can edit items
- ✅ No functionality lost from original implementation

**If any tests fail:** Check browser console for errors, verify CDN links, check script load order.
