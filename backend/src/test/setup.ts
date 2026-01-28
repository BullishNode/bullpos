/**
 * Test setup and global configuration
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';

beforeAll(() => {
  // Global setup before all tests
  console.log('Starting test suite...');
});

afterAll(() => {
  // Global cleanup after all tests
  console.log('Test suite complete.');
});

afterEach(() => {
  // Reset any test state after each test
});
