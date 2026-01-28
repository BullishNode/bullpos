// rate-refresh.ts - Automatic rate refresh for expired rate locks

import * as lwk from "lwk_wasm";
import { getPricesFetcher, setExchangeRate, getBoltzSession } from '../../state';

/**
 * RefreshResult contains the updated invoice and amounts
 */
export interface RefreshResult {
    invoice: lwk.InvoiceResponse;
    satoshis: number;
    fiatAmount: number;
    exchangeRate: number;
}

/**
 * Refresh the exchange rate, recalculate satoshi amount,
 * and create a new Boltz swap invoice.
 *
 * @param fiatAmount - Original fiat amount (fixed)
 * @param currencyAlpha3 - Currency code
 * @param description - Invoice description
 * @param claimAddress - Claim address for the swap
 * @returns Promise with new invoice and updated amounts
 */
export async function refreshRateAndSwap(
    fiatAmount: number,
    currencyAlpha3: string,
    description: string,
    claimAddress: lwk.Address
): Promise<RefreshResult> {
    const pricesFetcher = getPricesFetcher();
    if (!pricesFetcher) {
        throw new Error('PricesFetcher not initialized');
    }

    const boltzSession = getBoltzSession();
    if (!boltzSession) {
        throw new Error('BoltzSession not initialized');
    }

    // Fetch new exchange rate
    console.log(`Fetching new exchange rate for ${currencyAlpha3}...`);
    const currencyCode = new lwk.CurrencyCode(currencyAlpha3);
    const rates = await pricesFetcher.rates(currencyCode);
    const newRate = rates.median();
    console.log(`New exchange rate: ${newRate}`);

    // Update global state
    setExchangeRate(newRate);

    // Recalculate satoshi amount with new rate
    const SATOSHIS_PER_BTC = 100_000_000;
    const btcAmount = fiatAmount / newRate;
    const satoshis = Math.round(btcAmount * SATOSHIS_PER_BTC);

    console.log(`Recalculated amount: ${satoshis} sats for ${currencyAlpha3} ${fiatAmount}`);

    // Create new Boltz swap with updated amount
    console.log('Creating new Boltz swap...');
    const invoice = await boltzSession.invoice(BigInt(satoshis), description, claimAddress);
    console.log(`New invoice created: ${invoice.bolt11Invoice().toString()}`);

    return {
        invoice,
        satoshis,
        fiatAmount,
        exchangeRate: newRate
    };
}

/**
 * Cancel an old Boltz swap to free up resources.
 * Note: This is a placeholder - actual swap cancellation depends on Boltz API support.
 *
 * @param oldInvoice - The invoice/swap to cancel
 */
export async function cancelOldSwap(oldInvoice: lwk.InvoiceResponse): Promise<void> {
    try {
        const swapId = oldInvoice.swapId();
        console.log(`Cancelling old swap: ${swapId}`);
        // TODO: Implement actual swap cancellation when Boltz API supports it
        // For now, we just log - the old swap will naturally expire
    } catch (error) {
        console.error('Failed to cancel old swap:', error);
        // Non-fatal - old swap will expire naturally
    }
}
