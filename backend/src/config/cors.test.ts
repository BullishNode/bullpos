/**
 * Tests for CORS configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { corsOptions } from './cors.js';

describe('CORS Configuration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(cors(corsOptions));
    app.get('/test', (req, res) => {
      res.json({ success: true });
    });
  });

  describe('Allowed Origins', () => {
    it('should allow requests from btcpos.cash', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://btcpos.cash');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://btcpos.cash');
    });

    it('should allow requests from www.btcpos.cash', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://www.btcpos.cash');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://www.btcpos.cash');
    });

    it('should allow requests from localhost:8080', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:8080');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    });

    it('should allow requests from localhost:3000', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow requests with no origin (mobile apps, curl)', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });
  });

  describe('Blocked Origins', () => {
    it('should block requests from unauthorized domains', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com');

      // The request might succeed but CORS headers won't be set properly
      // Or it might be blocked with an error
      expect(
        response.status === 500 ||
        !response.headers['access-control-allow-origin']
      ).toBe(true);
    });

    it('should block http requests to production domain', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://btcpos.cash'); // HTTP instead of HTTPS

      expect(
        response.status === 500 ||
        !response.headers['access-control-allow-origin']
      ).toBe(true);
    });
  });

  describe('CORS Headers', () => {
    it('should expose rate limit headers', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://btcpos.cash')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-expose-headers']).toContain('RateLimit-Limit');
      expect(response.headers['access-control-expose-headers']).toContain('RateLimit-Remaining');
      expect(response.headers['access-control-expose-headers']).toContain('RateLimit-Reset');
    });

    it('should allow credentials', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://btcpos.cash')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow specified HTTP methods', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://btcpos.cash')
        .set('Access-Control-Request-Method', 'POST');

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
    });

    it('should cache preflight requests for 24 hours', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://btcpos.cash')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });
});
