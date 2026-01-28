/**
 * Authentication routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { hashPassword, verifyPassword, generateToken } from '../auth.js';
import { nanoid } from 'nanoid';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  pgpPublicKey: z.string().min(100), // PGP keys are typically large
});

/**
 * POST /api/auth/register
 * Register a new merchant account
 */
router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM merchants WHERE email = ?').get(body.email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create merchant
    const merchantId = nanoid();
    const now = Date.now();

    db.prepare(`
      INSERT INTO merchants (id, email, password_hash, pgp_public_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(merchantId, body.email, passwordHash, body.pgpPublicKey, now, now);

    // Generate token
    const token = generateToken({ merchantId, email: body.email });

    res.status(201).json({
      token,
      merchant: {
        id: merchantId,
        email: body.email,
        createdAt: now,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);

    // Find merchant
    const merchant = db.prepare(`
      SELECT id, email, password_hash
      FROM merchants
      WHERE email = ?
    `).get(body.email) as { id: string; email: string; password_hash: string } | undefined;

    if (!merchant) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const valid = await verifyPassword(body.password, merchant.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ merchantId: merchant.id, email: merchant.email });

    res.json({
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
