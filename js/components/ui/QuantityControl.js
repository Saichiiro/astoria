/**
 * QuantityControl - Reusable quantity picker component
 * Creates a quantity input with +/- buttons
 */

export class QuantityControl {
    /**
     * Create a quantity control element
     * @param {Object} options - Configuration options
     * @param {number} options.value - Initial value (default: 0)
     * @param {number} options.min - Minimum value (default: 0)
     * @param {number} options.max - Maximum value (default: 999)
     * @param {Function} options.onChange - Callback when value changes (value) => {}
     * @param {string} options.className - Additional CSS classes
     * @returns {Object} { element: HTMLElement, setValue: Function, getValue: Function }
     */
    static create(options = {}) {
        const {
            value = 0,
            min = 0,
            max = 999,
            onChange = null,
            className = '',
        } = options;

        const container = document.createElement('div');
        container.className = `quantity-control ${className}`;

        // Minus button
        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.className = 'quantity-btn quantity-minus';
        minusBtn.textContent = '-';
        minusBtn.disabled = value <= min;
        minusBtn.setAttribute('aria-label', 'Diminuer la quantité');

        // Input
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'quantity-input';
        input.min = String(min);
        input.max = String(max);
        input.value = String(value);
        input.setAttribute('aria-label', 'Quantité');

        // Plus button
        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.className = 'quantity-btn quantity-plus';
        plusBtn.textContent = '+';
        plusBtn.disabled = value >= max;
        plusBtn.setAttribute('aria-label', 'Augmenter la quantité');

        container.appendChild(minusBtn);
        container.appendChild(input);
        container.appendChild(plusBtn);

        // Internal state
        let currentValue = value;

        /**
         * Update value and trigger onChange
         */
        const updateValue = (newValue) => {
            currentValue = Math.max(min, Math.min(max, newValue));
            input.value = String(currentValue);
            minusBtn.disabled = currentValue <= min;
            plusBtn.disabled = currentValue >= max;

            if (onChange) {
                onChange(currentValue);
            }
        };

        // Event listeners
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateValue(currentValue - 1);
        });

        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateValue(currentValue + 1);
        });

        input.addEventListener('input', (e) => {
            e.stopPropagation();
            const val = parseInt(e.target.value) || 0;
            updateValue(val);
        });

        input.addEventListener('change', (e) => {
            e.stopPropagation();
            const val = parseInt(e.target.value) || 0;
            updateValue(val);
        });

        // Public API
        return {
            element: container,
            setValue: updateValue,
            getValue: () => currentValue,
            disable: () => {
                minusBtn.disabled = true;
                plusBtn.disabled = true;
                input.disabled = true;
            },
            enable: () => {
                minusBtn.disabled = currentValue <= min;
                plusBtn.disabled = currentValue >= max;
                input.disabled = false;
            },
        };
    }
}
