/**
 * API client for merchant operations
 */

// Use relative URL to hit the same origin, or fallback to production API
const API_BASE_URL = 'https://api.btcpos.cash';

export interface MerchantPGPKeyResponse {
    merchantId: string;
    pgpPublicKey: string;
}

/**
 * Fetch a merchant's PGP public key from the backend
 * @param merchantId - The merchant's unique identifier
 * @returns The merchant's PGP public key in armored format
 * @throws Error if the request fails or key is not found
 */
export async function fetchMerchantPGPKey(merchantId: string): Promise<string> {
    const url = `${API_BASE_URL}/api/merchants/${merchantId}/pgp`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Merchant with ID ${merchantId} not found or has no PGP key configured`);
            }
            throw new Error(`Failed to fetch PGP key: ${response.statusText}`);
        }

        const data: MerchantPGPKeyResponse = await response.json();

        if (!data.pgpPublicKey) {
            throw new Error('PGP public key not found in response');
        }

        return data.pgpPublicKey;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch merchant PGP key: ${error.message}`);
        }
        throw new Error('Failed to fetch merchant PGP key: Unknown error');
    }
}
