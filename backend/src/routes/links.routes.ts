/**
 * Payment links routes
 * Demonstrates integration of rate limiting and size limits for link operations
 * TODO: Full implementation in issue #7
 */

import { Router, Request, Response } from 'express';
import { authenticateMerchant } from '../middleware/auth.middleware';
import { linkCreationRateLimiter, merchantRateLimiter } from '../middleware/rate-limit';
import { validateLinkPayloadSize } from '../middleware/size-limit';

export const linksRouter = Router();

// POST /api/links - Create payment link
// Protected: requires authentication, per-merchant rate limit, and payload size validation
linksRouter.post(
  '/',
  authenticateMerchant,
  linkCreationRateLimiter, // 100 links per hour per merchant
  validateLinkPayloadSize, // Max 100 KB payload
  (req: Request, res: Response) => {
    // TODO: Implement link creation logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);

// GET /api/links/:id - Fetch payment link (public)
// Public endpoint with global rate limiting only
linksRouter.get('/:id', (req: Request, res: Response) => {
  // TODO: Implement link fetch logic (issue #7)
  res.status(501).json({ error: 'Not implemented yet' });
});

// GET /api/links - List merchant's links (authenticated)
// Protected: requires authentication and per-merchant rate limiting
linksRouter.get(
  '/',
  authenticateMerchant,
  merchantRateLimiter, // 100 operations per hour per merchant
  (req: Request, res: Response) => {
    // TODO: Implement links list logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);

// DELETE /api/links/:id - Delete payment link
// Protected: requires authentication and per-merchant rate limiting
linksRouter.delete(
  '/:id',
  authenticateMerchant,
  merchantRateLimiter, // 100 operations per hour per merchant
  (req: Request, res: Response) => {
    // TODO: Implement link deletion logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);
