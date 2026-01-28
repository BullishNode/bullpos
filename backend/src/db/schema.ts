import Database from 'better-sqlite3';
import path from 'path';

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bullpos.db');
export const db: Database.Database = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create merchants table
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      store_name TEXT,
      website_url TEXT,
      description TEXT,
      language TEXT DEFAULT 'en',
      currency TEXT DEFAULT 'BTC',
      pgp_public_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);

    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS swap_backups (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      CHECK (status IN ('pending', 'claimed', 'failed', 'refunded'))
    );

    CREATE INDEX IF NOT EXISTS idx_payment_links_merchant ON payment_links(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_swap_backups_merchant ON swap_backups(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_swap_backups_status ON swap_backups(status);
  `);
}

export type SwapBackupStatus = 'pending' | 'claimed' | 'failed' | 'refunded';

export interface SwapBackup {
  id: string;
  merchant_id: string;
  encrypted_data: string;
  status: SwapBackupStatus;
  created_at: number;
  updated_at: number;
}

export interface Merchant {
  id: string;
  email: string;
  password_hash: string;
  pgp_public_key: string;
  store_name: string | null;
  website_url: string | null;
  description: string | null;
  language: string;
  currency: string;
  created_at: number;
  updated_at: number;
}

export interface PaymentLink {
  id: string;
  merchant_id: string;
  encrypted_data: string;
  created_at: number;
}
