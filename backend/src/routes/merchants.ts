/**
 * Merchant profile routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';

const router = Router();

const updateProfileSchema = z.object({
  pgpPublicKey: z.string().min(100).optional(),
});

/**
 * GET /api/merchants/profile
 * Get the authenticated merchant's profile
 */
router.get('/profile', requireAuth, (req: AuthRequest, res) => {
  try {
    const merchant = db.prepare(`
      SELECT id, email, pgp_public_key, created_at, updated_at
      FROM merchants
      WHERE id = ?
    `).get(req.auth!.merchantId) as any;

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.json({
      id: merchant.id,
      email: merchant.email,
      pgpPublicKey: merchant.pgp_public_key,
      createdAt: merchant.created_at,
      updatedAt: merchant.updated_at,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/merchants/profile
 * Update the authenticated merchant's profile
 */
router.put('/profile', requireAuth, (req: AuthRequest, res) => {
  try {
    const body = updateProfileSchema.parse(req.body);

    if (body.pgpPublicKey) {
      const now = Date.now();
      db.prepare(`
        UPDATE merchants
        SET pgp_public_key = ?, updated_at = ?
        WHERE id = ?
      `).run(body.pgpPublicKey, now, req.auth!.merchantId);
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/merchants/:id/pgp
 * Get a merchant's PGP public key (public endpoint for encrypting swap backups)
 */
router.get('/:id/pgp', (req, res) => {
  try {
    const merchant = db.prepare(`
      SELECT pgp_public_key
      FROM merchants
      WHERE id = ?
    `).get(req.params.id) as { pgp_public_key: string } | undefined;

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.json({ pgpPublicKey: merchant.pgp_public_key });
  } catch (error) {
    console.error('Get PGP key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
