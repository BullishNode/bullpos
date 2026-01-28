/**
 * Payment link routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';
import { nanoid } from 'nanoid';

const router = Router();

const createLinkSchema = z.object({
  ciphertext: z.string(), // AES-encrypted payment link data
});

/**
 * POST /api/links
 * Create a new encrypted payment link
 */
router.post('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const body = createLinkSchema.parse(req.body);

    const linkId = nanoid();
    const now = Date.now();

    db.prepare(`
      INSERT INTO payment_links (id, merchant_id, ciphertext, created_at)
      VALUES (?, ?, ?, ?)
    `).run(linkId, req.auth!.merchantId, body.ciphertext, now);

    res.status(201).json({
      id: linkId,
      createdAt: now,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Create link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/links/:id
 * Get a payment link by ID (public endpoint - anyone with ID can retrieve)
 */
router.get('/:id', (req, res) => {
  try {
    const link = db.prepare(`
      SELECT id, ciphertext, created_at
      FROM payment_links
      WHERE id = ?
    `).get(req.params.id) as any;

    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }

    res.json({
      id: link.id,
      ciphertext: link.ciphertext,
      createdAt: link.created_at,
    });
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/links
 * List all payment links for the authenticated merchant
 */
router.get('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const links = db.prepare(`
      SELECT id, created_at
      FROM payment_links
      WHERE merchant_id = ?
      ORDER BY created_at DESC
    `).all(req.auth!.merchantId) as any[];

    res.json({
      links: links.map(link => ({
        id: link.id,
        createdAt: link.created_at,
      })),
    });
  } catch (error) {
    console.error('List links error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/links/:id
 * Delete a payment link
 */
router.delete('/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM payment_links
      WHERE id = ? AND merchant_id = ?
    `).run(req.params.id, req.auth!.merchantId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Payment link not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
