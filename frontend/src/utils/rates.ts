/**
 * Rate conversion utilities for BTC/fiat exchange
 */

const SATOSHIS_PER_BTC = 100_000_000;

/**
 * Convert fiat amount to satoshis based on current exchange rate
 * @param fiatAmount - Amount in fiat currency
 * @param exchangeRate - Exchange rate (1 BTC = X fiat)
 * @returns Amount in satoshis, or 0 if rate is invalid
 */
export function fiatToSatoshis(fiatAmount: number, exchangeRate: number): number {
    if (!exchangeRate || exchangeRate <= 0) {
        return 0;
    }
    if (fiatAmount <= 0) {
        return 0;
    }

    const btcAmount = fiatAmount / exchangeRate;
    return Math.round(btcAmount * SATOSHIS_PER_BTC);
}

/**
 * Convert satoshis to fiat amount based on current exchange rate
 * @param satoshis - Amount in satoshis
 * @param exchangeRate - Exchange rate (1 BTC = X fiat)
 * @returns Amount in fiat currency, or 0 if rate is invalid
 */
export function satoshisToFiat(satoshis: number, exchangeRate: number): number {
    if (!exchangeRate || exchangeRate <= 0) {
        return 0;
    }
    if (satoshis <= 0) {
        return 0;
    }

    const btcAmount = satoshis / SATOSHIS_PER_BTC;
    return btcAmount * exchangeRate;
}

/**
 * Convert satoshi amount to privacy-preserving bucket label
 * Used for analytics without revealing exact payment amounts
 * @param satoshis - Amount in satoshis
 * @returns Bucket label string
 */
export function satoshiBucket(satoshis: number): string {
    if (satoshis < 1_000) return '0-1k';           // ~$0-$1 (micro)
    if (satoshis < 10_000) return '1k-10k';        // ~$1-$10 (small)
    if (satoshis < 100_000) return '10k-100k';     // ~$10-$100 (medium)
    if (satoshis < 1_000_000) return '100k-1M';    // ~$100-$1k (large)
    return '1M+';                                   // ~$1k+ (very large)
}

/**
 * Validate invoice payload structure
 * @param payload - Invoice data to validate
 * @returns true if valid, false otherwise
 */
export interface InvoicePayload {
    fiatAmount: number;
    currency: string;
    satoshis: number;
    description: string | null;
    timestamp: string;
}

export function validateInvoicePayload(payload: unknown): payload is InvoicePayload {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const p = payload as Record<string, unknown>;

    // Validate fiatAmount
    if (typeof p.fiatAmount !== 'number' || p.fiatAmount < 0) {
        return false;
    }

    // Validate currency (must be 3-letter code)
    if (typeof p.currency !== 'string' || p.currency.length !== 3) {
        return false;
    }

    // Validate satoshis
    if (typeof p.satoshis !== 'number' || p.satoshis <= 0 || !Number.isInteger(p.satoshis)) {
        return false;
    }

    // Validate description (optional string or null)
    if (p.description !== null && typeof p.description !== 'string') {
        return false;
    }

    // Validate timestamp (must be valid ISO 8601 string)
    if (typeof p.timestamp !== 'string') {
        return false;
    }
    const date = new Date(p.timestamp);
    if (isNaN(date.getTime())) {
        return false;
    }

    return true;
}
