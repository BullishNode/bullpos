# Abuse Prevention & Enhanced Rate Limiting

This document describes the abuse prevention measures implemented in the BullPOS backend to protect against spam, denial of service, and other malicious activities.

## Overview

The backend implements multiple layers of protection:

1. **IP-based rate limiting** for public endpoints
2. **Per-merchant rate limiting** for authenticated operations
3. **Payload size limits** to prevent storage abuse
4. **Request logging** for security audit and monitoring

## Rate Limiting

### Global Rate Limiting

All endpoints are protected by a global rate limiter that applies to each IP address:

- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Response**: 429 Too Many Requests with `Retry-After` header

### Endpoint-Specific Rate Limiting

#### Registration Endpoint
`POST /api/merchants/register`

- **Window**: 1 hour
- **Limit**: 5 registrations per IP
- **Purpose**: Prevents account creation spam

#### Login Endpoint
`POST /api/auth/login`

- **Window**: 1 minute
- **Limit**: 10 attempts per IP
- **Purpose**: Prevents brute force password attacks

#### Link Creation
`POST /api/links`

- **Window**: 1 hour
- **Limit**: 100 links per merchant
- **Purpose**: Prevents payment link spam

#### Backup Operations
`POST /api/backups`, `PUT /api/backups/:id`

- **Window**: 1 hour
- **Limit**: 50 operations per merchant/IP
- **Purpose**: Protects against resource-intensive backup abuse (more restrictive than general merchant limit)

#### General Merchant Operations
`GET /api/links`, `DELETE /api/links/:id`, `GET /api/backups`

- **Window**: 1 hour
- **Limit**: 100 operations per merchant
- **Purpose**: Rate limits authenticated operations by merchant ID

### Rate Limit Response Headers

All rate-limited responses include standard headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1234567890
```

When rate limit is exceeded, the server returns:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": "900"
}
```

## Payload Size Limits

### Backup Size Limit

**Maximum**: 500 KB per backup

Endpoint: `POST /api/backups`

Protects against:
- Storage abuse via oversized encrypted backups
- DoS attacks using large payloads

Error response when exceeded:
```json
{
  "error": "Payload too large",
  "message": "Backup size (600000 bytes) exceeds maximum allowed size (512000 bytes)",
  "maxSize": 512000,
  "actualSize": 600000
}
```

### Link Payload Size Limit

**Maximum**: 100 KB per payment link

Endpoint: `POST /api/links`

Validates total size of:
- `ciphertext` field
- `nonce` field
- `tag` field

Error response includes breakdown:
```json
{
  "error": "Payload too large",
  "message": "Link payload size (120000 bytes) exceeds maximum allowed size (102400 bytes)",
  "maxSize": 102400,
  "actualSize": 120000,
  "breakdown": {
    "ciphertext": 100000,
    "nonce": 10000,
    "tag": 10000
  }
}
```

### General Payload Limit

**Maximum**: 10 MB per request

Applied globally via `express.json({ limit: '10mb' })` and `validateGeneralPayloadSize` middleware.

## Request Logging

### Request Logger

Logs all API requests with:
- Timestamp
- HTTP method and path
- IP address
- Merchant ID (if authenticated)
- Status code
- Response time
- User agent
- Content length

Example log output:
```
[2026-01-28T03:15:42.123Z] POST /api/links - 201 - 45ms - IP: 192.168.1.100 - Merchant: merchant-abc123
```

### Security Event Logger

Automatically logs security-relevant events:

**Logged Events**:
- 401 Unauthorized (invalid/missing authentication)
- 403 Forbidden (insufficient permissions)
- 429 Rate Limit Exceeded

Example security log:
```
[SECURITY] RATE_LIMIT_EXCEEDED - /api/merchants/register - IP: 10.0.0.50
[SECURITY] UNAUTHORIZED_ACCESS - /api/links - IP: 192.168.1.200 - Merchant: merchant-xyz789
```

### Production Logging

In production (`NODE_ENV=production`):
- Request logs are not output to console (to reduce noise)
- Security events are always logged to console
- TODO: Integration with external logging services (CloudWatch, DataDog, etc.)

## Implementation Details

### Middleware Files

**`src/middleware/rate-limit.ts`**
- Exports rate limiter configurations for different endpoints
- Uses `express-rate-limit` library
- Supports both IP-based and merchant-based rate limiting

**`src/middleware/size-limit.ts`**
- Validates payload sizes before processing
- Returns detailed error messages with size breakdown
- Exports size limit constants for testing

**`src/middleware/logging.ts`**
- Request logger for audit trail
- Security event logger for monitoring
- Error logger for debugging

### Route Integration

Routes are configured with appropriate middleware:

```typescript
// Example: Link creation with all protections
linksRouter.post(
  '/',
  authenticateMerchant,           // Verify JWT token
  linkCreationRateLimiter,        // Rate limit per merchant
  validateLinkPayloadSize,        // Check payload size
  createLinkHandler               // Business logic
);
```

### Testing

Unit tests are provided in:
- `src/__tests__/unit/middleware/rate-limit.test.ts`
- `src/__tests__/unit/middleware/size-limit.test.ts`
- `src/__tests__/unit/middleware/logging.test.ts`

Integration tests in `src/__tests__/integration/rate-limiting.test.ts` verify end-to-end behavior.

## Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` to enable production logging behavior
- `JWT_SECRET`: Required for merchant authentication (used by rate limiters that key on merchantId)

### Adjusting Limits

To modify rate limits, edit the middleware configurations in `src/middleware/rate-limit.ts`:

```typescript
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // Change window
  max: 5,                     // Change limit
  // ...
});
```

To modify size limits, edit `SIZE_LIMITS` in `src/middleware/size-limit.ts`:

```typescript
const SIZE_LIMITS = {
  BACKUP_MAX_SIZE: 500 * 1024,          // 500 KB
  LINK_PAYLOAD_MAX_SIZE: 100 * 1024,    // 100 KB
  // ...
};
```

## Best Practices

1. **Monitor rate limit logs**: Watch for patterns of rate limit violations that might indicate attacks
2. **Adjust limits based on usage**: Review actual usage patterns and adjust limits accordingly
3. **Set up alerting**: Configure alerts for excessive rate limit violations
4. **Regular audit**: Review security logs for suspicious patterns
5. **Test in staging**: Always test limit changes in a staging environment first

## Future Enhancements

Potential improvements for consideration:

- [ ] CAPTCHA integration for registration endpoint
- [ ] Dynamic rate limiting based on user reputation
- [ ] Distributed rate limiting using Redis for multi-instance deployments
- [ ] Integration with external security monitoring services
- [ ] IP allowlist/blocklist management
- [ ] Rate limit bypass for trusted sources
