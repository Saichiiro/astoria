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
    note: document.getElementById('adminItemNote'),
    cancelBtn: document.getElementById('adminItemCancel'),
    saveBtn: document.getElementById('adminItemSave'),
    deleteBtn: document.getElementById('adminItemDelete'),
    cropperBackdrop: document.getElementById('itemCropperBackdrop'),
    cropperImage: document.getElementById('itemCropperImage'),
    cropperZoom: document.getElementById('itemCropperZoom'),
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
    const buyText = row.price_pa ? `${row.price_pa} pa` : '';
    const sellText = row.price_po ? `${row.price_po} po` : '';
    return {
        _dbId: row.id,
        source: 'db',
        name: row.name || '',
        description: row.description || '',
        effect: row.effect || '',
        category: row.category || '',
        buyPrice: buyText,
        sellPrice: sellText,
        image: primary,
        images: images
    };
}

function parsePrice(raw) {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

function openBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
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
    editingItem = item || null;
    setError('');
    if (dom.note) dom.note.textContent = '';
    if (dom.modalTitle) {
        const isDbItem = editingItem && editingItem._dbId;
        dom.modalTitle.textContent = isDbItem ? 'Modifier un objet' : 'Ajouter un objet';
        if (editingItem && !isDbItem && dom.note) {
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
        dom.categoryInput.value = editingItem.category || '';
        dom.buyInput.value = editingItem.buyPrice || '';
        dom.sellInput.value = editingItem.sellPrice || '';
        dom.descriptionInput.value = editingItem.description || '';
        dom.effectInput.value = editingItem.effect || '';
        if (editingItem.image) {
            setImagePreview(editingItem.image);
        }
    }

    openBackdrop(dom.backdrop);
    dom.nameInput?.focus();
}

function closeAdminModal() {
    closeBackdrop(dom.backdrop);
    resetImagePreview();
    imageBlob = null;
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
            .delete()
            .eq('id', editingItem._dbId)
            .select();

        if (error) {
            console.error('[DELETE] Delete error:', error);
            setError('Impossible de supprimer l\'objet.');
            closeDeleteModal();
            return;
        }

        console.log('[DELETE] Successfully deleted from DB:', data);

        // Remove from UI
        window.astoriaCodex?.removeItemByRef(editingItem);
        console.log('[DELETE] Removed from UI');

        // Close modals
        closeDeleteModal();
        closeAdminModal();
    } catch (error) {
        console.error('[DELETE] Exception:', error);
        setError('Erreur lors de la suppression.');
        closeDeleteModal();
    }
}

// Global function for edit button in table rows
window.openEditModal = function(globalIndex) {
    const item = window.astoriaCodex?.getItemByIndex(globalIndex);
    if (!item) return;
    openAdminModal(item);
};

function destroyCropper() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (imagePreviewUrl) {
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
    // Don't revoke here - setImagePreview will handle it after image loads
    const newBlobUrl = URL.createObjectURL(blob);
    setImagePreview(newBlobUrl);
    closeCropper();
}

async function uploadImage(dbId, nameHint) {
    if (!imageBlob || !supabase) {
        console.warn('Upload skipped: no imageBlob or no supabase');
        return null;
    }

    // TEMP SOLUTION: Convert blob to data URL instead of uploading to storage
    // TODO: Create 'items' bucket in Supabase Storage for production use
    try {
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
        });
        console.log('Image converted to data URL, size:', imageBlob.size);
        return dataUrl;
    } catch (error) {
        console.error('Failed to convert image to data URL:', error);
        setError('Impossible de traiter l\'image');
        return null;
    }

    /* ORIGINAL STORAGE UPLOAD CODE (requires 'items' bucket to exist):
    const safeName = String(nameHint || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '_');
    const filePath = `items/${dbId}/${Date.now()}_${safeName}.png`;

    console.log('Uploading image:', filePath, 'Size:', imageBlob.size);

    const { error: uploadError } = await supabase.storage
        .from(ITEMS_BUCKET)
        .upload(filePath, imageBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/png'
        });

    if (uploadError) {
        console.error('Upload error:', uploadError);
        setError(`Upload impossible: ${uploadError.message || 'Verifie le bucket items'}`);
        return null;
    }

    const { data } = supabase.storage.from(ITEMS_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || null;
    console.log('Image uploaded successfully:', publicUrl);
    return publicUrl;
    */
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

    const payload = {
        name,
        description: dom.descriptionInput.value.trim(),
        effect: dom.effectInput.value.trim(),
        category: dom.categoryInput.value.trim().toLowerCase(),
        price_po: parsePrice(dom.sellInput.value),
        price_pa: parsePrice(dom.buyInput.value)
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
        closeAdminModal();
    } catch (error) {
        console.error('Save error:', error);
        setError(`Impossible de sauvegarder: ${error.message || 'Erreur inconnue'}`);
    } finally {
        dom.saveBtn.disabled = false;
    }
}

async function loadDbItems() {
    if (!supabase || !window.astoriaCodex) return;
    console.log('[LOAD] Loading items from database...');
    const { data, error } = await supabase
        .from('items')
        .select('id, name, description, effect, category, price_po, price_pa, images, enabled')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[LOAD] Items load error:', error);
        return;
    }

    console.log('[LOAD] Loaded', data?.length || 0, 'items from DB');
    console.log('[LOAD] Items:', data?.map(item => ({ id: item.id, name: item.name })));

    const mapped = (data || []).map(mapDbItem);
    window.astoriaCodex.addItems(mapped);
}

function updateEditButton(detail) {
    if (!dom.editBtn || !dom.modalActions) return;
    const item = detail?.item || null;
    if (adminMode && item) {
        dom.modalActions.hidden = false;
        dom.editBtn.hidden = false;
        dom.editBtn.textContent = item._dbId ? 'Modifier' : 'Importer pour modifier';
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

    dom.addBtn.addEventListener('click', () => openAdminModal(null));
    dom.closeBtn?.addEventListener('click', closeAdminModal);
    dom.cancelBtn?.addEventListener('click', closeAdminModal);
    dom.form?.addEventListener('submit', saveItem);
    dom.deleteBtn?.addEventListener('click', openDeleteModal);
    dom.deleteCancel?.addEventListener('click', closeDeleteModal);
    dom.deleteConfirm?.addEventListener('click', confirmDelete);

    dom.imageBtn?.addEventListener('click', () => dom.imageInput?.click());
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
