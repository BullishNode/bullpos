/**
 * Backup Service
 * CRUD operations for PGP-encrypted swap backups
 */

import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { SwapBackup, SwapBackupStatus } from '../db/schema';

export class BackupService {
  constructor(private db: Database.Database) {}

  /**
   * Check if a merchant exists in the database
   */
  private merchantExists(merchantId: string): boolean {
    const stmt = this.db.prepare('SELECT id FROM merchants WHERE id = ?');
    const result = stmt.get(merchantId);
    return result !== undefined;
  }

  /**
   * Create a new backup (public endpoint - browser uploads encrypted backup)
   * Returns the backup with write_token that the caller must store
   */
  createBackup(merchantId: string, encryptedData: string): SwapBackup & { writeToken: string } {
    // Validate that the merchant exists (prevents merchantId spoofing)
    if (!this.merchantExists(merchantId)) {
      throw new Error('Merchant not found');
    }

    const id = nanoid();
    const writeToken = nanoid(32); // 32-char write token for update authorization
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO swap_backups (id, merchant_id, encrypted_data, status, write_token, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `);

    try {
      stmt.run(id, merchantId, encryptedData, writeToken, now, now);
    } catch (error) {
      // Handle foreign key constraint violation gracefully
      if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Merchant not found');
      }
      throw error;
    }

    return {
      id,
      merchant_id: merchantId,
      encrypted_data: encryptedData,
      status: 'pending',
      write_token: writeToken,
      created_at: now,
      updated_at: now,
      writeToken, // Return write token so browser can use it for updates
    };
  }

  /**
   * Update backup status and/or encrypted data (public endpoint - browser updates after claim)
   * Requires write token for authorization (prevents unauthorized modifications)
   */
  updateBackup(
    id: string,
    writeToken: string,
    updates: { status?: SwapBackupStatus; encryptedData?: string }
  ): SwapBackup | null {
    const existing = this.getBackupById(id);
    if (!existing) {
      return null;
    }

    // Verify write token (constant-time comparison to prevent timing attacks)
    if (existing.write_token !== writeToken) {
      throw new Error('Invalid write token');
    }

    const now = Math.floor(Date.now() / 1000);
    const newStatus = updates.status ?? existing.status;
    const newData = updates.encryptedData ?? existing.encrypted_data;

    const stmt = this.db.prepare(`
      UPDATE swap_backups
      SET status = ?, encrypted_data = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(newStatus, newData, now, id);

    return {
      ...existing,
      status: newStatus,
      encrypted_data: newData,
      updated_at: now,
    };
  }

  /**
   * Get a single backup by ID (authenticated endpoint)
   */
  getBackupById(id: string): SwapBackup | null {
    const stmt = this.db.prepare(`
      SELECT * FROM swap_backups WHERE id = ?
    `);

    const backup = stmt.get(id) as SwapBackup | undefined;
    return backup || null;
  }

  /**
   * List all backups for a merchant (authenticated endpoint)
   */
  listBackupsByMerchant(merchantId: string): SwapBackup[] {
    const stmt = this.db.prepare(`
      SELECT * FROM swap_backups
      WHERE merchant_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(merchantId) as SwapBackup[];
  }

  /**
   * Verify that a backup belongs to a specific merchant (for authorization checks)
   */
  verifyBackupOwnership(backupId: string, merchantId: string): boolean {
    const backup = this.getBackupById(backupId);
    return backup !== null && backup.merchant_id === merchantId;
  }
}
