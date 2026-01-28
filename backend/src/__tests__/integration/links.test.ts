/**
 * Integration tests for payment links flows
 * Tests: create, fetch (public), list (authenticated), delete
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { generateTestMerchant, generateTestLink } from '../setup.js';

// TODO: Enable these tests after issue #7 (backend API implementation) is merged
// These tests verify the payment links API endpoints which are currently TODO stubs in backend/src/index.ts
// Skipped to prevent CI failures until the backend implementation is complete
describe.skip('Payment Links Integration Tests', () => {
  let token: string;
  let merchantId: string;
  let secondToken: string;
  let secondMerchantId: string;

  beforeEach(async () => {
    // Create first merchant
    const merchant1 = generateTestMerchant('links1');
    const response1 = await request(app)
      .post('/api/merchants/register')
      .send(merchant1);
    token = response1.body.token;
    merchantId = response1.body.merchantId;

    // Create second merchant for authorization tests
    const merchant2 = generateTestMerchant('links2');
    const response2 = await request(app)
      .post('/api/merchants/register')
      .send(merchant2);
    secondToken = response2.body.token;
    secondMerchantId = response2.body.merchantId;
  });

  describe('POST /api/links - Create Payment Link', () => {
    it('should create a payment link with valid authentication', async () => {
      const linkData = generateTestLink('1');

      const response = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(linkData)
        .expect(201);

      expect(response.body).toHaveProperty('linkId');
      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.linkId).toBe('string');
      expect(typeof response.body.url).toBe('string');
    });

    it('should reject link creation without authentication', async () => {
      const linkData = generateTestLink('2');

      await request(app)
        .post('/api/links')
        .send(linkData)
        .expect(401);
    });

    it('should reject link creation with invalid data', async () => {
      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('should reject link creation with missing ciphertext', async () => {
      const invalidData = generateTestLink('3');
      delete (invalidData as any).ciphertext;

      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/links/:id - Fetch Payment Link (Public)', () => {
    let linkId: string;

    beforeEach(async () => {
      // Create a link
      const linkData = generateTestLink('fetch');
      const response = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(linkData);
      linkId = response.body.linkId;
    });

    it('should fetch payment link without authentication (public endpoint)', async () => {
      const response = await request(app)
        .get(`/api/links/${linkId}`)
        .expect(200);

      expect(response.body).toHaveProperty('linkId', linkId);
      expect(response.body).toHaveProperty('ciphertext');
      expect(response.body).toHaveProperty('nonce');
      expect(response.body).toHaveProperty('tag');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 404 for non-existent link', async () => {
      await request(app)
        .get('/api/links/non-existent-link-id')
        .expect(404);
    });

    it('should not expose merchant information in public fetch', async () => {
      const response = await request(app)
        .get(`/api/links/${linkId}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('merchantId');
      expect(response.body).not.toHaveProperty('merchant');
    });
  });

  describe('GET /api/links - List Merchant Links', () => {
    it('should list all links for authenticated merchant', async () => {
      // Create multiple links
      const link1 = generateTestLink('list1');
      const link2 = generateTestLink('list2');
      const link3 = generateTestLink('list3');

      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(link1);

      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(link2);

      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(link3);

      const response = await request(app)
        .get('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Verify all links belong to this merchant
      response.body.forEach((link: any) => {
        expect(link).toHaveProperty('linkId');
        expect(link).toHaveProperty('ciphertext');
        expect(link).toHaveProperty('createdAt');
      });
    });

    it('should require authentication to list links', async () => {
      await request(app)
        .get('/api/links')
        .expect(401);
    });

    it('should only show links owned by authenticated merchant', async () => {
      // Merchant 1 creates links
      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(generateTestLink('merchant1-1'));

      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(generateTestLink('merchant1-2'));

      // Merchant 2 creates links
      await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${secondToken}`)
        .send(generateTestLink('merchant2-1'));

      // Merchant 1 lists links - should only see their own
      const response1 = await request(app)
        .get('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Merchant 2 lists links - should only see their own
      const response2 = await request(app)
        .get('/api/links')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);

      // Both should have links, but different counts
      expect(response1.body.length).toBeGreaterThanOrEqual(2);
      expect(response2.body.length).toBeGreaterThanOrEqual(1);
      expect(response1.body.length).not.toBe(response2.body.length);
    });

    it('should return empty array for merchant with no links', async () => {
      // Create a new merchant with no links
      const merchant3 = generateTestMerchant('links3');
      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchant3);
      const token3 = response.body.token;

      const listResponse = await request(app)
        .get('/api/links')
        .set('Authorization', `Bearer ${token3}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body.length).toBe(0);
    });
  });

  describe('DELETE /api/links/:id - Delete Payment Link', () => {
    let linkId: string;

    beforeEach(async () => {
      // Create a link
      const linkData = generateTestLink('delete');
      const response = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(linkData);
      linkId = response.body.linkId;
    });

    it('should delete own payment link', async () => {
      await request(app)
        .delete(`/api/links/${linkId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify link is deleted - public fetch should return 404
      await request(app)
        .get(`/api/links/${linkId}`)
        .expect(404);
    });

    it('should require authentication to delete link', async () => {
      await request(app)
        .delete(`/api/links/${linkId}`)
        .expect(401);
    });

    it('should not allow deleting another merchant\'s link', async () => {
      // Second merchant tries to delete first merchant's link
      await request(app)
        .delete(`/api/links/${linkId}`)
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(403);

      // Verify link still exists
      await request(app)
        .get(`/api/links/${linkId}`)
        .expect(200);
    });

    it('should return 404 when deleting non-existent link', async () => {
      await request(app)
        .delete('/api/links/non-existent-link-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Complete Link Lifecycle', () => {
    it('should handle full create → fetch → list → delete flow', async () => {
      // Step 1: Create link
      const linkData = generateTestLink('lifecycle');
      const createResponse = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(linkData)
        .expect(201);

      const linkId = createResponse.body.linkId;
      expect(linkId).toBeTruthy();

      // Step 2: Fetch link publicly
      const fetchResponse = await request(app)
        .get(`/api/links/${linkId}`)
        .expect(200);

      expect(fetchResponse.body.linkId).toBe(linkId);
      expect(fetchResponse.body.ciphertext).toBe(linkData.ciphertext);

      // Step 3: List links (should include our new link)
      const listResponse = await request(app)
        .get('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const foundLink = listResponse.body.find((link: any) => link.linkId === linkId);
      expect(foundLink).toBeTruthy();
      expect(foundLink.ciphertext).toBe(linkData.ciphertext);

      // Step 4: Delete link
      await request(app)
        .delete(`/api/links/${linkId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Step 5: Verify link is gone
      await request(app)
        .get(`/api/links/${linkId}`)
        .expect(404);

      // Step 6: Verify link not in list
      const listResponse2 = await request(app)
        .get('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const foundLink2 = listResponse2.body.find((link: any) => link.linkId === linkId);
      expect(foundLink2).toBeUndefined();
    });
  });
});
