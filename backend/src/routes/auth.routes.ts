import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { verifyPassword, generateToken } from '../services/auth.service.js';
import { loginSchema } from '../validators/auth.validators.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate merchant and issue JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid request data', details: result.error.issues });
      return;
    }

    const { username, password } = result.data;

    // Find merchant by username
    const merchant = db
      .prepare('SELECT id, username, password_hash, store_name FROM merchants WHERE username = ?')
      .get(username) as { id: string; username: string; password_hash: string; store_name: string } | undefined;

    if (!merchant) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, merchant.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      merchantId: merchant.id,
      username: merchant.username,
    });

    res.json({
      token,
      merchant: {
        id: merchant.id,
        username: merchant.username,
        storeName: merchant.store_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
