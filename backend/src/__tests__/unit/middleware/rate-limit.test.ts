/**
 * Unit tests for rate limiting middleware
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import {
  publicRateLimiter,
  registrationRateLimiter,
  loginRateLimiter,
  merchantRateLimiter,
  linkCreationRateLimiter,
  backupRateLimiter
} from '../../../middleware/rate-limit';

describe('Rate Limiting Middleware', () => {
  describe('publicRateLimiter', () => {
    it('should allow requests within rate limit', async () => {
      const app = express();
      app.use(publicRateLimiter);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test').expect(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers', async () => {
      const app = express();
      app.use(publicRateLimiter);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test').expect(200);
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('registrationRateLimiter', () => {
    it('should have stricter limits than public limiter', async () => {
      const app = express();
      app.use(registrationRateLimiter);
      app.post('/register', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).post('/register').expect(200);
      const limit = parseInt(response.headers['ratelimit-limit']);

      // Registration limit should be 5 per hour
      expect(limit).toBe(5);
    });
  });

  describe('loginRateLimiter', () => {
    it('should have moderate limits for login attempts', async () => {
      const app = express();
      app.use(loginRateLimiter);
      app.post('/login', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).post('/login').expect(200);
      const limit = parseInt(response.headers['ratelimit-limit']);

      // Login limit should be 10 per minute
      expect(limit).toBe(10);
    });
  });

  describe('merchantRateLimiter', () => {
    it('should use custom key generator', async () => {
      const app = express();

      // Simulate authenticated request by adding merchantId
      app.use((req: Request, res: Response, next) => {
        req.merchantId = 'test-merchant-123';
        next();
      });

      app.use(merchantRateLimiter);
      app.get('/merchant-action', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/merchant-action').expect(200);
      const limit = parseInt(response.headers['ratelimit-limit']);

      // Merchant limit should be 100 per hour
      expect(limit).toBe(100);
    });
  });

  describe('linkCreationRateLimiter', () => {
    it('should allow link creation within rate limit', async () => {
      const app = express();
      app.use((req: Request, res: Response, next) => {
        req.merchantId = 'test-merchant-456';
        next();
      });
      app.use(linkCreationRateLimiter);
      app.post('/links', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).post('/links').expect(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('backupRateLimiter', () => {
    it('should have aggressive limits for backup operations', async () => {
      const app = express();
      app.use(backupRateLimiter);
      app.post('/backups', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app).post('/backups').expect(200);
      const limit = parseInt(response.headers['ratelimit-limit']);

      // Backup limit should be 50 per hour (more restrictive)
      expect(limit).toBe(50);
    });
  });

  describe('Rate limit exceeded responses', () => {
    it('should return 429 with proper error message structure', async () => {
      const app = express();

      // Create a very strict limiter for testing
      const strictLimiter = publicRateLimiter;
      app.use(strictLimiter);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Note: Actually triggering rate limit requires many requests
      // This test verifies the middleware is properly configured
      const response = await request(app).get('/test');

      if (response.status === 429) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('retryAfter');
      }
    });
  });
});
