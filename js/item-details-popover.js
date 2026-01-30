// ============================================================================
// Popover de détails d'item - Système réutilisable
// ============================================================================

let popoverInstance = null;

export function showItemDetailsPopover(item, anchorElement) {
    // Fermer le popover existant s'il y en a un
    if (popoverInstance) {
        closeItemDetailsPopover();
    }

    // Créer le popover
    const popover = createPopoverElement(item);
    document.body.appendChild(popover);
    popoverInstance = popover;

    // Positionner le popover par rapport à l'élément ancre
    positionPopover(popover, anchorElement);

    // Afficher avec animation
    requestAnimationFrame(() => {
        popover.classList.add('visible');
    });

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

    // Fermer avec Escape
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
    if (popoverInstance) {
        popoverInstance.classList.remove('visible');
        setTimeout(() => {
            if (popoverInstance && popoverInstance.parentNode) {
                popoverInstance.parentNode.removeChild(popoverInstance);
            }
            popoverInstance = null;
        }, 200);
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

function positionPopover(popover, anchorElement) {
    const anchorRect = anchorElement.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = popover.offsetHeight || 400; // Estimation si pas encore rendu
    const gap = 12; // Espace entre l'ancre et le popover
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let placement = 'right'; // Par défaut
    let top = 0;
    let left = 0;

    // Essayer de placer à droite
    if (anchorRect.right + gap + popoverWidth <= viewportWidth) {
        placement = 'right';
        left = anchorRect.right + gap + scrollX;
        top = anchorRect.top + anchorRect.height / 2 - popoverHeight / 2 + scrollY;
    }
    // Sinon essayer à gauche
    else if (anchorRect.left - gap - popoverWidth >= 0) {
        placement = 'left';
        left = anchorRect.left - gap - popoverWidth + scrollX;
        top = anchorRect.top + anchorRect.height / 2 - popoverHeight / 2 + scrollY;
    }
    // Sinon essayer en bas
    else if (anchorRect.bottom + gap + popoverHeight <= viewportHeight) {
        placement = 'bottom';
        left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2 + scrollX;
        top = anchorRect.bottom + gap + scrollY;
    }
    // Sinon placer en haut
    else {
        placement = 'top';
        left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2 + scrollX;
        top = anchorRect.top - gap - popoverHeight + scrollY;
    }

    // S'assurer que le popover reste dans le viewport horizontalement
    if (left < 20) {
        left = 20;
    } else if (left + popoverWidth > viewportWidth - 20) {
        left = viewportWidth - popoverWidth - 20;
    }

    // S'assurer que le popover reste dans le viewport verticalement
    if (top < 20) {
        top = 20;
    } else if (top + popoverHeight > viewportHeight - 20 + scrollY) {
        top = viewportHeight - popoverHeight - 20 + scrollY;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.setAttribute('data-placement', placement);
}

// Export de la fonction pour fermer manuellement le popover
export function isPopoverOpen() {
    return popoverInstance !== null;
}
