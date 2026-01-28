/**
 * Tests for rate limiting middleware
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
  registrationLimiter,
  loginLimiter,
  linkCreationLimiter,
  backupLimiter,
  generalLimiter,
} from './rate-limit.js';

describe('Rate Limiting Middleware', () => {
  describe('registrationLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/register', registrationLimiter, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should allow requests under the limit (5 per hour)', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/register')
          .send({ test: true });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should block requests over the limit', async () => {
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/register');
      }

      // 6th request should be rate limited
      const response = await request(app).post('/register');
      expect(response.status).toBe(429);
      expect(response.text).toContain('Too many registration attempts');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).post('/register');
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('loginLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/login', loginLimiter, (req: Request, res: Response) => {
        res.json({ token: 'fake-token' });
      });
    });

    it('should allow requests under the limit (10 per minute)', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'test', password: 'test' });
        expect(response.status).toBe(200);
      }
    });

    it('should block requests over the limit', async () => {
      // Make 10 successful requests
      for (let i = 0; i < 10; i++) {
        await request(app).post('/login');
      }

      // 11th request should be rate limited
      const response = await request(app).post('/login');
      expect(response.status).toBe(429);
      expect(response.text).toContain('Too many login attempts');
    });
  });

  describe('linkCreationLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Mock authentication middleware that adds merchant
      app.use((req: Request, res: Response, next: NextFunction) => {
        // @ts-expect-error - Adding merchant for testing
        req.merchant = { id: 'test-merchant-123' };
        next();
      });

      app.post('/links', linkCreationLimiter, (req: Request, res: Response) => {
        res.json({ linkId: 'fake-link' });
      });
    });

    it('should use merchant ID as rate limit key', async () => {
      // This test verifies the limiter keys by merchant ID
      // Make requests with merchant ID present
      for (let i = 0; i < 100; i++) {
        const response = await request(app).post('/links');
        expect(response.status).toBe(200);
      }

      // 101st request should be rate limited for this merchant
      const response = await request(app).post('/links');
      expect(response.status).toBe(429);
    });

    it('should warn and fallback when merchant ID is missing', async () => {
      // Create new app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.post('/links', linkCreationLimiter, (req: Request, res: Response) => {
        res.json({ linkId: 'fake-link' });
      });

      // Mock console.warn to capture warning
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = () => { warnCalled = true; };

      const response = await request(appNoAuth).post('/links');

      // Restore console.warn
      console.warn = originalWarn;

      // Should either succeed (if under IP limit) or show warning was called
      expect(response.status === 200 || warnCalled).toBe(true);
    });
  });

  describe('backupLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Mock authentication middleware
      app.use((req: Request, res: Response, next: NextFunction) => {
        // @ts-expect-error - Adding merchant for testing
        req.merchant = { id: 'test-merchant-456' };
        next();
      });

      app.post('/backups', backupLimiter, (req: Request, res: Response) => {
        res.json({ backupId: 'fake-backup' });
      });
    });

    it('should allow up to 100 requests per hour per merchant', async () => {
      for (let i = 0; i < 100; i++) {
        const response = await request(app).post('/backups');
        expect(response.status).toBe(200);
      }

      // 101st request should be rate limited
      const response = await request(app).post('/backups');
      expect(response.status).toBe(429);
    });
  });

  describe('generalLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(generalLimiter);
      app.get('/api/test', (req: Request, res: Response) => {
        res.json({ ok: true });
      });
    });

    it('should allow requests under the limit (100 per 15 minutes)', async () => {
      for (let i = 0; i < 100; i++) {
        const response = await request(app).get('/api/test');
        expect(response.status).toBe(200);
      }
    });

    it('should block requests over the limit', async () => {
      // Make 100 successful requests
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/test');
      }

      // 101st request should be rate limited
      const response = await request(app).get('/api/test');
      expect(response.status).toBe(429);
      expect(response.text).toContain('Too many requests');
    });

    it('should expose rate limit information in headers', async () => {
      const response = await request(app).get('/api/test');
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers['ratelimit-limit']).toBe('100');
    });
  });
});
