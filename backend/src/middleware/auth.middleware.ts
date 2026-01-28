import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include merchant info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      merchantId?: string;
    }
  }
}

// Validate JWT_SECRET at module load
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface JWTPayload {
  merchantId: string;
  email: string;
}

export function authenticateMerchant(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'] // Prevent algorithm confusion attacks
    }) as JWTPayload;
    req.merchantId = payload.merchantId;
    next();
  } catch (error) {
    // Log error for debugging but return generic message
    console.error('JWT verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Alias for backward compatibility with feature branch
export const authenticateToken = authenticateMerchant;

export function generateToken(merchantId: string, email: string): string {
  return jwt.sign(
    { merchantId, email } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
