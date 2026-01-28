/**
 * Represents a line item in an invoice
 */
export interface LineItem {
    description: string;
    quantity: number;
    price: number; // Price per unit in fiat currency
}

/**
 * Invoice payload structure after decryption
 */
export interface InvoicePayload {
    amount: number; // Total amount in fiat currency
    currency: string; // Currency code (CAD, USD, etc.)
    lineItems?: LineItem[]; // Optional array of line items
    invoiceNumber?: string; // Optional invoice number
    invoiceDate?: string; // Optional invoice date (ISO 8601 format)
    dueDate?: string; // Optional due date (ISO 8601 format)
    memo?: string; // Optional memo/notes
    merchantName?: string; // Merchant name for branding
    merchantLogo?: string; // Optional merchant logo URL
}

/**
 * Validates that an object conforms to the InvoicePayload structure
 */
export function validateInvoicePayload(payload: unknown): payload is InvoicePayload {
    if (typeof payload !== 'object' || payload === null) {
        return false;
    }

    const p = payload as Partial<InvoicePayload>;

    // Required fields
    if (typeof p.amount !== 'number' || p.amount <= 0) {
        return false;
    }

    if (typeof p.currency !== 'string' || p.currency.length !== 3) {
        return false;
    }

    // Optional fields validation
    if (p.lineItems !== undefined) {
        if (!Array.isArray(p.lineItems)) {
            return false;
        }
        for (const item of p.lineItems) {
            if (
                typeof item.description !== 'string' ||
                typeof item.quantity !== 'number' ||
                typeof item.price !== 'number'
            ) {
                return false;
            }
        }
    }

    if (p.invoiceNumber !== undefined && typeof p.invoiceNumber !== 'string') {
        return false;
    }

    if (p.invoiceDate !== undefined && typeof p.invoiceDate !== 'string') {
        return false;
    }

    if (p.dueDate !== undefined && typeof p.dueDate !== 'string') {
        return false;
    }

    if (p.memo !== undefined && typeof p.memo !== 'string') {
        return false;
    }

    if (p.merchantName !== undefined && typeof p.merchantName !== 'string') {
        return false;
    }

    if (p.merchantLogo !== undefined && typeof p.merchantLogo !== 'string') {
        return false;
    }

    return true;
}
