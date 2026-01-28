/**
 * Payment Link Page
 * Handles fetching and decrypting payment links when user visits a link URL
 *
 * URL format: /#/pay/:linkId:key
 * - linkId: unique payment link ID (from backend)
 * - key: base64url-encoded AES-256 decryption key (never sent to server)
 *
 * Example: /#/pay/abc123xyz:dGVzdGtleTE.....
 */

import { fetchEncryptedLink } from '../api/links.js';
import { decryptPayload } from '../crypto/aes.js';
import { ApiClientError } from '../api/client.js';
import type { InvoicePayload } from '../types/invoice.js';

/**
 * Parse payment link URL fragment
 * @param fragment - Hash fragment (e.g., "/pay/abc123:keydata")
 * @returns {linkId, key} or null if invalid
 */
export function parsePaymentLinkFragment(fragment: string): { linkId: string; key: string } | null {
  // Expected format: /pay/:linkId:key
  const match = fragment.match(/^\/pay\/([^:]+):(.+)$/);
  if (!match) {
    return null;
  }

  const [, linkId, key] = match;
  if (!linkId || !key) {
    return null;
  }

  return { linkId, key };
}

/**
 * Fetch and decrypt a payment link
 *
 * This function:
 * 1. Fetches encrypted data from backend (GET /api/links/:id)
 * 2. Extracts encryptedPayload, nonce, merchantId from response
 * 3. Decrypts payload using AES key from URL fragment
 * 4. Validates decrypted InvoicePayload schema
 * 5. Stores merchantId for PGP key lookup (future use)
 *
 * @param linkId - Payment link ID from URL
 * @param keyBase64Url - AES decryption key from URL fragment
 * @returns Decrypted invoice payload and merchant ID
 * @throws ApiClientError if link not found or network error
 * @throws Error if decryption fails or payload invalid
 */
export async function fetchAndDecryptLink(
  linkId: string,
  keyBase64Url: string
): Promise<{ payload: InvoicePayload; merchantId: string }> {
  // Step 1: Fetch encrypted link from backend
  const encryptedLink = await fetchEncryptedLink(linkId);

  // Step 2: Decrypt the payload using key from URL
  const payload = await decryptPayload(
    encryptedLink.encryptedPayload,
    encryptedLink.nonce,
    keyBase64Url
  );

  // Step 3: Store merchantId for future PGP key lookup
  // (will be used in future for backup encryption)
  return {
    payload,
    merchantId: encryptedLink.merchantId,
  };
}

/**
 * Initialize the payment link page
 * Called when user visits a payment link URL
 *
 * @param linkId - Payment link ID
 * @param key - Decryption key from URL fragment
 */
export async function initPaymentLinkPage(linkId: string, key: string): Promise<void> {
  console.log('Loading payment link:', linkId);

  try {
    // Fetch and decrypt the link
    const { payload, merchantId } = await fetchAndDecryptLink(linkId, key);

    console.log('Payment link decrypted successfully');
    console.log('Merchant ID:', merchantId);
    console.log('Invoice payload:', payload);

    // TODO: Display payment information to user
    // This will be implemented in future issues to show:
    // - Amount (satoshis and fiat)
    // - Description
    // - Payment options (lightning, on-chain, etc.)

    // For now, just log success
    alert(`Payment link loaded!\nAmount: ${payload.satoshis} sats\nDescription: ${payload.description || 'None'}`);
  } catch (error) {
    console.error('Failed to load payment link:', error);

    if (error instanceof ApiClientError) {
      if (error.statusCode === 404) {
        showError('Link not found', 'This payment link does not exist or has been deleted.');
      } else if (error.statusCode === 410) {
        showError('Link expired', 'This payment link has expired and is no longer valid.');
      } else if (error.statusCode === 0) {
        showError('Network error', 'Could not connect to server. Please check your internet connection.');
      } else {
        showError('Server error', `Failed to load link: ${error.message}`);
      }
    } else {
      // Decryption error or other error
      showError('Decryption failed', 'Could not decrypt payment link. The link may be corrupted or invalid.');
    }
  }
}

/**
 * Show error message to user
 * @param title - Error title
 * @param message - Error details
 */
function showError(title: string, message: string): void {
  // TODO: Use proper error page template (will be added in future issue)
  // For now, use alert
  alert(`${title}\n\n${message}`);
  console.error(`[${title}]`, message);
}
