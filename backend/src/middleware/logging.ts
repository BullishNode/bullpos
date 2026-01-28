/**
 * Request logging middleware for audit and security monitoring
 * Logs all API requests for security analysis and debugging
 */

import { Request, Response, NextFunction } from 'express';

interface RequestLogEntry {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  merchantId?: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  contentLength?: number;
  error?: string;
}

/**
 * Logs request details for security audit
 * In production, these logs should be sent to a logging service
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture response finish to log complete request
  const originalSend = res.send;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.send = function (data: any) {
    const responseTime = Date.now() - startTime;

    const logEntry: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      merchantId: req.merchantId, // Added by auth middleware if authenticated
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length') ? parseInt(req.get('content-length')!, 10) : undefined
    };

    // Log to console (in production, send to logging service)
    logRequest(logEntry);

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Logs security-relevant events (failed auth, rate limits, etc.)
 */
export function securityEventLogger(req: Request, res: Response, next: NextFunction) {
  const originalStatus = res.status;

  res.status = function (code: number) {
    // Log security-relevant status codes
    if (code === 401 || code === 403 || code === 429) {
      const securityEvent = {
        timestamp: new Date().toISOString(),
        eventType: getSecurityEventType(code),
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        merchantId: req.merchantId,
        statusCode: code,
        userAgent: req.get('user-agent')
      };

      logSecurityEvent(securityEvent);
    }

    return originalStatus.call(this, code);
  };

  next();
}

/**
 * Maps status codes to security event types
 */
function getSecurityEventType(statusCode: number): string {
  switch (statusCode) {
    case 401:
      return 'UNAUTHORIZED_ACCESS';
    case 403:
      return 'FORBIDDEN_ACCESS';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return 'SECURITY_EVENT';
  }
}

/**
 * Outputs request log entry
 * In production, send to logging service (e.g., CloudWatch, DataDog, etc.)
 */
function logRequest(entry: RequestLogEntry) {
  // Only log to console in development
  if (process.env.NODE_ENV !== 'production') {
    const logMessage = `[${entry.timestamp}] ${entry.method} ${entry.path} - ${entry.statusCode} - ${entry.responseTime}ms - IP: ${entry.ip}${entry.merchantId ? ` - Merchant: ${entry.merchantId}` : ''}`;
    console.log(logMessage);
  }

  // In production, send to logging service:
  // await loggingService.log(entry);

  // For now, append to audit log file in production
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement file-based logging or external service integration
    // For example: fs.appendFileSync('audit.log', JSON.stringify(entry) + '\n');
  }
}

/**
 * Outputs security event log
 * In production, send to security monitoring service
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logSecurityEvent(event: any) {
  // Always log security events to console
  console.warn(`[SECURITY] ${event.eventType} - ${event.path} - IP: ${event.ip}${event.merchantId ? ` - Merchant: ${event.merchantId}` : ''}`);

  // In production, send to security monitoring service:
  // await securityMonitoring.alert(event);

  // For now, append to security log file
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement security event logging
    // For example: fs.appendFileSync('security.log', JSON.stringify(event) + '\n');
  }
}

/**
 * Error logging middleware
 * Captures and logs application errors for debugging
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    merchantId: req.merchantId
  };

  console.error('[ERROR]', JSON.stringify(errorLog, null, 2));

  // In production, send to error tracking service (e.g., Sentry)
  // await errorTracking.captureException(err, { req });

  next(err);
}
