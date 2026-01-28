/**
 * Rate conversion utilities
 * Converts between fiat and satoshis using exchange rates
 */

const SATOSHIS_PER_BTC = 100_000_000;

/**
 * Converts fiat amount to satoshis
 * @param fiatAmount - Amount in fiat currency
 * @param btcRate - BTC price in fiat currency (e.g., 100000 for $100k per BTC)
 * @returns Amount in satoshis
 */
export function fiatToSats(fiatAmount: number, btcRate: number): number {
    if (btcRate <= 0) {
        throw new Error('BTC rate must be positive');
    }
    if (fiatAmount < 0) {
        throw new Error('Fiat amount cannot be negative');
    }

    const btcAmount = fiatAmount / btcRate;
    return Math.round(btcAmount * SATOSHIS_PER_BTC);
}

/**
 * Converts satoshis to fiat amount
 * @param satoshis - Amount in satoshis
 * @param btcRate - BTC price in fiat currency (e.g., 100000 for $100k per BTC)
 * @returns Amount in fiat currency
 */
export function satsToFiat(satoshis: number, btcRate: number): number {
    if (btcRate <= 0) {
        throw new Error('BTC rate must be positive');
    }
    if (satoshis < 0) {
        throw new Error('Satoshi amount cannot be negative');
    }

    const btcAmount = satoshis / SATOSHIS_PER_BTC;
    return btcAmount * btcRate;
}

/**
 * Formats satoshis for display
 * @param satoshis - Amount in satoshis
 * @returns Formatted string with thousand separators
 */
export function formatSats(satoshis: number): string {
    return satoshis.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * Formats fiat amount for display
 * @param fiatAmount - Amount in fiat currency
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with thousand separators and decimals
 */
export function formatFiat(fiatAmount: number, decimals: number = 2): string {
    return fiatAmount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Formats BTC rate for display
 * @param btcRate - BTC price in fiat currency
 * @returns Formatted string with thousand separators
 */
export function formatRate(btcRate: number): string {
    return btcRate.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}
