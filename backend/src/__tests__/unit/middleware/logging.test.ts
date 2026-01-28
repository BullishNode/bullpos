/**
 * Unit tests for request logging middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { requestLogger, securityEventLogger } from '../../../middleware/logging';

describe('Logging Middleware', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Spy on console methods to verify logging
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('requestLogger', () => {
    it('should log successful requests', async () => {
      const app = express();
      app.use(requestLogger);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);

      // In development, should log to console
      if (process.env.NODE_ENV !== 'production') {
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCall = consoleLogSpy.mock.calls[0][0];
        expect(logCall).toContain('GET');
        expect(logCall).toContain('/test');
        expect(logCall).toContain('200');
      }
    });

    it('should include response time in logs', async () => {
      const app = express();
      app.use(requestLogger);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);

      if (process.env.NODE_ENV !== 'production') {
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCall = consoleLogSpy.mock.calls[0][0];
        expect(logCall).toMatch(/\d+ms/); // Should include milliseconds
      }
    });

    it('should log merchantId if present', async () => {
      const app = express();
      app.use((req: Request, res: Response, next) => {
        req.merchantId = 'test-merchant-789';
        next();
      });
      app.use(requestLogger);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);

      if (process.env.NODE_ENV !== 'production') {
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCall = consoleLogSpy.mock.calls[0][0];
        expect(logCall).toContain('Merchant: test-merchant-789');
      }
    });
  });

  describe('securityEventLogger', () => {
    it('should log 401 unauthorized events', async () => {
      const app = express();
      app.use(securityEventLogger);
      app.get('/protected', (req: Request, res: Response) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app).get('/protected').expect(401);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('[SECURITY]');
      expect(warnCall).toContain('UNAUTHORIZED_ACCESS');
    });

    it('should log 403 forbidden events', async () => {
      const app = express();
      app.use(securityEventLogger);
      app.get('/forbidden', (req: Request, res: Response) => {
        res.status(403).json({ error: 'Forbidden' });
      });

      await request(app).get('/forbidden').expect(403);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('[SECURITY]');
      expect(warnCall).toContain('FORBIDDEN_ACCESS');
    });

    it('should log 429 rate limit events', async () => {
      const app = express();
      app.use(securityEventLogger);
      app.get('/rate-limited', (req: Request, res: Response) => {
        res.status(429).json({ error: 'Too many requests' });
      });

      await request(app).get('/rate-limited').expect(429);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('[SECURITY]');
      expect(warnCall).toContain('RATE_LIMIT_EXCEEDED');
    });

    it('should not log non-security status codes', async () => {
      const app = express();
      app.use(securityEventLogger);
      app.get('/ok', (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      await request(app).get('/ok').expect(200);

      // Should not log security events for 200 status
      const securityLogs = consoleWarnSpy.mock.calls.filter((call: any[]) =>
        call[0].includes('[SECURITY]')
      );
      expect(securityLogs).toHaveLength(0);
    });

    it('should include merchantId in security events if present', async () => {
      const app = express();
      app.use((req: Request, res: Response, next) => {
        req.merchantId = 'suspicious-merchant';
        next();
      });
      app.use(securityEventLogger);
      app.get('/protected', (req: Request, res: Response) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app).get('/protected').expect(401);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('Merchant: suspicious-merchant');
    });
  });

  describe('Combined logging', () => {
    it('should work with both loggers in middleware chain', async () => {
      const app = express();
      app.use(requestLogger);
      app.use(securityEventLogger);
      app.get('/test', (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      await request(app).get('/test').expect(200);

      // Should have request log but not security log (200 status)
      if (process.env.NODE_ENV !== 'production') {
        expect(consoleLogSpy).toHaveBeenCalled();
      }
    });
  });
});
