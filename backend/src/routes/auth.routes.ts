/**
 * Authentication routes
 * Demonstrates integration of rate limiting for auth endpoints
 * TODO: Full implementation in issue #7
 */

import { Router, Request, Response } from 'express';
import { registrationRateLimiter, loginRateLimiter } from '../middleware/rate-limit';

export const authRouter = Router();

// POST /api/merchants/register - Register new merchant
// Uses strict rate limiting (5 per hour per IP) to prevent account spam
authRouter.post(
  '/merchants/register',
  registrationRateLimiter,
  (req: Request, res: Response) => {
    // TODO: Implement registration logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);

// POST /api/auth/login - Login existing merchant
// Uses rate limiting (10 per minute per IP) to prevent brute force attacks
authRouter.post(
  '/auth/login',
  loginRateLimiter,
  (req: Request, res: Response) => {
    // TODO: Implement login logic (issue #7)
    res.status(501).json({ error: 'Not implemented yet' });
  }
);
