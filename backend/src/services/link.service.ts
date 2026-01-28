import { nanoid } from 'nanoid';
import { db } from '../db/index.js';

export interface EncryptedLink {
  id: string;
  merchantId: string;
  encryptedData: string;
  createdAt: number;
  expiresAt: number | null;
  claimedAt: number | null;
}

export interface CreateLinkParams {
  merchantId: string;
  encryptedPayload: string;
  nonce: string;
  expiresAt?: number;
}

export interface LinkMetadata {
  id: string;
  createdAt: number;
  expiresAt: number | null;
  claimedAt: number | null;
}

/**
 * Generate a short unique ID for a payment link
 */
function generateLinkId(): string {
  return nanoid(10); // 10 characters: ~2.7 million years for 1% collision at 1000 IDs/hour
}

/**
 * Create a new encrypted payment link
 */
export function createLink(params: CreateLinkParams): EncryptedLink {
  const id = generateLinkId();
  const now = Date.now();

  // Store encrypted payload as JSON with nonce
  const encryptedData = JSON.stringify({
    payload: params.encryptedPayload,
    nonce: params.nonce,
  });

  const stmt = db.prepare(`
    INSERT INTO encrypted_links (id, merchant_id, encrypted_data, created_at, expires_at, claimed_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);

  stmt.run(id, params.merchantId, encryptedData, now, params.expiresAt || null);

  return {
    id,
    merchantId: params.merchantId,
    encryptedData,
    createdAt: now,
    expiresAt: params.expiresAt || null,
    claimedAt: null,
  };
}

/**
 * Get encrypted link by ID (public endpoint - anyone can fetch)
 */
export function getLinkById(id: string): EncryptedLink | null {
  const stmt = db.prepare(`
    SELECT id, merchant_id as merchantId, encrypted_data as encryptedData,
           created_at as createdAt, expires_at as expiresAt, claimed_at as claimedAt
    FROM encrypted_links
    WHERE id = ?
  `);

  const row = stmt.get(id) as EncryptedLink | undefined;
  return row || null;
}

/**
 * List all links for a merchant (metadata only)
 */
export function listMerchantLinks(merchantId: string): LinkMetadata[] {
  const stmt = db.prepare(`
    SELECT id, created_at as createdAt, expires_at as expiresAt, claimed_at as claimedAt
    FROM encrypted_links
    WHERE merchant_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(merchantId) as LinkMetadata[];
}

/**
 * Delete a link (must be owned by merchant)
 */
export function deleteLink(id: string, merchantId: string): boolean {
  const stmt = db.prepare(`
    DELETE FROM encrypted_links
    WHERE id = ? AND merchant_id = ?
  `);

  const result = stmt.run(id, merchantId);
  return result.changes > 0;
}

/**
 * Mark a link as claimed (used when payment is received)
 */
export function markLinkClaimed(id: string): boolean {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE encrypted_links
    SET claimed_at = ?
    WHERE id = ? AND claimed_at IS NULL
  `);

  const result = stmt.run(now, id);
  return result.changes > 0;
}
