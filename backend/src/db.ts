/**
 * Database initialization and schema
 * SQLite database for merchant accounts and encrypted payment links
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_DIR || './data';
const DB_PATH = path.join(DB_DIR, 'bullpos.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db: Database.Database = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  // Merchants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pgp_public_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Payment links table
  // Stores encrypted payment link data (server cannot decrypt)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    )
  `);

  // Swap backups table
  // Stores PGP-encrypted Boltz swap backups (server cannot decrypt)
  db.exec(`
    CREATE TABLE IF NOT EXISTS swap_backups (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      payment_link_id TEXT NOT NULL,
      encrypted_backup TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_link_id) REFERENCES payment_links(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_links_merchant
    ON payment_links(merchant_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_swap_backups_merchant
    ON swap_backups(merchant_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_swap_backups_link
    ON swap_backups(payment_link_id);
  `);

  console.log('Database initialized at', DB_PATH);
}

export default db;
