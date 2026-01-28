/**
 * CORS configuration for BullPOS backend
 * Allows requests from btcpos.cash frontend
 */

import { CorsOptions } from 'cors';

/**
 * Allowed origins for CORS
 * In production, restrict to btcpos.cash domain
 * In development, allow localhost for testing
 */
const allowedOrigins = [
  'https://btcpos.cash',
  'https://www.btcpos.cash',
  // Development origins
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
];

/**
 * CORS options configuration
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours - cache preflight requests
};
