import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { hashPassword, generateToken } from '../services/auth.service.js';
import { registerMerchantSchema } from '../validators/auth.validators.js';

const router = Router();

/**
 * POST /api/merchants/register
 * Register a new merchant account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = registerMerchantSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid request data', details: result.error.issues });
      return;
    }

    const { username, password, storeName, pgpPublicKey } = result.data;

    // Check if username already exists
    const existing = db
      .prepare('SELECT id FROM merchants WHERE username = ?')
      .get(username);

    if (existing) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create merchant
    const merchantId = nanoid();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO merchants (id, username, password_hash, store_name, pgp_public_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(merchantId, username, passwordHash, storeName, pgpPublicKey, now, now);

    // Generate JWT token for auto-login
    const token = generateToken({
      merchantId,
      username,
    });

    res.status(201).json({
      token,
      merchant: {
        id: merchantId,
        username,
        storeName,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
