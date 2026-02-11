// ============================================================================
// Popover de détails d'item - Système réutilisable (Simple positioning)
// ============================================================================

let currentPopover = null;

export function showItemDetailsPopover(item, anchorElement) {
    // Fermer le popover existant s'il y en a un
    if (currentPopover) {
        closeItemDetailsPopover();
    }

    // Créer le popover
    const popover = createPopoverElement(item);
    // Toujours monter dans document.body pour éviter tout conflit de stacking context
    document.body.appendChild(popover);
    // Position the popover next to the anchor element
    positionPopover(popover, anchorElement);
    currentPopover = popover;

    // Afficher le popover
    popover.style.opacity = '1';
    popover.style.pointerEvents = 'auto';
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
    if (currentPopover) {
        if (currentPopover.parentNode) {
            currentPopover.parentNode.removeChild(currentPopover);
        }
        currentPopover = null;
    }
}

function positionPopover(popover, anchorElement) {
    // Get anchor position relative to viewport
    const anchorRect = anchorElement.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    // Get modal body for scroll position (if inside modal)
    const modalRoot = anchorElement.closest('.quest-items-modal');
    const modalBody = modalRoot?.querySelector('.quest-items-modal-body') || null;
    const hasScroll = modalBody && modalBody.scrollHeight > modalBody.clientHeight;

    // Calculate available space
    const spaceRight = window.innerWidth - anchorRect.right;
    const spaceLeft = anchorRect.left;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;

    let left, top;
    let placement = 'right'; // default

    // Determine best placement based on available space
    if (spaceRight >= popoverRect.width + 20) {
        // Position to the right
        placement = 'right';
        left = anchorRect.right + 12;
        top = anchorRect.top;
    } else if (spaceLeft >= popoverRect.width + 20) {
        // Position to the left
        placement = 'left';
        left = anchorRect.left - popoverRect.width - 12;
        top = anchorRect.top;
    } else if (spaceBelow >= popoverRect.height + 20) {
        // Position below
        placement = 'below';
        left = Math.max(20, Math.min(anchorRect.left, window.innerWidth - popoverRect.width - 20));
        top = anchorRect.bottom + 12;
    } else if (spaceAbove >= popoverRect.height + 20) {
        // Position above
        placement = 'above';
        left = Math.max(20, Math.min(anchorRect.left, window.innerWidth - popoverRect.width - 20));
        top = anchorRect.top - popoverRect.height - 12;
    } else {
        // Not enough space anywhere, position in center of viewport
        placement = 'center';
        left = (window.innerWidth - popoverRect.width) / 2;
        top = Math.max(20, (window.innerHeight - popoverRect.height) / 2);
    }

    // Ensure popover stays within viewport bounds
    left = Math.max(20, Math.min(left, window.innerWidth - popoverRect.width - 20));
    top = Math.max(20, Math.min(top, window.innerHeight - popoverRect.height - 20));

    // Apply position (fixed positioning relative to viewport)
    popover.style.position = 'fixed';
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.zIndex = '2147483647';
    popover.style.maxHeight = `${window.innerHeight - 40}px`;
    popover.style.overflowY = 'auto'; // Allow scrolling if content is too long
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
    return currentPopover !== null;
}
