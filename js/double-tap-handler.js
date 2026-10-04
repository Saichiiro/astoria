/**
 * Double Tap Handler
 * Gère le double-clic/double-tap pour équiper automatiquement des items
 */

(function() {
    'use strict';

    const DOUBLE_TAP_DELAY = 300; // 300ms entre les deux taps
    let lastTap = 0;
    let lastTarget = null;

    /**
     * Détecte si un élément est un item équipable
     */
    function isEquippableItem(element) {
        // Cherche l'élément item dans les parents
        const itemCard = element.closest('.inventory-item-card, .codex-card, .item-card');
        if (!itemCard) return null;

        // Vérifie que c'est un item équipable
        const category = itemCard.dataset.category;
        if (category === 'équipement' || category === 'consommable') {
            return itemCard;
        }

        return null;
    }

    /**
     * Équipe automatiquement un item
     */
    function autoEquipItem(itemCard) {
        const itemId = itemCard.dataset.itemId;
        const itemName = itemCard.querySelector('.item-name, .codex-card-title')?.textContent;

        console.log('[DoubleTap] Auto-équipement:', itemName, itemId);

        // Dispatch event custom pour que l'inventaire gère l'équipement
        const event = new CustomEvent('item:auto-equip', {
            detail: {
                itemId: itemId,
                itemCard: itemCard
            },
            bubbles: true
        });

        itemCard.dispatchEvent(event);

        // Feedback visuel
        itemCard.style.transform = 'scale(1.05)';
        itemCard.style.transition = 'transform 0.1s ease';

        setTimeout(() => {
            itemCard.style.transform = '';
        }, 150);
    }

    /**
     * Handler de double-tap/double-click
     */
    function handleDoubleTap(event) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastTap;

        const itemCard = isEquippableItem(event.target);
        if (!itemCard) {
            lastTap = 0;
            lastTarget = null;
            return;
        }

        // Double-tap détecté
        if (timeDiff < DOUBLE_TAP_DELAY && lastTarget === itemCard) {
            event.preventDefault();
            autoEquipItem(itemCard);
            lastTap = 0;
            lastTarget = null;
        } else {
            // Premier tap
            lastTap = currentTime;
            lastTarget = itemCard;
        }
    }

    /**
     * Initialize double-tap handler
     */
    function init() {
        // Écoute sur click (desktop) et touchend (mobile)
        document.addEventListener('click', handleDoubleTap);
        document.addEventListener('touchend', handleDoubleTap);

        console.log('[DoubleTap] Handler initialized');
    }

    // Init au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
