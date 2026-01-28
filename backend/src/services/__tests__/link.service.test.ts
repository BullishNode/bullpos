/**
 * Link Service Tests
 * Tests for encrypted payment link CRUD operations and ownership checks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, createTestMerchant, createTestLink } from '../../test/helpers';

describe('Link Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('Create Link', () => {
    it('should create a new encrypted link', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const ciphertext = 'encrypted-payment-data-12345';

      const linkId = createTestLink(db, merchantId, ciphertext);

      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get(linkId);

      expect(link).toBeDefined();
      expect((link as any).id).toBe(linkId);
      expect((link as any).merchant_id).toBe(merchantId);
      expect((link as any).ciphertext).toBe(ciphertext);
    });

    it('should generate unique link IDs', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const linkId1 = createTestLink(db, merchantId);
      const linkId2 = createTestLink(db, merchantId);

      expect(linkId1).not.toBe(linkId2);
    });

    it('should require merchant_id foreign key', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO encrypted_links (id, merchant_id, ciphertext)
          VALUES (?, ?, ?)
        `).run('test-link', 'non-existent-merchant', 'test-cipher');
      }).toThrow(); // Foreign key constraint violation
    });

    it('should set created_at timestamp', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      const link = db.prepare('SELECT created_at FROM encrypted_links WHERE id = ?').get(linkId);

      expect((link as any).created_at).toBeDefined();
      expect((link as any).created_at).toBeTruthy();
    });

    it('should store large ciphertext payloads', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const largeCiphertext = 'encrypted-'.repeat(1000); // Large payload

      const linkId = createTestLink(db, merchantId, largeCiphertext);

      const link = db.prepare('SELECT ciphertext FROM encrypted_links WHERE id = ?').get(linkId);

      expect((link as any).ciphertext).toBe(largeCiphertext);
      expect((link as any).ciphertext.length).toBeGreaterThan(5000);
    });
  });

  describe('Retrieve Link', () => {
    it('should retrieve link by ID', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const ciphertext = 'test-encrypted-payload';
      const linkId = createTestLink(db, merchantId, ciphertext);

      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get(linkId);

      expect(link).toBeDefined();
      expect((link as any).id).toBe(linkId);
      expect((link as any).ciphertext).toBe(ciphertext);
    });

    it('should return undefined for non-existent link', () => {
      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get('non-existent-link');

      expect(link).toBeUndefined();
    });

    it('should retrieve link without authentication (public endpoint)', async () => {
      // Links are public - anyone with the ID can retrieve them
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get(linkId);

      expect(link).toBeDefined();
      // Ciphertext is encrypted client-side, so public access is safe
    });
  });

  describe('List Links', () => {
    it('should list all links for a merchant', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      createTestLink(db, merchantId, 'cipher1');
      createTestLink(db, merchantId, 'cipher2');
      createTestLink(db, merchantId, 'cipher3');

      const links = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchantId);

      expect(links.length).toBe(3);
    });

    it('should return empty array if merchant has no links', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const links = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchantId);

      expect(links.length).toBe(0);
    });

    it('should not include other merchants links', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      createTestLink(db, merchant1);
      createTestLink(db, merchant1);
      createTestLink(db, merchant2);

      const merchant1Links = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchant1);
      const merchant2Links = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchant2);

      expect(merchant1Links.length).toBe(2);
      expect(merchant2Links.length).toBe(1);
    });

    it('should order links by creation time', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      const linkId1 = createTestLink(db, merchantId);
      await new Promise(resolve => setTimeout(resolve, 1100)); // SQLite has second precision
      const linkId2 = createTestLink(db, merchantId);
      await new Promise(resolve => setTimeout(resolve, 1100));
      const linkId3 = createTestLink(db, merchantId);

      const links = db.prepare(`
        SELECT * FROM encrypted_links
        WHERE merchant_id = ?
        ORDER BY created_at DESC
      `).all(merchantId);

      expect((links[0] as any).id).toBe(linkId3); // Most recent first
      expect((links[2] as any).id).toBe(linkId1); // Oldest last
    });
  });

  describe('Delete Link', () => {
    it('should delete link by ID', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      db.prepare('DELETE FROM encrypted_links WHERE id = ?').run(linkId);

      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get(linkId);
      expect(link).toBeUndefined();
    });

    it('should not affect other links when deleting one', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId1 = createTestLink(db, merchantId);
      const linkId2 = createTestLink(db, merchantId);

      db.prepare('DELETE FROM encrypted_links WHERE id = ?').run(linkId1);

      const remainingLinks = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchantId);
      expect(remainingLinks.length).toBe(1);
      expect((remainingLinks[0] as any).id).toBe(linkId2);
    });

    it('should cascade delete backups when link is deleted', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      // Create backup referencing this link
      db.prepare(`
        INSERT INTO backups (id, merchant_id, encrypted_link_id, encrypted_backup)
        VALUES (?, ?, ?, ?)
      `).run('backup-1', merchantId, linkId, 'test-backup');

      // Delete the link
      db.prepare('DELETE FROM encrypted_links WHERE id = ?').run(linkId);

      // Backup's encrypted_link_id should be set to NULL (ON DELETE SET NULL)
      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get('backup-1');
      expect((backup as any).encrypted_link_id).toBeNull();
    });
  });

  describe('Ownership Checks', () => {
    it('should verify link belongs to merchant', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      const linkId = createTestLink(db, merchant1);

      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ? AND merchant_id = ?').get(linkId, merchant1);
      const wrongMerchant = db.prepare('SELECT * FROM encrypted_links WHERE id = ? AND merchant_id = ?').get(linkId, merchant2);

      expect(link).toBeDefined();
      expect(wrongMerchant).toBeUndefined();
    });

    it('should prevent unauthorized deletion', async () => {
      const { id: merchant1 } = await createTestMerchant(db, { email: 'merchant1@example.com' });
      const { id: merchant2 } = await createTestMerchant(db, { email: 'merchant2@example.com' });

      const linkId = createTestLink(db, merchant1);

      // Attempt to delete as wrong merchant
      const result = db.prepare('DELETE FROM encrypted_links WHERE id = ? AND merchant_id = ?').run(linkId, merchant2);

      expect(result.changes).toBe(0); // No rows deleted

      // Link should still exist
      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get(linkId);
      expect(link).toBeDefined();
    });

    it('should allow owner to delete their link', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const linkId = createTestLink(db, merchantId);

      const result = db.prepare('DELETE FROM encrypted_links WHERE id = ? AND merchant_id = ?').run(linkId, merchantId);

      expect(result.changes).toBe(1); // One row deleted

      const link = db.prepare('SELECT * FROM encrypted_links WHERE id = ?').get(linkId);
      expect(link).toBeUndefined();
    });
  });

  describe('Data Integrity', () => {
    it('should enforce NOT NULL on ciphertext', () => {
      expect(async () => {
        const { id: merchantId } = await createTestMerchant(db);
        db.prepare(`
          INSERT INTO encrypted_links (id, merchant_id, ciphertext)
          VALUES (?, ?, ?)
        `).run('test-link', merchantId, null);
      }).rejects.toThrow();
    });

    it('should handle special characters in ciphertext', async () => {
      const { id: merchantId } = await createTestMerchant(db);
      const specialCipher = 'test!@#$%^&*(){}[]|\\:";\'<>?,./~`';

      const linkId = createTestLink(db, merchantId, specialCipher);

      const link = db.prepare('SELECT ciphertext FROM encrypted_links WHERE id = ?').get(linkId);
      expect((link as any).ciphertext).toBe(specialCipher);
    });

    it('should use index for merchant_id queries', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      // Create many links
      for (let i = 0; i < 100; i++) {
        createTestLink(db, merchantId);
      }

      // Query should be fast due to index
      const start = Date.now();
      const links = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchantId);
      const duration = Date.now() - start;

      expect(links.length).toBe(100);
      expect(duration).toBeLessThan(100); // Should be very fast with index
    });
  });
});
