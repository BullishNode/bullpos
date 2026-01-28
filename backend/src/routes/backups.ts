/**
 * Swap backup routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';
import { nanoid } from 'nanoid';

const router = Router();

const createBackupSchema = z.object({
  paymentLinkId: z.string(),
  encryptedBackup: z.string(), // PGP-encrypted Boltz swap backup
});

const updateBackupSchema = z.object({
  encryptedBackup: z.string(),
});

/**
 * POST /api/backups
 * Create a new PGP-encrypted swap backup
 */
router.post('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const body = createBackupSchema.parse(req.body);

    // Verify the payment link belongs to the merchant
    const link = db.prepare(`
      SELECT id FROM payment_links
      WHERE id = ? AND merchant_id = ?
    `).get(body.paymentLinkId, req.auth!.merchantId);

    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }

    const backupId = nanoid();
    const now = Date.now();

    db.prepare(`
      INSERT INTO swap_backups (id, merchant_id, payment_link_id, encrypted_backup, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(backupId, req.auth!.merchantId, body.paymentLinkId, body.encryptedBackup, now, now);

    res.status(201).json({
      id: backupId,
      createdAt: now,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/backups/:id
 * Update an existing swap backup
 */
router.put('/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const body = updateBackupSchema.parse(req.body);

    const now = Date.now();
    const result = db.prepare(`
      UPDATE swap_backups
      SET encrypted_backup = ?, updated_at = ?
      WHERE id = ? AND merchant_id = ?
    `).run(body.encryptedBackup, now, req.params.id, req.auth!.merchantId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Update backup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/backups
 * List all swap backups for the authenticated merchant
 */
router.get('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const backups = db.prepare(`
      SELECT id, payment_link_id, created_at, updated_at
      FROM swap_backups
      WHERE merchant_id = ?
      ORDER BY created_at DESC
    `).all(req.auth!.merchantId) as any[];

    res.json({
      backups: backups.map(backup => ({
        id: backup.id,
        paymentLinkId: backup.payment_link_id,
        createdAt: backup.created_at,
        updatedAt: backup.updated_at,
      })),
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/backups/:id
 * Get a specific swap backup
 */
router.get('/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const backup = db.prepare(`
      SELECT id, payment_link_id, encrypted_backup, created_at, updated_at
      FROM swap_backups
      WHERE id = ? AND merchant_id = ?
    `).get(req.params.id, req.auth!.merchantId) as any;

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({
      id: backup.id,
      paymentLinkId: backup.payment_link_id,
      encryptedBackup: backup.encrypted_backup,
      createdAt: backup.created_at,
      updatedAt: backup.updated_at,
    });
  } catch (error) {
    console.error('Get backup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
