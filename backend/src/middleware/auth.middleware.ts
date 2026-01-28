import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/auth.service.js';

// Extend Express Request interface to include merchant
declare global {
  namespace Express {
    interface Request {
      merchant?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware - validates JWT token
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.merchant = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
