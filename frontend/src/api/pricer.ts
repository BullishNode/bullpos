/**
 * Bull Bitcoin Pricer API Client
 * Fetches exchange rates from the Bull Bitcoin Pricer API
 */

const PRICER_API_BASE = 'https://api.bullbitcoin.com/pricer/api/v1';

export interface PricerRates {
    bid: number;
    ask: number;
    mid: number;
}

export interface PricerResponse {
    currency: string;
    bid: number;
    ask: number;
    mid: number;
    timestamp: number;
}

/**
 * Cache for exchange rates
 */
interface RateCache {
    rates: PricerRates;
    timestamp: number;
}

const rateCache = new Map<string, RateCache>();
const CACHE_DURATION_MS = 30000; // 30 seconds

/**
 * Fetches exchange rates for a specific currency from the Pricer API
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR", "CHF")
 * @returns Promise resolving to bid, ask, and mid rates
 * @throws Error if the API request fails or returns invalid data
 */
export async function fetchRates(currency: string): Promise<PricerRates> {
    // Check cache first
    const cached = rateCache.get(currency);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.rates;
    }

    try {
        const url = `${PRICER_API_BASE}/rates/${currency}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Pricer API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as PricerResponse;

        // Validate response data
        if (typeof data.bid !== 'number' || typeof data.ask !== 'number' || typeof data.mid !== 'number') {
            throw new Error('Invalid response from Pricer API: missing or invalid rate fields');
        }

        if (data.bid <= 0 || data.ask <= 0 || data.mid <= 0) {
            throw new Error('Invalid response from Pricer API: rates must be positive');
        }

        const rates: PricerRates = {
            bid: data.bid,
            ask: data.ask,
            mid: data.mid
        };

        // Update cache
        rateCache.set(currency, {
            rates,
            timestamp: Date.now()
        });

        return rates;
    } catch (error) {
        // If we have stale cached data, return it as fallback
        if (cached) {
            console.warn('Pricer API request failed, using stale cache:', error);
            return cached.rates;
        }
        throw error;
    }
}

/**
 * Clears the rate cache for a specific currency or all currencies
 * @param currency - Optional currency code to clear. If omitted, clears all cache.
 */
export function clearCache(currency?: string): void {
    if (currency) {
        rateCache.delete(currency);
    } else {
        rateCache.clear();
    }
}
