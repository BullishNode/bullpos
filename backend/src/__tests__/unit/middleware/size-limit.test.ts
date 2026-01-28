/**
 * Unit tests for payload size validation middleware
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  validateBackupSize,
  validateLinkPayloadSize,
  validateGeneralPayloadSize,
  SIZE_LIMITS
} from '../../../middleware/size-limit';

describe('Size Limit Middleware', () => {
  describe('validateBackupSize', () => {
    it('should allow backups within size limit', async () => {
      const app = express();
      app.use(express.json());
      app.use(validateBackupSize);
      app.post('/backup', (req, res) => {
        res.json({ success: true });
      });

      const smallBackup = '-----BEGIN PGP MESSAGE-----\nSmall encrypted backup\n-----END PGP MESSAGE-----';

      const response = await request(app)
        .post('/backup')
        .send({ encryptedBackup: smallBackup })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject backups exceeding size limit', async () => {
      const app = express();
      app.use(express.json({ limit: '10mb' }));
      app.use(validateBackupSize);
      app.post('/backup', (req, res) => {
        res.json({ success: true });
      });

      // Create backup larger than 500 KB limit
      const largeBackup = '-----BEGIN PGP MESSAGE-----\n' + 'A'.repeat(600 * 1024) + '\n-----END PGP MESSAGE-----';

      const response = await request(app)
        .post('/backup')
        .send({ encryptedBackup: largeBackup })
        .expect(413);

      expect(response.body).toHaveProperty('error', 'Payload too large');
      expect(response.body).toHaveProperty('maxSize', SIZE_LIMITS.BACKUP_MAX_SIZE);
      expect(response.body.actualSize).toBeGreaterThan(SIZE_LIMITS.BACKUP_MAX_SIZE);
    });

    it('should pass through requests without backup field', async () => {
      const app = express();
      app.use(express.json());
      app.use(validateBackupSize);
      app.post('/backup', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/backup')
        .send({ otherField: 'value' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('validateLinkPayloadSize', () => {
    it('should allow link payloads within size limit', async () => {
      const app = express();
      app.use(express.json());
      app.use(validateLinkPayloadSize);
      app.post('/link', (req, res) => {
        res.json({ success: true });
      });

      const smallPayload = {
        ciphertext: 'small-encrypted-data',
        nonce: 'test-nonce',
        tag: 'test-tag'
      };

      const response = await request(app)
        .post('/link')
        .send(smallPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject link payloads exceeding size limit', async () => {
      const app = express();
      app.use(express.json({ limit: '10mb' }));
      app.use(validateLinkPayloadSize);
      app.post('/link', (req, res) => {
        res.json({ success: true });
      });

      // Create payload larger than 100 KB limit
      const largePayload = {
        ciphertext: 'A'.repeat(110 * 1024),
        nonce: 'test-nonce',
        tag: 'test-tag'
      };

      const response = await request(app)
        .post('/link')
        .send(largePayload)
        .expect(413);

      expect(response.body).toHaveProperty('error', 'Payload too large');
      expect(response.body).toHaveProperty('maxSize', SIZE_LIMITS.LINK_PAYLOAD_MAX_SIZE);
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body.breakdown).toHaveProperty('ciphertext');
      expect(response.body.breakdown).toHaveProperty('nonce');
      expect(response.body.breakdown).toHaveProperty('tag');
    });

    it('should calculate total size including all components', async () => {
      const app = express();
      app.use(express.json({ limit: '10mb' }));
      app.use(validateLinkPayloadSize);
      app.post('/link', (req, res) => {
        res.json({ success: true });
      });

      // Create payload where total size exceeds limit
      const payload = {
        ciphertext: 'A'.repeat(40 * 1024),
        nonce: 'B'.repeat(40 * 1024),
        tag: 'C'.repeat(40 * 1024)
      };

      const response = await request(app)
        .post('/link')
        .send(payload)
        .expect(413);

      expect(response.body.actualSize).toBeGreaterThan(SIZE_LIMITS.LINK_PAYLOAD_MAX_SIZE);
    });

    it('should pass through requests without ciphertext field', async () => {
      const app = express();
      app.use(express.json());
      app.use(validateLinkPayloadSize);
      app.post('/link', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/link')
        .send({ otherField: 'value' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('validateGeneralPayloadSize', () => {
    it('should check Content-Length header', async () => {
      const app = express();
      app.use(validateGeneralPayloadSize);
      app.use(express.json({ limit: '10mb' }));
      app.post('/data', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/data')
        .send({ small: 'data' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should allow requests without Content-Length', async () => {
      const app = express();
      app.use(validateGeneralPayloadSize);
      app.get('/data', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/data').expect(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('SIZE_LIMITS constants', () => {
    it('should export size limit constants', () => {
      expect(SIZE_LIMITS).toBeDefined();
      expect(SIZE_LIMITS.BACKUP_MAX_SIZE).toBe(500 * 1024); // 500 KB
      expect(SIZE_LIMITS.LINK_PAYLOAD_MAX_SIZE).toBe(100 * 1024); // 100 KB
      expect(SIZE_LIMITS.GENERAL_PAYLOAD_MAX_SIZE).toBe(10 * 1024 * 1024); // 10 MB
    });
  });
});
