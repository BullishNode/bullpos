/**
 * AES-256-GCM encryption/decryption using WebCrypto API
 *
 * NOTE: Full implementation will be added in issue #13
 */

import { InvoicePayload } from '../types/invoice.js';

/**
 * Decrypt an AES-256-GCM encrypted payload
 *
 * @param encryptedPayload - Base64-encoded ciphertext
 * @param nonce - Base64-encoded nonce (IV)
 * @param keyBase64Url - Base64url-encoded AES key (from URL fragment)
 * @returns Decrypted and parsed InvoicePayload
 * @throws Error if decryption fails or payload is invalid
 */
export async function decryptPayload(
  _encryptedPayload: string,
  _nonce: string,
  _keyBase64Url: string
): Promise<InvoicePayload> {
  // TODO: Implement in issue #13
  // This is a placeholder for compilation
  throw new Error('decryptPayload not yet implemented (issue #13)');
}
