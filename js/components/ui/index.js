/**
 * UI Components - Reusable UI building blocks
 * Export all reusable UI components from a single entry point
 */

export { ItemCard } from './ItemCard.js';
export { QuantityControl } from './QuantityControl.js';
export { CategoryFilter } from './CategoryFilter.js';
export { ItemsModal } from './ItemsModal.js';

/**
 * Usage examples:
 *
 * // Import specific components
 * import { ItemCard, QuantityControl } from './components/ui/index.js';
 *
 * // Create an item card
 * const card = ItemCard.create(itemData, {
 *   onMoreClick: (item, btn) => showDetails(item, btn),
 *   showPrice: true
 * });
 *
 * // Create a quantity control
 * const qtyControl = QuantityControl.create({
 *   value: 5,
 *   onChange: (newValue) => console.log('New quantity:', newValue)
 * });
 *
 * // Create a full modal
 * const itemsModal = new ItemsModal({
 *   backdropId: 'myModalBackdrop',
 *   title: 'Select Items',
 *   onConfirm: (selectedItems) => {
 *     selectedItems.forEach((qty, itemName) => {
 *       console.log(`${itemName}: ${qty}`);
 *     });
 *   }
 * });
 *
 * itemsModal.open();
 */
