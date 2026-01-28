import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/bullpos.db');

export type DatabaseInstance = ReturnType<typeof Database>;

let _db: DatabaseInstance | null = null;

/**
 * Get or create the database connection (singleton pattern)
 */
export function getDb(): DatabaseInstance {
  if (!_db) {
    // Ensure data directory exists
    const dataDir = dirname(DB_PATH);
    mkdirSync(dataDir, { recursive: true });

    _db = new Database(DB_PATH);

    // Enable foreign keys
    _db.pragma('foreign_keys = ON');

    // Initialize schema
    initializeDatabase(_db);
  }

  return _db;
}

/**
 * Initialize database schema
 */
function initializeDatabase(db: DatabaseInstance): void {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Export the database instance for convenience
export const db: DatabaseInstance = getDb();
