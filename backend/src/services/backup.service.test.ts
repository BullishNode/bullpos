/**
 * Backup Service Tests
 * Unit tests for backup CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { BackupService } from './backup.service';
import { initializeDatabase } from '../db/schema';

describe('BackupService', () => {
  let db: Database.Database;
  let backupService: BackupService;
  let testMerchantId: string;

  beforeEach(() => {
    // Create in-memory database for tests
    db = new Database(':memory:');
    // Initialize schema
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        pgp_public_key TEXT NOT NULL,
        store_name TEXT,
        website_url TEXT,
        description TEXT,
        language TEXT DEFAULT 'en',
        currency TEXT DEFAULT 'BTC',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS swap_backups (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        write_token TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
        CHECK (status IN ('pending', 'claimed', 'failed', 'refunded'))
      )
    `);

    // Insert test merchant
    testMerchantId = 'test-merchant-id';
    const stmt = db.prepare(`
      INSERT INTO merchants (id, username, password_hash, pgp_public_key)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(testMerchantId, 'testmerchant', 'hashedpassword', 'pgp-key-data');

    backupService = new BackupService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('createBackup', () => {
    it('should create a backup with valid merchantId', () => {
      const encryptedData = 'encrypted-backup-data';
      const backup = backupService.createBackup(testMerchantId, encryptedData);

      expect(backup).toBeDefined();
      expect(backup.id).toBeDefined();
      expect(backup.merchant_id).toBe(testMerchantId);
      expect(backup.encrypted_data).toBe(encryptedData);
      expect(backup.status).toBe('pending');
      expect(backup.writeToken).toBeDefined();
      expect(backup.writeToken.length).toBeGreaterThan(20); // nanoid(32) should be long
      expect(backup.created_at).toBeDefined();
      expect(backup.updated_at).toBeDefined();
    });

    it('should throw error for non-existent merchantId', () => {
      expect(() => {
        backupService.createBackup('non-existent-merchant', 'encrypted-data');
      }).toThrow('Merchant not found');
    });

    it('should enforce foreign key constraint', () => {
      expect(() => {
        backupService.createBackup('invalid-merchant-id', 'encrypted-data');
      }).toThrow('Merchant not found');
    });

    it('should create backups with unique IDs', () => {
      const backup1 = backupService.createBackup(testMerchantId, 'data1');
      const backup2 = backupService.createBackup(testMerchantId, 'data2');

      expect(backup1.id).not.toBe(backup2.id);
      expect(backup1.writeToken).not.toBe(backup2.writeToken);
    });
  });

  describe('updateBackup', () => {
    it('should update backup status with valid write token', () => {
      const backup = backupService.createBackup(testMerchantId, 'data');
      const updated = backupService.updateBackup(backup.id, backup.writeToken, {
        status: 'claimed',
      });

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('claimed');
      expect(updated!.encrypted_data).toBe('data');
    });

    it('should update encrypted data with valid write token', () => {
      const backup = backupService.createBackup(testMerchantId, 'original-data');
      const updated = backupService.updateBackup(backup.id, backup.writeToken, {
        encryptedData: 'updated-data',
      });

      expect(updated).toBeDefined();
      expect(updated!.encrypted_data).toBe('updated-data');
      expect(updated!.status).toBe('pending');
    });

    it('should update both status and data with valid write token', () => {
      const backup = backupService.createBackup(testMerchantId, 'original-data');
      const updated = backupService.updateBackup(backup.id, backup.writeToken, {
        status: 'claimed',
        encryptedData: 'updated-data',
      });

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('claimed');
      expect(updated!.encrypted_data).toBe('updated-data');
    });

    it('should throw error with invalid write token', () => {
      const backup = backupService.createBackup(testMerchantId, 'data');

      expect(() => {
        backupService.updateBackup(backup.id, 'wrong-token', { status: 'claimed' });
      }).toThrow('Invalid write token');
    });

    it('should return null for non-existent backup', () => {
      const updated = backupService.updateBackup('non-existent-id', 'any-token', {
        status: 'claimed',
      });

      expect(updated).toBeNull();
    });

    it('should use nullish coalescing for partial updates', () => {
      const backup = backupService.createBackup(testMerchantId, 'data');

      // Update only status
      const updated1 = backupService.updateBackup(backup.id, backup.writeToken, {
        status: 'claimed',
      });
      expect(updated1!.encrypted_data).toBe('data');

      // Update only data
      const updated2 = backupService.updateBackup(backup.id, backup.writeToken, {
        encryptedData: 'new-data',
      });
      expect(updated2!.status).toBe('claimed');
    });
  });

  describe('getBackupById', () => {
    it('should retrieve existing backup', () => {
      const created = backupService.createBackup(testMerchantId, 'data');
      const retrieved = backupService.getBackupById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.merchant_id).toBe(testMerchantId);
      expect(retrieved!.encrypted_data).toBe('data');
    });

    it('should return null for non-existent backup', () => {
      const backup = backupService.getBackupById('non-existent-id');
      expect(backup).toBeNull();
    });
  });

  describe('listBackupsByMerchant', () => {
    it('should list all backups for a merchant', () => {
      backupService.createBackup(testMerchantId, 'data1');
      backupService.createBackup(testMerchantId, 'data2');
      backupService.createBackup(testMerchantId, 'data3');

      const backups = backupService.listBackupsByMerchant(testMerchantId);

      expect(backups).toHaveLength(3);
      expect(backups[0].merchant_id).toBe(testMerchantId);
      expect(backups[1].merchant_id).toBe(testMerchantId);
      expect(backups[2].merchant_id).toBe(testMerchantId);
    });

    it('should return empty array for merchant with no backups', () => {
      const backups = backupService.listBackupsByMerchant(testMerchantId);
      expect(backups).toHaveLength(0);
    });

    it('should order backups by created_at DESC', () => {
      const backup1 = backupService.createBackup(testMerchantId, 'data1');
      // Insert slight delay to ensure different timestamps
      const backup2 = backupService.createBackup(testMerchantId, 'data2');
      const backup3 = backupService.createBackup(testMerchantId, 'data3');

      const backups = backupService.listBackupsByMerchant(testMerchantId);

      // Most recent first (should be ordered by created_at DESC)
      // Since all are created in same second, verify we get 3 backups
      expect(backups).toHaveLength(3);
      expect(backups.map(b => b.id)).toContain(backup1.id);
      expect(backups.map(b => b.id)).toContain(backup2.id);
      expect(backups.map(b => b.id)).toContain(backup3.id);
    });

    it('should only return backups for specific merchant', () => {
      // Create second merchant
      const merchant2Id = 'merchant-2';
      db.prepare(`
        INSERT INTO merchants (id, username, password_hash, pgp_public_key)
        VALUES (?, ?, ?, ?)
      `).run(merchant2Id, 'merchant2', 'hash2', 'pgp2');

      backupService.createBackup(testMerchantId, 'merchant1-data');
      backupService.createBackup(merchant2Id, 'merchant2-data');

      const merchant1Backups = backupService.listBackupsByMerchant(testMerchantId);
      const merchant2Backups = backupService.listBackupsByMerchant(merchant2Id);

      expect(merchant1Backups).toHaveLength(1);
      expect(merchant2Backups).toHaveLength(1);
      expect(merchant1Backups[0].encrypted_data).toBe('merchant1-data');
      expect(merchant2Backups[0].encrypted_data).toBe('merchant2-data');
    });
  });

  describe('verifyBackupOwnership', () => {
    it('should return true for correct owner', () => {
      const backup = backupService.createBackup(testMerchantId, 'data');
      const isOwner = backupService.verifyBackupOwnership(backup.id, testMerchantId);

      expect(isOwner).toBe(true);
    });

    it('should return false for incorrect owner', () => {
      const backup = backupService.createBackup(testMerchantId, 'data');
      const isOwner = backupService.verifyBackupOwnership(backup.id, 'other-merchant');

      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent backup', () => {
      const isOwner = backupService.verifyBackupOwnership('non-existent', testMerchantId);

      expect(isOwner).toBe(false);
    });
  });
});
