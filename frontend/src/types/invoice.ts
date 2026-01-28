/**
 * Invoice payload structure for encrypted payment links
 * This is the decrypted payload after AES-256-GCM decryption
 */
export interface InvoicePayload {
  /** Amount in satoshis */
  satoshis: number;

  /** Fiat amount (optional) */
  fiatAmount?: number;

  /** Currency code (e.g., "USD", "EUR") */
  currency?: string;

  /** Payment description/memo (optional) */
  description?: string;

  /** Timestamp when invoice was created */
  timestamp: string;

  /** Liquid Bitcoin descriptor for receiving payment */
  descriptor?: string;

  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Response from GET /api/links/:id endpoint
 * Contains encrypted data that must be decrypted client-side
 */
export interface EncryptedLinkResponse {
  /** Unique link ID */
  id: string;

  /** Merchant ID (for PGP key lookup) */
  merchantId: string;

  /** Base64-encoded encrypted payload */
  encryptedPayload: string;

  /** Base64-encoded nonce for AES-GCM decryption */
  nonce: string;

  /** Link creation timestamp (Unix epoch ms) */
  createdAt: number;

  /** Link expiration timestamp (Unix epoch ms, optional) */
  expiresAt?: number;

  /** When link was claimed/used (Unix epoch ms, optional) */
  claimedAt?: number;
}
