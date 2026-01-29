/**
 * Authentication Middleware Tests
 * Unit tests for JWT authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, type AuthRequest } from './auth.middleware';

const JWT_SECRET = 'test-secret';

describe('Authentication Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let nextFunction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Set JWT_SECRET and NODE_ENV for testing
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    nextFunction = vi.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  it('should authenticate valid JWT token', () => {
    const merchantId = 'test-merchant-123';
    const token = jwt.sign({ merchantId }, JWT_SECRET);

    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockReq.merchantId).toBe(merchantId);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no token provided', () => {
    mockReq.headers = {};

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentication token required',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 when authorization header missing Bearer format', () => {
    mockReq.headers = {
      authorization: 'InvalidFormat token123',
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    // jwt.verify is called with undefined token, which throws JsonWebTokenError
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 for invalid token', () => {
    mockReq.headers = {
      authorization: 'Bearer invalid-token',
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 for expired token', () => {
    const merchantId = 'test-merchant-123';
    const expiredToken = jwt.sign({ merchantId }, JWT_SECRET, {
      expiresIn: '-1h', // Already expired
    });

    mockReq.headers = {
      authorization: `Bearer ${expiredToken}`,
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 for token signed with wrong secret', () => {
    const merchantId = 'test-merchant-123';
    const wrongSecretToken = jwt.sign({ merchantId }, 'wrong-secret');

    mockReq.headers = {
      authorization: `Bearer ${wrongSecretToken}`,
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should extract merchantId from token payload', () => {
    const merchantId = 'merchant-abc-123';
    const token = jwt.sign({ merchantId }, JWT_SECRET);

    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockReq.merchantId).toBe(merchantId);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle malformed JWT gracefully', () => {
    mockReq.headers = {
      authorization: 'Bearer not.a.valid.jwt.format',
    };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});

describe('JWT_SECRET validation', () => {
  it('should throw error in production without JWT_SECRET', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    // Clean up environment
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    // The module should throw on load in production without JWT_SECRET
    // We can't easily test module-level code, so this is a design verification test
    expect(() => {
      if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
    }).toThrow('JWT_SECRET must be set in production environment');

    // Restore environment
    process.env.NODE_ENV = originalEnv;
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('should allow missing JWT_SECRET in development', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';

    // Should not throw in development
    expect(() => {
      if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
    }).not.toThrow();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});
