/**
 * Integration tests for backup storage flows
 * Tests: create, update status, list (authenticated), fetch (authenticated)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { generateTestMerchant, generateTestBackup, generateTestLink } from '../setup.js';

describe('Backup Storage Integration Tests', () => {
  let token: string;
  let merchantId: string;
  let secondToken: string;
  let secondMerchantId: string;
  let linkId: string;

  beforeEach(async () => {
    // Create first merchant and a payment link
    const merchant1 = generateTestMerchant('backup1');
    const response1 = await request(app)
      .post('/api/merchants/register')
      .send(merchant1);
    token = response1.body.token;
    merchantId = response1.body.merchantId;

    // Create a payment link for backup tests
    const linkData = generateTestLink('backup-link');
    const linkResponse = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${token}`)
      .send(linkData);
    linkId = linkResponse.body.linkId;

    // Create second merchant for authorization tests
    const merchant2 = generateTestMerchant('backup2');
    const response2 = await request(app)
      .post('/api/merchants/register')
      .send(merchant2);
    secondToken = response2.body.token;
    secondMerchantId = response2.body.merchantId;
  });

  describe('POST /api/backups - Create Backup', () => {
    it('should create a backup without authentication (public endpoint)', async () => {
      const backupData = {
        ...generateTestBackup('1'),
        paymentLinkId: linkId,
      };

      const response = await request(app)
        .post('/api/backups')
        .send(backupData)
        .expect(201);

      expect(response.body).toHaveProperty('backupId');
      expect(typeof response.body.backupId).toBe('string');
    });

    it('should reject backup with missing encrypted data', async () => {
      const invalidData = {
        paymentLinkId: linkId,
        status: 'pending',
      };

      await request(app)
        .post('/api/backups')
        .send(invalidData)
        .expect(400);
    });

    it('should reject backup with invalid status', async () => {
      const invalidData = {
        ...generateTestBackup('2'),
        paymentLinkId: linkId,
        status: 'invalid-status',
      };

      await request(app)
        .post('/api/backups')
        .send(invalidData)
        .expect(400);
    });

    it('should accept valid status values', async () => {
      const statuses = ['pending', 'completed', 'failed'];

      for (const status of statuses) {
        const backupData = {
          ...generateTestBackup(`status-${status}`),
          paymentLinkId: linkId,
          status,
        };

        const response = await request(app)
          .post('/api/backups')
          .send(backupData)
          .expect(201);

        expect(response.body).toHaveProperty('backupId');
      }
    });
  });

  describe('PUT /api/backups/:id - Update Backup Status', () => {
    let backupId: string;

    beforeEach(async () => {
      // Create a backup
      const backupData = {
        ...generateTestBackup('update'),
        paymentLinkId: linkId,
      };
      const response = await request(app)
        .post('/api/backups')
        .send(backupData);
      backupId = response.body.backupId;
    });

    it('should update backup status without authentication (public endpoint)', async () => {
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'completed' })
        .expect(200);

      // Verify status was updated
      const getResponse = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(getResponse.body.status).toBe('completed');
    });

    it('should reject update with invalid status', async () => {
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'invalid-status' })
        .expect(400);
    });

    it('should return 404 for non-existent backup', async () => {
      await request(app)
        .put('/api/backups/non-existent-id')
        .send({ status: 'completed' })
        .expect(404);
    });

    it('should allow multiple status updates', async () => {
      // Update to completed
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'completed' })
        .expect(200);

      // Update to failed
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'failed' })
        .expect(200);

      // Verify final status
      const getResponse = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(getResponse.body.status).toBe('failed');
    });
  });

  describe('GET /api/backups - List Merchant Backups', () => {
    it('should list all backups for authenticated merchant', async () => {
      // Create multiple backups
      const backup1Data = {
        ...generateTestBackup('list1'),
        paymentLinkId: linkId,
      };
      const backup2Data = {
        ...generateTestBackup('list2'),
        paymentLinkId: linkId,
      };

      await request(app)
        .post('/api/backups')
        .send(backup1Data);

      await request(app)
        .post('/api/backups')
        .send(backup2Data);

      const response = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Verify backup metadata
      response.body.forEach((backup: any) => {
        expect(backup).toHaveProperty('backupId');
        expect(backup).toHaveProperty('status');
        expect(backup).toHaveProperty('paymentLinkId');
        expect(backup).toHaveProperty('createdAt');
        expect(backup).toHaveProperty('updatedAt');
      });
    });

    it('should require authentication to list backups', async () => {
      await request(app)
        .get('/api/backups')
        .expect(401);
    });

    it('should only show backups owned by authenticated merchant', async () => {
      // Merchant 1 creates backup
      const backup1Data = {
        ...generateTestBackup('merchant1'),
        paymentLinkId: linkId,
      };
      await request(app)
        .post('/api/backups')
        .send(backup1Data);

      // Merchant 2 creates their own link and backup
      const link2Data = generateTestLink('merchant2-link');
      const link2Response = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${secondToken}`)
        .send(link2Data);
      const link2Id = link2Response.body.linkId;

      const backup2Data = {
        ...generateTestBackup('merchant2'),
        paymentLinkId: link2Id,
      };
      await request(app)
        .post('/api/backups')
        .send(backup2Data);

      // Merchant 1 lists backups - should only see their own
      const response1 = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Merchant 2 lists backups - should only see their own
      const response2 = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);

      // Verify separation
      expect(response1.body.length).toBeGreaterThanOrEqual(1);
      expect(response2.body.length).toBeGreaterThanOrEqual(1);

      // Verify merchant 1's backups are for their links
      response1.body.forEach((backup: any) => {
        expect(backup.paymentLinkId).toBe(linkId);
      });

      // Verify merchant 2's backups are for their links
      response2.body.forEach((backup: any) => {
        expect(backup.paymentLinkId).toBe(link2Id);
      });
    });

    it('should return empty array for merchant with no backups', async () => {
      // Create a new merchant with no backups
      const merchant3 = generateTestMerchant('backup3');
      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchant3);
      const token3 = response.body.token;

      const listResponse = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${token3}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body.length).toBe(0);
    });
  });

  describe('GET /api/backups/:id - Fetch Backup', () => {
    let backupId: string;

    beforeEach(async () => {
      // Create a backup
      const backupData = {
        ...generateTestBackup('fetch'),
        paymentLinkId: linkId,
      };
      const response = await request(app)
        .post('/api/backups')
        .send(backupData);
      backupId = response.body.backupId;
    });

    it('should fetch backup with authentication', async () => {
      const response = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('backupId', backupId);
      expect(response.body).toHaveProperty('encryptedBackup');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('paymentLinkId', linkId);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should require authentication to fetch backup', async () => {
      await request(app)
        .get(`/api/backups/${backupId}`)
        .expect(401);
    });

    it('should not allow fetching another merchant\'s backup', async () => {
      // Second merchant tries to fetch first merchant's backup
      await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent backup', async () => {
      await request(app)
        .get('/api/backups/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Complete Backup Lifecycle', () => {
    it('should handle full create → update → list → fetch flow', async () => {
      // Step 1: Create backup (public)
      const backupData = {
        ...generateTestBackup('lifecycle'),
        paymentLinkId: linkId,
      };
      const createResponse = await request(app)
        .post('/api/backups')
        .send(backupData)
        .expect(201);

      const backupId = createResponse.body.backupId;
      expect(backupId).toBeTruthy();

      // Step 2: Update status to completed (public)
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'completed' })
        .expect(200);

      // Step 3: List backups (authenticated - should include our new backup)
      const listResponse = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const foundBackup = listResponse.body.find((backup: any) => backup.backupId === backupId);
      expect(foundBackup).toBeTruthy();
      expect(foundBackup.status).toBe('completed');
      expect(foundBackup.paymentLinkId).toBe(linkId);

      // Step 4: Fetch full backup details (authenticated)
      const fetchResponse = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(fetchResponse.body.backupId).toBe(backupId);
      expect(fetchResponse.body.encryptedBackup).toBe(backupData.encryptedBackup);
      expect(fetchResponse.body.status).toBe('completed');
      expect(fetchResponse.body.paymentLinkId).toBe(linkId);
    });

    it('should handle backup status transitions', async () => {
      // Create backup with pending status
      const backupData = {
        ...generateTestBackup('transitions'),
        paymentLinkId: linkId,
        status: 'pending',
      };
      const createResponse = await request(app)
        .post('/api/backups')
        .send(backupData)
        .expect(201);

      const backupId = createResponse.body.backupId;

      // Verify initial status
      let fetchResponse = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(fetchResponse.body.status).toBe('pending');

      // Transition to completed
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'completed' })
        .expect(200);

      fetchResponse = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(fetchResponse.body.status).toBe('completed');

      // Transition to failed (simulating error recovery)
      await request(app)
        .put(`/api/backups/${backupId}`)
        .send({ status: 'failed' })
        .expect(200);

      fetchResponse = await request(app)
        .get(`/api/backups/${backupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(fetchResponse.body.status).toBe('failed');
    });
  });
});
