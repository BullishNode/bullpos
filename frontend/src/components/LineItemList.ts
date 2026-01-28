import { LineItem } from '../types/invoice';

/**
 * LineItemList component - Displays line items in a table format
 */
export function renderLineItemList(lineItems: LineItem[], currency: string): string {
    if (!lineItems || lineItems.length === 0) {
        return '';
    }

    const rows = lineItems
        .map((item) => {
            const itemTotal = item.quantity * item.price;
            return `
                <tr class="line-item-row">
                    <td class="line-item-description">${escapeHtml(item.description)}</td>
                    <td class="line-item-quantity">${item.quantity}</td>
                    <td class="line-item-price">${formatCurrency(item.price, currency)}</td>
                    <td class="line-item-total">${formatCurrency(itemTotal, currency)}</td>
                </tr>
            `;
        })
        .join('');

    return `
        <div class="line-items-container">
            <h3 class="line-items-title">Items</h3>
            <table class="line-items-table">
                <thead>
                    <tr>
                        <th class="col-description">Description</th>
                        <th class="col-quantity">Qty</th>
                        <th class="col-price">Price</th>
                        <th class="col-total">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Formats currency amounts with proper currency symbol
 */
function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
