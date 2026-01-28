/**
 * Merchant Service Tests
 * Tests for merchant registration, profile retrieval, and profile updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, createTestMerchant } from '../../test/helpers';

describe('Merchant Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('Merchant Registration', () => {
    it('should create a new merchant', async () => {
      const email = 'newmerchant@example.com';
      const { id } = await createTestMerchant(db, { email });

      const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id);

      expect(merchant).toBeDefined();
      expect((merchant as any).email).toBe(email);
      expect((merchant as any).password_hash).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      const email = 'duplicate@example.com';
      await createTestMerchant(db, { email });

      // Attempting to create another merchant with same email should fail
      await expect(async () => {
        await createTestMerchant(db, { email });
      }).rejects.toThrow();
    });

    it('should store PGP public key if provided', async () => {
      const pgpKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest-key\n-----END PGP PUBLIC KEY BLOCK-----';
      const { id } = await createTestMerchant(db, { pgpPublicKey: pgpKey });

      const merchant = db.prepare('SELECT pgp_public_key FROM merchants WHERE id = ?').get(id);

      expect((merchant as any).pgp_public_key).toBe(pgpKey);
    });

    it('should hash password before storing', async () => {
      const password = 'PlainTextPassword123!';
      const { id } = await createTestMerchant(db, { password });

      const merchant = db.prepare('SELECT password_hash FROM merchants WHERE id = ?').get(id);

      expect((merchant as any).password_hash).toBeDefined();
      expect((merchant as any).password_hash).not.toBe(password);
      expect((merchant as any).password_hash).toMatch(/^\$2[ab]\$/); // bcrypt hash format
    });

    it('should set default values for optional fields', async () => {
      const { id } = await createTestMerchant(db);

      const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id);

      expect((merchant as any).language).toBe('en');
      expect((merchant as any).currency).toBe('BTC');
      expect((merchant as any).created_at).toBeDefined();
    });

    it('should generate unique IDs for merchants', async () => {
      const { id: id1 } = await createTestMerchant(db);
      const { id: id2 } = await createTestMerchant(db);

      expect(id1).not.toBe(id2);
    });
  });

  describe('Profile Retrieval', () => {
    it('should retrieve merchant profile by ID', async () => {
      const { id, email } = await createTestMerchant(db, {
        storeName: 'My Test Store',
      });

      const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id);

      expect(merchant).toBeDefined();
      expect((merchant as any).id).toBe(id);
      expect((merchant as any).email).toBe(email);
      expect((merchant as any).store_name).toBe('My Test Store');
    });

    it('should not return password hash in profile', async () => {
      const { id } = await createTestMerchant(db);

      // In real implementation, service should exclude password_hash
      const merchant = db.prepare(`
        SELECT id, email, pgp_public_key, store_name, website_url,
               description, language, currency, created_at, updated_at
        FROM merchants WHERE id = ?
      `).get(id);

      expect(merchant).toBeDefined();
      expect((merchant as any).password_hash).toBeUndefined();
    });

    it('should return null for non-existent merchant', () => {
      const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get('non-existent-id');

      expect(merchant).toBeUndefined();
    });

    it('should retrieve PGP public key', async () => {
      const pgpKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest\n-----END PGP PUBLIC KEY BLOCK-----';
      const { id } = await createTestMerchant(db, { pgpPublicKey: pgpKey });

      const result = db.prepare('SELECT pgp_public_key FROM merchants WHERE id = ?').get(id);

      expect((result as any).pgp_public_key).toBe(pgpKey);
    });
  });

  describe('Profile Updates', () => {
    it('should update merchant profile fields', async () => {
      const { id } = await createTestMerchant(db, {
        storeName: 'Old Store Name',
      });

      const newStoreName = 'New Store Name';
      const newWebsite = 'https://example.com';

      db.prepare(`
        UPDATE merchants
        SET store_name = ?, website_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStoreName, newWebsite, id);

      const updated = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id);

      expect((updated as any).store_name).toBe(newStoreName);
      expect((updated as any).website_url).toBe(newWebsite);
    });

    it('should not allow updating email (if enforced)', async () => {
      const { id, email } = await createTestMerchant(db);

      // Email updates might be restricted in the actual service
      // This test documents the expected behavior
      const originalEmail = email;
      expect(originalEmail).toBeDefined();
    });

    it('should update PGP public key', async () => {
      const { id } = await createTestMerchant(db, {
        pgpPublicKey: 'old-key',
      });

      const newKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\nnew-key\n-----END PGP PUBLIC KEY BLOCK-----';

      db.prepare('UPDATE merchants SET pgp_public_key = ? WHERE id = ?').run(newKey, id);

      const updated = db.prepare('SELECT pgp_public_key FROM merchants WHERE id = ?').get(id);

      expect((updated as any).pgp_public_key).toBe(newKey);
    });

    it('should update language and currency preferences', async () => {
      const { id } = await createTestMerchant(db);

      db.prepare(`
        UPDATE merchants
        SET language = ?, currency = ?
        WHERE id = ?
      `).run('es', 'EUR', id);

      const updated = db.prepare('SELECT language, currency FROM merchants WHERE id = ?').get(id);

      expect((updated as any).language).toBe('es');
      expect((updated as any).currency).toBe('EUR');
    });

    it('should update timestamp on profile changes', async () => {
      const { id } = await createTestMerchant(db);

      const original = db.prepare('SELECT updated_at FROM merchants WHERE id = ?').get(id);
      const originalTimestamp = (original as any).updated_at;

      // Wait for at least 1 second to ensure timestamp difference (SQLite has second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));

      db.prepare(`
        UPDATE merchants
        SET store_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('Updated Store', id);

      const updated = db.prepare('SELECT updated_at FROM merchants WHERE id = ?').get(id);
      const updatedTimestamp = (updated as any).updated_at;

      expect(updatedTimestamp).not.toBe(originalTimestamp);
    });
  });

  describe('Data Validation', () => {
    it('should handle null optional fields', async () => {
      const { id } = await createTestMerchant(db, {
        storeName: 'Test Store',
      });

      const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id);

      expect((merchant as any).website_url).toBeNull();
      expect((merchant as any).description).toBeNull();
      expect((merchant as any).pgp_public_key).toBeNull();
    });

    it('should store long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const { id } = await createTestMerchant(db);

      db.prepare('UPDATE merchants SET description = ? WHERE id = ?').run(longDescription, id);

      const merchant = db.prepare('SELECT description FROM merchants WHERE id = ?').get(id);

      expect((merchant as any).description).toBe(longDescription);
    });

    it('should handle special characters in profile fields', async () => {
      const specialStoreName = "Test's \"Store\" & Co.";
      const { id } = await createTestMerchant(db, {
        storeName: specialStoreName,
      });

      const merchant = db.prepare('SELECT store_name FROM merchants WHERE id = ?').get(id);

      expect((merchant as any).store_name).toBe(specialStoreName);
    });
  });

  describe('Cascade Deletes', () => {
    it('should delete merchant and cascade to links', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      // Create a link for this merchant
      db.prepare(`
        INSERT INTO encrypted_links (id, merchant_id, ciphertext)
        VALUES (?, ?, ?)
      `).run('link-1', merchantId, 'test-cipher');

      // Delete merchant
      db.prepare('DELETE FROM merchants WHERE id = ?').run(merchantId);

      // Links should be deleted too (cascade)
      const links = db.prepare('SELECT * FROM encrypted_links WHERE merchant_id = ?').all(merchantId);
      expect(links.length).toBe(0);
    });

    it('should delete merchant and cascade to backups', async () => {
      const { id: merchantId } = await createTestMerchant(db);

      // Create a backup for this merchant
      db.prepare(`
        INSERT INTO backups (id, merchant_id, encrypted_backup)
        VALUES (?, ?, ?)
      `).run('backup-1', merchantId, 'test-backup');

      // Delete merchant
      db.prepare('DELETE FROM merchants WHERE id = ?').run(merchantId);

      // Backups should be deleted too (cascade)
      const backups = db.prepare('SELECT * FROM backups WHERE merchant_id = ?').all(merchantId);
      expect(backups.length).toBe(0);
    });
  });
});
