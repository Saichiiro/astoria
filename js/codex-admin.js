import {
    getSupabaseClient,
    getCurrentUser,
    isAdmin,
    refreshSessionUser
} from './auth.js';

const ITEMS_BUCKET = 'items';
const IMAGE_SIZE = 256;

const dom = {
    addBtn: document.getElementById('adminAddItemBtn'),
    modalActions: document.getElementById('modalAdminActions'),
    editBtn: document.getElementById('adminEditBtn'),
    backdrop: document.getElementById('adminItemBackdrop'),
    modalTitle: document.getElementById('adminItemTitle'),
    closeBtn: document.getElementById('adminItemClose'),
    form: document.getElementById('adminItemForm'),
    error: document.getElementById('adminItemError'),
    nameInput: document.getElementById('adminItemName'),
    categoryInput: document.getElementById('adminItemCategory'),
    buyInput: document.getElementById('adminItemBuy'),
    sellInput: document.getElementById('adminItemSell'),
    descriptionInput: document.getElementById('adminItemDescription'),
    effectInput: document.getElementById('adminItemEffect'),
    imageBtn: document.getElementById('adminItemImageBtn'),
    imageInput: document.getElementById('adminItemImageInput'),
    imagePreview: document.getElementById('adminItemImagePreview'),
    imageTag: document.getElementById('adminItemImage'),
    imagePlaceholder: document.querySelector('#adminItemImagePreview .codex-admin-image-placeholder'),
    imageMeta: document.getElementById('adminItemImageMeta'),
    note: document.getElementById('adminItemNote'),
    cancelBtn: document.getElementById('adminItemCancel'),
    saveBtn: document.getElementById('adminItemSave'),
    deleteBtn: document.getElementById('adminItemDelete'),
    cropperBackdrop: document.getElementById('itemCropperBackdrop'),
    cropperImage: document.getElementById('itemCropperImage'),
    cropperZoom: document.getElementById('itemCropperZoom'),
    cropperZoomIn: document.getElementById('itemCropperZoomIn'),
    cropperZoomOut: document.getElementById('itemCropperZoomOut'),
    cropperRotateLeft: document.getElementById('itemCropperRotateLeft'),
    cropperRotateRight: document.getElementById('itemCropperRotateRight'),
    cropperRotate180: document.getElementById('itemCropperRotate180'),
    cropperFlipX: document.getElementById('itemCropperFlipX'),
    cropperFlipY: document.getElementById('itemCropperFlipY'),
    cropperReset: document.getElementById('itemCropperReset'),
    cropperClose: document.getElementById('itemCropperClose'),
    cropperCancel: document.getElementById('itemCropperCancel'),
    cropperConfirm: document.getElementById('itemCropperConfirm'),
    deleteBackdrop: document.getElementById('deleteItemBackdrop'),
    deleteItemName: document.getElementById('deleteItemName'),
    deleteCancel: document.getElementById('deleteItemCancel'),
    deleteConfirm: document.getElementById('deleteItemConfirm')
};

let supabase = null;
let adminMode = false;
let editingItem = null;
let imageBlob = null;
let imagePreviewUrl = '';
let cropper = null;
let syncZoom = false;
let imageMeta = null;
const knownCategories = new Set();
const ITEM_TOMBSTONES_KEY = "astoriaItemTombstones";
let dbItemsByKey = new Map();

function normalizeItemName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "")
        .toLowerCase();
}

function getDbMatch(item) {
    if (!item) return null;
    const key = normalizeItemName(item.name || item.nom || '');
    if (!key) return null;
    return dbItemsByKey.get(key) || null;
}


async function getItemTombstones() {
    try {
        // Using StorageManager instead of localStorage
        const data = await storageManager.get(ITEM_TOMBSTONES_KEY);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn('[CodexAdmin] getItemTombstones error:', error);
        return [];
    }
}

async function addItemTombstone(name) {
    const key = normalizeItemName(name);
    if (!key) return;
    const tombstones = new Set(await getItemTombstones());
    tombstones.add(key);
    await storageManager.set(ITEM_TOMBSTONES_KEY, Array.from(tombstones));
}

function setError(message) {
    if (!dom.error) return;
    if (!message) {
        dom.error.textContent = '';
        dom.error.classList.remove('visible');
        return;
    }
    dom.error.textContent = message;
    dom.error.classList.add('visible');
}

function formatBytes(bytes) {
    const size = Number(bytes) || 0;
    if (size <= 0) return '0 Ko';
    if (size < 1024) return `${size} o`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function setImageMetaText(text) {
    if (!dom.imageMeta) return;
    dom.imageMeta.textContent = text || 'Aucun fichier';
}

function updateImageControls(hasImage) {
    if (dom.imageBtn) {
        dom.imageBtn.textContent = hasImage ? "Changer l'image" : "Importer l'image";
    }
}

function safeJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }
    return {};
}

function mapDbItem(row) {
    const images = safeJson(row.images);
    const primary = images.primary || images.url || '';
    const priceText = row.price_kaels ? `${row.price_kaels} kaels` : '';
    return {
        id: row.id,
        _dbId: row.id,
        source: 'db',
        name: row.name || '',
        description: row.description || '',
        effect: row.effect || '',
        category: row.category || '',
        equipment_slot: row.equipment_slot || '',
        buyPrice: priceText,
        sellPrice: priceText,
        image: primary,
        images: images
    };
}

function normalizeCategory(value) {
    return String(value || '').trim();
}

function collectCategories(items) {
    // Toujours inclure les catégories standards
    knownCategories.add('agricole');
    knownCategories.add('consommable');
    knownCategories.add('equipement');
    knownCategories.add('materiau');
    knownCategories.add('quete');

    // Ajouter les catégories des items existants
    (items || []).forEach((item) => {
        const category = normalizeCategory(item?.category);
        if (category) knownCategories.add(category);
    });
}

function renderCategoryOptions(selectedValue) {
    if (!dom.categoryInput) return;
    const currentValue = normalizeCategory(selectedValue);
    const options = Array.from(knownCategories).sort((a, b) => a.localeCompare(b, 'fr'));

    dom.categoryInput.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisir une categorie';
    dom.categoryInput.appendChild(placeholder);

    options.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        dom.categoryInput.appendChild(option);
    });

    if (currentValue) {
        if (!options.includes(currentValue)) {
            const option = document.createElement('option');
            option.value = currentValue;
            option.textContent = currentValue;
            dom.categoryInput.appendChild(option);
        }
        dom.categoryInput.value = currentValue;
    }
}

function parsePrice(raw) {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

function openBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.removeAttribute('aria-hidden');
    backdrop.classList.add('open');
}

function closeBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
}

function resetImagePreview() {
    // IMPORTANT: Clear image src FIRST, then revoke URL
    if (dom.imageTag) {
        dom.imageTag.src = '';
        dom.imageTag.hidden = true;
    }
    if (dom.imagePlaceholder) {
        dom.imagePlaceholder.hidden = false;
    }
    setImageMetaText('Aucun fichier');
    updateImageControls(false);

    // Now safe to revoke blob URL
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
    }
    imagePreviewUrl = '';
    imageBlob = null;
}

function setImagePreview(url) {
    if (!dom.imageTag || !dom.imagePlaceholder) return;

    // Store old URL to revoke AFTER new image loads
    const oldUrl = imagePreviewUrl;

    // Set new URL immediately
    imagePreviewUrl = url;
    dom.imageTag.hidden = !url;
    dom.imagePlaceholder.hidden = !!url;
    updateImageControls(!!url);

    if (!url) {
        dom.imageTag.src = '';
        // Revoke old blob if clearing preview
        if (oldUrl && oldUrl.startsWith('blob:')) {
            URL.revokeObjectURL(oldUrl);
        }
        return;
    }

    // Wait for image to load before revoking old blob
    dom.imageTag.onload = () => {
        // Only revoke old blob after new image successfully loaded
        if (oldUrl && oldUrl !== url && oldUrl.startsWith('blob:')) {
            URL.revokeObjectURL(oldUrl);
        }
    };

    dom.imageTag.onerror = () => {
        console.error('Failed to load image preview:', url);
        // Don't revoke if load failed - might need to retry
    };

    dom.imageTag.src = url;
}

function openAdminModal(item) {
    const dbMatch = getDbMatch(item);
    editingItem = dbMatch || item || null;
    imageMeta = null;
    setError('');
    if (dom.note) dom.note.textContent = '';
    renderCategoryOptions(editingItem?.category);
    if (dom.modalTitle) {
        const isDbItem = editingItem && editingItem._dbId;
        dom.modalTitle.textContent = isDbItem ? 'Modifier un objet' : 'Ajouter un objet';
        if (item && dbMatch && dom.note) {
            dom.note.textContent = "Objet deja en base: modification directe.";
        } else if (editingItem && !isDbItem && dom.note) {
            dom.note.textContent = "Objet local: l'enregistrement creera une copie modifiable en base.";
        }
    }
    if (dom.form) dom.form.reset();
    resetImagePreview();

    // Show/hide delete button
    if (dom.deleteBtn) {
        const isDbItem = editingItem && editingItem._dbId;
        dom.deleteBtn.hidden = !isDbItem;
    }

    if (editingItem) {
        dom.nameInput.value = editingItem.name || '';
        renderCategoryOptions(editingItem.category);
        dom.buyInput.value = editingItem.buyPrice || '';
        dom.sellInput.value = editingItem.sellPrice || '';
        dom.descriptionInput.value = editingItem.description || '';
        dom.effectInput.value = editingItem.effect || '';
        // Show/hide equipment slot field based on category
        const eqSlotField = document.getElementById('adminItemEquipmentSlotField');
        const eqSlotEl = document.getElementById('adminItemEquipmentSlot');
        const isEquipment = (editingItem.category || '').toLowerCase() === 'equipement';
        if (eqSlotField) {
            eqSlotField.style.display = isEquipment ? '' : 'none';
        }
        if (eqSlotEl) {
            eqSlotEl.value = editingItem.equipment_slot || editingItem.equipmentSlot || '';
        }
        if (editingItem.image) {
            setImagePreview(editingItem.image);
            setImageMetaText('Image actuelle');
        }
    } else {
        // New item - hide equipment slot field by default
        const eqSlotField = document.getElementById('adminItemEquipmentSlotField');
        if (eqSlotField) eqSlotField.style.display = 'none';
    }

    openBackdrop(dom.backdrop);
    dom.nameInput?.focus();
}

function closeAdminModal() {
    closeBackdrop(dom.backdrop);
    resetImagePreview();
    imageBlob = null;
    imageMeta = null;
    editingItem = null;
}

function openDeleteModal() {
    if (!editingItem || !editingItem._dbId) return;
    if (dom.deleteItemName) {
        dom.deleteItemName.textContent = editingItem.name || 'cet objet';
    }
    openBackdrop(dom.deleteBackdrop);
}

function closeDeleteModal() {
    closeBackdrop(dom.deleteBackdrop);
}

async function confirmDelete() {
    if (!editingItem || !editingItem._dbId || !supabase) {
        console.error('[DELETE] Cannot delete:', { editingItem, hasDbId: !!editingItem?._dbId, hasSupabase: !!supabase });
        return;
    }

    console.log('[DELETE] Deleting item:', editingItem.name, 'ID:', editingItem._dbId);

    try {
        const { data, error } = await supabase
            .from('items')
            .update({ enabled: false })
            .eq('id', editingItem._dbId)
            .select();

        if (error) {
            console.error('[DELETE] Delete error:', error);
            setError('Impossible de supprimer l\'objet.');
            toastManager.error('Impossible de supprimer l\'objet.');
            closeDeleteModal();
            return;
        }

        console.log('[DELETE] Successfully deleted from DB:', data);

        await addItemTombstone(editingItem?.name || "");
        // Remove from UI
        window.astoriaCodex?.removeItemByRef(editingItem);
        console.log('[DELETE] Removed from UI');
        await loadDbItems();

        toastManager.success(`"${editingItem.name}" supprimé avec succès`);

        // Close modals
        closeDeleteModal();
        closeAdminModal();
    } catch (error) {
        console.error('[DELETE] Exception:', error);
        setError('Erreur lors de la suppression.');
        toastManager.error('Erreur lors de la suppression.');
        closeDeleteModal();
    }
}

// Global function for edit button in table rows
window.openEditModal = function(globalIndex) {
    const item = window.astoriaCodex?.getItemByIndex(globalIndex);
    if (!item) return;
    openAdminModal(item);
};

function destroyCropper(keepPreview = false) {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (!keepPreview && imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        imagePreviewUrl = '';
    }
}

function closeCropper() {
    closeBackdrop(dom.cropperBackdrop);
    destroyCropper();
    if (dom.imageInput) dom.imageInput.value = '';
}

function openCropper(file) {
    imageMeta = {
        name: file?.name || 'image.png',
        size: file?.size || 0
    };
    setImageMetaText(`${imageMeta.name} • ${formatBytes(imageMeta.size)}`);

    if (!dom.cropperBackdrop || !dom.cropperImage) {
        imageBlob = file;
        imagePreviewUrl = URL.createObjectURL(file);
        setImagePreview(imagePreviewUrl);
        return;
    }

    if (!window.Cropper) {
        imageBlob = file;
        imagePreviewUrl = URL.createObjectURL(file);
        setImagePreview(imagePreviewUrl);
        return;
    }

    destroyCropper();
    imagePreviewUrl = URL.createObjectURL(file);
    dom.cropperImage.src = imagePreviewUrl;
    openBackdrop(dom.cropperBackdrop);

    cropper = new Cropper(dom.cropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        background: false,
        autoCropArea: 1,
        ready() {
            if (dom.cropperZoom) dom.cropperZoom.value = 1;
        },
        zoom(event) {
            if (!dom.cropperZoom) return;
            if (syncZoom) return;
            syncZoom = true;
            dom.cropperZoom.value = event.detail.ratio.toFixed(2);
            syncZoom = false;
        }
    });
}

async function applyCropper() {
    if (!cropper) {
        closeCropper();
        return;
    }

    const canvas = cropper.getCroppedCanvas({
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        imageSmoothingQuality: 'high'
    });

    if (!canvas) {
        closeCropper();
        return;
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
    if (!blob) {
        closeCropper();
        return;
    }

    imageBlob = blob;
    if (imageMeta) {
        imageMeta = { ...imageMeta, size: blob.size };
        setImageMetaText(`${imageMeta.name} • ${formatBytes(imageMeta.size)}`);
    }
    // Don't revoke here - setImagePreview will handle it after image loads
    const newBlobUrl = URL.createObjectURL(blob);
    setImagePreview(newBlobUrl);
    closeBackdrop(dom.cropperBackdrop);
    destroyCropper(true);
    if (dom.imageInput) dom.imageInput.value = '';
}

async function uploadImage(dbId, nameHint) {
    if (!imageBlob || !supabase) {
        console.warn('Upload skipped: no imageBlob or no supabase');
        return null;
    }

    // Upload to Supabase Storage bucket 'items'
    const safeName = String(nameHint || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '_');
    const filePath = `${dbId}/${Date.now()}_${safeName}.png`;

    console.log('[UPLOAD] Uploading image:', filePath, 'Size:', imageBlob.size);

    const { error: uploadError } = await supabase.storage
        .from(ITEMS_BUCKET)
        .upload(filePath, imageBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/png'
        });

    if (uploadError) {
        console.error('[UPLOAD] Upload error:', uploadError);
        const errorMsg = `Upload impossible: ${uploadError.message || 'Verifie le bucket items'}`;
        setError(errorMsg);
        toastManager.error('Échec de l\'upload de l\'image');
        return null;
    }

    const { data } = supabase.storage.from(ITEMS_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || null;
    console.log('[UPLOAD] Image uploaded successfully:', publicUrl);
    return publicUrl;
}

async function saveItem(event) {
    event.preventDefault();
    if (!supabase) return;
    setError('');

    const name = dom.nameInput.value.trim();
    if (!name) {
        setError('Nom obligatoire.');
        dom.nameInput.focus();
        return;
    }

    const equipmentSlotEl = document.getElementById('adminItemEquipmentSlot');
    const equipmentSlotVal = equipmentSlotEl ? equipmentSlotEl.value.trim() : '';

    const payload = {
        name,
        description: dom.descriptionInput.value.trim(),
        effect: dom.effectInput.value.trim(),
        category: dom.categoryInput.value.trim().toLowerCase(),
        price_kaels: parsePrice(dom.sellInput.value),
        equipment_slot: equipmentSlotVal || null
    };

    dom.saveBtn.disabled = true;

    try {
        let row = null;
        const isUpdate = editingItem && editingItem._dbId;

        if (isUpdate) {
            const { data, error } = await supabase
                .from('items')
                .update(payload)
                .eq('id', editingItem._dbId)
                .select()
                .single();
            if (error) throw error;
            row = data;
        } else {
            const { data, error } = await supabase
                .from('items')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            row = data;
        }

        // Upload image if present
        let imageUrl = null;
        if (imageBlob && row?.id) {
            imageUrl = await uploadImage(row.id, name);
            if (imageUrl) {
                const images = { primary: imageUrl };
                const { data, error } = await supabase
                    .from('items')
                    .update({ images })
                    .eq('id', row.id)
                    .select()
                    .single();
                if (!error && data) {
                    row = data;
                } else {
                    console.warn('Failed to update item with image URL:', error);
                }
            }
        } else if (isUpdate && editingItem.images) {
            // Preserve existing images when updating without new image
            if (!row.images) {
                row.images = editingItem.images;
            }
        }

        const mapped = mapDbItem(row);

        if (isUpdate) {
            window.astoriaCodex?.updateItemById(editingItem._dbId, mapped);
        } else {
            if (editingItem) {
                window.astoriaCodex?.removeItemByRef(editingItem);
            }
            window.astoriaCodex?.addItems([mapped]);
        }

        // Reset image state
        imageBlob = null;
        imageMeta = null;

        toastManager.success(isUpdate ? `"${name}" mis à jour` : `"${name}" ajouté au codex`);
        closeAdminModal();
    } catch (error) {
        console.error('Save error:', error);
        const errorMsg = `Impossible de sauvegarder: ${error.message || 'Erreur inconnue'}`;
        setError(errorMsg);
        toastManager.error('Échec de la sauvegarde');
    } finally {
        dom.saveBtn.disabled = false;
    }
}

async function loadDbItems() {
    if (!supabase || !window.astoriaCodex) return;
    console.log('[LOAD] Loading items from database...');
    const { data, error } = await supabase
        .from('items')
        .select('id, name, description, effect, category, price_kaels, images, enabled, created_at, equipment_slot')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[LOAD] Items load error:', error);
        return;
    }

    console.log('[LOAD] Loaded', data?.length || 0, 'items from DB');
    console.log('[LOAD] Items:', data?.map(item => ({ id: item.id, name: item.name })));

    // Check for duplicate names (normalized)
    const nameCounts = new Map();
    (data || []).forEach(item => {
        const key = normalizeItemName(item?.name || '');
        if (!key) return;
        if (!nameCounts.has(key)) {
            nameCounts.set(key, []);
        }
        nameCounts.get(key).push(item);
    });

    const duplicates = Array.from(nameCounts.entries())
        .filter(([, items]) => items.length > 1);
    let idsToDelete = [];

    if (duplicates.length > 0) {
        console.warn('[LOAD] DUPLICATE ITEMS DETECTED:');
        duplicates.forEach(([key, items]) => {
            console.warn(`  - "${key}": ${items.length} copies`, items.map((row) => row.id));
        });
        console.warn('[LOAD] Delete duplicates manually in Supabase or use DELETE FROM items WHERE id IN (...ids)');

        duplicates.forEach(([, rows]) => {
            const sorted = rows.slice().sort((a, b) => {
                const aTime = new Date(a.created_at || 0).getTime();
                const bTime = new Date(b.created_at || 0).getTime();
                return bTime - aTime;
            });
            sorted.slice(1).forEach((row) => {
                if (row?.id) idsToDelete.push(row.id);
            });
        });

        if (idsToDelete.length) {
            const { error: deleteError } = await supabase
                .from('items')
                .delete()
                .in('id', idsToDelete);
            if (deleteError) {
                console.error('[LOAD] Failed to delete duplicates:', deleteError);
                idsToDelete = [];
            } else {
                console.warn('[LOAD] Removed duplicate items:', idsToDelete.length);
            }
        }
    }

    const filtered = (data || []).filter((row) =>
        row &&
        row.enabled !== false &&
        !idsToDelete?.includes(row.id)
    );
    const mapped = filtered.map(mapDbItem);
    dbItemsByKey = new Map(
        mapped
            .map((item) => [normalizeItemName(item?.name || ''), item])
            .filter(([key]) => key)
    );
    collectCategories(mapped);
    renderCategoryOptions();
    if (typeof window.astoriaCodex.setDbItems === 'function') {
        window.astoriaCodex.setDbItems(mapped);
    } else if (typeof window.astoriaCodex.setItems === 'function') {
        window.astoriaCodex.setItems(mapped);
    } else {
        window.astoriaCodex.addItems(mapped);
    }
}

function updateEditButton(detail) {
    if (!dom.editBtn || !dom.modalActions) return;
    const item = detail?.item || null;
    const dbMatch = getDbMatch(item);
    if (adminMode && item) {
        dom.modalActions.hidden = false;
        dom.editBtn.hidden = false;
        dom.editBtn.textContent = (item._dbId || dbMatch) ? 'Modifier' : 'Importer pour modifier';
        dom.editBtn.onclick = () => {
            if (typeof window.closeItemModal === 'function') {
                window.closeItemModal();
            }
            openAdminModal(item);
        };
    } else {
        dom.modalActions.hidden = true;
        dom.editBtn.hidden = true;
    }
}

async function init() {
    try {
        await refreshSessionUser?.();
    } catch {}

    const user = getCurrentUser();
    if (!user) return;

    adminMode = isAdmin();
    if (!adminMode) return;

    supabase = await getSupabaseClient();
    dom.addBtn.hidden = false;

    if (typeof inventoryData !== 'undefined' && Array.isArray(inventoryData)) {
        collectCategories(inventoryData);
        renderCategoryOptions();
    }

    dom.addBtn.addEventListener('click', () => openAdminModal(null));
    dom.closeBtn?.addEventListener('click', closeAdminModal);
    dom.cancelBtn?.addEventListener('click', closeAdminModal);
    dom.form?.addEventListener('submit', saveItem);
    dom.deleteBtn?.addEventListener('click', openDeleteModal);
    dom.deleteCancel?.addEventListener('click', closeDeleteModal);
    dom.deleteConfirm?.addEventListener('click', confirmDelete);

    dom.imageBtn?.addEventListener('click', () => dom.imageInput?.click());
    dom.imagePreview?.addEventListener('click', () => dom.imageInput?.click());
    dom.imageInput?.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Fichier image invalide.');
            return;
        }
        openCropper(file);
    });

    dom.cropperClose?.addEventListener('click', closeCropper);
    dom.cropperCancel?.addEventListener('click', closeCropper);
    dom.cropperConfirm?.addEventListener('click', applyCropper);
    dom.cropperZoom?.addEventListener('input', () => {
        if (!cropper) return;
        if (syncZoom) return;
        const value = parseFloat(dom.cropperZoom.value);
        if (Number.isFinite(value)) {
            syncZoom = true;
            cropper.zoomTo(value);
            syncZoom = false;
        }
    });

    // Wire up cropper controls
    dom.cropperZoomIn?.addEventListener('click', () => {
        if (cropper) cropper.zoom(0.1);
    });

    dom.cropperZoomOut?.addEventListener('click', () => {
        if (cropper) cropper.zoom(-0.1);
    });

    dom.cropperRotateLeft?.addEventListener('click', () => {
        if (cropper) cropper.rotate(-90);
    });

    dom.cropperRotateRight?.addEventListener('click', () => {
        if (cropper) cropper.rotate(90);
    });

    dom.cropperRotate180?.addEventListener('click', () => {
        if (cropper) cropper.rotate(180);
    });

    let scaleX = 1, scaleY = 1;
    dom.cropperFlipX?.addEventListener('click', () => {
        if (cropper) {
            scaleX = -scaleX;
            cropper.scaleX(scaleX);
        }
    });

    dom.cropperFlipY?.addEventListener('click', () => {
        if (cropper) {
            scaleY = -scaleY;
            cropper.scaleY(scaleY);
        }
    });

    dom.cropperReset?.addEventListener('click', () => {
        if (cropper) {
            cropper.reset();
            scaleX = 1;
            scaleY = 1;
        }
    });

    // Wire up aspect ratio buttons
    const aspectButtons = dom.cropperBackdrop?.querySelectorAll('.cropper-aspect-btn');
    aspectButtons?.forEach(btn => {
        btn.addEventListener('click', () => {
            const ratio = parseFloat(btn.dataset.ratio);
            if (cropper && Number.isFinite(ratio)) {
                cropper.setAspectRatio(ratio);
                // Update active state
                aspectButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    window.addEventListener('astoria:codex-modal-open', (event) => updateEditButton(event.detail));
    window.addEventListener('astoria:codex-modal-close', () => updateEditButton(null));

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (dom.deleteBackdrop?.classList.contains('open')) {
            closeDeleteModal();
        } else if (dom.backdrop?.classList.contains('open')) {
            closeAdminModal();
        } else if (dom.cropperBackdrop?.classList.contains('open')) {
            closeCropper();
        }
    });

    await loadDbItems();
}

init();
