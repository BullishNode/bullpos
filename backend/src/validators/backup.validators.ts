/**
 * Backup Validators
 * Zod schemas for validating backup operations
 */

import { z } from 'zod';

// Status enum matching database constraint
export const swapBackupStatusSchema = z.enum(['pending', 'claimed', 'failed', 'refunded']);

// Create backup request (POST /api/backups)
export const createBackupSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  encryptedData: z.string().min(1, 'Encrypted data is required'),
});

// Update backup request (PUT /api/backups/:id)
export const updateBackupSchema = z.object({
  status: swapBackupStatusSchema.optional(),
  encryptedData: z.string().min(1).optional(),
}).refine(
  (data) => data.status !== undefined || data.encryptedData !== undefined,
  { message: 'At least one field (status or encryptedData) must be provided' }
);

// Backup ID parameter validation
export const backupIdSchema = z.string().min(1, 'Backup ID is required');

export type CreateBackupInput = z.infer<typeof createBackupSchema>;
export type UpdateBackupInput = z.infer<typeof updateBackupSchema>;
export type SwapBackupStatus = z.infer<typeof swapBackupStatusSchema>;
