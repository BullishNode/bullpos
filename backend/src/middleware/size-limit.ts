/**
 * Payload size validation middleware for abuse prevention
 * Protects against oversized payloads that could cause DoS
 */

import { Request, Response, NextFunction } from 'express';

// Size limits (in bytes)
const SIZE_LIMITS = {
  BACKUP_MAX_SIZE: 500 * 1024, // 500 KB for encrypted backups
  LINK_PAYLOAD_MAX_SIZE: 100 * 1024, // 100 KB for payment link encrypted data
  GENERAL_PAYLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10 MB general limit (set in express.json)
};

/**
 * Validates that backup payload size is within acceptable limits
 * Prevents storage abuse and DoS attacks via oversized backups
 */
export function validateBackupSize(req: Request, res: Response, next: NextFunction) {
  const backup = req.body?.encryptedBackup;

  if (!backup) {
    // If no backup field, let validation happen in route handler
    next();
    return;
  }

  // Check size of encrypted backup string
  const backupSize = Buffer.byteLength(backup, 'utf8');

  if (backupSize > SIZE_LIMITS.BACKUP_MAX_SIZE) {
    res.status(413).json({
      error: 'Payload too large',
      message: `Backup size (${backupSize} bytes) exceeds maximum allowed size (${SIZE_LIMITS.BACKUP_MAX_SIZE} bytes)`,
      maxSize: SIZE_LIMITS.BACKUP_MAX_SIZE,
      actualSize: backupSize
    });
    return;
  }

  next();
}

/**
 * Validates that payment link payload size is within acceptable limits
 * Prevents storage abuse via oversized encrypted payment data
 */
export function validateLinkPayloadSize(req: Request, res: Response, next: NextFunction) {
  const { ciphertext, nonce, tag } = req.body;

  if (!ciphertext) {
    // If no ciphertext field, let validation happen in route handler
    next();
    return;
  }

  // Calculate total size of encrypted payload components
  const ciphertextSize = Buffer.byteLength(ciphertext, 'utf8');
  const nonceSize = nonce ? Buffer.byteLength(nonce, 'utf8') : 0;
  const tagSize = tag ? Buffer.byteLength(tag, 'utf8') : 0;
  const totalSize = ciphertextSize + nonceSize + tagSize;

  if (totalSize > SIZE_LIMITS.LINK_PAYLOAD_MAX_SIZE) {
    res.status(413).json({
      error: 'Payload too large',
      message: `Link payload size (${totalSize} bytes) exceeds maximum allowed size (${SIZE_LIMITS.LINK_PAYLOAD_MAX_SIZE} bytes)`,
      maxSize: SIZE_LIMITS.LINK_PAYLOAD_MAX_SIZE,
      actualSize: totalSize,
      breakdown: {
        ciphertext: ciphertextSize,
        nonce: nonceSize,
        tag: tagSize
      }
    });
    return;
  }

  next();
}

/**
 * Validates general request payload size
 * Additional safety check beyond express.json limit
 */
export function validateGeneralPayloadSize(req: Request, res: Response, next: NextFunction) {
  const contentLength = req.get('content-length');

  if (contentLength) {
    const size = parseInt(contentLength, 10);

    if (size > SIZE_LIMITS.GENERAL_PAYLOAD_MAX_SIZE) {
      res.status(413).json({
        error: 'Payload too large',
        message: `Request size (${size} bytes) exceeds maximum allowed size (${SIZE_LIMITS.GENERAL_PAYLOAD_MAX_SIZE} bytes)`,
        maxSize: SIZE_LIMITS.GENERAL_PAYLOAD_MAX_SIZE
      });
      return;
    }
  }

  next();
}

// Export size limits for testing and documentation
export { SIZE_LIMITS };
