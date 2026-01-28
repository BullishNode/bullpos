import { z } from 'zod';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * Merchant registration validation schema
 */
export const registerMerchantSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  storeName: z.string().min(1, 'Store name is required'),
  pgpPublicKey: z.string().min(1, 'PGP public key is required'),
});

export type RegisterMerchantRequest = z.infer<typeof registerMerchantSchema>;
