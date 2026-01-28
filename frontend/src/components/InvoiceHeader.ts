/**
 * InvoiceHeader component - Displays merchant branding and logo
 */
export function renderInvoiceHeader(merchantName?: string, merchantLogo?: string): string {
    if (!merchantName && !merchantLogo) {
        return '';
    }

    const logoHtml = merchantLogo
        ? `<img src="${escapeHtml(merchantLogo)}" alt="${escapeHtml(merchantName || 'Merchant')}" class="merchant-logo" />`
        : '';

    const nameHtml = merchantName
        ? `<h2 class="merchant-name">${escapeHtml(merchantName)}</h2>`
        : '';

    return `
        <div class="invoice-header">
            ${logoHtml}
            ${nameHtml}
        </div>
    `;
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
