/**
 * Enhanced rate limiting middleware for abuse prevention
 * Provides IP-based and merchant-based rate limiting
 */

import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// IP-based rate limiting for public endpoints
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Stricter rate limiting for registration (prevents account creation spam)
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registrations per hour
  skipSuccessfulRequests: false, // Count all registration attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many registration attempts from this IP',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Registration rate limit exceeded',
      message: 'Too many registration attempts. Please try again in an hour.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Login rate limiting (prevents brute force attacks)
export const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 login attempts per minute
  skipSuccessfulRequests: false, // Count failed login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this IP',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Login rate limit exceeded',
      message: 'Too many login attempts. Please try again in a minute.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Per-merchant rate limiting for authenticated endpoints
// Uses merchantId from JWT instead of IP address
export const merchantRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each merchant to 100 operations per hour
  standardHeaders: true,
  legacyHeaders: false,
  // Use merchantId as key instead of IP
  keyGenerator: (req: Request) => {
    // merchantId is added by authenticateMerchant middleware
    return req.merchantId || req.ip || 'unknown';
  },
  message: 'Merchant rate limit exceeded',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Merchant rate limit exceeded',
      message: 'You have exceeded your hourly operation limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Aggressive rate limiting for backup operations (resource intensive)
export const backupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit to 50 backup operations per hour (lower than general merchant limit)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use merchantId for authenticated backup endpoints, IP for public
    return req.merchantId || req.ip || 'unknown';
  },
  message: 'Backup operation rate limit exceeded',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Backup rate limit exceeded',
      message: 'Too many backup operations. Please try again in an hour.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Link creation rate limiting (prevents link spam)
export const linkCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each merchant to 100 link creations per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.merchantId || req.ip || 'unknown';
  },
  message: 'Link creation rate limit exceeded',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Link creation rate limit exceeded',
      message: 'Too many payment links created. Please try again in an hour.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});
