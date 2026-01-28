/**
 * Backup Routes
 * API endpoints for PGP-encrypted swap backup storage
 * Includes aggressive rate limiting and size limits for backup operations
 */

import { Router, Request, Response } from 'express';
import { BackupService } from '../services/backup.service';
import {
  createBackupSchema,
  updateBackupSchema,
  backupIdSchema,
} from '../validators/backup.validators';
import { authenticateToken, type AuthRequest } from '../middleware/auth.middleware';
import { backupRateLimiter, merchantRateLimiter } from '../middleware/rate-limit';
import { validateBackupSize } from '../middleware/size-limit';
import type Database from 'better-sqlite3';

export function createBackupRoutes(db: Database.Database): Router {
  const router = Router();
  const backupService = new BackupService(db);

  /**
   * POST /api/backups
   * Create a new backup (public endpoint - browser uploads encrypted backup)
   * Includes aggressive rate limiting (50 per hour) and size validation (max 500 KB)
   */
  router.post(
    '/',
    backupRateLimiter, // 50 backups per hour (more restrictive than general limit)
    validateBackupSize, // Max 500 KB backup size
    (req: Request, res: Response) => {
      try {
        const validatedData = createBackupSchema.parse(req.body);
        const backup = backupService.createBackup(
          validatedData.merchantId,
          validatedData.encryptedData
        );

        res.status(201).json({
          id: backup.id,
          merchantId: backup.merchant_id,
          status: backup.status,
          createdAt: backup.created_at,
          updatedAt: backup.updated_at,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Invalid request data', details: error.message });
        } else {
          console.error('Error creating backup:', error);
          res.status(500).json({ error: 'Failed to create backup' });
        }
      }
    }
  );

  /**
   * PUT /api/backups/:id
   * Update backup status and/or encrypted data (public endpoint - browser updates after claim)
   * Includes rate limiting
   */
  router.put(
    '/:id',
    backupRateLimiter,
    (req: Request, res: Response) => {
      try {
        const backupId = backupIdSchema.parse(req.params.id);
        const validatedData = updateBackupSchema.parse(req.body);

        const updatedBackup = backupService.updateBackup(backupId, {
          status: validatedData.status,
          encryptedData: validatedData.encryptedData,
        });

        if (!updatedBackup) {
          res.status(404).json({ error: 'Backup not found' });
          return;
        }

        res.json({
          id: updatedBackup.id,
          merchantId: updatedBackup.merchant_id,
          status: updatedBackup.status,
          createdAt: updatedBackup.created_at,
          updatedAt: updatedBackup.updated_at,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Invalid request data', details: error.message });
        } else {
          console.error('Error updating backup:', error);
          res.status(500).json({ error: 'Failed to update backup' });
        }
      }
    }
  );

  /**
   * GET /api/backups
   * List all backups for authenticated merchant
   * Protected: requires authentication and per-merchant rate limiting (100 operations per hour)
   */
  router.get(
    '/',
    authenticateToken,
    merchantRateLimiter, // 100 operations per hour per merchant
    (req: AuthRequest, res: Response) => {
      try {
        if (!req.merchantId) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const backups = backupService.listBackupsByMerchant(req.merchantId);

        res.json({
          backups: backups.map((backup) => ({
            id: backup.id,
            merchantId: backup.merchant_id,
            encryptedData: backup.encrypted_data,
            status: backup.status,
            createdAt: backup.created_at,
            updatedAt: backup.updated_at,
          })),
        });
      } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
      }
    }
  );

  /**
   * GET /api/backups/:id
   * Get a single backup (authenticated - merchant can only access their own backups)
   * Protected: requires authentication and per-merchant rate limiting (100 operations per hour)
   */
  router.get(
    '/:id',
    authenticateToken,
    merchantRateLimiter, // 100 operations per hour per merchant
    (req: AuthRequest, res: Response) => {
      try {
        if (!req.merchantId) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const backupId = backupIdSchema.parse(req.params.id);
        const backup = backupService.getBackupById(backupId);

        if (!backup) {
          res.status(404).json({ error: 'Backup not found' });
          return;
        }

        // Verify ownership
        if (backup.merchant_id !== req.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        res.json({
          id: backup.id,
          merchantId: backup.merchant_id,
          encryptedData: backup.encrypted_data,
          status: backup.status,
          createdAt: backup.created_at,
          updatedAt: backup.updated_at,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Invalid backup ID' });
        } else {
          console.error('Error getting backup:', error);
          res.status(500).json({ error: 'Failed to get backup' });
        }
      }
    }
  );

  return router;
}
