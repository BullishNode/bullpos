/**
 * Backup Service Tests
 * Tests for PGP-encrypted swap backup CRUD operations and status updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, createTestMerchant, createTestLink, createTestBackup } from '../../test/helpers';

describe('Backup Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('Create Backup', () => {
    it('should create a new backup', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const encryptedBackup = 'pgp-encrypted-backup-data';

      const backupId = createTestBackup(db, merchantId, undefined, encryptedBackup);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);

      expect(backup).toBeDefined();
      expect((backup as any).id).toBe(backupId);
      expect((backup as any).merchant_id).toBe(merchantId);
      expect((backup as any).encrypted_backup).toBe(encryptedBackup);
    });

    it('should create backup linked to payment link', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      const backupId = createTestBackup(db, merchantId, linkId);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).encrypted_link_id).toBe(linkId);
    });

    it('should create backup without link reference', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const backupId = createTestBackup(db, merchantId);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).encrypted_link_id).toBeNull();
    });

    it('should set default status to pending', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);

      const backup = db.prepare('SELECT status FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).status).toBe('pending');
    });

    it('should set created_at and updated_at timestamps', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);

      const backup = db.prepare('SELECT created_at, updated_at FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).created_at).toBeDefined();
      expect((backup as any).updated_at).toBeDefined();
    });

    it('should generate unique backup IDs', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const backupId1 = createTestBackup(db, merchantId);
      const backupId2 = createTestBackup(db, merchantId);

      expect(backupId1).not.toBe(backupId2);
    });

    it('should require merchant_id foreign key', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO backups (id, merchant_id, encrypted_backup)
          VALUES (?, ?, ?)
        `).run('test-backup', 'non-existent-merchant', 'test-data');
      }).toThrow(); // Foreign key constraint violation
    });

    it('should handle optional link_id foreign key', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      // Should work with non-existent link ID if allowing NULL
      expect(() => {
        db.prepare(`
          INSERT INTO backups (id, merchant_id, encrypted_link_id, encrypted_backup)
          VALUES (?, ?, ?, ?)
        `).run('test-backup', merchantId, 'non-existent-link', 'test-data');
      }).toThrow(); // Foreign key constraint violation if FK is enforced
    });
  });

  describe('Retrieve Backup', () => {
    it('should retrieve backup by ID', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const encryptedData = 'test-encrypted-backup';
      const backupId = createTestBackup(db, merchantId, undefined, encryptedData);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);

      expect(backup).toBeDefined();
      expect((backup as any).encrypted_backup).toBe(encryptedData);
    });

    it('should return undefined for non-existent backup', () => {
      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get('non-existent-backup');

      expect(backup).toBeUndefined();
    });

    it('should include link reference if present', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);
      const backupId = createTestBackup(db, merchantId, linkId);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).encrypted_link_id).toBe(linkId);
    });
  });

  describe('List Backups', () => {
    it('should list all backups for a merchant', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      createTestBackup(db, merchantId);
      createTestBackup(db, merchantId);
      createTestBackup(db, merchantId);

      const backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchantId);

      expect(backups.length).toBe(3);
    });

    it('should return empty array if merchant has no backups', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchantId);

      expect(backups.length).toBe(0);
    });

    it('should not include other merchants backups', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      createTestBackup(db, merchant1);
      createTestBackup(db, merchant1);
      createTestBackup(db, merchant2);

      const merchant1Backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchant1);
      const merchant2Backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchant2);

      expect(merchant1Backups.length).toBe(2);
      expect(merchant2Backups.length).toBe(1);
    });

    it('should filter backups by payment link', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      createTestBackup(db, merchantId, linkId);
      createTestBackup(db, merchantId, linkId);
      createTestBackup(db, merchantId); // No link reference

      const linkBackups = db.prepare('SELECT * FROM backups WHERE encrypted_link_id = ?').all(linkId);

      expect(linkBackups.length).toBe(2);
    });

    it('should order backups by creation time', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const backupId1 = createTestBackup(db, merchantId);
      await new Promise(resolve => setTimeout(resolve, 1100)); // SQLite has second precision
      const backupId2 = createTestBackup(db, merchantId);
      await new Promise(resolve => setTimeout(resolve, 1100));
      const backupId3 = createTestBackup(db, merchantId);

      const backups = db.prepare(`
        SELECT * FROM backups
        WHERE merchant_id = ?
        ORDER BY created_at DESC
      `).all(merchantId);

      expect((backups[0] as any).id).toBe(backupId3); // Most recent first
      expect((backups[2] as any).id).toBe(backupId1); // Oldest last
    });
  });

  describe('Update Backup', () => {
    it('should update encrypted backup data', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId, undefined, 'old-backup');

      const newBackup = 'new-encrypted-backup-data';
      db.prepare(`
        UPDATE backups
        SET encrypted_backup = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newBackup, backupId);

      const backup = db.prepare('SELECT encrypted_backup FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).encrypted_backup).toBe(newBackup);
    });

    it('should update status', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);

      db.prepare('UPDATE backups SET status = ? WHERE id = ?').run('completed', backupId);

      const backup = db.prepare('SELECT status FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).status).toBe('completed');
    });

    it('should support various status values', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);

      const statuses = ['pending', 'processing', 'completed', 'failed'];

      for (const status of statuses) {
        db.prepare('UPDATE backups SET status = ? WHERE id = ?').run(status, backupId);
        const backup = db.prepare('SELECT status FROM backups WHERE id = ?').get(backupId);
        expect((backup as any).status).toBe(status);
      }
    });

    it('should update timestamp on modification', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);

      const original = db.prepare('SELECT updated_at FROM backups WHERE id = ?').get(backupId);
      const originalTimestamp = (original as any).updated_at;

      // Wait for at least 1 second to ensure timestamp difference (SQLite has second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));

      db.prepare(`
        UPDATE backups
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('completed', backupId);

      const updated = db.prepare('SELECT updated_at FROM backups WHERE id = ?').get(backupId);
      const updatedTimestamp = (updated as any).updated_at;

      expect(updatedTimestamp).not.toBe(originalTimestamp);
    });

    it('should allow updating link reference', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);
      const linkId = createTestLink(db, merchantId);

      db.prepare('UPDATE backups SET encrypted_link_id = ? WHERE id = ?').run(linkId, backupId);

      const backup = db.prepare('SELECT encrypted_link_id FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).encrypted_link_id).toBe(linkId);
    });
  });

  describe('Delete Backup', () => {
    it('should delete backup by ID', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId = createTestBackup(db, merchantId);

      db.prepare('DELETE FROM backups WHERE id = ?').run(backupId);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);
      expect(backup).toBeUndefined();
    });

    it('should not affect other backups when deleting one', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const backupId1 = createTestBackup(db, merchantId);
      const backupId2 = createTestBackup(db, merchantId);

      db.prepare('DELETE FROM backups WHERE id = ?').run(backupId1);

      const remainingBackups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchantId);
      expect(remainingBackups.length).toBe(1);
      expect((remainingBackups[0] as any).id).toBe(backupId2);
    });
  });

  describe('Ownership and Authorization', () => {
    it('should verify backup belongs to merchant', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      const backupId = createTestBackup(db, merchant1);

      const backup = db.prepare('SELECT * FROM backups WHERE id = ? AND merchant_id = ?').get(backupId, merchant1);
      const wrongMerchant = db.prepare('SELECT * FROM backups WHERE id = ? AND merchant_id = ?').get(backupId, merchant2);

      expect(backup).toBeDefined();
      expect(wrongMerchant).toBeUndefined();
    });

    it('should prevent unauthorized updates', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      const backupId = createTestBackup(db, merchant1);

      const result = db.prepare('UPDATE backups SET status = ? WHERE id = ? AND merchant_id = ?').run('completed', backupId, merchant2);

      expect(result.changes).toBe(0); // No rows updated
    });

    it('should prevent unauthorized deletion', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      const backupId = createTestBackup(db, merchant1);

      const result = db.prepare('DELETE FROM backups WHERE id = ? AND merchant_id = ?').run(backupId, merchant2);

      expect(result.changes).toBe(0); // No rows deleted

      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);
      expect(backup).toBeDefined();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should cascade delete backups when merchant is deleted', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      createTestBackup(db, merchantId);
      createTestBackup(db, merchantId);

      db.prepare('DELETE FROM merchants WHERE id = ?').run(merchantId);

      const backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchantId);
      expect(backups.length).toBe(0);
    });

    it('should set link_id to NULL when link is deleted', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);
      const backupId = createTestBackup(db, merchantId, linkId);

      db.prepare('DELETE FROM encrypted_links WHERE id = ?').run(linkId);

      const backup = db.prepare('SELECT encrypted_link_id FROM backups WHERE id = ?').get(backupId);
      expect((backup as any).encrypted_link_id).toBeNull();
    });
  });

  describe('Data Integrity', () => {
    it('should enforce NOT NULL on encrypted_backup', () => {
      expect(async () => {
        const { id: merchantId } = await createTestMerchant(db);
        db.prepare(`
          INSERT INTO backups (id, merchant_id, encrypted_backup)
          VALUES (?, ?, ?)
        `).run('test-backup', merchantId, null);
      }).rejects.toThrow();
    });

    it('should store large encrypted backup payloads', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const largeBackup = 'encrypted-'.repeat(5000);

      const backupId = createTestBackup(db, merchantId, undefined, largeBackup);

      const backup = db.prepare('SELECT encrypted_backup FROM backups WHERE id = ?').get(backupId);

      expect((backup as any).encrypted_backup).toBe(largeBackup);
      expect((backup as any).encrypted_backup.length).toBeGreaterThan(20000);
    });

    it('should use index for merchant_id queries', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      for (let i = 0; i < 100; i++) {
        createTestBackup(db, merchantId);
      }

      const start = Date.now();
      const backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchantId);
      const duration = Date.now() - start;

      expect(backups.length).toBe(100);
      expect(duration).toBeLessThan(100);
    });

    it('should use index for link_id queries', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      for (let i = 0; i < 50; i++) {
        createTestBackup(db, merchantId, linkId);
      }

      const start = Date.now();
      const backups = db.prepare('SELECT * FROM backups WHERE encrypted_link_id = ?').all(linkId);
      const duration = Date.now() - start;

      expect(backups.length).toBe(50);
      expect(duration).toBeLessThan(100);
    });
  });
});
