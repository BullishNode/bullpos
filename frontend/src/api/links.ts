/**
 * API methods for payment links
 * Handles fetching encrypted payment links from backend
 */

import { apiGet } from './client.js';
import { EncryptedLinkResponse } from '../types/invoice.js';

/**
 * Fetch an encrypted payment link from the backend
 *
 * This is a PUBLIC endpoint - no authentication required.
 * The server returns encrypted data that can only be decrypted
 * client-side using the key from the URL fragment.
 *
 * @param linkId - The unique link ID from the URL
 * @returns Encrypted link data including merchantId for PGP key lookup
 * @throws ApiClientError if link not found (404), expired (410), or other error
 *
 * @example
 * ```typescript
 * try {
 *   const encryptedLink = await fetchEncryptedLink('abc123xyz');
 *   console.log('Merchant ID:', encryptedLink.merchantId);
 *   console.log('Encrypted payload:', encryptedLink.encryptedPayload);
 *   // Next step: decrypt using key from URL fragment
 * } catch (error) {
 *   if (error.statusCode === 404) {
 *     console.error('Link not found');
 *   } else if (error.statusCode === 410) {
 *     console.error('Link has expired');
 *   }
 * }
 * ```
 */
export async function fetchEncryptedLink(linkId: string): Promise<EncryptedLinkResponse> {
  return await apiGet<EncryptedLinkResponse>(`/api/links/${linkId}`);
}
