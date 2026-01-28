/**
 * Test utilities and helpers
 */

import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcryptjs';

/**
 * Create a test database in memory
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');

  // Initialize schema (this should match your actual schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pgp_public_key TEXT,
      store_name TEXT,
      website_url TEXT,
      description TEXT,
      language TEXT DEFAULT 'en',
      currency TEXT DEFAULT 'BTC',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS encrypted_links (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      encrypted_link_id TEXT,
      encrypted_backup TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (encrypted_link_id) REFERENCES encrypted_links(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_encrypted_links_merchant ON encrypted_links(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_backups_merchant ON backups(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_backups_link ON backups(encrypted_link_id);
  `);

  return db;
}

/**
 * Clean up test database
 */
export function cleanupTestDb(db: Database.Database): void {
  db.close();
}

/**
 * Create a test merchant
 */
export async function createTestMerchant(
  db: Database.Database,
  overrides?: Partial<{
    email: string;
    password: string;
    pgpPublicKey: string;
    storeName: string;
  }>
): Promise<{ id: string; email: string; password: string }> {
  const id = nanoid();
  const email = overrides?.email || `test-${nanoid()}@example.com`;
  const password = overrides?.password || 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const stmt = db.prepare(`
    INSERT INTO merchants (id, email, password_hash, pgp_public_key, store_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    email,
    passwordHash,
    overrides?.pgpPublicKey || null,
    overrides?.storeName || 'Test Store'
  );

  return { id, email, password };
}

/**
 * Create a test encrypted link
 */
export function createTestLink(
  db: Database.Database,
  merchantId: string,
  ciphertext?: string
): string {
  const id = nanoid();
  const stmt = db.prepare(`
    INSERT INTO encrypted_links (id, merchant_id, ciphertext)
    VALUES (?, ?, ?)
  `);

  stmt.run(id, merchantId, ciphertext || 'test-encrypted-payload');

  return id;
}

/**
 * Create a test backup
 */
export function createTestBackup(
  db: Database.Database,
  merchantId: string,
  linkId?: string,
  encryptedBackup?: string
): string {
  const id = nanoid();
  const stmt = db.prepare(`
    INSERT INTO backups (id, merchant_id, encrypted_link_id, encrypted_backup, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    merchantId,
    linkId || null,
    encryptedBackup || 'test-encrypted-backup',
    'pending'
  );

  return id;
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(merchantId: string): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { merchantId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );
}
