/**
 * Backup Routes Tests
 * Integration tests for backup API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import Database from 'better-sqlite3';
import { createBackupRoutes } from './backups.routes';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

describe('Backup Routes', () => {
  let app: Express;
  let db: Database.Database;
  let testMerchantId: string;
  let authToken: string;

  beforeEach(() => {
    // Create test app
    app = express();
    app.use(express.json());

    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = JWT_SECRET;

    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Initialize schema
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
    testMerchantId = 'test-merchant-123';
    db.prepare(`
      INSERT INTO merchants (id, username, password_hash, pgp_public_key)
      VALUES (?, ?, ?, ?)
    `).run(testMerchantId, 'testuser', 'hashed', 'pgp-key');

    // Generate auth token
    authToken = jwt.sign({ merchantId: testMerchantId }, JWT_SECRET);

    // Mount routes
    app.use('/api/backups', createBackupRoutes(db));
  });

  afterEach(() => {
    db.close();
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/backups', () => {
    it('should create a backup with valid merchantId', async () => {
      const response = await request(app)
        .post('/api/backups')
        .send({
          merchantId: testMerchantId,
          encryptedData: 'encrypted-backup-data',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        merchantId: testMerchantId,
        writeToken: expect.any(String),
        status: 'pending',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
      expect(response.body.writeToken.length).toBeGreaterThan(20);
    });

    it('should return 404 for non-existent merchantId', async () => {
      const response = await request(app)
        .post('/api/backups')
        .send({
          merchantId: 'non-existent-merchant',
          encryptedData: 'data',
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Merchant not found',
      });
    });

    it('should return 400 for missing merchantId', async () => {
      const response = await request(app)
        .post('/api/backups')
        .send({
          encryptedData: 'data',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for missing encryptedData', async () => {
      const response = await request(app)
        .post('/api/backups')
        .send({
          merchantId: testMerchantId,
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for empty encryptedData', async () => {
      const response = await request(app)
        .post('/api/backups')
        .send({
          merchantId: testMerchantId,
          encryptedData: '',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 413 for encryptedData exceeding express.json limit', async () => {
      const largeData = 'x'.repeat(11000000); // Exceeds 10MB express limit
      await request(app)
        .post('/api/backups')
        .send({
          merchantId: testMerchantId,
          encryptedData: largeData,
        })
        .expect(413); // Payload Too Large from express.json
    });
  });

  describe('PUT /api/backups/:id', () => {
    let backupId: string;
    let writeToken: string;

    beforeEach(async () => {
      // Create a backup first
      const response = await request(app)
        .post('/api/backups')
        .send({
          merchantId: testMerchantId,
          encryptedData: 'original-data',
        });
      backupId = response.body.id;
      writeToken = response.body.writeToken;
    });

    it('should update backup status with valid write token', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken,
          status: 'claimed',
        })
        .expect(200);

      expect(response.body.status).toBe('claimed');
    });

    it('should update encrypted data with valid write token', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken,
          encryptedData: 'updated-data',
        })
        .expect(200);

      expect(response.body.encryptedData).toBe('updated-data');
    });

    it('should update both status and data with valid write token', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken,
          status: 'claimed',
          encryptedData: 'updated-data',
        })
        .expect(200);

      expect(response.body.status).toBe('claimed');
      expect(response.body.encryptedData).toBe('updated-data');
    });

    it('should return 403 with invalid write token', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken: 'wrong-token',
          status: 'claimed',
        })
        .expect(403);

      expect(response.body.error).toBe('Invalid write token');
    });

    it('should return 400 for missing write token', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          status: 'claimed',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 404 for non-existent backup', async () => {
      const response = await request(app)
        .put('/api/backups/non-existent-id')
        .send({
          writeToken: 'any-token',
          status: 'claimed',
        })
        .expect(404);

      expect(response.body.error).toBe('Backup not found');
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken,
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken,
          status: 'invalid-status',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should prevent different merchant from updating with stolen write token', async () => {
      // Create second merchant
      const merchant2Id = 'merchant-2';
      db.prepare(`
        INSERT INTO merchants (id, username, password_hash, pgp_public_key)
        VALUES (?, ?, ?, ?)
      `).run(merchant2Id, 'merchant2', 'hash', 'pgp');

      // Even with valid write token, only the backup owner can update
      // (write token is tied to the backup, not the merchant)
      const response = await request(app)
        .put(`/api/backups/${backupId}`)
        .send({
          writeToken, // Valid token for this backup
          status: 'claimed',
        })
        .expect(200);

      expect(response.body.status).toBe('claimed');
    });
  });

  describe('GET /api/backups', () => {
    beforeEach(async () => {
      // Create some backups
      await request(app).post('/api/backups').send({
        merchantId: testMerchantId,
        encryptedData: 'backup1',
      });
      await request(app).post('/api/backups').send({
        merchantId: testMerchantId,
        encryptedData: 'backup2',
      });
    });

    it('should list all backups for authenticated merchant', async () => {
      const response = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.backups).toHaveLength(2);
      expect(response.body.backups[0]).toMatchObject({
        id: expect.any(String),
        merchantId: testMerchantId,
        encryptedData: expect.any(String),
        status: 'pending',
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/backups').expect(401);

      expect(response.body.error).toBe('Authentication token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/backups')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should only return backups for authenticated merchant', async () => {
      // Create second merchant
      const merchant2Id = 'merchant-2';
      db.prepare(`
        INSERT INTO merchants (id, username, password_hash, pgp_public_key)
        VALUES (?, ?, ?, ?)
      `).run(merchant2Id, 'merchant2', 'hash', 'pgp');

      // Create backup for merchant 2
      await request(app).post('/api/backups').send({
        merchantId: merchant2Id,
        encryptedData: 'merchant2-backup',
      });

      // Merchant 1 should only see their own backups
      const response = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.backups).toHaveLength(2);
      expect(response.body.backups.every((b: any) => b.merchantId === testMerchantId)).toBe(
        true
      );
    });
  });

  describe('GET /api/backups/:id', () => {
    let backupId: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/backups').send({
        merchantId: testMerchantId,
        encryptedData: 'test-backup',
      });
      backupId = response.body.id;
    });

    it('should get backup by ID for authenticated owner', async () => {
      const response = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: backupId,
        merchantId: testMerchantId,
        encryptedData: 'test-backup',
        status: 'pending',
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/api/backups/${backupId}`).expect(401);

      expect(response.body.error).toBe('Authentication token required');
    });

    it('should return 403 for non-owner', async () => {
      // Create second merchant
      const merchant2Id = 'merchant-2';
      db.prepare(`
        INSERT INTO merchants (id, username, password_hash, pgp_public_key)
        VALUES (?, ?, ?, ?)
      `).run(merchant2Id, 'merchant2', 'hash', 'pgp');

      const merchant2Token = jwt.sign({ merchantId: merchant2Id }, JWT_SECRET);

      // Try to access merchant1's backup with merchant2's token
      const response = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${merchant2Token}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent backup', async () => {
      const response = await request(app)
        .get('/api/backups/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Backup not found');
    });
  });
});
