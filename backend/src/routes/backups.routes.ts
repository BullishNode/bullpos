/**
 * Backup routes
 * Demonstrates integration of aggressive rate limiting and size limits for backup operations
 * TODO: Full implementation in issue #7
 */

import { Router, Request, Response } from 'express';
import { authenticateMerchant } from '../middleware/auth.middleware';
import { backupRateLimiter, merchantRateLimiter } from '../middleware/rate-limit';
import { validateBackupSize } from '../middleware/size-limit';

export const backupsRouter = Router();

// POST /api/backups - Create backup
// Public endpoint with aggressive rate limiting (50 per hour) and size validation (max 500 KB)
backupsRouter.post(
  '/',
  backupRateLimiter, // 50 backups per hour (more restrictive than general limit)
  validateBackupSize, // Max 500 KB backup size
  (req: Request, res: Response) => {
    // TODO: Implement backup creation logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);

// PUT /api/backups/:id - Update backup status
// Public endpoint with rate limiting
backupsRouter.put('/:id', backupRateLimiter, (req: Request, res: Response) => {
  // TODO: Implement backup update logic (issue #7)
  res.status(501).json({ error: 'Not implemented yet' });
});

// GET /api/backups - List merchant's backups (authenticated)
// Protected: requires authentication and per-merchant rate limiting
backupsRouter.get(
  '/',
  authenticateMerchant,
  merchantRateLimiter, // 100 operations per hour per merchant
  (req: Request, res: Response) => {
    // TODO: Implement backups list logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);

// GET /api/backups/:id - Fetch backup details (authenticated)
// Protected: requires authentication and per-merchant rate limiting
backupsRouter.get(
  '/:id',
  authenticateMerchant,
  merchantRateLimiter, // 100 operations per hour per merchant
  (req: Request, res: Response) => {
    // TODO: Implement backup fetch logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);
