import { db } from '../db/schema';
import { UpdateProfileInput } from '../validators/merchant.validators';

export interface MerchantProfile {
  id: string;
  email: string;
  storeName: string | null;
  websiteUrl: string | null;
  description: string | null;
  language: string;
  currency: string;
  pgpPublicKey: string;
  createdAt: number;
  updatedAt: number;
}

interface MerchantRow {
  id: string;
  email: string;
  store_name: string | null;
  website_url: string | null;
  description: string | null;
  language: string;
  currency: string;
  pgp_public_key: string;
  created_at: number;
  updated_at: number;
}

function mapRowToProfile(row: MerchantRow): MerchantProfile {
  return {
    id: row.id,
    email: row.email,
    storeName: row.store_name,
    websiteUrl: row.website_url,
    description: row.description,
    language: row.language,
    currency: row.currency,
    pgpPublicKey: row.pgp_public_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getProfile(merchantId: string): MerchantProfile | null {
  const stmt = db.prepare(`
    SELECT id, email, store_name, website_url, description, language, currency,
           pgp_public_key, created_at, updated_at
    FROM merchants
    WHERE id = ?
  `);

  const row = stmt.get(merchantId) as MerchantRow | undefined;
  return row ? mapRowToProfile(row) : null;
}

export function updateProfile(merchantId: string, updates: UpdateProfileInput): MerchantProfile | null {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.storeName !== undefined) {
    fields.push('store_name = ?');
    values.push(updates.storeName);
  }
  if (updates.websiteUrl !== undefined) {
    fields.push('website_url = ?');
    values.push(updates.websiteUrl);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.language !== undefined) {
    fields.push('language = ?');
    values.push(updates.language);
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?');
    values.push(updates.currency);
  }

  if (fields.length === 0) {
    return getProfile(merchantId);
  }

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(merchantId);

  const stmt = db.prepare(`
    UPDATE merchants
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
  return getProfile(merchantId);
}

export function getPgpPublicKey(merchantId: string): string | null {
  const stmt = db.prepare('SELECT pgp_public_key FROM merchants WHERE id = ?');
  const row = stmt.get(merchantId) as { pgp_public_key: string } | undefined;
  return row ? row.pgp_public_key : null;
}
