/**
 * Payment status utilities for comparing requested vs received amounts
 */

export interface PaymentComparison {
    /** Requested amount in satoshis */
    requestedSats: number;

    /** Actual received amount in satoshis */
    receivedSats: number;

    /** Difference percentage (positive = overpay, negative = underpay) */
    differencePercent: number;

    /** Difference in absolute satoshis (positive = overpay, negative = underpay) */
    differenceSats: number;

    /** Payment status category */
    status: 'exact' | 'overpay' | 'underpay';
}

/**
 * Calculate payment comparison between requested and received amounts
 *
 * @param requestedSats - The amount requested in satoshis
 * @param receivedSats - The amount actually received in satoshis
 * @returns Payment comparison with status and differences
 */
export function comparePaymentAmounts(
    requestedSats: number,
    receivedSats: number
): PaymentComparison {
    const differenceSats = receivedSats - requestedSats;
    const differencePercent = requestedSats > 0
        ? (differenceSats / requestedSats) * 100
        : 0;

    // Determine status based on 0.1% threshold
    let status: 'exact' | 'overpay' | 'underpay';
    if (Math.abs(differencePercent) < 0.1) {
        status = 'exact';
    } else if (differencePercent > 0) {
        status = 'overpay';
    } else {
        status = 'underpay';
    }

    return {
        requestedSats,
        receivedSats,
        differencePercent,
        differenceSats,
        status,
    };
}

/**
 * Format payment difference for display
 *
 * @param comparison - Payment comparison result
 * @param currency - Currency code for fiat display
 * @param exchangeRate - BTC price in the currency
 * @returns Formatted message string
 */
export function formatPaymentDifference(
    comparison: PaymentComparison,
    currency: string,
    exchangeRate: number | null
): {
    title: string;
    message: string;
    fiatMessage?: string;
} {
    const { status, differenceSats, differencePercent } = comparison;

    if (status === 'exact') {
        return {
            title: 'Exact payment',
            message: 'Payment amount matches exactly',
        };
    }

    const absSats = Math.abs(differenceSats);
    const absPercent = Math.abs(differencePercent).toFixed(2);

    // Calculate fiat equivalent if exchange rate available
    let fiatMessage: string | undefined;
    if (exchangeRate && exchangeRate > 0) {
        const btcAmount = absSats / 100_000_000;
        const fiatAmount = (btcAmount * exchangeRate).toFixed(2);
        fiatMessage = `≈ ${currency} ${fiatAmount}`;
    }

    if (status === 'overpay') {
        return {
            title: 'Overpayment received',
            message: `Received ${absSats} sats more than requested (+${absPercent}%)`,
            fiatMessage,
        };
    } else {
        return {
            title: 'Underpayment received',
            message: `Received ${absSats} sats less than requested (-${absPercent}%)`,
            fiatMessage,
        };
    }
}
