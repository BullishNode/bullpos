import { InvoicePayload } from '../types/invoice';
import { renderInvoiceHeader } from './InvoiceHeader';
import { renderLineItemList } from './LineItemList';

/**
 * InvoiceDisplay component - Main invoice display showing all payment details
 */
export function renderInvoiceDisplay(invoice: InvoicePayload, satsAmount: number): string {
    const headerHtml = renderInvoiceHeader(invoice.merchantName, invoice.merchantLogo);
    const lineItemsHtml = invoice.lineItems ? renderLineItemList(invoice.lineItems, invoice.currency) : '';

    const metadataHtml = renderMetadata(invoice);
    const amountHtml = renderAmount(invoice.amount, invoice.currency, satsAmount);
    const memoHtml = invoice.memo ? renderMemo(invoice.memo) : '';

    return `
        <div class="invoice-display">
            ${headerHtml}
            ${metadataHtml}
            ${lineItemsHtml}
            ${amountHtml}
            ${memoHtml}
        </div>
    `;
}

/**
 * Renders invoice metadata (number, date, due date)
 */
function renderMetadata(invoice: InvoicePayload): string {
    const items: string[] = [];

    if (invoice.invoiceNumber) {
        items.push(`
            <div class="metadata-item">
                <span class="metadata-label">Invoice #:</span>
                <span class="metadata-value">${escapeHtml(invoice.invoiceNumber)}</span>
            </div>
        `);
    }

    if (invoice.invoiceDate) {
        const formattedDate = formatDate(invoice.invoiceDate);
        items.push(`
            <div class="metadata-item">
                <span class="metadata-label">Date:</span>
                <span class="metadata-value">${formattedDate}</span>
            </div>
        `);
    }

    if (invoice.dueDate) {
        const formattedDueDate = formatDate(invoice.dueDate);
        items.push(`
            <div class="metadata-item">
                <span class="metadata-label">Due Date:</span>
                <span class="metadata-value">${formattedDueDate}</span>
            </div>
        `);
    }

    if (items.length === 0) {
        return '';
    }

    return `
        <div class="invoice-metadata">
            ${items.join('')}
        </div>
    `;
}

/**
 * Renders the invoice amount prominently in both fiat and sats
 */
function renderAmount(fiatAmount: number, currency: string, satsAmount: number): string {
    const formattedFiat = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(fiatAmount);

    const formattedSats = satsAmount.toLocaleString('en-US');

    return `
        <div class="invoice-amount">
            <div class="amount-label">Amount Due</div>
            <div class="amount-fiat">${formattedFiat}</div>
            <div class="amount-sats">${formattedSats} sats</div>
        </div>
    `;
}

/**
 * Renders the invoice memo/notes section
 */
function renderMemo(memo: string): string {
    return `
        <div class="invoice-memo">
            <div class="memo-label">Notes</div>
            <div class="memo-text">${escapeHtml(memo)}</div>
        </div>
    `;
}

/**
 * Formats an ISO 8601 date string to a readable format
 */
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    } catch {
        return dateString; // Return original if parsing fails
    }
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
