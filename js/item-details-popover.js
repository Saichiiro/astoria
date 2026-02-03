// ============================================================================
// Popover de détails d'item - Système réutilisable (REFACTORED with FloatingManager)
// ============================================================================

let popoverFloatingInstance = null;

export function showItemDetailsPopover(item, anchorElement) {
    console.log('[Popover] showItemDetailsPopover called', { item, anchorElement });

    // Fermer le popover existant s'il y en a un
    if (popoverFloatingInstance) {
        closeItemDetailsPopover();
    }

    // Créer le popover
    const popover = createPopoverElement(item);
    console.log('[Popover] Popover created', popover);

    // Ajouter au backdrop du modal items pour qu'il soit par-dessus le modal blanc
    const modalBackdrop = document.getElementById('questItemsModalBackdrop') || document.body;
    modalBackdrop.appendChild(popover);
    console.log('[Popover] Popover appended to:', modalBackdrop);

    // REFACTORED: Utiliser FloatingManager au lieu du positionnement manuel
    popoverFloatingInstance = floatingManager.createPopover(anchorElement, popover, {
        placement: 'right',
        offset: 12,
        arrow: false,
        trigger: 'manual', // Géré manuellement car déjà ouvert
        onHide: () => {
            // Cleanup après fermeture
            if (popover && popover.parentNode) {
                popover.parentNode.removeChild(popover);
            }
            popoverFloatingInstance = null;
        }
    });

    // Afficher le popover
    popoverFloatingInstance.show();
    console.log('[Popover] Popover shown with FloatingManager');

    // Event listeners
    const closeBtn = popover.querySelector('.item-details-popover-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeItemDetailsPopover);
    }

    // Fermer en cliquant en dehors
    const outsideClickHandler = (e) => {
        if (!popover.contains(e.target) && !anchorElement.contains(e.target)) {
            closeItemDetailsPopover();
            document.removeEventListener('click', outsideClickHandler);
        }
    };

    // Petit délai pour éviter que le clic actuel ne ferme immédiatement
    setTimeout(() => {
        document.addEventListener('click', outsideClickHandler);
    }, 100);

    // ESC key et click-outside sont déjà gérés par FloatingManager
    // Mais on garde l'handler ESC custom pour la compatibilité
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeItemDetailsPopover();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    return popover;
}

export function closeItemDetailsPopover() {
    if (popoverFloatingInstance) {
        popoverFloatingInstance.hide();
        popoverFloatingInstance.destroy();
        popoverFloatingInstance = null;
    }
}

function createPopoverElement(item) {
    const popover = document.createElement('div');
    popover.className = 'item-details-popover';

    // Header avec image et nom
    const header = document.createElement('div');
    header.className = 'item-details-popover-header';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'item-details-popover-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Fermer');

    const imageContainer = document.createElement('div');
    imageContainer.className = 'item-details-popover-image';

    if (item.image && item.image !== '') {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name || '';
        img.loading = 'lazy';
        imageContainer.appendChild(img);
    } else {
        const letter = document.createElement('div');
        letter.className = 'item-details-popover-image-letter';
        const firstLetter = item.name ? item.name[0].toUpperCase() : '?';
        letter.textContent = firstLetter;
        imageContainer.appendChild(letter);
    }

    const name = document.createElement('h3');
    name.className = 'item-details-popover-name';
    name.textContent = item.name || 'Item';

    const category = document.createElement('div');
    category.className = 'item-details-popover-category';
    category.textContent = item.category || 'autre';

    header.appendChild(closeBtn);
    header.appendChild(imageContainer);
    header.appendChild(name);
    header.appendChild(category);

    // Body avec détails
    const body = document.createElement('div');
    body.className = 'item-details-popover-body';

    // Description
    if (item.description && item.description !== '') {
        const descSection = document.createElement('div');
        descSection.className = 'item-details-popover-section';

        const descLabel = document.createElement('div');
        descLabel.className = 'item-details-popover-label';
        descLabel.textContent = 'Description';

        const descText = document.createElement('div');
        descText.className = 'item-details-popover-text';
        descText.textContent = item.description;

        descSection.appendChild(descLabel);
        descSection.appendChild(descText);
        body.appendChild(descSection);
    }

    // Effet
    if (item.effect && item.effect !== '') {
        const effectSection = document.createElement('div');
        effectSection.className = 'item-details-popover-section';

        const effectLabel = document.createElement('div');
        effectLabel.className = 'item-details-popover-label';
        effectLabel.textContent = 'Effet';

        const effectText = document.createElement('div');
        effectText.className = 'item-details-popover-text';
        effectText.textContent = item.effect;

        effectSection.appendChild(effectLabel);
        effectSection.appendChild(effectText);
        body.appendChild(effectSection);
    }

    // Prix
    const price = item.price || item.price_kaels || item.sellPrice || item.buyPrice || 0;
    if (price > 0) {
        const priceSection = document.createElement('div');
        priceSection.className = 'item-details-popover-section';

        const priceBox = document.createElement('div');
        priceBox.className = 'item-details-popover-price';
        priceBox.textContent = `${price} kaels`;

        priceSection.appendChild(priceBox);
        body.appendChild(priceSection);
    }

    // Si aucune info, afficher un message
    if (body.children.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'item-details-popover-no-data';
        noData.textContent = 'Aucune information détaillée disponible pour cet item.';
        body.appendChild(noData);
    }

    popover.appendChild(header);
    popover.appendChild(body);

    return popover;
}

// Export de la fonction pour vérifier si le popover est ouvert
export function isPopoverOpen() {
    return popoverFloatingInstance !== null;
}
