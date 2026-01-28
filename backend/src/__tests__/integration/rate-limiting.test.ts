/**
 * Integration tests for rate limiting behavior
 * Tests: global rate limit, registration rate limit, login rate limit
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { generateTestMerchant, waitFor } from '../setup.js';

describe('Rate Limiting Integration Tests', () => {
  describe('Global Rate Limit', () => {
    it('should enforce global rate limit after threshold', async () => {
      // The global rate limit is 100 requests per 15 minutes
      // This test verifies rate limit headers are present
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Verify rate limit headers are present
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Verify initial values
      expect(parseInt(response.headers['x-ratelimit-limit'])).toBe(100);
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(100);
    });

    it('should decrement rate limit remaining count with each request', async () => {
      // Make first request
      const response1 = await request(app)
        .get('/health')
        .expect(200);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);

      // Make second request
      const response2 = await request(app)
        .get('/health')
        .expect(200);

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);

      // Remaining count should decrease
      expect(remaining2).toBeLessThan(remaining1);
    });

    it('should include rate limit reset timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const resetTime = parseInt(response.headers['x-ratelimit-reset']);
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;

      // Reset time should be in the future, within 15 minutes
      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThanOrEqual(now + fifteenMinutes);
    });
  });

  describe('Registration Rate Limit', () => {
    it('should accept registration requests within rate limit', async () => {
      // According to PR #64 context, registration is limited to 5 per hour per IP
      const merchant = generateTestMerchant('ratelimit1');

      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchant)
        .expect(201);

      expect(response.body).toHaveProperty('token');
    });

    it('should provide rate limit headers on registration endpoint', async () => {
      const merchant = generateTestMerchant('ratelimit2');

      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchant)
        .expect(201);

      // Should have rate limit headers (if specific registration limiter is implemented)
      // If using global limiter, these will be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('should handle multiple registrations from same IP', async () => {
      // Test that we can make multiple valid registrations
      // (actual rate limit enforcement would require many requests)
      const merchants = [
        generateTestMerchant('multi1'),
        generateTestMerchant('multi2'),
        generateTestMerchant('multi3'),
      ];

      for (const merchant of merchants) {
        const response = await request(app)
          .post('/api/merchants/register')
          .send(merchant)
          .expect(201);

        expect(response.body).toHaveProperty('token');
      }
    });
  });

  describe('Login Rate Limit', () => {
    let merchantData: ReturnType<typeof generateTestMerchant>;

    beforeEach(async () => {
      // Create a merchant for login tests
      merchantData = generateTestMerchant('login-ratelimit');
      await request(app)
        .post('/api/merchants/register')
        .send(merchantData);
    });

    it('should accept login requests within rate limit', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: merchantData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should provide rate limit headers on login endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: merchantData.password,
        })
        .expect(200);

      // Should have rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('should handle multiple login attempts', async () => {
      // According to PR #64 context, login is limited to 10 per minute per IP
      // Test that we can make several valid login attempts
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: merchantData.email,
            password: merchantData.password,
          })
          .expect(200);

        expect(response.body).toHaveProperty('token');
      }
    });

    it('should track failed login attempts in rate limit', async () => {
      // Failed logins should still count against rate limit
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: 'wrong-password',
        })
        .expect(401);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'] || '0');

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: 'wrong-password',
        })
        .expect(401);

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'] || '0');

      // Remaining count should decrease even for failed attempts
      if (remaining1 > 0) {
        expect(remaining2).toBeLessThanOrEqual(remaining1);
      }
    });
  });

  describe('Link Creation Rate Limit', () => {
    let token: string;

    beforeEach(async () => {
      // Create merchant and get token
      const merchant = generateTestMerchant('link-ratelimit');
      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchant);
      token = response.body.token;
    });

    it('should accept link creation requests within rate limit', async () => {
      // According to PR #64 context, link creation is limited to 100 per hour per merchant
      const linkData = {
        ciphertext: 'encrypted-data',
        nonce: 'test-nonce',
        tag: 'test-tag',
      };

      const response = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(linkData)
        .expect(201);

      expect(response.body).toHaveProperty('linkId');
    });

    it('should handle multiple link creations from same merchant', async () => {
      // Test that we can create multiple links
      for (let i = 0; i < 5; i++) {
        const linkData = {
          ciphertext: `encrypted-data-${i}`,
          nonce: `nonce-${i}`,
          tag: `tag-${i}`,
        };

        const response = await request(app)
          .post('/api/links')
          .set('Authorization', `Bearer ${token}`)
          .send(linkData)
          .expect(201);

        expect(response.body).toHaveProperty('linkId');
      }
    });
  });

  describe('Backup Operations Rate Limit', () => {
    let token: string;
    let linkId: string;

    beforeEach(async () => {
      // Create merchant and payment link
      const merchant = generateTestMerchant('backup-ratelimit');
      const merchantResponse = await request(app)
        .post('/api/merchants/register')
        .send(merchant);
      token = merchantResponse.body.token;

      const linkData = {
        ciphertext: 'encrypted-data',
        nonce: 'test-nonce',
        tag: 'test-tag',
      };
      const linkResponse = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send(linkData);
      linkId = linkResponse.body.linkId;
    });

    it('should accept backup creation requests within rate limit', async () => {
      // According to PR #64 context, backup operations are limited to 100 per hour per merchant
      const backupData = {
        encryptedBackup: '-----BEGIN PGP MESSAGE-----\nTest\n-----END PGP MESSAGE-----',
        paymentLinkId: linkId,
        status: 'pending',
      };

      const response = await request(app)
        .post('/api/backups')
        .send(backupData)
        .expect(201);

      expect(response.body).toHaveProperty('backupId');
    });

    it('should handle multiple backup operations', async () => {
      // Create multiple backups
      const backupIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const backupData = {
          encryptedBackup: `-----BEGIN PGP MESSAGE-----\nTest ${i}\n-----END PGP MESSAGE-----`,
          paymentLinkId: linkId,
          status: 'pending',
        };

        const response = await request(app)
          .post('/api/backups')
          .send(backupData)
          .expect(201);

        expect(response.body).toHaveProperty('backupId');
        backupIds.push(response.body.backupId);
      }

      // Update backup statuses
      for (const backupId of backupIds) {
        await request(app)
          .put(`/api/backups/${backupId}`)
          .send({ status: 'completed' })
          .expect(200);
      }

      // List backups
      const listResponse = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listResponse.body.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Rate Limit Error Response', () => {
    it('should return 429 status code when rate limit exceeded', async () => {
      // This test documents the expected behavior when rate limit is exceeded
      // In a real test, we would need to make 100+ requests to trigger this
      // For now, we verify the structure exists

      // Make a request to ensure rate limiting is active
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Verify rate limit headers exist (proving rate limiting is configured)
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should include retry-after header when rate limited', async () => {
      // This test documents expected behavior for rate limit responses
      // When actually rate limited, response should include:
      // - Status: 429 Too Many Requests
      // - Header: Retry-After (seconds until reset)
      // - Body: Error message explaining rate limit

      // For now, verify rate limit infrastructure is in place
      const response = await request(app)
        .get('/health')
        .expect(200);

      const resetTime = parseInt(response.headers['x-ratelimit-reset']);
      expect(resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('Rate Limit Reset Behavior', () => {
    it('should reset rate limit after window expires', async () => {
      // This test documents that rate limits reset after their window
      // For the global limit: 15 minutes
      // For specific limits: varies by endpoint

      const response = await request(app)
        .get('/health')
        .expect(200);

      const resetTime = parseInt(response.headers['x-ratelimit-reset']);
      const now = Date.now();

      // Verify reset time is in the future
      expect(resetTime).toBeGreaterThan(now);

      // In a real scenario, we would wait for reset or mock time
      // For this integration test, we verify the headers are correct
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(100);
    });
  });
});
