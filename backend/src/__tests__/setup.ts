/**
 * Test setup utilities
 * Provides helpers for integration testing with in-memory database
 */

import { unlinkSync } from 'fs';
import { existsSync } from 'fs';

// Use in-memory database for tests
export const TEST_DB_PATH = ':memory:';
export const TEST_JWT_SECRET = 'test-jwt-secret-for-integration-tests';

// Set test environment variables before importing app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.DB_PATH = TEST_DB_PATH;

/**
 * Clean up test database file if it exists
 */
export function cleanupTestDb(dbPath: string): void {
  if (dbPath !== ':memory:' && existsSync(dbPath)) {
    try {
      unlinkSync(dbPath);
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  }
}

/**
 * Generate test merchant data
 */
export function generateTestMerchant(suffix = '') {
  return {
    email: `test${suffix}@example.com`,
    password: 'Test123!@#',
    storeName: `Test Store${suffix}`,
    pgpPublicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----
Test PGP key${suffix}
-----END PGP PUBLIC KEY BLOCK-----`,
  };
}

/**
 * Generate test payment link data
 */
export function generateTestLink(suffix = '') {
  return {
    ciphertext: `encrypted-payment-data${suffix}`,
    nonce: `test-nonce${suffix}`,
    tag: `test-tag${suffix}`,
  };
}

/**
 * Generate test backup data
 */
export function generateTestBackup(suffix = '') {
  return {
    encryptedBackup: `-----BEGIN PGP MESSAGE-----
Encrypted backup data${suffix}
-----END PGP MESSAGE-----`,
    paymentLinkId: `link-id${suffix}`,
    status: 'pending' as const,
  };
}

/**
 * Wait for a condition to be true or timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}
