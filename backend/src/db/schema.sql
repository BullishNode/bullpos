-- Merchants table: stores merchant accounts with BIP85-derived credentials
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,  -- wallet fingerprint
  password_hash TEXT NOT NULL,     -- bcrypt hash of BIP85-derived password
  store_name TEXT NOT NULL,
  pgp_public_key TEXT NOT NULL,   -- for encrypting swap backups
  created_at INTEGER NOT NULL,    -- Unix timestamp
  updated_at INTEGER NOT NULL     -- Unix timestamp
);

CREATE INDEX IF NOT EXISTS idx_merchants_username ON merchants(username);

-- Encrypted payment links table
CREATE TABLE IF NOT EXISTS encrypted_links (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,   -- AES-256-GCM encrypted JSON (server cannot decrypt)
  created_at INTEGER NOT NULL,
  expires_at INTEGER,              -- Unix timestamp, NULL = no expiration
  claimed_at INTEGER,              -- Unix timestamp when payment was made
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_encrypted_links_merchant ON encrypted_links(merchant_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_links_expires ON encrypted_links(expires_at);

-- Swap backups table: PGP-encrypted swap recovery data
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  encrypted_backup TEXT NOT NULL, -- PGP-encrypted swap data
  status TEXT NOT NULL,           -- pending, completed, failed, recovered
  created_at INTEGER NOT NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (link_id) REFERENCES encrypted_links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backups_merchant ON backups(merchant_id);
CREATE INDEX IF NOT EXISTS idx_backups_link ON backups(link_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
