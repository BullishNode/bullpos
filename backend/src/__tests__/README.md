# BullPOS Backend Integration Tests

This directory contains comprehensive integration tests for the BullPOS backend API.

## Test Structure

### Setup (`setup.ts`)
- Test environment configuration
- Helper functions for generating test data
- Utilities for test database management

### Integration Tests

#### `integration/auth.test.ts`
Tests the complete authentication flow:
- Merchant registration with validation
- Login with JWT token generation
- Auth middleware protecting routes
- Token validation (expired, invalid, malformed)
- Complete registration → login cycle

#### `integration/links.test.ts`
Tests the payment links lifecycle:
- Creating encrypted payment links (authenticated)
- Fetching links publicly (no auth required)
- Listing merchant's links (authenticated)
- Deleting links with authorization checks
- Complete CRUD flow

#### `integration/backups.test.ts`
Tests the backup storage system:
- Creating PGP-encrypted backups (public endpoint for browsers)
- Updating backup status (public endpoint)
- Listing backups (authenticated, merchant-scoped)
- Fetching backup details (authenticated, authorization enforced)
- Complete backup lifecycle with status transitions

#### `integration/rate-limiting.test.ts`
Tests rate limiting behavior:
- Global rate limit (100 req/15min per IP)
- Registration rate limit (5 req/hour per IP)
- Login rate limit (10 req/min per IP)
- Link creation rate limit (100 req/hour per merchant)
- Backup operations rate limit (100 req/hour per merchant)
- Rate limit headers and error responses

## Dependencies

These tests depend on the backend implementation from **Issue #7**, which includes:
- Database schema (merchants, payment_links, swap_backups)
- Authentication routes (`POST /api/auth/login`, `POST /api/merchants/register`)
- Merchant routes (`GET/PUT /api/merchants/profile`, `GET /api/merchants/:id/pgp`)
- Link routes (`POST/GET/DELETE /api/links`)
- Backup routes (`POST/PUT/GET /api/backups`)
- Auth middleware for JWT validation
- Rate limiting middleware

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Environment

Tests use:
- **In-memory SQLite database** (`:memory:`) for isolation
- **Test JWT secret** to avoid production credentials
- **Supertest** for HTTP assertions
- **Vitest** as the test runner

Each test suite creates fresh merchants and data to ensure test isolation.

## Expected Behavior

These integration tests verify:
1. ✅ Complete API workflows work end-to-end
2. ✅ Authentication and authorization are enforced correctly
3. ✅ Validation rejects invalid inputs
4. ✅ Rate limiting activates after threshold
5. ✅ Error responses use correct HTTP status codes
6. ✅ Zero-knowledge architecture (server can't decrypt data)
7. ✅ Data isolation between merchants

## Notes

- Tests assume the backend implementation from Issue #7 exists
- Tests use the zero-knowledge security model (encrypted data only)
- Public endpoints (link fetch, backup create/update) don't require auth
- Authenticated endpoints verify ownership and enforce authorization
- Rate limiting uses merchant ID as key for authenticated endpoints
