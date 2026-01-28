import { z } from 'zod';

/**
 * Validator for creating a new encrypted link
 */
export const createLinkSchema = z.object({
  encryptedPayload: z.string().min(1, 'Encrypted payload is required'),
  nonce: z.string().min(1, 'Nonce is required'),
  expiresAt: z.number().int().positive().optional(),
});

export type CreateLinkRequest = z.infer<typeof createLinkSchema>;

/**
 * Validator for link ID parameter
 */
export const linkIdParamSchema = z.object({
  id: z.string().min(1, 'Link ID is required'),
});

export type LinkIdParam = z.infer<typeof linkIdParamSchema>;
